import type { LocationProfile, LocationSuggestion, SelectedLocation } from '../types'

interface LocationConsoleProps {
  coverageProfiles: LocationProfile[]
  directoryCountries: string[]
  directoryRegions: string[]
  directoryProfiles: LocationProfile[]
  activeDirectoryCountry: string
  activeDirectoryRegion: string
  query: string
  suggestions: LocationSuggestion[]
  statusMessage: string
  selectedLocation: SelectedLocation | null
  isRefreshing: boolean
  onDirectoryCountryChange: (country: string) => void
  onDirectoryRegionChange: (region: string) => void
  onQueryChange: (nextValue: string) => void
  onSearch: () => void
  onCoverageSelect: (profileId: string) => void
  onSuggestionSelect: (suggestionId: string) => void
}

const matchKindLabel = {
  code: 'Code',
  alias: 'Area',
  place: 'Place',
  region: 'Region',
  country: 'Country',
}

function describeActiveStatus(selectedLocation: SelectedLocation | null, isRefreshing: boolean) {
  if (isRefreshing) {
    return 'Syncing live feeds'
  }

  if (selectedLocation?.profile.fetchStatus === 'error') {
    return 'Feed issue'
  }

  if (selectedLocation?.profile.freshness.status === 'stale') {
    return 'Stale snapshot'
  }

  if (selectedLocation?.profile.fetchStatus === 'live') {
    return 'Live feed'
  }

  return 'Awaiting sync'
}

export function LocationConsole({
  coverageProfiles,
  directoryCountries,
  directoryRegions,
  directoryProfiles,
  activeDirectoryCountry,
  activeDirectoryRegion,
  query,
  suggestions,
  statusMessage,
  selectedLocation,
  isRefreshing,
  onDirectoryCountryChange,
  onDirectoryRegionChange,
  onQueryChange,
  onSearch,
  onCoverageSelect,
  onSuggestionSelect,
}: LocationConsoleProps) {
  const hasCoverage = coverageProfiles.length > 0
  const activeStatus = describeActiveStatus(selectedLocation, isRefreshing)

  return (
    <section id="coverage" className="panel control-panel">
      <div className="section-label">Coverage Search</div>
      <h2>
        {hasCoverage
          ? 'Search a monitoring area or browse by country, region, and coverage area.'
          : 'Set up a coverage feed to unlock multi-signal monitoring.'}
      </h2>
      <p className="panel-copy">
        {hasCoverage
          ? 'Search stays local to the browser in the open-source core. Try a postcode, ZIP code, city, district, neighborhood, or address hint, or step through the directory filters below.'
          : 'Emergency Centre does not ship with baked-in sample feeds. Add your own trusted monitoring feed in the setup section, then search configured coverage areas here.'}
      </p>

      {hasCoverage ? (
        <>
          <div className="search-row">
            <div className="search-stack">
              <input
                className="search-input"
                type="text"
                value={query}
                placeholder="Try SW1A 1AA, 94103, Cardiff Bay, Mission District, or Tokyo"
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onSearch()
                  }
                }}
              />

              {query.trim().length > 1 ? (
                <div className="suggestion-list" role="listbox" aria-label="Coverage search suggestions">
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        className="suggestion-item"
                        type="button"
                        onClick={() => onSuggestionSelect(suggestion.id)}
                      >
                        <span className="suggestion-copy">
                          <strong>{suggestion.primaryLabel}</strong>
                          <span>{suggestion.secondaryLabel}</span>
                        </span>
                        <span className="suggestion-match">
                          {matchKindLabel[suggestion.matchKind]} · {suggestion.matchedText}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="suggestion-empty">No coverage matches found yet.</div>
                  )}
                </div>
              ) : (
                <div className="suggestion-empty">
                  Start typing to match configured location codes, aliases, towns, or regions.
                </div>
              )}
            </div>

            <button className="primary-button" onClick={onSearch}>
              Search
            </button>
          </div>

          <div className="directory-row">
            <label className="directory-label" htmlFor="coverage-country">
              Country
            </label>
            <select
              id="coverage-country"
              className="coverage-select"
              value={activeDirectoryCountry}
              onChange={(event) => onDirectoryCountryChange(event.target.value)}
            >
              <option value="">All configured countries</option>
              {directoryCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="directory-row">
            <label className="directory-label" htmlFor="coverage-region">
              Region / state
            </label>
            <select
              id="coverage-region"
              className="coverage-select"
              value={activeDirectoryRegion}
              onChange={(event) => onDirectoryRegionChange(event.target.value)}
              disabled={!activeDirectoryCountry}
            >
              <option value="">All configured regions</option>
              {directoryRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="directory-row">
            <label className="directory-label" htmlFor="coverage-directory">
              Coverage directory
            </label>
            <select
              id="coverage-directory"
              className="coverage-select"
              value={
                directoryProfiles.some((profile) => profile.id === selectedLocation?.profile.id)
                  ? (selectedLocation?.profile.id ?? '')
                  : ''
              }
              onChange={(event) => onCoverageSelect(event.target.value)}
            >
              <option value="">Choose configured coverage area</option>
              {directoryProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.region}
                </option>
              ))}
            </select>

            {directoryProfiles.length === 0 ? (
              <div className="suggestion-empty">
                No configured coverage feeds match the selected country and region yet.
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="empty-console">
          <div className="status-note">
            <span className="status-note-label">Coverage setup</span>
            <strong>Add a feed URL, coordinates, and location codes below.</strong>
          </div>
          <a className="support-link" href="#setup">
            Open setup section
          </a>
        </div>
      )}

      <div className="status-strip">
        <span className="status-chip status-open-source">No login in OSS core</span>
        <span className={`status-chip status-sync-${selectedLocation?.profile.fetchStatus ?? 'idle'}`}>
          {activeStatus}
        </span>
        <span className="status-chip status-light">Weather + civic + transport + airspace</span>
      </div>

      <div className="status-note">
        <span className="status-note-label">Coverage Match</span>
        <strong>
          {selectedLocation ? selectedLocation.confidenceLabel : 'No active coverage selection yet.'}
        </strong>
      </div>

      {selectedLocation?.profile.fetchError ? (
        <div className="status-note status-note-error">
          <span className="status-note-label">Feed issue</span>
          <strong>{selectedLocation.profile.fetchError}</strong>
        </div>
      ) : null}

      {selectedLocation?.profile.fetchStatus === 'live' ? (
        <div
          className={`status-note ${
            selectedLocation.profile.freshness.status === 'stale' ? 'status-note-error' : ''
          }`}
        >
          <span className="status-note-label">Snapshot state</span>
          <strong>{selectedLocation.profile.freshness.message}</strong>
        </div>
      ) : null}

      <p className="status-message">{statusMessage}</p>
      <div className="selected-brief">
        <strong>{selectedLocation?.label ?? 'Waiting for a configured coverage feed'}</strong>
        <span>
          {selectedLocation?.profile.outlook ??
            'Once a live briefing feed is connected, the current multi-signal outlook will appear here.'}
        </span>
      </div>
    </section>
  )
}
