using System.Threading.RateLimiting;
using HexMaster.Guestbook;
using HexMaster.Guestbook.Api.Endpoints;
using HexMaster.Guestbook.Api.RateLimiting;
using HexMaster.Guestbook.Data.CosmosDb;
using Microsoft.AspNetCore.RateLimiting;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var corsAllowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
const string CorsPolicyName = "GuestbookFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        if (corsAllowedOrigins.Length > 0)
        {
            policy.WithOrigins(corsAllowedOrigins)
                .WithMethods("GET", "POST")
                .WithHeaders("Content-Type");
        }
    });
});

builder.AddAzureCosmosClient("guestbook-cosmos");
builder.Services.AddGuestbookModule(builder.Configuration);
builder.Services.AddGuestbookCosmosDb(builder.Configuration);

// Per-instance request throttling (System.Threading.RateLimiting / Microsoft.AspNetCore.RateLimiting).
// Each regional instance enforces its own limits independently, so this does not introduce any
// shared/server-local session state that would violate the API's statelessness requirement.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Default policy applied to every request: a generous per-client-IP fixed window.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            RateLimitPartitions.ResolveClientKey(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));

    // Stricter policy for the write endpoint (POST /greet) to protect Cosmos DB write throughput.
    options.AddPolicy(RateLimitPartitions.CreateGreetingPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            RateLimitPartitions.ResolveClientKey(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));
});

var app = builder.Build();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.UseCors(CorsPolicyName);

app.UseRateLimiter();

app.MapGuestbookEndpoints();

app.Run();
