import { describeUnitSystem } from '../lib/units'
import type { LocationBriefing, UnitSystem } from '../types'

interface OverviewPanelProps {
  briefing: LocationBriefing | null
  coverageCount: number
  isRefreshing: boolean
  soundEnabled: boolean
  unitSystem: UnitSystem
}

const modeLabel = {
  directory: 'Coverage directory',
  search: 'Coverage search',
  suggestion: 'Autocomplete match',
}

export function OverviewPanel({
  briefing,
  coverageCount,
  isRefreshing,
  soundEnabled,
  unitSystem,
}: OverviewPanelProps) {
  const selectedProfile = briefing?.selectedLocation.profile ?? null
  const refreshState = isRefreshing
    ? 'Syncing'
    : selectedProfile?.fetchStatus === 'error'
      ? 'Needs attention'
      : selectedProfile?.freshness.status === 'stale'
        ? 'Stale snapshot'
        : selectedProfile?.fetchStatus === 'live'
          ? 'Live'
          : 'Waiting'

  return (
    <section className="panel overview-panel">
      <div className="section-label">Emergency Centre</div>
      <div className="overview-hero">
        <div>
          <h1>
            {briefing ? 'Monitor live public signals without the noise.' : 'Connect live feeds and monitor real signals.'}
          </h1>
          <p className="lead-copy">
            {briefing
              ? briefing.headline
              : 'Emergency Centre stays open source and feed-driven. Add real weather, transport, infrastructure, airspace, or public-safety endpoints to begin monitoring coverage areas.'}
          </p>
        </div>

        <aside className="overview-spotlight">
          <span className={`status-chip ${briefing ? 'status-accent' : 'status-light'}`}>
            {briefing ? 'Live public briefing' : 'Setup required'}
          </span>
          <strong>{briefing ? briefing.selectedLocation.label : 'No coverage feed selected yet'}</strong>
          <p>
            {briefing && selectedProfile
              ? `${selectedProfile.region} · ${selectedProfile.country}`
              : 'Add a coverage area and briefing endpoint below.'}
          </p>
          <p>
            {briefing && selectedProfile
              ? selectedProfile.locationCodes.join(' · ')
              : 'Weather, transport, infrastructure, public-safety, and partner briefings can flow into one view.'}
          </p>
          <p className="spotlight-outlook">
            {briefing && selectedProfile
              ? selectedProfile.outlook
              : 'No feed data is bundled into the open-source core. Communities bring their own trusted feeds.'}
          </p>
        </aside>
      </div>

      <div className="overview-ribbon">
        <span className="overview-ribbon-label">Current mode</span>
        <strong>{briefing ? modeLabel[briefing.selectedLocation.mode] : 'Coverage setup'}</strong>
        <span>
          {briefing ? briefing.metrics.sourceConfidence : `${coverageCount} configured coverage area${coverageCount === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Coverage feeds</span>
          <strong>{coverageCount}</strong>
        </article>
        <article className="metric-card">
          <span>Active signals</span>
          <strong>{briefing?.metrics.activeSignals ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>Critical signals</span>
          <strong>{briefing?.metrics.criticalSignals ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>Signal categories</span>
          <strong>{briefing?.metrics.monitoredCategories ?? 0}</strong>
        </article>
      </div>

      <div className="headline-strip">
        <span>
          {soundEnabled ? 'Audio signals enabled' : 'Audio signals muted'} · {describeUnitSystem(unitSystem)}
        </span>
        <span>
          {briefing ? `${refreshState} · ${briefing.metrics.lastRefresh}` : 'Waiting for the first live sync'}
        </span>
      </div>
    </section>
  )
}
