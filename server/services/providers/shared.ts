import type {
  CoverageZoneProviderConfig,
  CoverageZoneTemplate,
  NewsItem,
  ReadinessAction,
  Severity,
  SignalCategory,
  SignalItem,
  SourceHealth,
  WeatherSnapshot,
} from '../../../src/types.js'

const severityPriority: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Moderate: 2,
  Advisory: 3,
}

const providerTypes: Record<CoverageZoneProviderConfig['id'], SourceHealth['type']> = {
  nws: 'Weather',
  'met-office': 'Weather',
  'environment-agency': 'Hydrology',
  usgs: 'Seismic',
}

const providerMethods: Record<CoverageZoneProviderConfig['id'], SourceHealth['method']> = {
  nws: 'API',
  'met-office': 'Scraped page',
  'environment-agency': 'API',
  usgs: 'API',
}

export interface ProviderContribution {
  providerId: CoverageZoneProviderConfig['id']
  providerLabel: string
  weather?: WeatherSnapshot
  signals: SignalItem[]
  news: NewsItem[]
  sources: SourceHealth[]
  refreshedAt: string
}

export function toArray<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return [] as T[]
  }

  return Array.isArray(value) ? value : [value]
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function decodeHtml(value: string) {
  return normalizeWhitespace(
    value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  )
}

export function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
}

export function clipText(value: string, maxLength = 220) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`
}

export function compactStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()))
}

export function toIso(value: string | number | null | undefined, fallback = new Date().toISOString()) {
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
  }

  if (!value) {
    return fallback
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

export function sentenceSummary(value: string) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return ''
  }

  const sentenceMatch = normalized.match(/^.*?[.!?](?:\s|$)/)
  return sentenceMatch ? sentenceMatch[0].trim() : normalized
}

export function parseNumberList(value: string) {
  return [...value.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))
}

export function fahrenheitToCelsius(value: number) {
  return ((value - 32) * 5) / 9
}

export function mphToKph(value: number) {
  return value * 1.60934
}

export function parseWindKph(value: string | undefined) {
  if (!value) {
    return 0
  }

  const values = parseNumberList(value)

  if (values.length === 0) {
    return 0
  }

  return Math.round(mphToKph(Math.max(...values)))
}

export function parsePercent(value: string | null) {
  if (!value) {
    return 0
  }

  const trimmed = value.trim()
  const numberMatch = trimmed.match(/(\d+)/)

  if (!numberMatch) {
    return 0
  }

  return Number(numberMatch[1])
}

export function hashText(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash
}

export function fallbackRainChance(zone: CoverageZoneTemplate) {
  return (hashText(zone.id) % 35) + 10
}

export function severityFromNws(value: string | null | undefined): Severity {
  switch ((value || '').toLowerCase()) {
    case 'extreme':
      return 'Critical'
    case 'severe':
      return 'High'
    case 'moderate':
      return 'Moderate'
    default:
      return 'Advisory'
  }
}

export function severityFromMetOffice(text: string): Severity {
  const normalized = text.toLowerCase()

  if (normalized.includes('red warning')) {
    return 'Critical'
  }

  if (normalized.includes('amber warning')) {
    return 'High'
  }

  if (normalized.includes('yellow warning')) {
    return 'Moderate'
  }

  return 'Advisory'
}

export function severityFromFloodLevel(level: number | null | undefined): Severity {
  switch (level) {
    case 1:
      return 'Critical'
    case 2:
      return 'High'
    case 3:
      return 'Moderate'
    default:
      return 'Advisory'
  }
}

export function severityFromMagnitude(magnitude: number) {
  if (magnitude >= 6) {
    return 'Critical' as const
  }

  if (magnitude >= 5) {
    return 'High' as const
  }

  if (magnitude >= 3.5) {
    return 'Moderate' as const
  }

  return 'Advisory' as const
}

export function categoryFromText(title: string, summary = ''): SignalCategory {
  const normalized = `${title} ${summary}`.toLowerCase()

  if (normalized.includes('earthquake')) {
    return 'earthquake'
  }

  if (normalized.includes('flood')) {
    return 'flood'
  }

  if (normalized.includes('air quality') || normalized.includes('smoke')) {
    return 'air-quality'
  }

  if (normalized.includes('heat')) {
    return 'heat'
  }

  if (
    normalized.includes('wildfire') ||
    normalized.includes('fire weather') ||
    normalized.includes('red flag') ||
    normalized.includes('brush fire')
  ) {
    return 'wildfire'
  }

  if (
    normalized.includes('storm') ||
    normalized.includes('wind') ||
    normalized.includes('rain') ||
    normalized.includes('thunder') ||
    normalized.includes('tornado') ||
    normalized.includes('snow') ||
    normalized.includes('ice') ||
    normalized.includes('hurricane') ||
    normalized.includes('tropical')
  ) {
    return 'storm'
  }

  if (normalized.includes('shelter') || normalized.includes('civil emergency')) {
    return 'civil-defense'
  }

  return 'weather'
}

export function buildSourceHealthEntry(input: {
  id: string
  name: string
  type: SourceHealth['type']
  status: SourceHealth['status']
  lastSync: string
  note: string
  method?: SourceHealth['method']
  link?: string
  fetchedAt?: string
}): SourceHealth {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    status: input.status,
    lastSync: input.lastSync,
    note: input.note,
    method: input.method,
    link: input.link,
    fetchedAt: input.fetchedAt ?? input.lastSync,
  }
}

export function getLatestTimestamp(values: Array<string | null | undefined>, fallback = new Date().toISOString()) {
  const timestamps = values
    .map((value) => toIso(value ?? null, ''))
    .filter(Boolean)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) {
    return fallback
  }

  return new Date(Math.max(...timestamps)).toISOString()
}

export function haversineDistanceKm(
  firstLat: number,
  firstLng: number,
  secondLat: number,
  secondLng: number,
) {
  const earthRadiusKm = 6371
  const latDelta = ((secondLat - firstLat) * Math.PI) / 180
  const lngDelta = ((secondLng - firstLng) * Math.PI) / 180
  const firstLatRad = (firstLat * Math.PI) / 180
  const secondLatRad = (secondLat * Math.PI) / 180
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(firstLatRad) * Math.cos(secondLatRad) * Math.sin(lngDelta / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function sortSignals(signals: SignalItem[]) {
  return [...signals].sort((left, right) => {
    const severityDelta = severityPriority[left.severity] - severityPriority[right.severity]

    if (severityDelta !== 0) {
      return severityDelta
    }

    return Date.parse(right.issuedAt) - Date.parse(left.issuedAt)
  })
}

export function sortNews(news: NewsItem[]) {
  return [...news].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
}

export function buildActions(zone: CoverageZoneTemplate, signals: SignalItem[]): ReadinessAction[] {
  const categories = new Set(signals.map((signal) => signal.category))
  const actions: ReadinessAction[] = []

  if (categories.has('storm') || categories.has('weather')) {
    actions.push({
      id: `${zone.id}-action-weather`,
      title: 'Check local travel and weather updates',
      description:
        'Use official transport and weather sources before making route changes, outdoor event decisions, or shift plans.',
      whenToUse: 'When active weather-related warnings or advisories are present',
    })
  }

  if (categories.has('flood')) {
    actions.push({
      id: `${zone.id}-action-flood`,
      title: 'Avoid flood-prone routes and low ground',
      description:
        'Do not drive through floodwater. Confirm local closures, drainage hotspots, and river or coastal access restrictions.',
      whenToUse: 'When flood alerts or flood warnings are in force',
    })
  }

  if (categories.has('earthquake')) {
    actions.push({
      id: `${zone.id}-action-earthquake`,
      title: 'Review structural and utility safety',
      description:
        'Check for damage, shut off utilities if needed, and follow local emergency-management advice before re-entering affected buildings.',
      whenToUse: 'When nearby earthquake updates are detected',
    })
  }

  if (categories.has('wildfire') || categories.has('air-quality')) {
    actions.push({
      id: `${zone.id}-action-air`,
      title: 'Reduce exposure and monitor vulnerable groups',
      description:
        'Limit outdoor exertion where smoke or degraded air quality is a factor, and keep an eye on schools, elderly residents, and medically vulnerable people.',
      whenToUse: 'When smoke, fire-weather, or air-quality signals are active',
    })
  }

  if (categories.has('heat')) {
    actions.push({
      id: `${zone.id}-action-heat`,
      title: 'Stand up heat-risk support',
      description:
        'Check hydration, cooling access, and welfare support for vulnerable residents, especially during prolonged hot periods.',
      whenToUse: 'When heat advisories or excessive-heat warnings are active',
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: `${zone.id}-action-monitor`,
      title: 'Keep monitoring official sources',
      description:
        'No high-priority official warning is active right now, but continue polling weather, warning, and seismic providers for changes.',
      whenToUse: 'Routine monitoring',
    })
  }

  return actions.slice(0, 4)
}

export function formatProviderLabelList(labels: string[]) {
  const uniqueLabels = [...new Set(labels.filter(Boolean))]

  if (uniqueLabels.length <= 1) {
    return uniqueLabels[0] ?? 'configured providers'
  }

  if (uniqueLabels.length === 2) {
    return `${uniqueLabels[0]} and ${uniqueLabels[1]}`
  }

  return `${uniqueLabels.slice(0, -1).join(', ')}, and ${uniqueLabels.at(-1)}`
}

export function summarizeOutlook(
  zone: CoverageZoneTemplate,
  weather: WeatherSnapshot,
  signals: SignalItem[],
  providerLabels: string[],
) {
  const liveProvidersLabel = formatProviderLabelList(providerLabels)

  if (signals.length === 0) {
    return `${zone.name}: ${weather.condition}. No active official warnings are currently surfaced from ${liveProvidersLabel}.`
  }

  const criticalCount = signals.filter((signal) => signal.severity === 'Critical').length
  const highCount = signals.filter((signal) => signal.severity === 'High').length
  const leadParts = [
    criticalCount > 0 ? `${criticalCount} critical` : null,
    highCount > 0 ? `${highCount} high-priority` : null,
  ].filter(Boolean)

  if (leadParts.length === 0) {
    return `${zone.name}: ${weather.condition}. ${signals.length} live official signal updates are active from ${liveProvidersLabel}.`
  }

  return `${zone.name}: ${weather.condition}. ${leadParts.join(' and ')} official signal updates are active from ${liveProvidersLabel}.`
}

export function fillTemplate(template: string, values: Record<string, number | string>) {
  return template.replace(/\{(?<name>[a-zA-Z0-9]+)\}/g, (_match, name: string) => {
    const replacement = values[name]
    return replacement === undefined ? '' : String(replacement)
  })
}

export function getProviderConfig<TProviderId extends CoverageZoneProviderConfig['id']>(
  zone: CoverageZoneTemplate,
  providerId: TProviderId,
) {
  return (
    zone.providers.find((provider): provider is Extract<CoverageZoneProviderConfig, { id: TProviderId }> => {
      return provider.id === providerId
    }) ?? null
  )
}

export function buildProviderFailureSource(
  zone: CoverageZoneTemplate,
  provider: CoverageZoneProviderConfig,
  reason: unknown,
): SourceHealth {
  return buildSourceHealthEntry({
    id: `${zone.id}-source-${provider.id}-failure`,
    name: provider.label,
    type: providerTypes[provider.id],
    status: 'Delayed',
    lastSync: new Date().toISOString(),
    note: `Provider refresh failed: ${reason instanceof Error ? reason.message : String(reason)}`,
    method: providerMethods[provider.id],
    link:
      provider.id === 'met-office'
        ? provider.forecastPageUrl
        : provider.id === 'environment-agency'
          ? fillTemplate(provider.floodUrlTemplate, {
              lat: zone.coordinates.lat.toFixed(4),
              lng: zone.coordinates.lng.toFixed(4),
              radiusKm: provider.radiusKm,
              minimumSeverityLevel: provider.minimumSeverityLevel,
            })
          : provider.id === 'nws'
            ? fillTemplate(provider.pointsUrlTemplate, {
                lat: zone.coordinates.lat.toFixed(4),
                lng: zone.coordinates.lng.toFixed(4),
              })
            : provider.feedUrl,
  })
}

export function countHealthySources(sources: SourceHealth[]) {
  return sources.filter((source) => source.status === 'Healthy').length
}
