using System.Text.Json;

namespace OnboardingApi.Shared;

/// <summary>
/// One JSON line per request: who (key id, never the key), what, result and effect.
/// No API keys, no e-mail addresses, no tax ids. Used to evaluate the agent experiment.
/// </summary>
public sealed class AuditLog(IConfiguration config, TimeProvider clock)
{
    private readonly string? _path = config["AuditLogPath"];
    private readonly Lock _gate = new();

    public void Write(object entry)
    {
        if (_path is null) return;
        var line = JsonSerializer.Serialize(new { at = clock.GetUtcNow(), entry });
        lock (_gate) File.AppendAllText(_path, line + Environment.NewLine);
    }
}

/// <summary>Collects what an endpoint did, so the audit line can say it.</summary>
public sealed class AuditEffect
{
    public List<string> Effects { get; } = [];
}

public static class AuditMiddleware
{
    public static IApplicationBuilder UseAudit(this IApplicationBuilder app, string contract) =>
        app.Use(async (context, next) =>
        {
            var effect = new AuditEffect();
            context.Features.Set(effect);
            var aborted = false;
            try
            {
                await next(context);
            }
            finally
            {
                aborted = context.RequestAborted.IsCancellationRequested;
                var audit = context.RequestServices.GetRequiredService<AuditLog>();
                audit.Write(new
                {
                    contract,
                    keyId = context.User.Identity?.IsAuthenticated == true ? context.User.KeyId() : null,
                    method = context.Request.Method,
                    path = context.Request.Path.Value,
                    query = context.Request.QueryString.Value,
                    idempotencyKey = context.Request.Headers["Idempotency-Key"].ToString() is { Length: > 0 } k ? k : null,
                    status = context.Response.StatusCode,
                    responseDropped = aborted,
                    effects = effect.Effects,
                    correlationId = context.CorrelationId(),
                });
            }
        });

    public static void Record(this HttpContext context, string effect) =>
        context.Features.Get<AuditEffect>()?.Effects.Add(effect);

    /// <summary>The W3C trace id of the request: same value in the response header, error bodies and logs.</summary>
    public static string CorrelationId(this HttpContext context) =>
        System.Diagnostics.Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
}
