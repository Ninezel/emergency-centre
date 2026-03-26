# Changelog

All notable documentation-facing changes for Emergency Centre are recorded here.

## 2026-03-26

### Added

- live starter-zone provider coverage documentation for:
  - `NWS` forecasts and alerts
  - `Met Office` forecast pages and warning RSS feeds
  - `Environment Agency` flood warnings
  - `USGS` earthquake feeds
- a repo-level changelog so release notes do not get buried in commit history
- a matching wiki changelog page for public release notes

### Updated

- setup, API, and self-hosting docs to reflect that starter zones now default to `/api/briefings/live/:zoneId`
- development docs to include the correct compiled API entry path: `dist-server/server/index.js`
- feed contract docs to clarify that built-in provider adapters normalize upstream data into the same public schema
- wiki navigation and landing pages to point readers at the current live-provider flow instead of the older demo-first wording

### Notes

- demo briefing routes remain available as a deterministic fallback for local testing
- the main repo wiki source and the published GitHub wiki are kept in sync in this release
