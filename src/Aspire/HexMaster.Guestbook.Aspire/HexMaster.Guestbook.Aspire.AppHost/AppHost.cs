var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.HexMaster_Guestbook_Api>("hexmaster-guestbook-api");

builder.Build().Run();
