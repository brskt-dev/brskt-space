namespace OnboardingApi.V2;

/// <summary>What a credential may do. Checked by the server on every call, whatever the caller believes.</summary>
public static class Scopes
{
    public const string Read = "onboarding:read";
    public const string Write = "onboarding:write";
    public const string PlanChangeRequest = "plan-change:request";
    public const string PlanChangeApply = "plan-change:apply";
}
