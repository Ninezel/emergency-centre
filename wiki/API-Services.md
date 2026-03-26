# API Services

Emergency Centre includes an optional local Node API service.

Default local origin:

- `http://localhost:8787`

## What It Is For

- exposing starter coverage catalog data
- looking up built-in zones by postcode, ZIP, alias, place, region, or country
- serving normalized live briefings from official providers
- serving normalized demo briefings as a fallback
- giving self-hosters a simple backend baseline to extend

## What It Is Not

- not an auth server
- not a persistence layer
- not a generic open proxy
- not a secrets vault for arbitrary providers

## Step-By-Step: Run The API

1. Open the repository root.
2. Install dependencies with `npm install`.
3. Start the API only with `npm run dev:api`.
4. Open `http://localhost:8787/api/health`.
5. Confirm you get a JSON response with `"ok": true`.

## Step-By-Step: Run Frontend And API Together

1. Install dependencies with `npm install`.
2. Start both services with `npm run dev`.
3. Open the frontend URL shown by Vite.
4. Use the setup panel starter directory.
5. Load a built-in zone without a custom feed URL to use the live provider API endpoint automatically.

## Endpoints

### `GET /api`

Returns a small discovery document.

### `GET /api/health`

Returns the health response for the local API.

### `GET /api/catalog/countries`

Returns the built-in starter countries.

### `GET /api/catalog/regions?country=GB`

Returns starter regions for one country code.

### `GET /api/catalog/zones?country=GB&region=greater-london`

Returns starter zones for a country and optional region code.

### `GET /api/catalog/lookup?q=SW1A%201AA&country=GB`

Looks up starter zones by:

- UK postcode
- US ZIP
- alias
- place name
- region
- country

### `GET /api/catalog/zones/:zoneId`

Returns one built-in starter zone by ID.

### `GET /api/briefings/live/:zoneId`

Returns a normalized live briefing for the requested starter zone using the built-in provider adapters.

### `GET /api/briefings/demo/:zoneId`

Returns a normalized demo briefing for the requested starter zone.

## Environment Variables

- `EC_API_PORT`
- `EC_API_ORIGIN`

See `.env.example` in the main repository.

## Extension Guidance

If you extend the API:

- keep routes explicit
- keep upstream providers allowlisted
- document every new endpoint
- do not add a generic user-supplied proxy route
