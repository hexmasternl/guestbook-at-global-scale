using Bogus;
using HexMaster.Guestbook.DomainModels;

namespace HexMaster.Guestbook.Tests.Factories;

/// <summary>
/// Generates realistic, valid guestbook entry inputs using Bogus.
/// </summary>
public static class GuestbookEntryFaker
{
    private static readonly Faker Faker = new();

    public static (string Message, double Lat, double Lng) CreateValidInput()
    {
        Randomizer.Seed = new Random(1234);

        var message = Faker.Lorem.Sentence(6);
        var lat = Faker.Address.Latitude();
        var lng = Faker.Address.Longitude();

        return (message, lat, lng);
    }

    /// <summary>
    /// Creates a list of persisted-looking <see cref="GuestbookEntry"/> instances
    /// with distinct, descending <c>Ts</c> values (newest first), suitable for asserting
    /// list-ordering behavior.
    /// </summary>
    public static List<GuestbookEntry> CreateOrderedEntries(int count, string region = "westeurope")
    {
        Randomizer.Seed = new Random(1234);
        var now = DateTimeOffset.UtcNow;

        var entries = new List<GuestbookEntry>(count);
        for (var i = 0; i < count; i++)
        {
            var ts = now.AddMinutes(-i);
            entries.Add(GuestbookEntry.Restore(
                Guid.NewGuid(),
                Faker.Lorem.Sentence(6),
                Faker.Address.Latitude(),
                Faker.Address.Longitude(),
                region,
                ts));
        }

        return entries;
    }
}
