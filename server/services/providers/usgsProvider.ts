import type { CoverageZoneTemplate } from '../../../src/types.js'
import { fetchCachedJson } from '../providerCache.js'
import {
  buildSourceHealthEntry,
  clipText,
  compactStrings,
  getProviderConfig,
  haversineDistanceKm,
  severityFromMagnitude,
  toArray,
  toIso,
  type ProviderContribution,
} from './shared.js'

const EARTHQUAKE_TTL_MS = 60_000

interface UsgsEarthquakeFeed {
  features?: Array<{
    id: string
    properties: {
      mag?: number | null
      place?: string
      time?: number
      updated?: number
      title?: string
      url?: string
    }
    geometry?: {
      coordinates?: [number, number, number?]
    }
  }>
}

export function mapEarthquakes(zone: CoverageZoneTemplate, feed: UsgsEarthquakeFeed) {
  const provider = getProviderConfig(zone, 'usgs')

  if (!provider) {
    return []
  }

  return toArray(feed.features)
    .flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates

      if (!coordinates || coordinates.length < 2 || feature.properties?.mag == null) {
        return []
      }

      const distanceKm = haversineDistanceKm(
        zone.coordinates.lat,
        zone.coordinates.lng,
        coordinates[1],
        coordinates[0],
      )

      return [
        {
          feature,
          distanceKm,
        },
      ]
    })
    .filter((item) => {
      const magnitude = item.feature.properties?.mag ?? 0
      return (
        magnitude >= provider.minimumMagnitude &&
        (item.distanceKm <= provider.radiusKm ||
          (item.distanceKm <= provider.extendedRadiusKm && magnitude >= provider.extendedMagnitude))
      )
    })
    .sort((left, right) => {
      const magnitudeDelta = (right.feature.properties?.mag ?? 0) - (left.feature.properties?.mag ?? 0)

      if (magnitudeDelta !== 0) {
        return magnitudeDelta
      }

      return left.distanceKm - right.distanceKm
    })
    .slice(0, 3)
    .map((item) => {
      const magnitude = item.feature.properties?.mag ?? 0
      const place = item.feature.properties?.place ?? 'Nearby seismic event'

      return {
        id: item.feature.id,
        title: item.feature.properties?.title ?? `M ${magnitude.toFixed(1)} earthquake`,
        category: 'earthquake' as const,
        severity: severityFromMagnitude(magnitude),
        status: 'Live' as const,
        issuedAt: toIso(item.feature.properties?.time),
        source: 'USGS',
        coverage: zone.name,
        summary: clipText(
          `USGS recorded a magnitude ${magnitude.toFixed(1)} earthquake about ${Math.round(
            item.distanceKm,
          )} km from ${zone.name} near ${place}.`,
          220,
        ),
        hotspotLabel: place,
        reactionCount: 0,
        tags: compactStrings([`M${magnitude.toFixed(1)}`, `${Math.round(item.distanceKm)} km`]),
        link: item.feature.properties?.url,
      }
    })
}

export async function fetchUsgsProvider(zone: CoverageZoneTemplate): Promise<ProviderContribution> {
  const provider = getProviderConfig(zone, 'usgs')

  if (!provider) {
    throw new Error(`Zone "${zone.id}" is missing the USGS provider configuration.`)
  }

  const earthquakeFeed = await fetchCachedJson<UsgsEarthquakeFeed>(provider.feedUrl, EARTHQUAKE_TTL_MS)
  const earthquakeSignals = mapEarthquakes(zone, earthquakeFeed)
  const refreshedAt = earthquakeSignals[0]?.issuedAt ?? new Date().toISOString()

  return {
    providerId: provider.id,
    providerLabel: provider.label,
    signals: earthquakeSignals,
    news:
      earthquakeSignals.length > 0
        ? [
            {
              id: `${zone.id}-news-usgs-earthquakes`,
              headline: `USGS seismic activity update for ${zone.name}`,
              source: 'USGS',
              publishedAt: earthquakeSignals[0].issuedAt,
              summary: clipText(earthquakeSignals[0].summary, 180),
              scope: 'Regional',
              link: earthquakeSignals[0].link || provider.feedUrl,
            },
          ]
        : [],
    sources: [
      buildSourceHealthEntry({
        id: `${zone.id}-source-usgs`,
        name: 'USGS earthquake feed',
        type: 'Seismic',
        status: 'Healthy',
        lastSync: refreshedAt,
        note:
          earthquakeSignals.length > 0
            ? `${earthquakeSignals.length} nearby earthquake update(s) matched the configured distance and magnitude filters.`
            : `No nearby earthquakes above the configured threshold were found near ${zone.name} in the USGS daily feed.`,
        method: 'API',
        link: provider.feedUrl,
      }),
    ],
    refreshedAt,
  }
}
