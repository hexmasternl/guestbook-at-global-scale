using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.Features.CreateGuestbookEntry;
using HexMaster.Guestbook.Features.ListGuestbookEntries;
using HexMaster.Guestbook.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HexMaster.Guestbook;

public static class GuestbookModuleRegistration
{
    public static IServiceCollection AddGuestbookModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult>, CreateGuestbookEntryCommandHandler>();
        services.AddScoped<IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>, ListGuestbookEntriesQueryHandler>();
        services.AddSingleton<IGuestbookRegionProvider, ConfigurationGuestbookRegionProvider>();
        // IP → location is resolved from the embedded Resources/GeoIp.csv.gz dataset,
        // decompressed and parsed once into an in-memory lookup (no external database or download).
        services.AddSingleton<IClientLocationResolver, CsvClientLocationResolver>();

        return services;
    }
}
