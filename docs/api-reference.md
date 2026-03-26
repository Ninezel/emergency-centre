# API Reference

Emergency Centre now ships with a small optional Node API service. It is intended for:

- starter coverage catalog browsing
- postcode and ZIP lookup
- built-in live briefing endpoints backed by official providers
- built-in demo briefing endpoints
- local health checks

The default local base URL is:

- `http://localhost:8787`

## Endpoints

### `GET /api`

Returns a small discovery document with the exposed routes.

### `GET /api/health`

Returns:

```json
{
  "ok": true,
  "service": "emergency-centre-api",
  "timestamp": "2026-03-26T14:00:00.000Z"
}
```

### `GET /api/catalog/countries`

Returns the built-in starter countries.

### `GET /api/catalog/regions?country=GB`

Returns built-in regions for one country code.

Query params:

- `country`: optional country code such as `GB` or `US`

### `GET /api/catalog/zones?country=GB&region=greater-london`

Returns built-in starter zones filtered by country and optional region.

Query params:

- `country`: optional country code
- `region`: optional region code

### `GET /api/catalog/lookup?q=SW1A%201AA&country=GB`

Looks up starter zones by UK postcode, US ZIP, alias, place, region, or country name.

Query params:

- `q`: required search text
- `country`: optional country code to narrow the results

### `GET /api/catalog/zones/:zoneId`

Returns one built-in starter zone by ID.

### `GET /api/briefings/live/:zoneId`

Returns a normalized live briefing for one starter zone.

Current starter-provider coverage:

- `US`: NWS forecast plus active alerts, with nearby USGS earthquakes
- `GB` England starter zones: Met Office forecast plus warnings, Environment Agency flood warnings, and nearby USGS earthquakes
- `GB` Wales, Scotland, and Northern Ireland starter zones: Met Office forecast plus warnings, with nearby USGS earthquakes

### `GET /api/briefings/demo/:zoneId`

Returns a normalized demo briefing for one starter zone.

This route still exists as a fallback if you want a deterministic local feed without upstream calls.

## Development

Run the client and API together:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm install
npm run dev
```

Run only the API:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm run dev:api
```

Build both layers:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm run build
```

Run the compiled API server:

```powershell
npm run start:api
```

That command resolves to:

- `node dist-server/server/index.js`

## Runtime Notes

- live starter-zone routes use a small in-memory cache to avoid hammering upstream providers during polling
- provider adapters are allowlisted in code; the API does not fetch arbitrary user-supplied upstream URLs
- the built-in live routes are meant as a starter operational layer, not a replacement for region-specific verification and local adapters

## Security Notes

- The current API does not implement auth.
- The current API does not implement rate limiting.
- The current API does not act as a generic open proxy.
- The built-in live route uses allowlisted official providers only.
- If you add more upstream fetching later, keep the targets allowlisted and documented.
