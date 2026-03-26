# Developer Guide

This guide is for contributors working on the Emergency Centre open-source core.

## Local setup

```powershell
cd g:\Projects\emergency-centre
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm install
npm run dev
```

This starts both the frontend and the local API service.

Create a production build with:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm run build
```

Run only the API service with:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
npm run dev:api
```

Run the compiled API after `npm run build` with:

```powershell
npm run start:api
```

## Project layout

- `src/App.tsx`: state orchestration, polling, selection, and top-level composition
- `src/components/`: isolated UI sections
- `src/data/coverageCatalogData.ts`: shared starter coverage data used by both client and API layers
- `src/components/SetupTutorial.tsx`: in-app onboarding for first-time feed setup
- `src/lib/setup.ts`: persisted setup and profile lifecycle helpers
- `src/lib/feed.ts`: live feed fetching
- `src/lib/alertSync.ts`: sync summaries and new-signal detection
- `src/lib/audio.ts`: signal sound playback
- `src/lib/location.ts`: search and selection logic
- `src/lib/coverageCatalog.ts`: built-in coverage starter data and postcode / ZIP lookup
- `src/lib/briefing.ts`: briefing shaping and summary metrics
- `server/index.ts`: optional local API entrypoint
- `server/services/catalogService.ts`: API-facing starter zone catalog services
- `server/services/liveBriefingService.ts`: live provider adapters and normalization for starter zones
- `server/services/providerCache.ts`: allowlisted upstream fetch and in-memory cache helpers
- `server/services/demoBriefingService.ts`: demo API briefing generation
- `src/types.ts`: shared frontend contracts
- `src/styles.css`: visual system and responsive layout

## Architectural rules

- Keep the default build public and usable without login.
- Do not introduce private auth or database dependencies into the open-source baseline.
- Treat coverage feeds as replaceable integrations.
- Keep the optional API service narrow and explicit; do not turn it into an unaudited open proxy.
- Keep search and selection logic independent from any single provider.
- Make feed health and trust posture visible to users.
- Do not silently mix official data with unverified data.

## Live feed guidance

Each coverage record points to one briefing URL. That endpoint must return the normalized JSON shape documented in [feed-schema.md](./feed-schema.md).

Key rules:

- coverage metadata is configured locally by the user
- live briefing data is fetched from the configured URL
- if an upstream provider needs secrets, use a server or edge adapter
- if the upstream blocks browser access, use a proxy that adds the correct CORS headers
- keep returned data explicit about source provenance

## Local persistence model

The open-source core stores setup in browser local storage. That currently includes:

- configured coverage records
- polling interval
- signal sound preference
- signal volume preference
- unit system preference

Do not treat this as a secure store. It is a convenience layer for local configuration.

## UI guidance

- Empty states must be explicit when no coverage feed is configured.
- Syncing, live, idle, and error states should remain visually distinct.
- Search must keep working for generic location codes, not only UK postcodes.
- Avoid stretching hero copy or overloading the control panel with long paragraphs.

## Verification checklist

Before opening a pull request:

- run `npm run build`
- if you changed server behavior, run `npm run start:api` and hit at least one live starter route
- test the setup flow by adding and removing a coverage feed
- test a successful live refresh
- test a failing feed URL and confirm the error state is visible
- test the sound button in the browser
- confirm mobile layout still works
- update the docs set if behavior changed

## Documentation expectations

When a feature changes, update the relevant docs at the same time:

- `README.md` for product direction or setup changes
- `docs/feature-reference.md` for user-facing behavior
- `docs/architecture.md` for structural changes
- `docs/feed-schema.md` for contract changes
- `docs/security-model.md` for trust, privacy, or auth implications
