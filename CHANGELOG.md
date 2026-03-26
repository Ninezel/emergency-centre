# Changelog

All notable project-facing changes for Emergency Centre are recorded here.

## 2026-03-26

### Added

- modular live-provider adapters under `server/services/providers/` for:
  - `NWS` forecasts and alerts
  - `Met Office` forecast pages and warning RSS feeds
  - `Environment Agency` flood warnings
  - `USGS` earthquake feeds
- a last-known-good briefing snapshot store so live routes can degrade to an explicit stale response instead of hard failing after a previous success
- response-level freshness metadata in the shared briefing contract
- upstream provenance fields for signals, news, and sources:
  - item links
  - source fetch method
  - source fetched-at timestamps
- optional browser notifications for newly arrived live signals
- parser fixtures and `vitest` coverage for provider normalization and stale snapshot behavior
- a repo-level changelog and matching wiki changelog page

### Changed

- starter zone metadata now carries explicit provider configuration in `src/data/coverageCatalogData.ts`
- `server/services/liveBriefingService.ts` now composes provider contributions instead of owning all parsing logic directly
- the client now preserves and renders freshness state during live polling, sync summaries, and selected-location briefings
- source-health and bulletin panels now expose official upstream links when feeds provide them
- the local API now returns `X-EC-Data-State` and tighter cache headers for live briefing routes

### Documentation

- refreshed `README.md`, API/schema docs, architecture notes, developer guidance, feature reference, and security notes for the new provider structure
- documented stale snapshot behavior, freshness fields, provenance fields, notification behavior, and test commands
- synced the tracked `wiki/` source pages and the live GitHub wiki to match the current codebase

### Notes

- demo briefing routes remain available as deterministic local fallbacks
- starter live routes still use allowlisted official providers only; they are not a generic proxy layer
