import type { CoverageZoneTemplate } from '../../../src/types.js'
import { fetchCachedJson } from '../providerCache.js'
import {
  buildSourceHealthEntry,
  clipText,
  compactStrings,
  fillTemplate,
  getLatestTimestamp,
  getProviderConfig,
  stripTags,
  toArray,
  toIso,
  severityFromFloodLevel,
  type ProviderContribution,
} from './shared.js'

const FLOOD_TTL_MS = 300_000

interface EnvironmentAgencyFloodResponse {
  items?: Array<{
    '@id'?: string
    description?: string
    eaAreaName?: string
    eaRegionName?: string
    severity?: string
    severityLevel?: number
    timeRaised?: string
    timeMessageChanged?: string
    floodArea?: {
      county?: string
      riverOrSea?: string
    }
    message?: string
  }>
}

export function mapFloodWarnings(zone: CoverageZoneTemplate, items: EnvironmentAgencyFloodResponse['items']) {
  return toArray(items)
    .filter((item) => (item.severityLevel ?? 5) <= 3)
    .map((item, index) => {
      const summarySource = stripTags(item.message ?? item.description ?? '')
      const title = `${item.severity ?? 'Flood update'}: ${item.description ?? zone.name}`

      return {
        id: item['@id'] ?? `${zone.id}-flood-${index}`,
        title,
        category: 'flood' as const,
        severity: severityFromFloodLevel(item.severityLevel),
        status: (item.severityLevel ?? 4) <= 2 ? ('Live' as const) : ('Monitoring' as const),
        issuedAt: toIso(item.timeMessageChanged ?? item.timeRaised),
        source: 'Environment Agency',
        coverage: item.eaAreaName || zone.region,
        summary: clipText(summarySource || `Flood update for ${item.description ?? zone.name}.`, 220),
        hotspotLabel: item.floodArea?.county || item.floodArea?.riverOrSea || zone.name,
        reactionCount: 0,
        tags: compactStrings([
          item.severity,
          item.floodArea?.county,
          item.floodArea?.riverOrSea,
        ]),
        link: item['@id'],
      }
    })
}

export async function fetchEnvironmentAgencyProvider(zone: CoverageZoneTemplate): Promise<ProviderContribution> {
  const provider = getProviderConfig(zone, 'environment-agency')

  if (!provider) {
    throw new Error(`Zone "${zone.id}" is missing the Environment Agency provider configuration.`)
  }

  const floodUrl = fillTemplate(provider.floodUrlTemplate, {
    lat: zone.coordinates.lat.toFixed(4),
    lng: zone.coordinates.lng.toFixed(4),
    radiusKm: provider.radiusKm,
    minimumSeverityLevel: provider.minimumSeverityLevel,
  })
  const floodResponse = await fetchCachedJson<EnvironmentAgencyFloodResponse>(floodUrl, FLOOD_TTL_MS)
  const floodSignals = mapFloodWarnings(zone, floodResponse.items)
  const refreshedAt = getLatestTimestamp(
    floodSignals.map((signal) => signal.issuedAt),
    new Date().toISOString(),
  )

  return {
    providerId: provider.id,
    providerLabel: provider.label,
    signals: floodSignals,
    news:
      floodSignals.length > 0
        ? [
            {
              id: `${zone.id}-news-environment-agency`,
              headline: `${floodSignals.length} flood alert or warning item(s) near ${zone.name}`,
              source: 'Environment Agency',
              publishedAt: floodSignals[0].issuedAt,
              summary: clipText(floodSignals[0].summary, 180),
              scope: 'Local',
              link: floodSignals[0].link || floodUrl,
            },
          ]
        : [],
    sources: [
      buildSourceHealthEntry({
        id: `${zone.id}-source-environment-agency`,
        name: 'Environment Agency flood warnings',
        type: 'Hydrology',
        status: 'Healthy',
        lastSync: refreshedAt,
        note:
          floodSignals.length > 0
            ? `${floodSignals.length} active flood alert or warning item(s) were found within the configured search radius.`
            : `No active Environment Agency flood alerts or flood warnings were returned near ${zone.name}.`,
        method: 'API',
        link: floodUrl,
      }),
    ],
    refreshedAt,
  }
}
