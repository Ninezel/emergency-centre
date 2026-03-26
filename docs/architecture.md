# Architecture Notes

Emergency Centre is a public monitoring client with an optional local Node API for real multi-signal briefing feeds.

## Core product decision

The open-source core is intentionally:

- public
- feed-driven
- usable without login
- deployable without Supabase
- configurable by local operators or self-hosters

That means the baseline app does not assume:

- user accounts
- private profiles
- server-side sessions
- vendor-managed feed infrastructure

## High-level flow

1. A user configures one or more coverage areas in the setup panel.
   The setup panel can now prefill coverage metadata from a built-in starter directory for supported countries.
2. If the feed URL is blank, the starter flow now prefills a local live API endpoint such as `/api/briefings/live/:zoneId`.
3. The setup is saved to browser local storage.
4. Search and directory selection operate on those configured coverage profiles.
5. The app polls each profile's briefing URL on a fixed interval.
6. Feed responses are normalized into the shared `LocationProfile` shape.
7. Display preferences such as unit system are applied in the presentation layer.
8. The selected profile is converted into a renderable briefing model.
9. If new live signals appear, the browser can play an alert tone.

## Frontend architecture

### `src/App.tsx`

Owns the top-level state:

- persisted setup
- selected coverage record
- query text and autocomplete results
- sync status messaging
- polling lifecycle
- audio signal triggers

It is the coordination layer between setup, selection, feed refresh, and presentation components.

### `src/lib/setup.ts`

Responsible for:

- the local storage key used by the app
- creation of new empty coverage profiles
- hydration of saved profiles from storage
- safe defaults for old or partial data
- merging live feed data into a profile
- setting sync and error states

### `src/lib/feed.ts`

Owns baseline live-feed fetching:

- fetches a briefing URL
- requests JSON
- validates the required top-level fields
- normalizes array-like sections so the UI can render safely

This module is intentionally small. If deployments need stronger validation, they should extend it without leaking secrets into the browser.

### `src/lib/alertSync.ts`

Tracks operational sync behavior:

- compares the previous and next live signal sets
- counts newly arrived live signals
- creates user-facing sync summaries

### `src/lib/audio.ts`

Provides the browser alert tone. It uses the Web Audio API so the project does not need to ship a bundled media file just to support signal playback.

### `src/lib/location.ts`

Handles coverage lookup and search:

- location-code matches
- alias matches
- place and region matches
- ranked autocomplete suggestions
- consistent selection metadata for directory and search flows
- configured country and region filtering for the live coverage console

This module is data-source agnostic. It operates on the configured coverage profile list rather than importing a global dataset.

### `src/lib/coverageCatalog.ts`

Provides the built-in setup directory:

- curated starter zones for the United Kingdom and United States
- hierarchical country, region, and coverage-area browsing
- postcode and ZIP lookup against those starter zones
- conversion of a starter zone into a coverage draft for the setup form

### `server/index.ts`

Hosts the optional local API server:

- service discovery and health routes
- coverage catalog routes
- built-in live provider routes
- built-in demo briefing routes

### `server/services/catalogService.ts`

Provides API-safe catalog helpers:

- country listing
- region listing
- zone listing
- postcode and ZIP lookup
- individual zone lookup

### `server/services/liveBriefingService.ts`

Generates normalized live briefings for starter coverage zones by fetching and scraping a small allowlisted set of official public providers. The current adapters cover:

- NWS point forecasts and active alerts
- Met Office public forecast pages and regional severe-weather warning RSS feeds
- Environment Agency flood warnings for England starter zones
- USGS daily earthquake feeds

### `server/services/demoBriefingService.ts`

Generates normalized demo briefings for starter coverage zones so the frontend can be run end to end without requiring a third-party provider on day one.

### `src/lib/briefing.ts`

Builds the render-ready briefing:

- sorts signal items by severity
- calculates headline metrics and category counts
- exposes refresh-state messaging for the selected profile

### `src/components/`

The UI is split into focused surfaces:

- `OverviewPanel`
- `LocationConsole`
- `SetupPanel`
- `SetupTutorial`
- `AlertFeed`
- `SituationPanels`
- `OpenSourcePanel`

The product intentionally avoids a built-in map dependency in the current baseline. Coverage monitoring is driven by configured areas, search, and the directory dropdown.

## Trust boundary

Emergency Centre is a public client with an optional local API service. Feed URLs and feed responses are still visible to the browser when the browser fetches them directly.

Implications:

- never place private API keys directly in a client-visible feed URL
- use a proxy or edge adapter for protected upstream providers
- label source provenance clearly in the returned data
- do not make unofficial feeds look identical to official ones

The local API added in this repo is intentionally narrow. It does not act as a generic open proxy.

## Future optional modules

The baseline is deliberately narrow. Future modules can add:

- account-backed saved places
- outbound notification channels
- moderation or editorial tooling
- richer provider adapters

Those should stay optional and should not weaken the no-login default deployment path.
