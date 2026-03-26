# Emergency Centre

Emergency Centre is an open-source web application for monitoring live public signals across configurable coverage areas. It is designed for storms, flooding, earthquakes, wildfire pressure, air-quality incidents, transport disruption, infrastructure issues, airspace advisories, missing-person bulletins, and other public-safety signals.

The project is intentionally:

- public by default
- self-hostable
- feed-driven rather than vendor-locked
- usable without mandatory login

[Support ongoing development on Ko-Fi](https://ko-fi.com/ninezel)

## What It Does

Emergency Centre lets a deployment define one or more coverage areas and connect each one to a live JSON briefing feed.

Each coverage record includes:

- a public-facing place name
- region and country metadata
- location codes such as postcodes, ZIP codes, or other local code systems
- aliases or address hints for search
- coordinates for the coverage record
- a live briefing endpoint

The application stores that configuration locally in the browser, polls the configured feeds, and renders a public monitoring surface for weather, signals, public briefings, source health, and readiness actions.

The open-source core now also ships with a built-in starter directory for a first set of countries:

- `United Kingdom`
- `United States`

Users can load a built-in coverage zone into the setup form by selecting:

1. country
2. region or state
3. coverage area

They can also jump to a built-in zone by typing a UK postcode or US ZIP code.

The repository now includes a small Node API service for:

- starter coverage catalog endpoints
- postcode and ZIP lookup endpoints
- live briefing endpoints for built-in coverage zones backed by official providers
- demo briefing endpoints as a fallback for built-in coverage zones
- local health checks and API discovery

## Core Capabilities

- coverage search by postcode, ZIP code, city, district, alias, or code
- country, region, and coverage-area browsing for configured feeds
- built-in UK and US starter directory for coverage setup
- postcode and ZIP lookup against the built-in starter directory
- optional local API server for starter catalog, live provider, and demo fallback routes
- live polling for configured briefing feeds
- browser sound alerts when new live signals appear
- optional browser notifications for new live signals after permission is granted
- freshness-aware live briefings with stale snapshot fallback during provider refresh failures
- source, bulletin, and signal links back to official upstream pages when available
- metric or imperial display preference
- built-in setup tutorial and in-app feed-schema reference
- manual feed refresh and sound test controls
- multi-signal, weather, public-briefing, source-health, and readiness panels
- parser fixtures and automated tests for provider normalization
- open-source baseline with no mandatory login

## Operating Model

Emergency Centre does not ship with bundled live signal data.

Instead:

1. A user configures a coverage area in the setup section.
2. The coverage area points to a live JSON briefing endpoint.
3. The browser polls that endpoint on the configured interval.
4. The selected coverage area is rendered into the monitoring interface.
5. Search and directory selection operate only on the configured coverage records.

This keeps the core application generic and self-hostable while allowing each deployment to choose its own trusted data sources.

## Quick Start

```powershell
cd g:\Projects\emergency-centre
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm install
npm run dev
```

This starts both:

- the Vite client
- the local API server on `http://localhost:8787`

Create a production build with:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm run build
```

Run parser and snapshot tests with:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm test
```

Run the compiled API server with:

```powershell
node dist-server/server/index.js
```

Useful local API endpoints:

- `GET /api`
- `GET /api/health`
- `GET /api/catalog/countries`
- `GET /api/catalog/regions?country=GB`
- `GET /api/catalog/zones?country=GB&region=greater-london`
- `GET /api/catalog/lookup?q=SW1A%201AA&country=GB`
- `GET /api/briefings/live/gb-eng-greater-london-central`
- `GET /api/briefings/demo/gb-eng-greater-london-central`

The starter zones now default to `/api/briefings/live/:zoneId` when the briefing URL field is left blank.
Those live routes currently normalize official provider data from:

- `NWS` weather forecasts and alerts for United States starter zones
- `Met Office` forecast pages and regional warning RSS feeds for United Kingdom starter zones
- `Environment Agency` flood warnings for England starter zones
- `USGS` daily earthquake feeds for nearby seismic activity

If an upstream refresh fails after a successful sync, the live route can return a clearly labeled stale snapshot while retrying providers in the background.

## Feed Requirements

Each coverage area must point to a JSON briefing feed. The minimum required response fields are:

- `outlook`
- `weather`

The recommended full contract is documented in [docs/feed-schema.md](./docs/feed-schema.md).

Preferred optional fields:

- `signals`
- `news`
- `sources`
- `actions`
- `freshness`

Legacy compatibility:

- `hazards` is still accepted as an alias for `signals` so older feeds do not break immediately

Important constraints:

- do not expose private API keys in a client-visible feed URL
- use a proxy or edge adapter if the upstream provider needs secrets
- use a proxy if the upstream does not allow browser access
- keep signal IDs stable so new-alert sound detection works correctly
- expose provenance where possible through `link`, `method`, `fetchedAt`, and `freshness`

## Documentation

- [Changelog](./CHANGELOG.md)
- [Architecture notes](./docs/architecture.md)
- [API reference](./docs/api-reference.md)
- [Feature reference](./docs/feature-reference.md)
- [Developer guide](./docs/developer-guide.md)
- [Feed schema](./docs/feed-schema.md)
- [Security model](./docs/security-model.md)
- [Contributing guide](./CONTRIBUTING.md)

## Repository Layout

- `src/App.tsx`: top-level application shell and state orchestration
- `src/components/`: UI surfaces for overview, coverage selection, setup, signals, and supporting information
- `src/data/coverageCatalogData.ts`: shared built-in UK and US starter coverage data
- `src/lib/location.ts`: coverage matching, suggestion ranking, and selection helpers
- `src/lib/coverageCatalog.ts`: built-in UK and US coverage starter directory plus postcode and ZIP lookup helpers
- `src/lib/briefing.ts`: briefing assembly for the selected coverage area
- `src/lib/feed.ts`: live feed fetching and baseline response validation
- `src/lib/setup.ts`: local setup persistence and coverage profile hydration
- `src/lib/alertSync.ts`: live-signal diffing and sync summary helpers
- `src/lib/audio.ts`: browser signal sound playback
- `src/lib/notifications.ts`: browser notification permission and delivery helpers
- `src/lib/units.ts`: display-layer unit conversion for weather output
- `server/services/briefingSnapshotStore.ts`: last-known-good stale snapshot handling for live briefings
- `server/services/providers/`: allowlisted upstream adapters and shared parsing helpers
- `server/`: Node API entrypoint plus catalog, live-provider, and demo-briefing services
- `tests/`: provider parser fixtures and snapshot-store tests
- `src/types.ts`: shared frontend contracts
- `src/styles.css`: visual system and responsive layout

## Environment And Security Notes

The frontend-only baseline still requires no environment variables.

The default baseline also does not require:

- Supabase
- user accounts
- private backend storage

If a live provider needs secrets, keep them out of the public client and document the adapter or proxy layer explicitly.

If you run the local API service, see [.env.example](./.env.example) and [docs/api-reference.md](./docs/api-reference.md).

## Planned Optional Extensions

- saved places across devices
- outbound notifications and subscriptions
- moderator or operator workflows
- optional auth-backed personalization

These are intentionally deferred so the baseline stays simple, public, and easy to self-host.

## License

Licensed under `AGPL-3.0-or-later`. See [LICENSE](./LICENSE).
