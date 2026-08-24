# HexMaster.Guestbook.Api

## IP-based location fallback (GeoLite2-Country)

`POST /greet` resolves an approximate `lat`/`lng` from the client's IP address when the
request omits coordinates. This uses a MaxMind GeoLite2-Country database, read from the
path configured at `Guestbook:GeoIp:DatabasePath`.

- **Deployed image**: the Dockerfile downloads `GeoLite2-Country.mmdb` at build time
  (see `Dockerfile`) using a `MAXMIND_LICENSE_KEY` build secret, and copies it to
  `/app/geoip/GeoLite2-Country.mmdb` — the default configured in `appsettings.json`.
  Get a free license key at <https://www.maxmind.com/en/geolite2/signup>. Whichever
  CI/CD pipeline builds this image (none exists in this repo yet) must supply
  `MAXMIND_LICENSE_KEY` as a build secret/argument (e.g. `docker build --secret` or a
  pipeline secret variable) — never commit the key or the downloaded `.mmdb` file to
  source control.
- **Local development (Aspire / `dotnet run` / F5)**: no Docker build step runs, so the
  configured path won't exist by default. Either:
  - download `GeoLite2-Country.mmdb` yourself (e.g. via `geoipupdate` or a manual
    download from your MaxMind account) and set `Guestbook:GeoIp:DatabasePath` to its
    local path in `appsettings.Development.json` or user secrets, or
  - leave it unset/pointing at a missing file — resolution safely falls back to a fixed
    `(0, 0)` sentinel and logs a warning; it never fails the request or API startup.
