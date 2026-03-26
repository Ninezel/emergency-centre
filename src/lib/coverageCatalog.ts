import type {
  CoverageDraft,
  CoverageZoneSuggestion,
  CoverageZoneTemplate,
} from '../types'
import { coverageCatalogData } from '../data/coverageCatalogData'

const coverageCatalog = coverageCatalogData as unknown as CoverageZoneTemplate[]

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function scoreTextMatch(query: string, value: string) {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) {
    return Number.POSITIVE_INFINITY
  }

  if (normalizedValue === query) {
    return 0
  }

  if (normalizedValue.startsWith(query) || query.startsWith(normalizedValue)) {
    return 1
  }

  if (normalizedValue.includes(query) || query.includes(normalizedValue)) {
    return 2
  }

  return Number.POSITIVE_INFINITY
}

function scoreCodeMatch(query: string, value: string) {
  const normalizedQuery = normalizeCode(query)
  const normalizedValue = normalizeCode(value)

  if (!normalizedQuery || !normalizedValue) {
    return Number.POSITIVE_INFINITY
  }

  if (normalizedQuery === normalizedValue) {
    return 0
  }

  if (normalizedQuery.startsWith(normalizedValue) || normalizedValue.startsWith(normalizedQuery)) {
    return 1
  }

  if (normalizedQuery.includes(normalizedValue) || normalizedValue.includes(normalizedQuery)) {
    return 2
  }

  return Number.POSITIVE_INFINITY
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function matchesCountry(zone: CoverageZoneTemplate, countryCode: string | null) {
  return !countryCode || zone.countryCode === countryCode
}

function buildSuggestion(
  zone: CoverageZoneTemplate,
  matchedText: string,
  matchKind: CoverageZoneSuggestion['matchKind'],
  rank: number,
): CoverageZoneSuggestion {
  return {
    id: `${zone.id}-${matchKind}-${rank}`,
    zone,
    matchedText,
    matchKind,
  }
}

export function getCoverageCatalogCountries() {
  return uniqueSorted(coverageCatalog.map((zone) => zone.countryCode)).map((countryCode) => {
    const representativeZone = coverageCatalog.find((zone) => zone.countryCode === countryCode)!

    return {
      code: representativeZone.countryCode,
      label: representativeZone.country,
    }
  })
}

export function getCoverageCatalogRegions(countryCode: string | null) {
  const regions = coverageCatalog
    .filter((zone) => matchesCountry(zone, countryCode))
    .map((zone) => ({
      code: zone.regionCode,
      label: zone.region,
    }))

  const uniqueRegions = new Map(regions.map((region) => [region.code, region]))
  return [...uniqueRegions.values()].sort((left, right) => left.label.localeCompare(right.label))
}

export function getCoverageCatalogZones(countryCode: string | null, regionCode: string | null) {
  return coverageCatalog
    .filter((zone) => matchesCountry(zone, countryCode))
    .filter((zone) => !regionCode || zone.regionCode === regionCode)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function findCoverageCatalogZoneById(zoneId: string) {
  return coverageCatalog.find((zone) => zone.id === zoneId) ?? null
}

export function getCoverageCatalogSuggestions(query: string, countryCode: string | null = null, limit = 6) {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return getCoverageCatalogZones(countryCode, null)
      .slice(0, limit)
      .map((zone, index) => buildSuggestion(zone, zone.locationCodes[0] ?? zone.name, 'place', index))
  }

  const candidates = coverageCatalog
    .filter((zone) => matchesCountry(zone, countryCode))
    .flatMap((zone) => {
      const rankedEntries = [
        ...zone.locationCodes.map((code) => ({
          value: code,
          kind: 'code' as const,
          rank: scoreCodeMatch(query, code),
        })),
        ...zone.aliases.map((alias) => ({
          value: alias,
          kind: 'alias' as const,
          rank: scoreTextMatch(normalizedQuery, alias),
        })),
        {
          value: zone.name,
          kind: 'place' as const,
          rank: scoreTextMatch(normalizedQuery, zone.name),
        },
        {
          value: zone.region,
          kind: 'region' as const,
          rank: scoreTextMatch(normalizedQuery, zone.region),
        },
        {
          value: zone.country,
          kind: 'country' as const,
          rank: scoreTextMatch(normalizedQuery, zone.country),
        },
      ]
        .filter((entry) => Number.isFinite(entry.rank))
        .sort((left, right) => left.rank - right.rank)

      if (rankedEntries.length === 0) {
        return []
      }

      const bestEntry = rankedEntries[0]
      return [buildSuggestion(zone, bestEntry.value, bestEntry.kind, bestEntry.rank)]
    })

  return candidates
    .sort((left, right) => {
      const leftScore =
        left.matchKind === 'code'
          ? scoreCodeMatch(query, left.matchedText)
          : scoreTextMatch(normalizedQuery, left.matchedText)
      const rightScore =
        right.matchKind === 'code'
          ? scoreCodeMatch(query, right.matchedText)
          : scoreTextMatch(normalizedQuery, right.matchedText)

      if (leftScore !== rightScore) {
        return leftScore - rightScore
      }

      return left.zone.name.localeCompare(right.zone.name)
    })
    .slice(0, limit)
}

export function findBestCoverageCatalogSuggestion(query: string, countryCode: string | null = null) {
  return getCoverageCatalogSuggestions(query, countryCode, 1)[0] ?? null
}

export function createDraftFromCoverageCatalogZone(
  zone: CoverageZoneTemplate,
  currentBriefingUrl = '',
): CoverageDraft {
  return {
    name: zone.name,
    region: zone.region,
    country: zone.country,
    aliases: zone.aliases,
    locationCodes: zone.locationCodes,
    latitude: zone.coordinates.lat,
    longitude: zone.coordinates.lng,
    briefingUrl: currentBriefingUrl || `/api/briefings/live/${zone.id}`,
  }
}
