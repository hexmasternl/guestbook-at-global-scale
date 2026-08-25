# syntax=docker/dockerfile:1

# --- Build stage: compile the API ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
RUN dotnet publish src/HexMaster.Guestbook.Api/HexMaster.Guestbook.Api.csproj \
    -c Release -o /app/publish

# --- Final runtime image ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

# Run as the non-root user baked into the .NET base image (APP_UID / user "app"),
# so the container never runs under a privileged (root) account.
USER $APP_UID

ENTRYPOINT ["dotnet", "HexMaster.Guestbook.Api.dll"]
