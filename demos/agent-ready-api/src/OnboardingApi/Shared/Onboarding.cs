namespace OnboardingApi.Shared;

/// <summary>Plans a customer can start on. Synthetic data for the demo.</summary>
public enum Plan
{
    Basic = 1,
    Pro = 2,
    Enterprise = 3,
}

/// <summary>Where an onboarding request is. Each state has one meaning and a next step.</summary>
public enum OnboardingStatus
{
    Received,
    InReview,
    WaitingCustomer,
    Approved,
    Rejected,
}

public sealed class OnboardingRequest
{
    public required int Number { get; init; }
    public required string PublicId { get; init; }
    public required string TenantId { get; init; }
    public required string CustomerLegalName { get; init; }
    public required string CustomerTaxId { get; init; }
    public required Plan Plan { get; set; }
    public required DateOnly StartDate { get; init; }
    public required string ContactEmail { get; set; }
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// The demo has no back office, so the status moves on its own:
    /// a request stays "received" for 20 seconds and then goes to "in review".
    /// </summary>
    public OnboardingStatus StatusAt(DateTimeOffset now) =>
        now - CreatedAt < TimeSpan.FromSeconds(20) ? OnboardingStatus.Received : OnboardingStatus.InReview;
}

public sealed class PlanChangeRequest
{
    public required string PublicId { get; init; }
    public required string TenantId { get; init; }
    public required string OnboardingRequestId { get; init; }
    public required Plan RequestedPlan { get; init; }
    public required string Reason { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}
