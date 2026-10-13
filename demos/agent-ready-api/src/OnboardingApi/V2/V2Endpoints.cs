using System.ComponentModel;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using OnboardingApi.Shared;

namespace OnboardingApi.V2;

/// <summary>
/// Version 2: same domain, contract revised so a caller that only has the OpenAPI document
/// and the responses (a person, a script or an agent) can build the request, understand
/// errors, retry safely and confirm the result.
/// </summary>
public static class V2Endpoints
{
    private const string CreateOperation = "create-onboarding-request";

    public static void MapV2(this WebApplication app)
    {
        var requests = app.MapGroup("/v2/onboarding-requests").WithTags("Onboarding requests");

        requests.MapPost("/", Create)
            .WithName("CreateOnboardingRequest")
            .WithSummary("Create an onboarding request")
            .WithDescription("Creates one onboarding request. Send an Idempotency-Key: retrying with the same key and body returns the original result instead of creating another request. The response has the id to read the request later.")
            .RequireAuthorization(Scopes.Write)
            .AddEndpointFilter<DropFirstCreateResponse>()
            .Produces<OnboardingRequestResource>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        requests.MapPost("/validate", Validate)
            .WithName("ValidateOnboardingRequest")
            .WithSummary("Check an onboarding request without creating it")
            .WithDescription("Runs the same validation as create and changes nothing. Use it to check arguments before creating.")
            .RequireAuthorization(Scopes.Write)
            .ProducesValidationProblem();

        requests.MapGet("/", List)
            .WithName("ListOnboardingRequests")
            .WithSummary("List onboarding requests, optionally by customer tax id")
            .WithDescription("Only requests of your organization. Useful to check whether a request already exists before creating one.")
            .RequireAuthorization(Scopes.Read);

        requests.MapGet("/{id}", Get)
            .WithName("GetOnboardingRequest")
            .WithSummary("Read an onboarding request and its status")
            .RequireAuthorization(Scopes.Read)
            .Produces<OnboardingRequestResource>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        requests.MapPatch("/{id}", Update)
            .WithName("UpdateOnboardingRequest")
            .WithSummary("Change the contact e-mail of an onboarding request")
            .WithDescription("Only contactEmail can be changed here. A plan change needs approval: sending plan returns 403 and nothing is changed.")
            .RequireAuthorization(Scopes.Write)
            .Produces<OnboardingRequestResource>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        requests.MapPost("/{id}/plan-change-requests", RequestPlanChange)
            .WithName("RequestPlanChange")
            .WithSummary("Ask an account manager to change the plan")
            .WithDescription("Does not change the plan. Creates a plan change request in pending_approval; a person approves or rejects it. Send an Idempotency-Key.")
            .RequireAuthorization(Scopes.PlanChangeRequest)
            .Produces<PlanChangeResource>(StatusCodes.Status202Accepted)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapGet("/v2/plan-change-requests/{id}", GetPlanChange)
            .WithTags("Onboarding requests")
            .WithName("GetPlanChangeRequest")
            .WithSummary("Read a plan change request and its status")
            .RequireAuthorization(Scopes.Read)
            .Produces<PlanChangeResource>()
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static IResult Create(
        CreateOnboardingRequest body,
        [FromHeader(Name = "Idempotency-Key"), Description("8 to 64 characters, unique per new request. Reuse it only to retry the same request.")] string? idempotencyKey,
        ClaimsPrincipal user, OnboardingStore store, IdempotencyStore idempotency, TimeProvider clock, HttpContext http)
    {
        if (idempotencyKey is not { Length: >= 8 and <= 64 }) return Problems.IdempotencyKeyMissing();
        if (BusinessErrors(body, clock) is { } errors) return TypedResults.ValidationProblem(errors);

        var tenant = user.TenantId();
        switch (idempotency.Begin(tenant, CreateOperation, idempotencyKey, IdempotencyStore.Fingerprint(body)))
        {
            case IdempotencyStore.Outcome.Mismatch:
                return Problems.IdempotencyKeyReused();
            case IdempotencyStore.Outcome.InProgress:
                return Problems.RequestInProgress(http);
            case IdempotencyStore.Outcome.Replay(var done):
                http.Response.Headers["Idempotent-Replayed"] = "true";
                http.Record($"replayed:{((OnboardingRequestResource)done.Body!).Id}");
                return TypedResults.Created(done.Location, (OnboardingRequestResource)done.Body!);
            case IdempotencyStore.Outcome.Started(var entry):
                var created = store.Create(tenant, body.CustomerLegalName.Trim(), body.CustomerTaxId, body.Plan!.Value, body.StartDate!.Value, body.ContactEmail.Trim());
                var resource = created.ToResource(clock.GetUtcNow());
                entry.Complete(StatusCodes.Status201Created, resource.Links.Self, resource);
                http.Record($"created:{created.PublicId}");
                return TypedResults.Created(resource.Links.Self, resource);
            default:
                throw new InvalidOperationException();
        }
    }

    private static Results<Ok<ValidationResult>, ValidationProblem> Validate(CreateOnboardingRequest body, TimeProvider clock) =>
        BusinessErrors(body, clock) is { } errors
            ? TypedResults.ValidationProblem(errors)
            : TypedResults.Ok(new ValidationResult(true, "Valid. Nothing was created; call CreateOnboardingRequest to create it."));

    private static Ok<OnboardingRequestResource[]> List(
        [Description("Filter by CNPJ, 14 digits.")] string? customerTaxId,
        ClaimsPrincipal user, OnboardingStore store, TimeProvider clock) =>
        TypedResults.Ok(store.List(user.TenantId())
            .Where(r => customerTaxId is null || r.CustomerTaxId == customerTaxId)
            .Select(r => r.ToResource(clock.GetUtcNow()))
            .ToArray());

    private static IResult Get(string id, ClaimsPrincipal user, OnboardingStore store, TimeProvider clock) =>
        store.FindById(user.TenantId(), id) is { } r
            ? TypedResults.Ok(r.ToResource(clock.GetUtcNow()))
            : Problems.NotFound("Onboarding request");

    private static IResult Update(string id, UpdateOnboardingRequest body, ClaimsPrincipal user, OnboardingStore store, TimeProvider clock, HttpContext http)
    {
        if (store.FindById(user.TenantId(), id) is not { } r) return Problems.NotFound("Onboarding request");
        if (body.Plan is not null)
        {
            http.Record($"plan_change_refused:{r.PublicId}");
            return Problems.PlanChangeRequiresApproval(r.PublicId);
        }
        if (body.ContactEmail is { Length: > 0 } email)
        {
            r.ContactEmail = email.Trim();
            http.Record($"email_updated:{r.PublicId}");
        }
        return TypedResults.Ok(r.ToResource(clock.GetUtcNow()));
    }

    private static IResult RequestPlanChange(
        string id,
        CreatePlanChangeRequest body,
        [FromHeader(Name = "Idempotency-Key"), Description("8 to 64 characters, unique per new request.")] string? idempotencyKey,
        ClaimsPrincipal user, OnboardingStore store, IdempotencyStore idempotency, HttpContext http)
    {
        var tenant = user.TenantId();
        if (store.FindById(tenant, id) is not { } r) return Problems.NotFound("Onboarding request");
        if (idempotencyKey is not { Length: >= 8 and <= 64 }) return Problems.IdempotencyKeyMissing();

        switch (idempotency.Begin(tenant, $"plan-change:{r.PublicId}", idempotencyKey, IdempotencyStore.Fingerprint(body)))
        {
            case IdempotencyStore.Outcome.Mismatch:
                return Problems.IdempotencyKeyReused();
            case IdempotencyStore.Outcome.InProgress:
                return Problems.RequestInProgress(http);
            case IdempotencyStore.Outcome.Replay(var done):
                http.Response.Headers["Idempotent-Replayed"] = "true";
                return TypedResults.Accepted(done.Location, (PlanChangeResource)done.Body!);
            case IdempotencyStore.Outcome.Started(var entry):
                var change = store.AddPlanChange(tenant, r.PublicId, body.Plan!.Value, body.Reason.Trim());
                var resource = change.ToResource();
                entry.Complete(StatusCodes.Status202Accepted, resource.Self, resource);
                http.Record($"plan_change_requested:{r.PublicId}:{change.PublicId}");
                return TypedResults.Accepted(resource.Self, resource);
            default:
                throw new InvalidOperationException();
        }
    }

    private static IResult GetPlanChange(string id, ClaimsPrincipal user, OnboardingStore store) =>
        store.FindPlanChange(user.TenantId(), id) is { } c ? TypedResults.Ok(c.ToResource()) : Problems.NotFound("Plan change request");

    /// <summary>Rules that need more than attributes. Same messages for create and validate.</summary>
    private static Dictionary<string, string[]>? BusinessErrors(CreateOnboardingRequest body, TimeProvider clock)
    {
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (body.StartDate is { } start && start < today)
            return new() { ["startDate"] = [$"Must be today or later (UTC). Today is {today:yyyy-MM-dd}; received {start:yyyy-MM-dd}."] };
        return null;
    }
}
