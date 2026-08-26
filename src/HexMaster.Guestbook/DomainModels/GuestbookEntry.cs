using HexMaster.Guestbook.Core;

namespace HexMaster.Guestbook.DomainModels;

public sealed class GuestbookEntry
{
    private const int MaxMessageLength = 280;

    public Guid Id { get; }
    public string Message { get; }

    /// <summary>
    /// Latitude of the entry's origin, or <c>null</c> when the location is unknown — the
    /// visitor did not share GPS coordinates and the server could not approximate one from
    /// their IP address either. Always <c>null</c> together with <see cref="Lng"/>.
    /// </summary>
    public double? Lat { get; }

    /// <summary>Longitude of the entry's origin, or <c>null</c> when the location is unknown. See <see cref="Lat"/>.</summary>
    public double? Lng { get; }

    /// <summary>
    /// <c>false</c> when this entry has no location at all ("unknown"). Deliberately preferred
    /// over storing a fabricated <c>(0, 0)</c>, which is a real place in the Gulf of Guinea and
    /// would be indistinguishable from a genuine coordinate.
    /// </summary>
    public bool HasLocation => Lat.HasValue && Lng.HasValue;

    /// <summary>Cosmos DB partition key. Seeded from the handling region so writes stay partition-aligned.</summary>
    public string Region { get; }

    /// <summary>
    /// Azure region of the backend instance that served the create request — the entry's
    /// provenance, and the proof of which datacenter handled it.
    /// </summary>
    /// <remarks>
    /// Deliberately separate from <see cref="Region"/> even though both start out holding the same
    /// value: <see cref="Region"/> is an immutable Cosmos partition key that may be repartitioned
    /// (the plan floats <c>/id</c> as an alternative), whereas this value must survive that and keep
    /// meaning "the backend that handled this request".
    /// </remarks>
    public string HandledByRegion { get; }

    public DateTimeOffset Ts { get; }

    private GuestbookEntry(
        Guid id,
        string message,
        double? lat,
        double? lng,
        string region,
        string handledByRegion,
        DateTimeOffset ts)
    {
        Id = id;
        Message = message;
        Lat = lat;
        Lng = lng;
        Region = region;
        HandledByRegion = handledByRegion;
        Ts = ts;
    }

    /// <summary>
    /// Creates a new entry. <paramref name="lat"/>/<paramref name="lng"/> are optional and must
    /// be supplied together: both <c>null</c> means the origin is unknown, which is a valid entry.
    /// </summary>
    public static GuestbookEntry Create(string message, double? lat, double? lng, string handledByRegion)
    {
        if (string.IsNullOrWhiteSpace(message))
            throw new DomainException("Message must not be empty.");

        if (message.Length > MaxMessageLength)
            throw new DomainException($"Message must not exceed {MaxMessageLength} characters.");

        if (lat.HasValue != lng.HasValue)
            throw new DomainException("Lat and Lng must both be present, or both absent (unknown location).");

        if (lat is < -90 or > 90)
            throw new DomainException("Lat must be between -90 and 90.");

        if (lng is < -180 or > 180)
            throw new DomainException("Lng must be between -180 and 180.");

        if (string.IsNullOrWhiteSpace(handledByRegion))
            throw new DomainException("Region must not be empty.");

        return new GuestbookEntry(
            Guid.NewGuid(),
            message,
            lat,
            lng,
            handledByRegion,
            handledByRegion,
            DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Reconstructs a previously persisted entry from storage without re-applying
    /// creation-time invariants (id and timestamp are already assigned). A half-present
    /// coordinate pair is normalized to "unknown" so the both-or-neither invariant still
    /// holds for anything read back out of storage.
    /// </summary>
    public static GuestbookEntry Restore(
        Guid id,
        string message,
        double? lat,
        double? lng,
        string region,
        string handledByRegion,
        DateTimeOffset ts) =>
        lat.HasValue && lng.HasValue
            ? new(id, message, lat, lng, region, handledByRegion, ts)
            : new(id, message, null, null, region, handledByRegion, ts);
}
