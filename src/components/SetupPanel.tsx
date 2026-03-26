import { useState } from 'react'
import { SetupTutorial } from './SetupTutorial'
import {
  createDraftFromCoverageCatalogZone,
  findBestCoverageCatalogSuggestion,
  findCoverageCatalogZoneById,
  getCoverageCatalogCountries,
  getCoverageCatalogRegions,
  getCoverageCatalogSuggestions,
  getCoverageCatalogZones,
} from '../lib/coverageCatalog'
import type { AppSetup, CoverageDraft, LocationProfile, SetupSettingsUpdate } from '../types'

interface SetupPanelProps {
  setup: AppSetup
  onAddCoverage: (input: CoverageDraft) => void
  onRemoveCoverage: (profileId: string) => void
  onRefreshNow: () => void
  onTestSound: () => void
  onUpdateSettings: (next: SetupSettingsUpdate) => void
}

const initialFormState = {
  name: '',
  region: '',
  country: '',
  aliases: '',
  locationCodes: '',
  latitude: '',
  longitude: '',
  briefingUrl: '',
}

const matchKindLabel = {
  code: 'Code',
  alias: 'Area',
  place: 'Coverage',
  region: 'Region',
  country: 'Country',
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function SetupPanel({
  setup,
  onAddCoverage,
  onRemoveCoverage,
  onRefreshNow,
  onTestSound,
  onUpdateSettings,
}: SetupPanelProps) {
  const [formState, setFormState] = useState(initialFormState)
  const [catalogCountry, setCatalogCountry] = useState('')
  const [catalogRegion, setCatalogRegion] = useState('')
  const [catalogZoneId, setCatalogZoneId] = useState('')
  const [lookupQuery, setLookupQuery] = useState('')

  const catalogCountries = getCoverageCatalogCountries()
  const catalogRegions = getCoverageCatalogRegions(catalogCountry || null)
  const catalogZones = getCoverageCatalogZones(catalogCountry || null, catalogRegion || null)
  const lookupSuggestions = getCoverageCatalogSuggestions(lookupQuery, catalogCountry || null)

  function updateField(field: keyof typeof initialFormState, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function loadCatalogZone(zoneId: string) {
    const zone = findCoverageCatalogZoneById(zoneId)

    if (!zone) {
      return
    }

    const nextDraft = createDraftFromCoverageCatalogZone(zone, formState.briefingUrl)
    setCatalogCountry(zone.countryCode)
    setCatalogRegion(zone.regionCode)
    setCatalogZoneId(zone.id)
    setLookupQuery(zone.locationCodes[0] ?? zone.name)
    setFormState({
      name: nextDraft.name,
      region: nextDraft.region,
      country: nextDraft.country,
      aliases: nextDraft.aliases.join(', '),
      locationCodes: nextDraft.locationCodes.join(', '),
      latitude: String(nextDraft.latitude),
      longitude: String(nextDraft.longitude),
      briefingUrl: nextDraft.briefingUrl,
    })
  }

  function handleCatalogCountryChange(value: string) {
    setCatalogCountry(value)
    setCatalogRegion('')
    setCatalogZoneId('')
  }

  function handleCatalogRegionChange(value: string) {
    setCatalogRegion(value)
    setCatalogZoneId('')
  }

  function handleLookup() {
    const bestSuggestion = findBestCoverageCatalogSuggestion(lookupQuery, catalogCountry || null)

    if (!bestSuggestion) {
      return
    }

    loadCatalogZone(bestSuggestion.zone.id)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onAddCoverage({
      name: formState.name.trim(),
      region: formState.region.trim(),
      country: formState.country.trim(),
      aliases: splitCsv(formState.aliases),
      locationCodes: splitCsv(formState.locationCodes),
      latitude: Number(formState.latitude),
      longitude: Number(formState.longitude),
      briefingUrl: formState.briefingUrl.trim(),
    })

    setFormState(initialFormState)
  }

  return (
    <section id="setup" className="panel setup-panel">
      <div className="panel-heading">
        <div>
          <div className="section-label">Live Monitoring Setup</div>
          <h2>Connect real coverage feeds and signal sounds</h2>
        </div>
        <button className="primary-button" type="button" onClick={onRefreshNow}>
          Refresh feeds now
        </button>
      </div>

      <p className="panel-copy">
        Each coverage area should point to a JSON briefing endpoint that returns normalized weather,
        signal, news, source-health, readiness, and freshness data. If your source does not
        support browser access, place a small proxy or adapter in front of it. The preferred event
        list field is `signals`, but the open-source client still accepts the legacy `hazards`
        field for backwards compatibility.
      </p>

      <SetupTutorial />

      <div className="setup-grid">
        <form className="setup-form" onSubmit={handleSubmit}>
          <section className="coverage-catalog-card">
            <div className="section-label">Coverage Starter Directory</div>
            <h3>Load built-in coverage zones for the UK and US</h3>
            <p className="panel-copy">
              Pick a country, region, and coverage area, or search by postcode or ZIP code. This
              fills the coverage metadata into the form below. If the feed URL is blank, the
              starter flow also loads a local live-provider API briefing endpoint for that zone.
            </p>

            <div className="setup-field-grid">
              <label className="setup-field">
                <span>Country</span>
                <select value={catalogCountry} onChange={(event) => handleCatalogCountryChange(event.target.value)}>
                  <option value="">Choose country</option>
                  {catalogCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="setup-field">
                <span>Region / state</span>
                <select
                  value={catalogRegion}
                  onChange={(event) => handleCatalogRegionChange(event.target.value)}
                  disabled={!catalogCountry}
                >
                  <option value="">Choose region</option>
                  {catalogRegions.map((region) => (
                    <option key={region.code} value={region.code}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="setup-field setup-field-wide">
                <span>Coverage area</span>
                <select
                  value={catalogZoneId}
                  onChange={(event) => setCatalogZoneId(event.target.value)}
                  disabled={!catalogCountry}
                >
                  <option value="">Choose coverage area</option>
                  {catalogZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} · {zone.region}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="catalog-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={!catalogZoneId}
                onClick={() => loadCatalogZone(catalogZoneId)}
              >
                Load selected coverage zone
              </button>
            </div>

            <div className="catalog-lookup">
              <label className="setup-field setup-field-wide">
                <span>Find by postcode or ZIP code</span>
                <input
                  value={lookupQuery}
                  onChange={(event) => setLookupQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleLookup()
                    }
                  }}
                  placeholder="Try SW1A 1AA, CF10 1EP, 94103, or 10001"
                />
              </label>

              <button className="ghost-button" type="button" onClick={handleLookup} disabled={!lookupQuery.trim()}>
                Find zone
              </button>
            </div>

            {lookupQuery.trim().length > 1 ? (
              <div className="catalog-suggestion-list" role="listbox" aria-label="Coverage starter suggestions">
                {lookupSuggestions.length > 0 ? (
                  lookupSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className="suggestion-item suggestion-item-light"
                      type="button"
                      onClick={() => loadCatalogZone(suggestion.zone.id)}
                    >
                      <span className="suggestion-copy">
                        <strong>{suggestion.zone.name}</strong>
                        <span>
                          {suggestion.zone.region} · {suggestion.zone.country} ·{' '}
                          {suggestion.zone.locationCodes.join(', ')}
                        </span>
                      </span>
                      <span className="suggestion-match">
                        {matchKindLabel[suggestion.matchKind]} · {suggestion.matchedText}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="suggestion-empty suggestion-empty-light">
                    No built-in UK or US coverage zone matched that code.
                  </div>
                )}
              </div>
            ) : (
              <div className="suggestion-empty suggestion-empty-light">
                Search by UK postcode or US ZIP to jump straight to a built-in coverage zone.
              </div>
            )}
          </section>

          <div className="setup-field-grid">
            <label className="setup-field">
              <span>Coverage name</span>
              <input value={formState.name} onChange={(event) => updateField('name', event.target.value)} required />
            </label>
            <label className="setup-field">
              <span>Region / state</span>
              <input value={formState.region} onChange={(event) => updateField('region', event.target.value)} required />
            </label>
            <label className="setup-field">
              <span>Country</span>
              <input value={formState.country} onChange={(event) => updateField('country', event.target.value)} required />
            </label>
            <label className="setup-field">
              <span>Location codes</span>
              <input
                value={formState.locationCodes}
                onChange={(event) => updateField('locationCodes', event.target.value)}
                placeholder="SW1A 1AA, EC4M 7RF"
                required
              />
            </label>
            <label className="setup-field">
              <span>Aliases / address hints</span>
              <input
                value={formState.aliases}
                onChange={(event) => updateField('aliases', event.target.value)}
                placeholder="Westminster, South Bank"
              />
            </label>
            <label className="setup-field">
              <span>Latitude</span>
              <input value={formState.latitude} onChange={(event) => updateField('latitude', event.target.value)} type="number" step="0.0001" required />
            </label>
            <label className="setup-field">
              <span>Longitude</span>
              <input value={formState.longitude} onChange={(event) => updateField('longitude', event.target.value)} type="number" step="0.0001" required />
            </label>
            <label className="setup-field setup-field-wide">
              <span>Briefing feed URL</span>
              <input
                value={formState.briefingUrl}
                onChange={(event) => updateField('briefingUrl', event.target.value)}
                placeholder="/api/signals/london or https://signals.example.com/api/london.json"
                required
              />
            </label>
          </div>

          <button className="primary-button" type="submit">
            Add coverage area
          </button>
        </form>

        <aside className="setup-side">
          <div className="settings-card">
            <div className="section-label">Polling And Sound</div>
            <div className="settings-stack">
              <label className="setup-field">
                <span>Display units</span>
                <select
                  value={setup.unitSystem}
                  onChange={(event) =>
                    onUpdateSettings({
                      unitSystem: event.target.value as AppSetup['unitSystem'],
                    })
                  }
                >
                  <option value="metric">Metric</option>
                  <option value="imperial">Imperial</option>
                </select>
              </label>

              <label className="setup-field">
                <span>Polling interval in seconds</span>
                <input
                  type="number"
                  min="30"
                  value={setup.pollingIntervalSeconds}
                  onChange={(event) =>
                    onUpdateSettings({
                      pollingIntervalSeconds: Number(event.target.value) || 120,
                    })
                  }
                />
              </label>

              <label className="toggle-field">
                <input
                  checked={setup.soundEnabled}
                  onChange={(event) => onUpdateSettings({ soundEnabled: event.target.checked })}
                  type="checkbox"
                />
                <span>Play a sound when new live signals arrive</span>
              </label>

              <label className="setup-field">
                <span>Alert sound volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={setup.soundVolume}
                  onChange={(event) =>
                    onUpdateSettings({
                      soundVolume: Number(event.target.value),
                    })
                  }
                />
              </label>

              <button className="ghost-button" type="button" onClick={onTestSound}>
                Test signal sound
              </button>

              <label className="toggle-field">
                <input
                  checked={setup.browserNotificationsEnabled}
                  onChange={(event) =>
                    onUpdateSettings({ browserNotificationsEnabled: event.target.checked })
                  }
                  type="checkbox"
                />
                <span>Send browser notifications for new live signals</span>
              </label>
            </div>
          </div>

          <div className="settings-card">
            <div id="setup-feed-schema" className="section-label">Feed Schema Essentials</div>
            <div className="tutorial-schema-card">
              <h3>Minimum JSON response</h3>
              <p className="panel-copy">
                Every live feed should return `outlook` and `weather` at minimum. `signals`,
                `news`, `sources`, `actions`, and `freshness` are optional but recommended.
              </p>
              <pre className="tutorial-schema-snippet">
{`{
  "outlook": "Heavy rain remains the main concern.",
  "weather": {
    "temperatureC": 7,
    "condition": "Heavy rain bands",
    "windKph": 38,
    "rainChance": 92,
    "advisory": "Flash flooding is possible on low roads."
  },
  "signals": [
    {
      "id": "signal-001",
      "title": "Airport operations advisory",
      "category": "airspace",
      "severity": "Moderate",
      "status": "Monitoring",
      "issuedAt": "2026-03-26T12:20:00Z",
      "source": "Regional operations desk",
      "coverage": "Approach corridor west of the city",
      "summary": "Low cloud and crosswinds may slow arrivals this afternoon.",
      "hotspotLabel": "Western approach",
      "reactionCount": 3,
      "tags": ["crosswind", "arrival delay"],
      "link": "https://status.example.com/ops/advisory-001"
    }
  ],
  "freshness": {
    "status": "live",
    "checkedAt": "2026-03-26T12:25:00Z",
    "snapshotAgeMinutes": 0,
    "message": "Live provider data refreshed successfully."
  }
}`}
              </pre>
            </div>
          </div>

          <div className="settings-card">
            <div className="section-label">Configured Coverage Areas</div>
            <div className="setup-list">
              {setup.coverageProfiles.length > 0 ? (
                setup.coverageProfiles.map((profile: LocationProfile) => (
                  <article key={profile.id} className="setup-list-item">
                    <div>
                      <strong>{profile.name}</strong>
                      <p>{profile.region} · {profile.country}</p>
                      <p>{profile.briefingUrl}</p>
                    </div>
                    <button className="ghost-button" type="button" onClick={() => onRemoveCoverage(profile.id)}>
                      Remove
                    </button>
                  </article>
                ))
              ) : (
                <div className="setup-empty">No coverage feeds configured yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
