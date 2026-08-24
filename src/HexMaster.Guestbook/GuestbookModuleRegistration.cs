using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.Features.CreateGuestbookEntry;
using HexMaster.Guestbook.Features.ListGuestbookEntries;
using HexMaster.Guestbook.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HexMaster.Guestbook;

public static class GuestbookModuleRegistration
{
    public static IServiceCollection AddGuestbookModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult>, CreateGuestbookEntryCommandHandler>();
        services.AddScoped<IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>, ListGuestbookEntriesQueryHandler>();
        services.AddSingleton<IGuestbookRegionProvider, ConfigurationGuestbookRegionProvider>();
        services.AddSingleton<IClientLocationResolver>(provider =>
            new MaxMindClientLocationResolver(
                configuration["Guestbook:GeoIp:DatabasePath"],
                provider.GetRequiredService<ILogger<MaxMindClientLocationResolver>>()));

        return services;
    }
}
