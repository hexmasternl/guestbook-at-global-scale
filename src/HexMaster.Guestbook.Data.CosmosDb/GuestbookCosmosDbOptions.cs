namespace HexMaster.Guestbook.Data.CosmosDb;

public sealed class GuestbookCosmosDbOptions
{
    public string DatabaseName { get; set; } = "guestbook";

    public string ContainerName { get; set; } = "entries";
}
