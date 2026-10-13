using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using ModelContextProtocol;

namespace OnboardingMcp;

public sealed class OnboardingApiClient(HttpClient http)
{
    /// <summary>
    /// Sends the request and returns the response body. A non-2xx answer becomes a tool error
    /// carrying the Problem Details, so the model reads the same explanation a developer would.
    /// </summary>
    public async Task<string> SendAsync(HttpMethod method, string path, object? body, string? idempotencyKey, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null) request.Content = JsonContent.Create(body);
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);

        using var response = await http.SendAsync(request, ct);
        var text = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new McpException($"HTTP {(int)response.StatusCode}: {text}");
        return text;
    }

    /// <summary>
    /// Same arguments, same key. If the tool made a new key per call, a model that retries after a
    /// timeout would create a second request. Trade-off: two identical requests within the key's
    /// retention window count as one.
    /// </summary>
    public static string IdempotencyKey(string operation, object arguments) =>
        $"{operation}-{Convert.ToHexStringLower(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(arguments)))[..40]}";
}
