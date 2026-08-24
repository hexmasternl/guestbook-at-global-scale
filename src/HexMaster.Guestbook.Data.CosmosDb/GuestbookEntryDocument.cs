using Newtonsoft.Json;

namespace HexMaster.Guestbook.Data.CosmosDb;

/// <summary>
/// Flat Cosmos DB document shape for a guestbook entry, matching the schema
/// described in storyline/demo-app-plan.md.
/// </summary>
/// <remarks>
/// Uses Newtonsoft.Json property names because the Cosmos SDK's default
/// <see cref="Microsoft.Azure.Cosmos.CosmosClient"/> serializer is Newtonsoft-based,
/// not System.Text.Json.
/// </remarks>
public sealed class GuestbookEntryDocument
{
    [JsonProperty("id")]
    public required string Id { get; init; }

    [JsonProperty("message")]
    public required string Message { get; init; }

    [JsonProperty("lat")]
    public required double Lat { get; init; }

    [JsonProperty("lng")]
    public required double Lng { get; init; }

    [JsonProperty("region")]
    public required string Region { get; init; }

    [JsonProperty("ts")]
    public required DateTimeOffset Ts { get; init; }
}
