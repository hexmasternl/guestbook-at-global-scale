# syntax=docker/dockerfile:1

# --- Build stage: compile the API ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
RUN dotnet publish src/HexMaster.Guestbook.Api/HexMaster.Guestbook.Api.csproj \
    -c Release -o /app/publish

# --- GeoIP stage: download the GeoLite2-Country database ---
# Requires a MAXMIND_LICENSE_KEY build secret (free account at
# https://www.maxmind.com/en/geolite2/signup). Never bake the key or the downloaded
# database into source control — only into this build stage / the final image.
FROM curlimages/curl:8.11.0 AS geoip
ARG MAXMIND_LICENSE_KEY
WORKDIR /geoip

RUN curl -sSL \
    "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz" \
    -o GeoLite2-Country.tar.gz \
    && tar -xzf GeoLite2-Country.tar.gz \
    && find . -name "GeoLite2-Country.mmdb" -exec mv {} GeoLite2-Country.mmdb \; \
    && rm GeoLite2-Country.tar.gz

# --- Final runtime image ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .
COPY --from=geoip /geoip/GeoLite2-Country.mmdb /app/geoip/GeoLite2-Country.mmdb

ENTRYPOINT ["dotnet", "HexMaster.Guestbook.Api.dll"]
