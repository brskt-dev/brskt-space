using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using OnboardingApi.Shared;

namespace OnboardingApi.Tests;

/// <summary>A fresh in-memory API per test, serving one contract.</summary>
public sealed class Api : IDisposable
{
    public const string AcmeKey = "demo-key-acme-0001";
    public const string OtherTenantKey = "demo-key-other-0002";
    public const string ReadOnlyKey = "demo-key-readonly-0003";

    private readonly WebApplicationFactory<Program> _factory;

    public Api(string contract, bool dropFirstCreateResponse = false, string? auditLogPath = null, bool failFirstCreate = false)
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("Contract", contract)
             .UseSetting("Faults:DropFirstCreateResponse", dropFirstCreateResponse.ToString());
            if (auditLogPath is not null) b.UseSetting("AuditLogPath", auditLogPath);
            if (failFirstCreate)
                b.ConfigureTestServices(s => s.AddSingleton<OnboardingStore>(sp => new FailsFirstCreate(sp.GetRequiredService<TimeProvider>())));
        });
    }

    /// <summary>Throws on the first create, before anything is saved.</summary>
    private sealed class FailsFirstCreate(TimeProvider clock) : OnboardingStore(clock)
    {
        private int _calls;

        public override OnboardingRequest Create(string tenantId, string legalName, string taxId, Plan plan, DateOnly startDate, string email) =>
            Interlocked.Increment(ref _calls) == 1
                ? throw new InvalidOperationException("Simulated failure before the effect.")
                : base.Create(tenantId, legalName, taxId, plan, startDate, email);
    }

    public HttpClient Client(string apiKey = AcmeKey)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
        return client;
    }

    public void Dispose() => _factory.Dispose();

    public static object V2Body(string plan = "pro", string taxId = "11222333000181") => new
    {
        customerLegalName = "Padaria Exemplo Ltda",
        customerTaxId = taxId,
        plan,
        startDate = DateTime.UtcNow.Date.AddDays(7).ToString("yyyy-MM-dd"),
        contactEmail = "ana@exemplo.test",
    };

    public static object V1Body() => new
    {
        name = "Padaria Exemplo Ltda",
        doc = "11222333000181",
        plan = 2,
        start = DateTime.UtcNow.Date.AddDays(7).ToString("yyyy-MM-dd"),
        email = "ana@exemplo.test",
    };

    public static HttpRequestMessage Post(string url, object body, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return request;
    }

    public static async Task<JsonElement> Json(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();
}
