using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace OnboardingApi.Shared;

/// <summary>A demo credential: which tenant it belongs to and what it may do.</summary>
public sealed class DemoKey
{
    public string Key { get; set; } = "";
    public string KeyId { get; set; } = "";
    public string TenantId { get; set; } = "";
    public string[] Scopes { get; set; } = [];
}

public sealed class DemoKeysOptions
{
    public List<DemoKey> Keys { get; set; } = [];
}

/// <summary>
/// API keys mapped to a tenant and scopes. Enough to show server-side authorization in a demo;
/// a real system would use short-lived tokens (for example OAuth 2.0 client credentials).
/// </summary>
public sealed class ApiKeyHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IOptions<DemoKeysOptions> keys)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiKey";
    public const string Header = "X-Api-Key";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(Header, out var provided) || string.IsNullOrWhiteSpace(provided))
            return Task.FromResult(AuthenticateResult.NoResult());

        var key = keys.Value.Keys.FirstOrDefault(k => k.Key == provided.ToString());
        if (key is null)
            return Task.FromResult(AuthenticateResult.Fail("Unknown API key."));

        var claims = new List<Claim>
        {
            new("key_id", key.KeyId),
            new("tenant_id", key.TenantId),
        };
        claims.AddRange(key.Scopes.Select(s => new Claim("scope", s)));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}

public static class ClaimsPrincipalExtensions
{
    public static string TenantId(this ClaimsPrincipal user) =>
        user.FindFirstValue("tenant_id") ?? throw new InvalidOperationException("Authenticated user without tenant.");

    public static string KeyId(this ClaimsPrincipal user) => user.FindFirstValue("key_id") ?? "anonymous";
}
