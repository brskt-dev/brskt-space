using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Authorization.Policy;

namespace OnboardingApi.V2;

/// <summary>
/// v2 only: when a credential lacks a scope, say which one (403 with Problem Details)
/// instead of an empty 403. Knowing the missing scope helps whoever operates the client;
/// it does not grant anything.
/// </summary>
public sealed class ScopeProblemHandler(IProblemDetailsService problems) : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult result)
    {
        if (result.Forbidden)
        {
            var scopes = policy.Requirements.OfType<ClaimsAuthorizationRequirement>()
                .Where(r => r.ClaimType == "scope")
                .SelectMany(r => r.AllowedValues ?? [])
                .ToArray();
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await problems.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status403Forbidden,
                    Type = "https://example.com/problems/missing-scope",
                    Title = "Your credentials do not allow this operation.",
                    Detail = "Nothing was changed. Ask whoever manages this integration for the scope below; retrying will not help.",
                    Extensions = { ["requiredScope"] = scopes },
                },
            });
            return;
        }
        await _default.HandleAsync(next, context, policy, result);
    }
}
