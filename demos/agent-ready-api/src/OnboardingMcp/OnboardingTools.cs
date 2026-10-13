using System.ComponentModel;
using ModelContextProtocol.Server;

namespace OnboardingMcp;

/// <summary>
/// What the model is offered. There is deliberately no tool to apply a plan change:
/// the model can only ask for one, and a person approves it.
/// </summary>
[McpServerToolType]
public sealed class OnboardingTools(OnboardingApiClient api)
{
    [McpServerTool(Name = "create_onboarding_request", Title = "Create onboarding request", Destructive = false, Idempotent = true, OpenWorld = false)]
    [Description("Creates one onboarding request. Calling it again with the same arguments returns the same request, so it is safe to retry after a timeout. Returns the request with its id and status.")]
    public Task<string> CreateOnboardingRequest(
        [Description("Customer's registered legal name.")] string customerLegalName,
        [Description("CNPJ with exactly 14 digits, no punctuation. Example: 45723174000110.")] string customerTaxId,
        [Description("One of: basic, pro, enterprise.")] string plan,
        [Description("First day of service, YYYY-MM-DD, today or later.")] string startDate,
        [Description("Contact e-mail for onboarding updates.")] string contactEmail,
        CancellationToken ct)
    {
        var body = new { customerLegalName, customerTaxId, plan, startDate, contactEmail };
        return api.SendAsync(HttpMethod.Post, "/v2/onboarding-requests", body, OnboardingApiClient.IdempotencyKey("create", body), ct);
    }

    [McpServerTool(Name = "get_onboarding_request", Title = "Read onboarding request", ReadOnly = true, OpenWorld = false)]
    [Description("Reads an onboarding request and its status. Use it to confirm the result of a change before reporting it.")]
    public Task<string> GetOnboardingRequest(
        [Description("Id returned when the request was created, like onb_1a2b3c4d5e.")] string id,
        CancellationToken ct) =>
        api.SendAsync(HttpMethod.Get, $"/v2/onboarding-requests/{Uri.EscapeDataString(id)}", null, null, ct);

    [McpServerTool(Name = "request_plan_change", Title = "Request plan change", Destructive = false, Idempotent = true, OpenWorld = false)]
    [Description("Asks an account manager to change the plan. It does NOT change the plan: the result stays pending_approval until a person decides.")]
    public Task<string> RequestPlanChange(
        [Description("Onboarding request id, like onb_1a2b3c4d5e.")] string id,
        [Description("One of: basic, pro, enterprise.")] string plan,
        [Description("Why the customer needs the change. Shown to the approver.")] string reason,
        CancellationToken ct)
    {
        var body = new { plan, reason };
        return api.SendAsync(HttpMethod.Post, $"/v2/onboarding-requests/{Uri.EscapeDataString(id)}/plan-change-requests",
            body, OnboardingApiClient.IdempotencyKey($"plan-{id}", body), ct);
    }
}
