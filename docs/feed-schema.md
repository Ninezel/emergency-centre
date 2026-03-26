# Feed Schema

Each coverage area in Emergency Centre points to one live briefing URL. That endpoint must return JSON in the shape below.

## Required top-level fields

- `outlook`
- `weather`

## Optional but strongly recommended fields

- `signals`
- `news`
- `sources`
- `actions`
- `refreshedAt`

Legacy compatibility:

- `hazards` is still accepted as an alias for `signals`

## Example response

```json
{
  "outlook": "Heavy rain and transport pressure remain the main concerns for the next 12 hours.",
  "weather": {
    "temperatureC": 7,
    "condition": "Heavy rain bands",
    "windKph": 38,
    "rainChance": 92,
    "advisory": "Flash flooding is possible on low roads and at underpasses."
  },
  "signals": [
    {
      "id": "signal-001",
      "title": "Urban flood warning",
      "category": "flood",
      "severity": "High",
      "status": "Live",
      "issuedAt": "2026-03-26T12:10:00Z",
      "source": "River authority",
      "coverage": "South riverside districts",
      "summary": "Surface water is building quickly in repeated rain bands.",
      "hotspotLabel": "Riverside corridor",
      "reactionCount": 12,
      "tags": ["surface water", "road closures"]
    },
    {
      "id": "signal-002",
      "title": "Airport operations advisory",
      "category": "airspace",
      "severity": "Moderate",
      "status": "Monitoring",
      "issuedAt": "2026-03-26T12:18:00Z",
      "source": "Regional operations desk",
      "coverage": "Western approach corridor",
      "summary": "Low cloud and crosswinds may slow arrivals this afternoon.",
      "hotspotLabel": "Western approach",
      "reactionCount": 3,
      "tags": ["crosswind", "arrival delays"]
    }
  ],
  "news": [
    {
      "id": "news-001",
      "headline": "Council opens temporary charging point",
      "source": "City briefing desk",
      "publishedAt": "2026-03-26T12:18:00Z",
      "summary": "Residents can access charging and hot drinks at the civic hall.",
      "scope": "Local"
    }
  ],
  "sources": [
    {
      "id": "source-001",
      "name": "Rain radar mesh",
      "type": "Weather",
      "status": "Healthy",
      "lastSync": "2026-03-26T12:20:00Z",
      "note": "Radar frames are current."
    }
  ],
  "actions": [
    {
      "id": "action-001",
      "title": "Move vehicles away from flood-prone roads",
      "description": "Relocate vehicles before the next rain burst if your street floods quickly.",
      "whenToUse": "Before the next heavy band arrives"
    }
  ],
  "refreshedAt": "2026-03-26T12:20:00Z"
}
```

## Field reference

### `weather`

```json
{
  "temperatureC": 0,
  "condition": "string",
  "windKph": 0,
  "rainChance": 0,
  "advisory": "string"
}
```

### `signals[]`

- `id`: stable item identifier
- `title`: short human-readable name
- `category`: one of `weather`, `storm`, `flood`, `earthquake`, `wildfire`, `heat`, `air-quality`, `infrastructure`, `transport`, `airspace`, `public-safety`, `civil-defense`, `other`
- `severity`: one of `Critical`, `High`, `Moderate`, `Advisory`
- `status`: one of `Live`, `Monitoring`, `Recovery`
- `issuedAt`: displayable issue timestamp
- `source`: provider or authority name
- `coverage`: short area description
- `summary`: human-readable description
- `hotspotLabel`: compact hotspot or corridor label
- `reactionCount`: numeric count used by the current UI
- `tags`: optional short descriptors shown as chips in the UI

### `news[]`

- `id`
- `headline`
- `source`
- `publishedAt`
- `summary`
- `scope`: one of `Local`, `Regional`, `National`, `Global`

### `sources[]`

- `id`
- `name`
- `type`: one of `Weather`, `Hydrology`, `Seismic`, `Wildfire`, `Airspace`, `Transport`, `Infrastructure`, `News`, `Civil`, `Other`
- `status`: one of `Healthy`, `Delayed`, `Manual review`
- `lastSync`
- `note`

### `actions[]`

- `id`
- `title`
- `description`
- `whenToUse`

## Implementation notes

- the built-in `/api/briefings/live/:zoneId` routes return this same normalized schema after adapting official provider payloads
- The browser fetches this URL directly in the open-source baseline.
- If the upstream provider requires authentication or blocks browser requests, put a proxy or adapter in front of it.
- Keep signal IDs stable across refreshes so new-signal sound detection behaves correctly.
- Feed values stay metric in the contract. The client can convert temperature and wind to imperial for display.
