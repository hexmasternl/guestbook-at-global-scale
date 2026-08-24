using HexMaster.Guestbook.Core;

namespace HexMaster.Guestbook.Features.ListGuestbookEntries;

public sealed class ListGuestbookEntriesQueryHandler(IGuestbookEntryRepository repository)
    : IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>
{
    public async Task<ListGuestbookEntriesResult> Handle(ListGuestbookEntriesQuery query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);

        var page = await repository.ListAsync(query.PageSize, query.ContinuationToken, ct);

        return new ListGuestbookEntriesResult(page.Entries, page.ContinuationToken);
    }
}
