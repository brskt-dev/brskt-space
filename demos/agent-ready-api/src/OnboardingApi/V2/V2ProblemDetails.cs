using System.Text.Json;
using OnboardingApi.Shared;

namespace OnboardingApi.V2;

/// <summary>
/// Two fixes found while testing v2 itself:
/// 1. validation errors came keyed by C# property name ("CustomerTaxId") while the JSON uses "customerTaxId";
/// 2. a value the JSON reader rejects (plan "Pro", date "20/10/2026") came back as a bare 400 "Bad Request".
/// </summary>
public static class V2ProblemDetails
{
    public static void Customize(ProblemDetailsContext c)
    {
        c.ProblemDetails.Extensions["correlationId"] = c.HttpContext.CorrelationId();

        if (c.ProblemDetails is HttpValidationProblemDetails validation)
        {
            var renamed = validation.Errors.ToDictionary(e => JsonNamingPolicy.CamelCase.ConvertName(e.Key), e => e.Value);
            validation.Errors.Clear();
            foreach (var (key, value) in renamed) validation.Errors[key] = value;
        }

        if (c.Exception is BadHttpRequestException { InnerException: JsonException json })
        {
            var field = json.Path is { Length: > 2 } path ? path.TrimStart('$', '.') : "body";
            c.ProblemDetails.Type = "https://example.com/problems/unreadable-field";
            c.ProblemDetails.Title = "A field has a value or format this operation does not accept.";
            c.ProblemDetails.Detail = $"Check '{field}' against the schema in /openapi/v2.json (allowed values and formats). Nothing was created.";
            c.ProblemDetails.Extensions["field"] = field;
        }
    }
}
