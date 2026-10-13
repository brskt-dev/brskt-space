using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace OnboardingApi.Tests;

/// <summary>These tests pass on purpose: they pin down the v1 behaviors the article discusses.</summary>
public class V1ContractTests
{
    [Fact]
    public async Task Retry_after_a_lost_response_creates_a_duplicate()
    {
        using var api = new Api("v1", dropFirstCreateResponse: true);
        var client = api.Client();

        await Assert.ThrowsAnyAsync<Exception>(() => client.PostAsJsonAsync("/v1/requests", Api.V1Body()));
        var retry = await client.PostAsJsonAsync("/v1/requests", Api.V1Body());

        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        Assert.Equal(2, (await client.GetFromJsonAsync<JsonElement[]>("/v1/requests") ?? []).Length);
    }

    [Fact]
    public async Task Plan_in_put_is_ignored_but_the_answer_is_200()
    {
        using var api = new Api("v1");
        var client = api.Client();
        var id = (await Api.Json(await client.PostAsJsonAsync("/v1/requests", Api.V1Body()))).GetProperty("id").GetInt32();

        var put = await client.PutAsJsonAsync($"/v1/requests/{id}", new { plan = 3 });

        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        Assert.Equal(2, (await Api.Json(put)).GetProperty("plan").GetInt32());
    }

    [Fact]
    public async Task Invalid_input_does_not_say_which_field()
    {
        using var api = new Api("v1");
        var body = new { name = "Padaria Exemplo Ltda", doc = "11.222.333/0001-81", plan = 2, start = "2026-12-01", email = "ana@exemplo.test" };

        var response = await api.Client().PostAsJsonAsync("/v1/requests", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("""{"error":"Invalid data"}""", await response.Content.ReadAsStringAsync());
    }
}
