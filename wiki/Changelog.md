# Changelog

This page tracks user-facing documentation and release-note updates for Emergency Centre.

## 2026-03-26

### Documentation release

- updated repo docs and wiki pages for the live-provider starter-zone flow
- documented the current official starter adapters:
  - `NWS`
  - `Met Office`
  - `Environment Agency`
  - `USGS`
- clarified that starter zones default to `/api/briefings/live/:zoneId`
- kept `/api/briefings/demo/:zoneId` documented as a fallback for deterministic local testing
- fixed the production API start path in the docs to `dist-server/server/index.js`
