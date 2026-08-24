using HexMaster.Guestbook;
using HexMaster.Guestbook.Api.Endpoints;
using HexMaster.Guestbook.Data.CosmosDb;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.AddAzureCosmosClient("guestbook-cosmos");
builder.Services.AddGuestbookModule();
builder.Services.AddGuestbookCosmosDb(builder.Configuration);

var app = builder.Build();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapGuestbookEndpoints();

app.Run();
