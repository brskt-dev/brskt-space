using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OnboardingMcp;

// An MCP server (stdio) that exposes a few tools backed by the onboarding API v2.
// It adds no rule of its own: validation, scopes and approvals stay in the API.
var builder = Host.CreateApplicationBuilder(args);

// stdout carries the MCP messages, so logs go to stderr.
builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace);

builder.Services.AddHttpClient<OnboardingApiClient>(http =>
{
    http.BaseAddress = new Uri(builder.Configuration["OnboardingApi:BaseUrl"] ?? "http://127.0.0.1:5102");
    // The key comes from this server's configuration. The model never sees it and cannot pick another one.
    http.DefaultRequestHeaders.Add("X-Api-Key",
        builder.Configuration["OnboardingApi:ApiKey"] ?? throw new InvalidOperationException("Set OnboardingApi:ApiKey."));
});

builder.Services.AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<OnboardingTools>();

await builder.Build().RunAsync();
