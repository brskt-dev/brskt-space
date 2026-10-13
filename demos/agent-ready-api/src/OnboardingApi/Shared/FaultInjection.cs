using System.Collections.Concurrent;

namespace OnboardingApi.Shared;

/// <summary>Which API keys already had their first create response dropped.</summary>
public sealed class FaultState
{
    public ConcurrentDictionary<string, bool> Dropped { get; } = new();
}

/// <summary>
/// Experiment only: the first create request of each API key is saved and then the connection
/// is cut before the response goes out. From the client side it looks like a timeout after
/// the server already did the work. Off unless "Faults:DropFirstCreateResponse" is true.
/// Handlers persist everything (including idempotency records) before returning, so cutting
/// the connection here loses only the response.
/// </summary>
public sealed class DropFirstCreateResponse(IConfiguration config, FaultState state) : IEndpointFilter
{
    private readonly bool _enabled = config.GetValue<bool>("Faults:DropFirstCreateResponse");

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var result = await next(context);
        var http = context.HttpContext;
        var succeeded = result is IStatusCodeHttpResult { StatusCode: >= 200 and < 300 };
        if (_enabled && succeeded && http.User.Identity?.IsAuthenticated == true && state.Dropped.TryAdd(http.User.KeyId(), true))
        {
            http.Record("fault:response_dropped_after_commit");
            http.Abort();
            return Results.Empty;
        }
        return result;
    }
}
