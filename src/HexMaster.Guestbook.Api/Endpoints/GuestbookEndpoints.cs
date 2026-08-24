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
            .WithTags("Guestbook");

        group.MapPost("/", CreateGuestbookEntry)
            .WithName("CreateGuestbookEntry")
            .RequireRateLimiting(RateLimitPartitions.CreateGreetingPolicy)
            .Produces<GuestbookEntryDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        app.MapGet("/greetings", ListGuestbookEntries)
            .WithName("ListGuestbookEntries")
            .WithTags("Guestbook")
            .Produces<ListGuestbookEntriesResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem();

        return app;
    }

    private static async Task<IResult> CreateGuestbookEntry(
        CreateGuestbookEntryRequest request,
        HttpContext httpContext,
        ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult> handler,
        CancellationToken ct)
    {
        if (!CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors))
            return Results.ValidationProblem(errors);

        var clientIp = ClientIpResolver.Resolve(httpContext);
        var command = new CreateGuestbookEntryCommand(request.Message, request.Lat, request.Lng, clientIp);
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
