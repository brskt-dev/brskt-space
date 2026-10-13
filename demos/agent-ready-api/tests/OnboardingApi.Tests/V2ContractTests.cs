using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace OnboardingApi.Tests;

public class V2ContractTests
{
    private const string Requests = "/v2/onboarding-requests";

    [Fact]
    public async Task Retry_with_same_key_and_body_returns_the_original_and_creates_once()
    {
        using var api = new Api("v2");
        var client = api.Client();

        var first = await client.SendAsync(Api.Post(Requests, Api.V2Body(), "retry-key-0001"));
        var second = await client.SendAsync(Api.Post(Requests, Api.V2Body(), "retry-key-0001"));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        Assert.Equal("true", second.Headers.GetValues("Idempotent-Replayed").Single());
        Assert.Equal((await Api.Json(first)).GetProperty("id").GetString(), (await Api.Json(second)).GetProperty("id").GetString());
        Assert.Single(await client.GetFromJsonAsync<JsonElement[]>(Requests) ?? []);
    }

    [Fact]
    public async Task Same_key_with_a_different_body_is_refused_and_creates_nothing_new()
    {
        using var api = new Api("v2");
        var client = api.Client();

        await client.SendAsync(Api.Post(Requests, Api.V2Body("pro"), "reuse-key-0001"));
        var reused = await client.SendAsync(Api.Post(Requests, Api.V2Body("enterprise"), "reuse-key-0001"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, reused.StatusCode);
        Assert.EndsWith("/idempotency-key-reused", (await Api.Json(reused)).GetProperty("type").GetString());
        Assert.Single(await client.GetFromJsonAsync<JsonElement[]>(Requests) ?? []);
    }

    [Fact]
    public async Task Concurrent_requests_with_the_same_key_create_one_request()
    {
        using var api = new Api("v2");
        var client = api.Client();

        var responses = await Task.WhenAll(Enumerable.Range(0, 10)
            .Select(_ => client.SendAsync(Api.Post(Requests, Api.V2Body(), "parallel-key-0001"))));

        Assert.All(responses, r => Assert.True(r.StatusCode is HttpStatusCode.Created or HttpStatusCode.Conflict, r.StatusCode.ToString()));
        Assert.Single(await client.GetFromJsonAsync<JsonElement[]>(Requests) ?? []);
    }

    [Fact]
    public async Task Lost_response_then_retry_with_same_key_finds_the_request_instead_of_duplicating_it()
    {
        using var api = new Api("v2", dropFirstCreateResponse: true);
        var client = api.Client();

        await Assert.ThrowsAnyAsync<Exception>(() => client.SendAsync(Api.Post(Requests, Api.V2Body(), "lost-key-0001")));
        var retry = await client.SendAsync(Api.Post(Requests, Api.V2Body(), "lost-key-0001"));

        Assert.Equal(HttpStatusCode.Created, retry.StatusCode);
        Assert.Equal("true", retry.Headers.GetValues("Idempotent-Replayed").Single());
        Assert.Single(await client.GetFromJsonAsync<JsonElement[]>(Requests) ?? []);
    }

    [Fact]
    public async Task Failure_before_the_effect_frees_the_key_for_a_retry()
    {
        using var api = new Api("v2", failFirstCreate: true);
        var client = api.Client();

        var failed = await client.SendAsync(Api.Post(Requests, Api.V2Body(), "fail-key-0001"));
        var retry = await client.SendAsync(Api.Post(Requests, Api.V2Body(), "fail-key-0001"));

        Assert.Equal(HttpStatusCode.InternalServerError, failed.StatusCode);
        Assert.Equal(HttpStatusCode.Created, retry.StatusCode);
        Assert.Single(await client.GetFromJsonAsync<JsonElement[]>(Requests) ?? []);
    }

    [Fact]
    public async Task Validation_errors_use_the_json_field_name()
    {
        using var api = new Api("v2");
        var response = await api.Client().SendAsync(Api.Post(Requests, Api.V2Body(taxId: "11.222.333/0001-81"), "invalid-key-0001"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await Api.Json(response)).GetProperty("errors");
        Assert.True(errors.TryGetProperty("customerTaxId", out _), errors.ToString());
    }

    [Fact]
    public async Task Unknown_enum_value_names_the_field()
    {
        using var api = new Api("v2");
        var response = await api.Client().SendAsync(Api.Post(Requests, Api.V2Body(plan: "premium"), "enum-key-0001"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("plan", (await Api.Json(response)).GetProperty("field").GetString());
    }

    [Fact]
    public async Task Audit_log_records_the_final_status_of_a_rejected_body()
    {
        var path = Path.Combine(Path.GetTempPath(), $"audit-{Guid.NewGuid():N}.jsonl");
        using (var api = new Api("v2", auditLogPath: path))
            await api.Client().SendAsync(Api.Post(Requests, Api.V2Body(plan: "premium"), "audit-key-0001"));

        var entry = JsonDocument.Parse(File.ReadLines(path).Last()).RootElement.GetProperty("entry");
        File.Delete(path);
        Assert.Equal(400, entry.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Plan_change_through_patch_is_refused_and_nothing_changes()
    {
        using var api = new Api("v2");
        var client = api.Client();
        var created = await Api.Json(await client.SendAsync(Api.Post(Requests, Api.V2Body("pro"), "patch-key-0001")));
        var id = created.GetProperty("id").GetString();

        var patch = await client.PatchAsJsonAsync($"{Requests}/{id}", new { plan = "enterprise", contactEmail = "novo@exemplo.test" });
        var after = await client.GetFromJsonAsync<JsonElement>($"{Requests}/{id}");

        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
        Assert.EndsWith("/plan-change-requires-approval", (await Api.Json(patch)).GetProperty("type").GetString());
        Assert.Equal("pro", after.GetProperty("plan").GetString());
        Assert.Equal("ana@exemplo.test", after.GetProperty("contactEmail").GetString());
    }

    [Fact]
    public async Task Plan_change_request_waits_for_a_person_and_keeps_the_plan()
    {
        using var api = new Api("v2");
        var client = api.Client();
        var created = await Api.Json(await client.SendAsync(Api.Post(Requests, Api.V2Body("pro"), "pcr-create-0001")));
        var id = created.GetProperty("id").GetString();

        var change = await client.SendAsync(Api.Post($"{Requests}/{id}/plan-change-requests", new { plan = "enterprise", reason = "Pedido do cliente." }, "pcr-key-0001"));
        var after = await client.GetFromJsonAsync<JsonElement>($"{Requests}/{id}");

        Assert.Equal(HttpStatusCode.Accepted, change.StatusCode);
        Assert.Equal("pending_approval", (await Api.Json(change)).GetProperty("status").GetString());
        Assert.Equal("pro", after.GetProperty("plan").GetString());
    }

    [Fact]
    public async Task Another_tenant_cannot_see_the_request()
    {
        using var api = new Api("v2");
        var created = await Api.Json(await api.Client().SendAsync(Api.Post(Requests, Api.V2Body(), "tenant-key-0001")));

        var response = await api.Client(Api.OtherTenantKey).GetAsync($"{Requests}/{created.GetProperty("id").GetString()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Missing_scope_says_which_one_and_creates_nothing()
    {
        using var api = new Api("v2");
        var response = await api.Client(Api.ReadOnlyKey).SendAsync(Api.Post(Requests, Api.V2Body(), "scope-key-0001"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("onboarding:write", (await Api.Json(response)).GetProperty("requiredScope")[0].GetString());
        Assert.Empty(await api.Client().GetFromJsonAsync<JsonElement[]>(Requests) ?? []);
    }

    [Fact]
    public async Task Openapi_document_describes_enum_pattern_and_responses()
    {
        using var api = new Api("v2");
        var doc = await api.Client().GetFromJsonAsync<JsonElement>("/openapi/v2.json");
        var schemas = doc.GetProperty("components").GetProperty("schemas");
        var create = schemas.GetProperty("CreateOnboardingRequest").GetProperty("properties");

        Assert.Equal(@"^\d{14}$", create.GetProperty("customerTaxId").GetProperty("pattern").GetString());
        Assert.Equal(["basic", "pro", "enterprise"], schemas.GetProperty("Plan").GetProperty("enum").EnumerateArray().Select(e => e.GetString()));
        var post = doc.GetProperty("paths").GetProperty(Requests).GetProperty("post");
        var key = post.GetProperty("parameters").EnumerateArray().Single(p => p.GetProperty("name").GetString() == "Idempotency-Key");
        Assert.True(key.GetProperty("required").GetBoolean());
        var responses = post.GetProperty("responses");
        Assert.True(responses.TryGetProperty("201", out _));
        Assert.True(responses.TryGetProperty("422", out _));
    }
}
