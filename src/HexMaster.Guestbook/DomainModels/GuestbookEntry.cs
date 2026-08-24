using HexMaster.Guestbook.Core;

namespace HexMaster.Guestbook.DomainModels;

public sealed class GuestbookEntry
{
    private const int MaxMessageLength = 280;

    public Guid Id { get; }
    public string Message { get; }
    public double Lat { get; }
    public double Lng { get; }
    public string Region { get; }
    public DateTimeOffset Ts { get; }

    private GuestbookEntry(Guid id, string message, double lat, double lng, string region, DateTimeOffset ts)
    {
        Id = id;
        Message = message;
        Lat = lat;
        Lng = lng;
        Region = region;
        Ts = ts;
    }

    public static GuestbookEntry Create(string message, double lat, double lng, string region)
    {
        if (string.IsNullOrWhiteSpace(message))
            throw new DomainException("Message must not be empty.");

        if (message.Length > MaxMessageLength)
            throw new DomainException($"Message must not exceed {MaxMessageLength} characters.");

        if (lat is < -90 or > 90)
            throw new DomainException("Lat must be between -90 and 90.");

        if (lng is < -180 or > 180)
            throw new DomainException("Lng must be between -180 and 180.");

        if (string.IsNullOrWhiteSpace(region))
            throw new DomainException("Region must not be empty.");

        return new GuestbookEntry(Guid.NewGuid(), message, lat, lng, region, DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Reconstructs a previously persisted entry from storage without re-applying
    /// creation-time invariants (id and timestamp are already assigned).
    /// </summary>
    public static GuestbookEntry Restore(Guid id, string message, double lat, double lng, string region, DateTimeOffset ts) =>
        new(id, message, lat, lng, region, ts);
}
