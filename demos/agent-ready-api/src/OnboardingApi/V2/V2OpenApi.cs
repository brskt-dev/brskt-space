using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace OnboardingApi.V2;

public static class V2OpenApi
{
    public static void Configure(OpenApiOptions options)
    {
        options.AddDocumentTransformer((document, _, _) =>
        {
            document.Info = new OpenApiInfo
            {
                Title = "Onboarding requests API",
                Version = "v2",
                Description = """
                    Fictional API for customer onboarding requests (demo with synthetic data).
                    Errors use Problem Details (RFC 9457): read `type` and `detail` before retrying.
                    Retry only 409 (same Idempotency-Key and body) and 5xx; 400, 403, 404 and 422 need a change, not a retry.
                    Every response has an X-Correlation-Id header; quote it when asking for support.
                    """,
            };
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes["ApiKey"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.ApiKey,
                In = ParameterLocation.Header,
                Name = "X-Api-Key",
                Description = "Key issued per integration. Each key belongs to one organization and has scopes: onboarding:read, onboarding:write, plan-change:request. plan-change:apply is never given to integrations.",
            };
            document.Security = [new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("ApiKey", document)] = [] }];
            return Task.CompletedTask;
        });

        // The handlers take the header as string? so they can answer a missing key with their own
        // Problem Details (with guidance) instead of the framework's generic 400. The document must
        // still say the header is required; the first version of v2 did not, and a review caught it.
        options.AddOperationTransformer((operation, _, _) =>
        {
            foreach (var parameter in operation.Parameters?.OfType<OpenApiParameter>() ?? [])
                if (parameter.In == ParameterLocation.Header && parameter.Name == "Idempotency-Key")
                    parameter.Required = true;
            return Task.CompletedTask;
        });

        // C# needs Plan? and DateOnly? so [Required] can catch a missing field, but null is never valid.
        // Without this, the document would tell callers that null is allowed. Runs on the finished
        // document, after the generator has created the shared component schemas.
        options.AddDocumentTransformer((document, _, _) =>
        {
            foreach (var schema in document.Components?.Schemas?.Values.OfType<OpenApiSchema>() ?? [])
            {
                schema.Enum?.Remove(schema.Enum.FirstOrDefault(v => v is null)!);
                if (schema.Required is null || schema.Properties is null) continue;
                foreach (var name in schema.Required)
                {
                    if (!schema.Properties.TryGetValue(name, out var property) || property is not OpenApiSchema p) continue;
                    if (p.Type is { } type && type.HasFlag(JsonSchemaType.Null)) p.Type = type & ~JsonSchemaType.Null;
                    if (p.OneOf is { Count: 2 } oneOf && oneOf.FirstOrDefault(o => o.Type == JsonSchemaType.Null) is { } nullBranch)
                        schema.Properties[name] = oneOf.First(o => !ReferenceEquals(o, nullBranch));
                }
            }
            return Task.CompletedTask;
        });
    }
}
