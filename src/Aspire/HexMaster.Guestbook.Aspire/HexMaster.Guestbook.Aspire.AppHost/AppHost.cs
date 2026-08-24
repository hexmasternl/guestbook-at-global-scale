var builder = DistributedApplication.CreateBuilder(args);

var cosmos = builder.AddAzureCosmosDB("guestbook-cosmos")
    .RunAsEmulator(emulator => emulator.WithDataVolume());
var database = cosmos.AddCosmosDatabase("guestbook", databaseName: "guestbook");
database.AddContainer("entries", "/region");

builder.AddProject<Projects.HexMaster_Guestbook_Api>("hexmaster-guestbook-api")
    .WithReference(cosmos);

builder.Build().Run();
