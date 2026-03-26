# Changelog

This page tracks user-facing release notes for Emergency Centre.

## 2026-03-26

### Provider reliability pass

- split the built-in live briefing logic into dedicated provider adapters for `NWS`, `Met Office`, `Environment Agency`, and `USGS`
- added stale snapshot fallback so live starter routes can keep serving the last-known-good briefing during upstream refresh failures
- added shared `freshness` metadata and upstream provenance fields to the normalized briefing contract
- exposed official-source links in signals, bulletins, and source audit cards when feeds provide them
- added optional browser notifications for newly arrived live signals
- added parser and snapshot tests to catch upstream payload or markup drift

### Docs and wiki sync

- refreshed the README, API reference, feed schema, architecture notes, developer guide, feature reference, and security notes
- documented stale snapshot behavior, freshness fields, test commands, and notification behavior
- kept the tracked `wiki/` pages and the published GitHub wiki in sync
