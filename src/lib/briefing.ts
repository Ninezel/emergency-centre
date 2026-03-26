import type { LocationBriefing, SelectedLocation, Severity, SignalItem } from '../types'

const severityRank: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Moderate: 2,
  Advisory: 3,
}

function sortSignals(feed: SignalItem[]) {
  return [...feed].sort((left, right) => severityRank[left.severity] - severityRank[right.severity])
}

function describeRefresh(profile: SelectedLocation['profile']) {
  if (profile.fetchStatus === 'syncing') {
    return 'Syncing live feed now'
  }

  if (profile.fetchStatus === 'error') {
    return profile.fetchError ? `Sync issue: ${profile.fetchError}` : 'Live feed needs attention'
  }

  if (profile.fetchStatus === 'idle') {
    return 'Waiting for first live sync'
  }

  if (profile.freshness.status === 'stale') {
    return `Showing a ${profile.freshness.snapshotAgeMinutes} minute old snapshot while providers recover`
  }

  return `Last refreshed ${profile.lastUpdatedAt}`
}

export function buildLocationBriefing(selectedLocation: SelectedLocation): LocationBriefing {
  const signalFeed = sortSignals(selectedLocation.profile.signals)
  const criticalSignals = signalFeed.filter((signal) => signal.severity === 'Critical').length
  const monitoredCategories = new Set(signalFeed.map((signal) => signal.category)).size
  const areaLabel = selectedLocation.profile.name
  const healthySources = selectedLocation.profile.sources.filter((source) => source.status === 'Healthy').length
  const totalSources = selectedLocation.profile.sources.length

  return {
    selectedLocation,
    headline:
      criticalSignals > 0
        ? `${criticalSignals} critical signal${criticalSignals === 1 ? '' : 's'} need attention in ${areaLabel}.`
        : signalFeed.length > 0
          ? `${signalFeed.length} live signal${signalFeed.length === 1 ? '' : 's'} are active in ${areaLabel}. Continue monitoring local conditions.`
          : `No live signals are active in ${areaLabel}. Continue monitoring local conditions.`,
    metrics: {
      activeSignals: signalFeed.length,
      criticalSignals,
      monitoredCategories,
      sourceConfidence:
        totalSources > 0
          ? `${selectedLocation.confidenceLabel} · ${healthySources}/${totalSources} sources healthy${
              selectedLocation.profile.freshness.status === 'stale' ? ' · stale snapshot' : ''
            }`
          : selectedLocation.confidenceLabel,
      lastRefresh: describeRefresh(selectedLocation.profile),
    },
    signalFeed,
    weather: selectedLocation.profile.weather,
    newsFeed: selectedLocation.profile.news,
    sourceHealth: selectedLocation.profile.sources,
    actions: selectedLocation.profile.actions,
  }
}
