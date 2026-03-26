# Security Model

This document explains how the current Emergency Centre baseline approaches trust, privacy, feed safety, and the optional local API layer.

## Core rule

The open-source core is public and does not require accounts.

That means:

- no mandatory login
- no personal profile storage on a backend
- no private user dashboard in the baseline
- no Supabase dependency in the default install

## What the browser stores

The app stores local setup in browser local storage. That currently includes:

- configured coverage records
- polling interval
- sound enabled state
- browser notification preference
- sound volume
- unit system preference

Do not store secrets there. Local storage is not a secure secret manager.

## Feed trust boundary

Configured feed URLs are fetched directly by the browser in the baseline architecture.

Implications:

- feed URLs are visible to the client
- feed responses are visible to the client
- upstream API secrets must not be embedded in the client
- any provider requiring authentication should be placed behind a proxy or edge adapter

## Local API service boundary

The repository now includes a small local Node API service used for starter catalog routes, allowlisted live-provider routes, and demo briefings.

Current posture:

- it exposes only explicit catalog, live, and demo endpoints
- it does not accept arbitrary upstream URLs for proxying
- it does not store user accounts or personal subscriptions
- it labels stale snapshot fallback explicitly through response freshness metadata
- it should still be treated as a public service unless you place it behind your own network controls

## Current priority risks

- misleading or spoofed upstream data
- weak provenance labeling
- unsafe rendering of third-party content
- feed endpoints exposing secrets through client-side URLs
- CORS workarounds that unintentionally widen exposure
- silent provider failures that leave users looking at old data without clear freshness state

## Trust posture rules

The UI should distinguish clearly between:

- official or authoritative data
- newsroom or civic reporting
- manually reviewed notices
- future community reports

Anything user-generated in future modules must never be visually indistinguishable from official data.

## Safer feed integration rules

- normalize data into the shared feed contract before it reaches users
- label source names and types clearly
- show delayed or manual-review states explicitly
- surface stale snapshot state explicitly instead of silently implying a current live refresh
- keep provider adapters replaceable
- fail visibly when a feed breaks instead of silently serving stale confidence
- keep any future server-side fetch route allowlisted; do not introduce an unrestricted open proxy

## Why the no-login baseline is safer right now

Removing accounts from the first release reduces:

- credential theft risk
- session management complexity
- saved-location privacy exposure
- self-hosting mistakes around auth configuration
- accidental collection of personal data

## Future optional auth guidance

If optional accounts are added later:

- keep them behind a clearly documented module or feature flag
- separate public read models from private user data
- enforce row-level security where applicable
- audit publication and moderation actions
- treat saved places and subscriptions as sensitive user data
