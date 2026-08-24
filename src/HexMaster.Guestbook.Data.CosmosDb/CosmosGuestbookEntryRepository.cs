using HexMaster.Guestbook.DomainModels;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Options;

namespace HexMaster.Guestbook.Data.CosmosDb;

public sealed class CosmosGuestbookEntryRepository : IGuestbookEntryRepository
{
    private readonly Container _container;

    public CosmosGuestbookEntryRepository(CosmosClient cosmosClient, IOptions<GuestbookCosmosDbOptions> options)
    {
        var settings = options.Value;
        _container = cosmosClient.GetContainer(settings.DatabaseName, settings.ContainerName);
    }

    public async Task AddAsync(GuestbookEntry entry, CancellationToken ct)
    {
        var document = new GuestbookEntryDocument
        {
            Id = entry.Id.ToString(),
            Message = entry.Message,
            Lat = entry.Lat,
            Lng = entry.Lng,
            Region = entry.Region,
            Ts = entry.Ts
        };

        await _container.CreateItemAsync(document, new PartitionKey(document.Region), cancellationToken: ct);
    }

    public async Task<GuestbookEntryPage> ListAsync(int pageSize, string? continuationToken, CancellationToken ct)
    {
        var query = new QueryDefinition("SELECT * FROM c ORDER BY c.ts DESC");

        using var iterator = _container.GetItemQueryIterator<GuestbookEntryDocument>(
            query,
            continuationToken,
            new QueryRequestOptions { MaxItemCount = pageSize });

        var page = await iterator.ReadNextAsync(ct);
        var entries = page.Select(ToDomainEntry).ToList();
        var nextToken = iterator.HasMoreResults ? page.ContinuationToken : null;

        return new GuestbookEntryPage(entries, nextToken);
    }

    private static GuestbookEntry ToDomainEntry(GuestbookEntryDocument document) =>
        GuestbookEntry.Restore(Guid.Parse(document.Id), document.Message, document.Lat, document.Lng, document.Region, document.Ts);
}
