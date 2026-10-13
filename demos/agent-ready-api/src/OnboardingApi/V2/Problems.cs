namespace OnboardingApi.V2;

/// <summary>
/// Problem Details (RFC 9457) used by v2. Each type says what happened and what the
/// caller can do next, without internals (no stack traces, table names or other tenants' data).
/// </summary>
public static class Problems
{
    private const string Base = "https://example.com/problems/";

    public static IResult IdempotencyKeyMissing() => TypedResults.Problem(
        statusCode: StatusCodes.Status400BadRequest,
        type: Base + "idempotency-key-missing",
        title: "Idempotency-Key header is required.",
        detail: "Send an Idempotency-Key header with 8 to 64 characters (a UUID works). Reuse the same key when you retry this same request.");

    public static IResult IdempotencyKeyReused() => TypedResults.Problem(
        statusCode: StatusCodes.Status422UnprocessableEntity,
        type: Base + "idempotency-key-reused",
        title: "This Idempotency-Key was used with a different request.",
        detail: "Nothing was created. Use a new key for a new request, or send exactly the same body to retry the original one.");

    public static IResult RequestInProgress(HttpContext http)
    {
        http.Response.Headers.RetryAfter = "1";
        return TypedResults.Problem(
            statusCode: StatusCodes.Status409Conflict,
            type: Base + "request-in-progress",
            title: "A request with this Idempotency-Key is still being processed.",
            detail: "Wait and retry with the same key and body; you will get the original result.");
    }

    public static IResult NotFound(string what) => TypedResults.Problem(
        statusCode: StatusCodes.Status404NotFound,
        type: Base + "not-found",
        title: $"{what} not found.",
        detail: "Check the id. You only see resources that belong to your organization.");

    public static IResult PlanChangeRequiresApproval(string onboardingRequestId) => TypedResults.Problem(
        statusCode: StatusCodes.Status403Forbidden,
        type: Base + "plan-change-requires-approval",
        title: "Changing the plan needs approval by an account manager.",
        detail: "No changes were applied. Your credentials can request a plan change, not apply it.",
        extensions: new Dictionary<string, object?>
        {
            ["requiredScope"] = Scopes.PlanChangeApply,
            ["allowedAction"] = new { method = "POST", href = $"/v2/onboarding-requests/{onboardingRequestId}/plan-change-requests" },
        });
}
