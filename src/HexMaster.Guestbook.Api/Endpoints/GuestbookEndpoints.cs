using HexMaster.Guestbook.Abstractions.DataTransferObjects;
using HexMaster.Guestbook.Api.RateLimiting;
using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.Features.CreateGuestbookEntry;
using HexMaster.Guestbook.Features.ListGuestbookEntries;
using Microsoft.AspNetCore.RateLimiting;

namespace HexMaster.Guestbook.Api.Endpoints;

public static class GuestbookEndpoints
{
    public static IEndpointRouteBuilder MapGuestbookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/greet")
            .WithTags("Guestbook")
            .WithOpenApi();

        group.MapPost("/", CreateGuestbookEntry)
            .WithName("CreateGuestbookEntry")
            .RequireRateLimiting(RateLimitPartitions.CreateGreetingPolicy)
            .Produces<GuestbookEntryDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        app.MapGet("/greetings", ListGuestbookEntries)
            .WithName("ListGuestbookEntries")
            .WithTags("Guestbook")
            .WithOpenApi()
            .Produces<ListGuestbookEntriesResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem();

        return app;
    }

    private static async Task<IResult> CreateGuestbookEntry(
        CreateGuestbookEntryRequest request,
        ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult> handler,
        CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Message))
            errors["message"] = ["Message must not be empty."];

        if (request.Lat is < -90 or > 90)
            errors["lat"] = ["Lat must be between -90 and 90."];

        if (request.Lng is < -180 or > 180)
            errors["lng"] = ["Lng must be between -180 and 180."];

        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var command = new CreateGuestbookEntryCommand(request.Message, request.Lat, request.Lng);
        var result = await handler.Handle(command, ct);

        var dto = new GuestbookEntryDto(result.Id, result.Message, result.Lat, result.Lng, result.Region, result.Ts);
        return Results.Created($"/greetings/{result.Id}", dto);
    }

    private static async Task<IResult> ListGuestbookEntries(
        string? pageSize,
        string? continuationToken,
        IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult> handler,
        CancellationToken ct)
    {
        if (!GuestbookPageSizeResolver.TryResolve(pageSize, out var effectivePageSize, out var error))
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["pageSize"] = [error!] });

        var query = new ListGuestbookEntriesQuery(effectivePageSize, continuationToken);
        var result = await handler.Handle(query, ct);

        var dtos = result.Entries
            .Select(e => new GuestbookEntryDto(e.Id, e.Message, e.Lat, e.Lng, e.Region, e.Ts))
            .ToList();

        var response = new ListGuestbookEntriesResponse(dtos, result.ContinuationToken);
        return Results.Ok(response);
    }
}
