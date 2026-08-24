using HexMaster.Guestbook;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HexMaster.Guestbook.Data.CosmosDb;

public static class CosmosDbRegistration
{
    public static IServiceCollection AddGuestbookCosmosDb(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<GuestbookCosmosDbOptions>(configuration.GetSection("Guestbook:CosmosDb"));
        services.AddScoped<IGuestbookEntryRepository, CosmosGuestbookEntryRepository>();

        return services;
    }
}
