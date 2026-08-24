using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.Features.CreateGuestbookEntry;
using HexMaster.Guestbook.Features.ListGuestbookEntries;
using HexMaster.Guestbook.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HexMaster.Guestbook;

public static class GuestbookModuleRegistration
{
    public static IServiceCollection AddGuestbookModule(this IServiceCollection services)
    {
        services.AddScoped<ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult>, CreateGuestbookEntryCommandHandler>();
        services.AddScoped<IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>, ListGuestbookEntriesQueryHandler>();
        services.AddSingleton<IGuestbookRegionProvider, ConfigurationGuestbookRegionProvider>();

        return services;
    }
}
