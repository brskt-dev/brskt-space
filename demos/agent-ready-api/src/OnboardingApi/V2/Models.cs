using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using OnboardingApi.Shared;

namespace OnboardingApi.V2;

public sealed record CreateOnboardingRequest(
    [property: Description("Customer's registered legal name.")]
    [property: Required, StringLength(120, MinimumLength = 3)]
    string CustomerLegalName,

    [property: Description("Customer's CNPJ: exactly 14 digits, no dots, slash or dash. Example: 45723174000110.")]
    [property: Required, RegularExpression(@"^\d{14}$", ErrorMessage = "Use exactly 14 digits, without dots, slash or dash. Example: 45723174000110.")]
    string CustomerTaxId,

    [property: Description("Plan the customer starts on.")]
    [property: Required(ErrorMessage = "Required. Use one of: basic, pro, enterprise.")]
    Plan? Plan,

    [property: Description("First day of service, as an ISO 8601 date (YYYY-MM-DD). Today or later, in UTC.")]
    [property: Required(ErrorMessage = "Required. Use an ISO 8601 date: YYYY-MM-DD.")]
    DateOnly? StartDate,

    [property: Description("Who receives onboarding updates.")]
    [property: Required, EmailAddress]
    string ContactEmail);

public sealed record UpdateOnboardingRequest(
    [property: Description("New contact e-mail. The only field this endpoint changes.")]
    [property: EmailAddress]
    string? ContactEmail,

    [property: Description("Not changeable here. Sending it returns 403 with the operation to request a plan change.")]
    Plan? Plan);

public sealed record CreatePlanChangeRequest(
    [property: Description("Plan to move to after approval.")]
    [property: Required(ErrorMessage = "Required. Use one of: basic, pro, enterprise.")]
    Plan? Plan,

    [property: Description("Why the change is needed. Shown to the account manager who approves it.")]
    [property: Required, StringLength(300, MinimumLength = 5)]
    string Reason);

public sealed record OnboardingRequestResource(
    [property: Description("Stable id. Use it to read the request and its status.")] string Id,
    [property: Description("Where the request is now.")] OnboardingStatus Status,
    [property: Description("What the status means and whether the customer has to do anything.")] string StatusDescription,
    string CustomerLegalName,
    string CustomerTaxId,
    Plan Plan,
    DateOnly StartDate,
    string ContactEmail,
    DateTimeOffset CreatedAt,
    OnboardingLinks Links);

public sealed record OnboardingLinks(string Self, string PlanChangeRequests);

public sealed record PlanChangeResource(
    string Id,
    string OnboardingRequestId,
    Plan RequestedPlan,
    [property: Description("pending_approval until an account manager decides. The onboarding request keeps its current plan meanwhile.")] string Status,
    string StatusDescription,
    DateTimeOffset CreatedAt,
    string Self);

public sealed record ValidationResult(bool Valid, string Message);

public static class Mapping
{
    public static OnboardingRequestResource ToResource(this OnboardingRequest r, DateTimeOffset now)
    {
        var status = r.StatusAt(now);
        return new(
            r.PublicId,
            status,
            Describe(status),
            r.CustomerLegalName,
            r.CustomerTaxId,
            r.Plan,
            r.StartDate,
            r.ContactEmail,
            r.CreatedAt,
            new($"/v2/onboarding-requests/{r.PublicId}", $"/v2/onboarding-requests/{r.PublicId}/plan-change-requests"));
    }

    public static PlanChangeResource ToResource(this PlanChangeRequest c) => new(
        c.PublicId,
        c.OnboardingRequestId,
        c.RequestedPlan,
        "pending_approval",
        "Waiting for an account manager. The onboarding request keeps its current plan until this is approved.",
        c.CreatedAt,
        $"/v2/plan-change-requests/{c.PublicId}");

    public static string Describe(OnboardingStatus status) => status switch
    {
        OnboardingStatus.Received => "Received. Nothing to do yet; review starts automatically.",
        OnboardingStatus.InReview => "Being reviewed by the onboarding team. Nothing to do now.",
        OnboardingStatus.WaitingCustomer => "Waiting for the customer to send missing documents.",
        OnboardingStatus.Approved => "Approved. The customer can start on the start date.",
        OnboardingStatus.Rejected => "Rejected. See the reason sent to the contact e-mail.",
        _ => status.ToString(),
    };
}
