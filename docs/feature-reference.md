# Feature Reference

This document describes every user-facing feature in the current Emergency Centre web baseline.

## 1. Public access

Purpose:

- allow communities to inspect emergency coverage without an account wall

Current behavior:

- no account required
- no login prompt
- no mandatory Supabase dependency
- no saved cross-device identity workflow in the core app

## 2. Live monitoring setup

Purpose:

- let each deployment connect real monitoring feeds instead of relying on bundled demo data

Current inputs:

- coverage name
- region or state
- country
- location codes
- aliases or address hints
- latitude
- longitude
- briefing feed URL

Current behavior:

- setup is stored locally in the browser
- the app can add and remove coverage records
- the app ships with a built-in starter directory for the United Kingdom and United States
- users can pick `country -> region/state -> coverage area` to prefill a coverage record
- users can search the starter directory by UK postcode or US ZIP code
- starter zones can prefill a local live-provider API endpoint when the briefing URL field is blank
- `Refresh feeds now` forces an immediate sync
- the sound test button plays the current signal tone
- unit display can be switched between metric and imperial
- a built-in tutorial walks users through coverage metadata, feed URLs, verification, and operating settings
- an in-app schema card shows the minimum JSON shape needed for a live feed
- the preferred event list field is `signals`
- the legacy `hazards` field remains accepted for backward compatibility

## 3. Coverage search

Purpose:

- let the user switch quickly between configured coverage areas

Current inputs:

- free-text query
- configured country filter
- configured region/state filter
- configured coverage-area selector
- autocomplete suggestions
- coverage directory dropdown

Accepted search examples:

- postcode
- ZIP code
- location code
- city name
- district name
- neighborhood name
- general address hint

Current implementation note:

- search suggestions are generated from configured coverage profiles
- the configured directory can be narrowed by `country -> region/state -> coverage area`
- there is no built-in external geocoder in the open-source core

## 4. API services

Purpose:

- support self-hosted starter workflows without requiring an external provider immediately

Current endpoints:

- `GET /api`
- `GET /api/health`
- `GET /api/catalog/countries`
- `GET /api/catalog/regions`
- `GET /api/catalog/zones`
- `GET /api/catalog/lookup`
- `GET /api/catalog/zones/:zoneId`
- `GET /api/briefings/live/:zoneId`
- `GET /api/briefings/demo/:zoneId`

Current behavior:

- the repo ships with a local Node API server
- Vite proxies `/api/*` to the local API during development
- built-in coverage zones now default to official-provider live briefing endpoints
- demo briefing endpoints remain available as a fallback route
- the API does not currently provide auth, persistence, or a generic proxy route

## 5. Coverage sync states

Purpose:

- show whether the selected feed is ready, syncing, live, or failing

Current states:

- waiting for first sync
- syncing live feeds
- live feed
- feed issue

Current behavior:

- feed errors are surfaced directly in the control panel
- successful syncs update the overview metrics and downstream panels

## 6. Polling and manual refresh

Purpose:

- keep the selected coverage areas current

Current behavior:

- polling interval is configurable in the setup panel
- feeds are automatically polled on the selected interval
- the setup panel can force a manual refresh

## 7. Sound alerts

Purpose:

- make newly arrived live signals harder to miss

Current behavior:

- audio alerts can be enabled or disabled
- alert volume is configurable
- the app compares the previous and next live signal sets
- the browser tone plays when new live signals arrive after the first successful sync

Current limitation:

- browser autoplay policy can block sound until the user interacts with the page

## 8. Headline overview

Purpose:

- summarize local risk and current monitoring posture in one glance

Current contents:

- configured coverage feed count
- active signal count
- critical signal count
- refresh state
- current selection mode
- last refresh summary

## 9. Multi-signal feed

Purpose:

- show the active incidents and monitored signals for the selected coverage area

Current card contents:

- title
- source
- issue time
- severity
- category
- summary
- coverage
- hotspot label
- field reaction count
- tag chips when the feed provides `tags`

Current categories:

- weather
- storm
- flood
- earthquake
- wildfire
- heat
- air quality
- infrastructure
- transport
- airspace
- public safety
- civil defense
- other

Current behavior:

- users can filter the feed by category using in-panel chips
- the overview highlights how many categories are active in the selected coverage area

Public-safety examples may include:

- missing-person bulletins
- search perimeters
- police or civic safety notices

## 10. Environmental snapshot

Purpose:

- provide a fast environmental read for the selected coverage area

Current contents:

- condition
- temperature in metric or imperial display
- wind in metric or imperial display
- rain chance
- short advisory text

## 11. Context bulletins

Purpose:

- surface public and partner briefing headlines around the selected coverage area

Current contents:

- headline
- source
- publish time
- summary
- scope label

## 12. Readiness actions

Purpose:

- show concrete next steps people should take

Current contents:

- action title
- description
- when-to-use guidance

## 13. Source audit

Purpose:

- make source freshness and trust posture visible

Current contents:

- source name
- source type
- source status
- last sync
- operational note

Current statuses:

- Healthy
- Delayed
- Manual review

## 14. Open-source and security panel

Purpose:

- explain the public-access posture of the project inside the product

Current contents:

- no-login explanation
- replaceable feed-provider explanation
- modular signal-schema explanation
- Ko-Fi support link
