# Connect Real Feeds

Emergency Centre is designed to work with normalized JSON briefing feeds.

## Step-By-Step

1. Get the app running locally.
2. Open the setup panel.
3. Load a starter zone or create a manual coverage area.
4. Replace the built-in live or demo briefing URL with your own feed endpoint if you want to override the starter adapter.
5. Make sure the endpoint returns JSON in the Emergency Centre contract.
6. Click `Add coverage area`.
7. Click `Refresh feeds now`.
8. Confirm the coverage console moves into a healthy sync state.
9. Review the signal feed, context bulletins, source audit, and response actions panels.

## Minimum Feed Shape

Required fields:

- `outlook`
- `weather`

Recommended fields:

- `signals`
- `news`
- `sources`
- `actions`
- `freshness`

Legacy support:

- `hazards` is still accepted as an alias for `signals`

See the main repository document:

- `docs/feed-schema.md`

## Rules For Real Providers

- do not embed provider secrets in client-visible URLs
- use a server or edge adapter if the upstream needs secrets
- label source provenance clearly
- expose upstream links and fetch method data where possible
- keep signal IDs stable across refreshes
- fail visibly if the upstream breaks
- if you serve a stale fallback snapshot, label it explicitly instead of implying the data is fully current

## Recommended Integration Pattern

1. Fetch upstream provider data on the server side.
2. Normalize it into the Emergency Centre contract.
3. Expose one explicit route per trusted feed.
4. Point the coverage area briefing URL at that normalized route.

## Bad Pattern To Avoid

Do not add:

- a generic `?url=` open proxy
- client-side URLs containing provider secrets
- unofficial sources that look identical to official ones
