using System.Globalization;
using System.Security.Claims;
using OnboardingApi.Shared;

namespace OnboardingApi.V1;

/// <summary>
/// Version 1: the contract as it grew around a web form. It works for that form:
/// the form knows the plan ids, masks the tax id, sends dates as yyyy-MM-dd,
/// shows "try again" on a network error and has no plan field on the edit screen.
/// </summary>
public static class V1Endpoints
{
    public sealed record CreateBody(string? Name, string? Doc, int Plan, string? Start, string? Email);

    public sealed record UpdateBody(string? Email, int? Plan);

    public static void MapV1(this WebApplication app)
    {
        var api = app.MapGroup("/v1").RequireAuthorization();

        api.MapGet("/plans", () => Enum.GetValues<Plan>().Select(p => new { id = (int)p, n = p.ToString() }));

        api.MapGet("/requests", (ClaimsPrincipal user, OnboardingStore store, TimeProvider clock) =>
            store.List(user.TenantId()).Select(r => new { id = r.Number, name = r.CustomerLegalName, st = (int)r.StatusAt(clock.GetUtcNow()) }));

        api.MapGet("/requests/{id:int}", (int id, ClaimsPrincipal user, OnboardingStore store, TimeProvider clock) =>
            store.FindByNumber(user.TenantId(), id) is { } r ? Results.Ok(Full(r, clock)) : Results.NotFound());

        api.MapPost("/requests", (CreateBody body, ClaimsPrincipal user, OnboardingStore store, TimeProvider clock, HttpContext http) =>
        {
            if (!IsValid(body, clock, out var start))
                return Results.BadRequest(new { error = "Invalid data" });

            var r = store.Create(user.TenantId(), body.Name!.Trim(), body.Doc!, (Plan)body.Plan, start, body.Email!.Trim());
            http.Record($"created:{r.PublicId}");
            return Results.Ok(new { id = r.Number, st = (int)r.StatusAt(clock.GetUtcNow()) });
        }).AddEndpointFilter<DropFirstCreateResponse>();

        api.MapPut("/requests/{id:int}", (int id, UpdateBody body, ClaimsPrincipal user, OnboardingStore store, TimeProvider clock, HttpContext http) =>
        {
            if (store.FindByNumber(user.TenantId(), id) is not { } r) return Results.NotFound();

            // The edit form only has the e-mail field. Plan changes are done by account managers
            // in the back office, so anything else in the body is ignored.
            if (body.Email is { Length: > 0 } email)
            {
                r.ContactEmail = email.Trim();
                http.Record($"email_updated:{r.PublicId}");
            }
            if (body.Plan is not null) http.Record($"plan_ignored:{r.PublicId}");

            return Results.Ok(Full(r, clock));
        });
    }

    private static object Full(OnboardingRequest r, TimeProvider clock) => new
    {
        id = r.Number,
        name = r.CustomerLegalName,
        doc = r.CustomerTaxId,
        plan = (int)r.Plan,
        start = r.StartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        email = r.ContactEmail,
        st = (int)r.StatusAt(clock.GetUtcNow()),
    };

    private static bool IsValid(CreateBody b, TimeProvider clock, out DateOnly start)
    {
        start = default;
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        return !string.IsNullOrWhiteSpace(b.Name)
            && b.Doc is { Length: 14 } && b.Doc.All(char.IsAsciiDigit)
            && Enum.IsDefined((Plan)b.Plan)
            && DateOnly.TryParseExact(b.Start, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out start)
            && start >= today
            && b.Email is { } e && e.Contains('@');
    }
}
