using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using OnboardingApi.Shared;
using OnboardingApi.V1;
using OnboardingApi.V2;

var builder = WebApplication.CreateBuilder(args);

// One process serves one contract, so the experiment can point an agent at v1 or v2 only.
var contract = builder.Configuration["Contract"] is "v1" ? "v1" : "v2";

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<OnboardingStore>();
builder.Services.AddSingleton<IdempotencyStore>();
builder.Services.AddSingleton<AuditLog>();
builder.Services.AddSingleton<FaultState>();
builder.Services.Configure<DemoKeysOptions>(builder.Configuration.GetSection("DemoKeys"));

builder.Services.AddAuthentication(ApiKeyHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, ApiKeyHandler>(ApiKeyHandler.SchemeName, null);
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Scopes.Read, p => p.RequireClaim("scope", Scopes.Read))
    .AddPolicy(Scopes.Write, p => p.RequireClaim("scope", Scopes.Write))
    .AddPolicy(Scopes.PlanChangeRequest, p => p.RequireClaim("scope", Scopes.PlanChangeRequest));

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower)));
builder.Services.AddOpenApi(contract, options =>
{
    if (contract == "v2") V2OpenApi.Configure(options);
});

if (contract == "v2")
{
    builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = V2ProblemDetails.Customize);
    // Let JSON read errors reach the exception handler, so they become a Problem Details with the field.
    builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
    builder.Services.Configure<ExceptionHandlerOptions>(o =>
        o.StatusCodeSelector = ex => ex is BadHttpRequestException bad ? bad.StatusCode : StatusCodes.Status500InternalServerError);
    builder.Services.AddValidation();
    builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ScopeProblemHandler>();
}

var app = builder.Build();

// Outermost, so the audit line sees the final status code, including the ones the exception
// handler writes (a first version logged 200 for a body that could not be read).
app.UseAudit(contract);

if (contract == "v2")
{
    app.UseExceptionHandler();
    app.UseStatusCodePages();
    app.Use((context, next) =>
    {
        context.Response.Headers["X-Correlation-Id"] = context.CorrelationId();
        return next(context);
    });
}

app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi();

if (contract == "v1") app.MapV1();
else app.MapV2();

app.Run();

public partial class Program;
