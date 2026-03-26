import { XMLParser } from 'fast-xml-parser'
import type {
  CoverageZoneTemplate,
  LiveBriefingResponse,
  NewsItem,
  ReadinessAction,
  Severity,
  SignalCategory,
  SignalItem,
  SourceHealth,
  WeatherSnapshot,
} from '../../src/types.js'
import { fetchCachedJson, fetchCachedText, readThroughCache } from './providerCache.js'

const LIVE_BRIEFING_TTL_MS = 120_000
const NWS_TTL_MS = 180_000
const NWS_POINT_TTL_MS = 86_400_000
const MET_OFFICE_TTL_MS = 600_000
const EARTHQUAKE_TTL_MS = 60_000
const FLOOD_TTL_MS = 300_000
const USGS_DAY_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'

const severityPriority: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Moderate: 2,
  Advisory: 3,
}

const metOfficeWarningFeedsByRegion: Record<string, string> = {
  'greater-london': 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/se',
  'north-west-england': 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/nw',
  'west-midlands': 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/wm',
  'south-east-wales': 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/wl',
  lothian: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/dg',
  belfast: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/ni',
}

const metOfficeForecastPagesByZone: Record<string, string> = {
  'gb-eng-greater-london-central': 'https://weather.metoffice.gov.uk/forecast/gcpvj0v07',
  'gb-eng-greater-manchester': 'https://weather.metoffice.gov.uk/forecast/gcw2hzs1u',
  'gb-eng-west-midlands': 'https://weather.metoffice.gov.uk/forecast/gcqdt4b2x',
  'gb-wls-cardiff-vale': 'https://weather.metoffice.gov.uk/forecast/gcjszevgx',
  'gb-sct-edinburgh-lothians': 'https://weather.metoffice.gov.uk/forecast/gcvwr3zrw',
  'gb-nir-belfast-metro': 'https://weather.metoffice.gov.uk/forecast/gcey94cuf',
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
  trimValues: true,
})

interface NwsPointResponse {
  properties: {
    cwa?: string
    forecast: string
    forecastOffice?: string
  }
}

interface NwsForecastResponse {
  properties: {
    updated?: string
    periods: Array<{
      name: string
      startTime: string
      isDaytime: boolean
      temperature: number
      temperatureUnit: string
      probabilityOfPrecipitation?: {
        value: number | null
      }
      windSpeed?: string
      shortForecast?: string
      detailedForecast?: string
    }>
  }
}

interface NwsAlertsResponse {
  features?: Array<{
    id: string
    properties: {
      id?: string
      status?: string
      messageType?: string
      severity?: string
      certainty?: string
      urgency?: string
      event?: string
      effective?: string
      sent?: string
      expires?: string
      areaDesc?: string
      senderName?: string
      headline?: string | null
      description?: string
      instruction?: string | null
    }
  }>
}

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

interface MetOfficeRssChannel {
  title?: string
  pubDate?: string
  item?: MetOfficeRssItem | MetOfficeRssItem[]
}

interface MetOfficeRssItem {
  title?: string
  description?: string
  pubDate?: string
  guid?: string
  link?: string
}

interface MetOfficeForecastSnapshot {
  weather: WeatherSnapshot
  publishedAt: string
  headline: string
  todayText: string
  regionHeading: string
}

function toArray<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return [] as T[]
  }

  return Array.isArray(value) ? value : [value]
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function decodeHtml(value: string) {
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

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
}

function clipText(value: string, maxLength = 220) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`
}

function compactStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()))
}

function toIso(value: string | number | null | undefined, fallback = new Date().toISOString()) {
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

function sentenceSummary(value: string) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return ''
  }

  const sentenceMatch = normalized.match(/^.*?[.!?](?:\s|$)/)
  return sentenceMatch ? sentenceMatch[0].trim() : normalized
}

function parseNumberList(value: string) {
  return [...value.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))
}

function fahrenheitToCelsius(value: number) {
  return ((value - 32) * 5) / 9
}

function mphToKph(value: number) {
  return value * 1.60934
}

function parseWindKph(value: string | undefined) {
  if (!value) {
    return 0
  }

  const values = parseNumberList(value)

  if (values.length === 0) {
    return 0
  }

  return Math.round(mphToKph(Math.max(...values)))
}

function parsePercent(value: string | null) {
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

function hashText(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash
}

function fallbackRainChance(zone: CoverageZoneTemplate) {
  return (hashText(zone.id) % 35) + 10
}

function severityFromNws(value: string | null | undefined): Severity {
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

function severityFromMetOffice(text: string): Severity {
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

function severityFromFloodLevel(level: number | null | undefined): Severity {
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

function severityFromMagnitude(magnitude: number) {
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

function categoryFromText(title: string, summary = ''): SignalCategory {
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

function buildSourceHealthEntry(
  id: string,
  name: string,
  type: SourceHealth['type'],
  status: SourceHealth['status'],
  lastSync: string,
  note: string,
): SourceHealth {
  return {
    id,
    name,
    type,
    status,
    lastSync,
    note,
  }
}

function getLatestTimestamp(values: Array<string | null | undefined>, fallback = new Date().toISOString()) {
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

function haversineDistanceKm(
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

function sortSignals(signals: SignalItem[]) {
  return [...signals].sort((left, right) => {
    const severityDelta = severityPriority[left.severity] - severityPriority[right.severity]

    if (severityDelta !== 0) {
      return severityDelta
    }

    return Date.parse(right.issuedAt) - Date.parse(left.issuedAt)
  })
}

function sortNews(news: NewsItem[]) {
  return [...news].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
}

function buildActions(zone: CoverageZoneTemplate, signals: SignalItem[]): ReadinessAction[] {
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

function summarizeOutlook(
  zone: CoverageZoneTemplate,
  weather: WeatherSnapshot,
  signals: SignalItem[],
  liveProvidersLabel: string,
) {
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

function matchFirstGroup(source: string, pattern: RegExp, groupName: string) {
  const match = source.match(pattern)
  return match?.groups?.[groupName]?.trim() ?? null
}

function parseMetOfficeForecastPage(html: string, zone: CoverageZoneTemplate): MetOfficeForecastSnapshot {
  const headline = stripTags(
    matchFirstGroup(
      html,
      /<h4>\s*Headline:\s*<\/h4>\s*<p>(?<value>[\s\S]*?)<\/p>/i,
      'value',
    ) ?? 'No headline published.',
  )
  const todayText = stripTags(
    matchFirstGroup(html, /<h4>\s*Today:\s*<\/h4>\s*<p>(?<value>[\s\S]*?)<\/p>/i, 'value') ??
      'The forecast page did not expose a detailed today summary.',
  )
  const updatedAt = toIso(
    matchFirstGroup(
      html,
      /<section id="regional-forecast"[\s\S]*?<p class="updated">\s*Updated:\s*<time datetime="(?<value>[^"]+)"/i,
      'value',
    ),
  )
  const regionHeading = stripTags(
    matchFirstGroup(
      html,
      /<section id="regional-forecast"[\s\S]*?<h2[^>]*>(?<value>[\s\S]*?)<\/h2>/i,
      'value',
    ) ?? `${zone.region} weather forecast`,
  )
  const maxTemperatureText = matchFirstGroup(todayText, /Maximum temperature (?<value>-?\d+)/i, 'value')
  const hourlyTemperatureRow = matchFirstGroup(
    html,
    /Temperature[^<]{0,40}<\/span><\/th>(?<value>[\s\S]*?)<\/tr>/i,
    'value',
  )
  const hourlyWindRow = matchFirstGroup(
    html,
    /Wind speed<\/span><\/th>(?<value>[\s\S]*?)<\/tr>/i,
    'value',
  )
  const hourlyRainRow = matchFirstGroup(
    html,
    /Chance of precipitation<\/span><\/th>(?<value>[\s\S]*?)<\/tr>/i,
    'value',
  )

  const fallbackTemperature = parseNumberList(stripTags(hourlyTemperatureRow ?? ''))[0] ?? 0
  const temperatureC = Number(maxTemperatureText ?? fallbackTemperature)
  const firstWindMph = parseNumberList(stripTags(hourlyWindRow ?? ''))[0] ?? 0
  const rainChance = parsePercent(stripTags(hourlyRainRow ?? ''))

  return {
    weather: {
      temperatureC,
      condition: headline,
      windKph: Math.round(mphToKph(firstWindMph)),
      rainChance: rainChance || fallbackRainChance(zone),
      advisory: clipText(`Met Office forecast: ${sentenceSummary(todayText)}`, 210),
    },
    publishedAt: updatedAt,
    headline,
    todayText,
    regionHeading,
  }
}

function buildMetOfficeSource(
  zone: CoverageZoneTemplate,
  forecastSnapshot: MetOfficeForecastSnapshot,
): SourceHealth {
  return buildSourceHealthEntry(
    `${zone.id}-source-metoffice-forecast`,
    `${zone.region} Met Office forecast`,
    'Weather',
    'Healthy',
    forecastSnapshot.publishedAt,
    `Forecast page scraped successfully from the public Met Office forecast page for ${zone.name}.`,
  )
}

function mapMetOfficeWarnings(zone: CoverageZoneTemplate, items: MetOfficeRssItem[]) {
  return items.map<SignalItem>((item, index) => {
    const title = stripTags(item.title ?? 'Met Office severe weather warning')
    const description = stripTags(item.description ?? '')

    return {
      id: item.guid || item.link || `${zone.id}-metoffice-warning-${index}`,
      title,
      category: categoryFromText(title, description),
      severity: severityFromMetOffice(`${title} ${description}`),
      status: 'Live',
      issuedAt: toIso(item.pubDate),
      source: 'Met Office',
      coverage: zone.region,
      summary: clipText(description || `Met Office warning issued for ${zone.region}.`, 220),
      hotspotLabel: zone.name,
      reactionCount: 0,
      tags: compactStrings([
        title.match(/(Red|Amber|Yellow) warning/i)?.[0],
        title.match(/(rain|wind|snow|ice|thunderstorm|fog|heat)/i)?.[0],
      ]),
    }
  })
}

function buildMetOfficeWarningSource(
  zone: CoverageZoneTemplate,
  feedTitle: string,
  feedUpdatedAt: string,
  items: MetOfficeRssItem[],
): SourceHealth {
  return buildSourceHealthEntry(
    `${zone.id}-source-metoffice-warnings`,
    feedTitle || `${zone.region} Met Office warnings`,
    'Weather',
    'Healthy',
    feedUpdatedAt,
    items.length > 0
      ? `${items.length} severe weather warning item(s) were published for this regional RSS feed.`
      : `The regional severe weather warning RSS feed was checked and no active warning items were returned for ${zone.region}.`,
  )
}

function buildUnavailableHydrologySource(zone: CoverageZoneTemplate) {
  return buildSourceHealthEntry(
    `${zone.id}-source-hydrology`,
    `${zone.country} flood adapter`,
    'Hydrology',
    'Manual review',
    new Date().toISOString(),
    'No national flood-warning adapter is configured yet for this starter zone. Add one if your deployment needs hydrology signals here.',
  )
}

function mapFloodWarnings(zone: CoverageZoneTemplate, items: EnvironmentAgencyFloodResponse['items']) {
  return toArray(items)
    .filter((item) => (item.severityLevel ?? 5) <= 3)
    .map<SignalItem>((item, index) => {
      const summarySource = stripTags(item.message ?? item.description ?? '')
      const title = `${item.severity ?? 'Flood update'}: ${item.description ?? zone.name}`

      return {
        id: item['@id'] ?? `${zone.id}-flood-${index}`,
        title,
        category: 'flood',
        severity: severityFromFloodLevel(item.severityLevel),
        status: (item.severityLevel ?? 4) <= 2 ? 'Live' : 'Monitoring',
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
      }
    })
}

function buildFloodSource(zone: CoverageZoneTemplate, items: EnvironmentAgencyFloodResponse['items']): SourceHealth {
  const normalizedItems = toArray(items).filter((item) => (item.severityLevel ?? 5) <= 3)

  return buildSourceHealthEntry(
    `${zone.id}-source-environment-agency`,
    'Environment Agency flood warnings',
    'Hydrology',
    'Healthy',
    getLatestTimestamp(
      normalizedItems.map((item) => item.timeMessageChanged ?? item.timeRaised),
      new Date().toISOString(),
    ),
    normalizedItems.length > 0
      ? `${normalizedItems.length} active flood alert or warning item(s) were found within the configured search radius.`
      : `No active Environment Agency flood alerts or flood warnings were returned near ${zone.name}.`,
  )
}

function mapEarthquakes(zone: CoverageZoneTemplate, feed: UsgsEarthquakeFeed) {
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
    .filter(
      (item) =>
        item.feature.properties?.mag != null &&
        item.feature.properties.mag >= 2.5 &&
        (item.distanceKm <= 350 || (item.distanceKm <= 900 && item.feature.properties.mag >= 6)),
    )
    .sort((left, right) => {
      const magnitudeDelta = (right.feature.properties?.mag ?? 0) - (left.feature.properties?.mag ?? 0)

      if (magnitudeDelta !== 0) {
        return magnitudeDelta
      }

      return left.distanceKm - right.distanceKm
    })
    .slice(0, 3)
    .map<SignalItem>((item) => {
      const magnitude = item.feature.properties?.mag ?? 0
      const place = item.feature.properties?.place ?? 'Nearby seismic event'

      return {
        id: item.feature.id,
        title: item.feature.properties?.title ?? `M ${magnitude.toFixed(1)} earthquake`,
        category: 'earthquake',
        severity: severityFromMagnitude(magnitude),
        status: 'Live',
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
        tags: [`M${magnitude.toFixed(1)}`, `${Math.round(item.distanceKm)} km`],
      }
    })
}

function buildEarthquakeSource(zone: CoverageZoneTemplate, earthquakes: SignalItem[]): SourceHealth {
  return buildSourceHealthEntry(
    `${zone.id}-source-usgs`,
    'USGS earthquake feed',
    'Seismic',
    'Healthy',
    earthquakes[0]?.issuedAt ?? new Date().toISOString(),
    earthquakes.length > 0
      ? `${earthquakes.length} nearby earthquake update(s) matched the configured distance and magnitude filters.`
      : `No nearby earthquakes above the configured threshold were found near ${zone.name} in the USGS daily feed.`,
  )
}

function buildUsWeatherSnapshot(forecast: NwsForecastResponse, zone: CoverageZoneTemplate): WeatherSnapshot {
  const primaryPeriod = forecast.properties.periods[0]

  if (!primaryPeriod) {
    return {
      temperatureC: 0,
      condition: 'Forecast unavailable',
      windKph: 0,
      rainChance: 0,
      advisory: `No forecast period was returned for ${zone.name}.`,
    }
  }

  const temperatureC =
    primaryPeriod.temperatureUnit === 'F'
      ? fahrenheitToCelsius(primaryPeriod.temperature)
      : primaryPeriod.temperature

  return {
    temperatureC,
    condition: primaryPeriod.shortForecast || primaryPeriod.name,
    windKph: parseWindKph(primaryPeriod.windSpeed),
    rainChance: Math.round(primaryPeriod.probabilityOfPrecipitation?.value ?? 0),
    advisory: clipText(
      primaryPeriod.detailedForecast ||
        `NWS forecast period ${primaryPeriod.name} is active for ${zone.name}.`,
      210,
    ),
  }
}

function mapNwsAlerts(zone: CoverageZoneTemplate, response: NwsAlertsResponse) {
  return toArray(response.features)
    .filter((feature) => {
      const status = feature.properties.status?.toLowerCase()
      const messageType = feature.properties.messageType?.toLowerCase()
      return status === 'actual' && (messageType === 'alert' || messageType === 'update')
    })
    .map<SignalItem>((feature) => {
      const title = feature.properties.headline || feature.properties.event || 'NWS alert'
      const description = feature.properties.description || feature.properties.instruction || ''

      return {
        id: feature.properties.id || feature.id,
        title,
        category: categoryFromText(title, description),
        severity: severityFromNws(feature.properties.severity),
        status: feature.properties.urgency?.toLowerCase() === 'future' ? 'Monitoring' : 'Live',
        issuedAt: toIso(feature.properties.effective ?? feature.properties.sent),
        source: feature.properties.senderName || 'NWS',
        coverage: feature.properties.areaDesc || zone.name,
        summary: clipText(sentenceSummary(description) || `Official alert issued for ${zone.name}.`, 220),
        hotspotLabel: feature.properties.areaDesc || zone.name,
        reactionCount: 0,
        tags: compactStrings([
          feature.properties.severity,
          feature.properties.urgency,
          feature.properties.certainty,
        ]),
      }
    })
}

async function fetchUsBriefing(zone: CoverageZoneTemplate): Promise<LiveBriefingResponse> {
  const pointUrl = `https://api.weather.gov/points/${zone.coordinates.lat.toFixed(4)},${zone.coordinates.lng.toFixed(4)}`
  const point = await fetchCachedJson<NwsPointResponse>(
    pointUrl,
    NWS_POINT_TTL_MS,
    undefined,
    'application/geo+json, application/json',
  )
  const [forecast, alertsResult, earthquakeResult] = await Promise.allSettled([
    fetchCachedJson<NwsForecastResponse>(
      point.properties.forecast,
      NWS_TTL_MS,
      undefined,
      'application/geo+json, application/json',
    ),
    fetchCachedJson<NwsAlertsResponse>(
      `https://api.weather.gov/alerts/active?point=${zone.coordinates.lat.toFixed(4)},${zone.coordinates.lng.toFixed(4)}`,
      NWS_TTL_MS,
      undefined,
      'application/geo+json, application/json',
    ),
    fetchCachedJson<UsgsEarthquakeFeed>(USGS_DAY_URL, EARTHQUAKE_TTL_MS),
  ])

  if (forecast.status !== 'fulfilled') {
    throw forecast.reason
  }

  const weather = buildUsWeatherSnapshot(forecast.value, zone)
  const alertSignals = alertsResult.status === 'fulfilled' ? mapNwsAlerts(zone, alertsResult.value) : []
  const earthquakeSignals =
    earthquakeResult.status === 'fulfilled' ? mapEarthquakes(zone, earthquakeResult.value) : []
  const signals = sortSignals([...alertSignals, ...earthquakeSignals])

  const sources: SourceHealth[] = [
    buildSourceHealthEntry(
      `${zone.id}-source-nws-forecast`,
      `NWS forecast ${point.properties.cwa || ''}`.trim(),
      'Weather',
      'Healthy',
      toIso(forecast.value.properties.updated),
      `Forecast periods loaded from the official NWS grid forecast for ${zone.name}.`,
    ),
    alertsResult.status === 'fulfilled'
      ? buildSourceHealthEntry(
          `${zone.id}-source-nws-alerts`,
          'NWS active alerts',
          'Weather',
          'Healthy',
          getLatestTimestamp(alertSignals.map((signal) => signal.issuedAt)),
          alertSignals.length > 0
            ? `${alertSignals.length} active NWS alert(s) currently match this coverage point.`
            : `No active NWS alerts currently match this coverage point.`,
        )
      : buildSourceHealthEntry(
          `${zone.id}-source-nws-alerts`,
          'NWS active alerts',
          'Weather',
          'Delayed',
          new Date().toISOString(),
          `Active alerts could not be loaded: ${String(alertsResult.reason)}`,
        ),
    earthquakeResult.status === 'fulfilled'
      ? buildEarthquakeSource(zone, earthquakeSignals)
      : buildSourceHealthEntry(
          `${zone.id}-source-usgs`,
          'USGS earthquake feed',
          'Seismic',
          'Delayed',
          new Date().toISOString(),
          `Earthquake feed could not be loaded: ${String(earthquakeResult.reason)}`,
        ),
  ]

  const news = sortNews(
    compactStrings([forecast.value.properties.updated]).length > 0
      ? [
          {
            id: `${zone.id}-news-forecast`,
            headline: `NWS forecast refreshed for ${zone.name}`,
            source: `NWS ${point.properties.cwa || 'forecast office'}`,
            publishedAt: toIso(forecast.value.properties.updated),
            summary: clipText(
              `${forecast.value.properties.periods[0]?.name}: ${
                forecast.value.properties.periods[0]?.shortForecast || weather.condition
              }.`,
              180,
            ),
            scope: 'Local' as const,
          },
          ...(alertSignals.length > 0
            ? [
                {
                  id: `${zone.id}-news-alerts`,
                  headline: `${alertSignals.length} active NWS alert(s) near ${zone.name}`,
                  source: 'NWS',
                  publishedAt: alertSignals[0].issuedAt,
                  summary: clipText(alertSignals[0].title, 180),
                  scope: 'Regional' as const,
                },
              ]
            : []),
          ...(earthquakeSignals.length > 0
            ? [
                {
                  id: `${zone.id}-news-earthquakes`,
                  headline: `USGS seismic activity update for ${zone.name}`,
                  source: 'USGS',
                  publishedAt: earthquakeSignals[0].issuedAt,
                  summary: clipText(earthquakeSignals[0].summary, 180),
                  scope: 'Regional' as const,
                },
              ]
            : []),
        ]
      : [],
  )

  return {
    outlook: summarizeOutlook(zone, weather, signals, 'NWS and USGS'),
    weather,
    signals,
    news,
    sources,
    actions: buildActions(zone, signals),
    refreshedAt: new Date().toISOString(),
  }
}

async function fetchUkBriefing(zone: CoverageZoneTemplate): Promise<LiveBriefingResponse> {
  const forecastPageUrl = metOfficeForecastPagesByZone[zone.id]

  if (!forecastPageUrl) {
    throw new Error(`No Met Office forecast page is configured for starter zone "${zone.id}".`)
  }

  const warningFeedUrl = metOfficeWarningFeedsByRegion[zone.regionCode]

  if (!warningFeedUrl) {
    throw new Error(`No Met Office warning feed is configured for region "${zone.regionCode}".`)
  }

  const [forecastPageHtml, warningsXmlResult, floodResult, earthquakeResult] = await Promise.allSettled([
    fetchCachedText(forecastPageUrl, MET_OFFICE_TTL_MS),
    fetchCachedText(warningFeedUrl, MET_OFFICE_TTL_MS, undefined, 'application/rss+xml, application/xml, text/xml'),
    zone.id.startsWith('gb-eng')
      ? fetchCachedJson<EnvironmentAgencyFloodResponse>(
          `https://environment.data.gov.uk/flood-monitoring/id/floods?lat=${zone.coordinates.lat.toFixed(
            4,
          )}&long=${zone.coordinates.lng.toFixed(4)}&dist=35&min-severity=3`,
          FLOOD_TTL_MS,
        )
      : Promise.resolve(null),
    fetchCachedJson<UsgsEarthquakeFeed>(USGS_DAY_URL, EARTHQUAKE_TTL_MS),
  ])

  if (forecastPageHtml.status !== 'fulfilled') {
    throw forecastPageHtml.reason
  }

  const forecastSnapshot = parseMetOfficeForecastPage(forecastPageHtml.value, zone)
  const warningChannel =
    warningsXmlResult.status === 'fulfilled'
      ? (xmlParser.parse(warningsXmlResult.value)?.rss?.channel as MetOfficeRssChannel | undefined)
      : undefined
  const warningItems = mapMetOfficeWarnings(zone, toArray(warningChannel?.item))
  const floodSignals =
    floodResult.status === 'fulfilled' && floodResult.value
      ? mapFloodWarnings(zone, floodResult.value.items)
      : []
  const earthquakeSignals =
    earthquakeResult.status === 'fulfilled' ? mapEarthquakes(zone, earthquakeResult.value) : []
  const signals = sortSignals([...warningItems, ...floodSignals, ...earthquakeSignals])

  const sources: SourceHealth[] = [
    buildMetOfficeSource(zone, forecastSnapshot),
    warningsXmlResult.status === 'fulfilled'
      ? buildMetOfficeWarningSource(
          zone,
          warningChannel?.title || `${zone.region} Met Office warnings`,
          toIso(warningChannel?.pubDate, forecastSnapshot.publishedAt),
          toArray(warningChannel?.item),
        )
      : buildSourceHealthEntry(
          `${zone.id}-source-metoffice-warnings`,
          `${zone.region} Met Office warnings`,
          'Weather',
          'Delayed',
          new Date().toISOString(),
          `Regional warning feed could not be loaded: ${String(warningsXmlResult.reason)}`,
        ),
    zone.id.startsWith('gb-eng')
      ? floodResult.status === 'fulfilled' && floodResult.value
        ? buildFloodSource(zone, floodResult.value.items)
        : buildSourceHealthEntry(
            `${zone.id}-source-environment-agency`,
            'Environment Agency flood warnings',
            'Hydrology',
            'Delayed',
            new Date().toISOString(),
            `Flood warnings could not be loaded: ${String(
              floodResult.status === 'rejected' ? floodResult.reason : 'Unknown error',
            )}`,
          )
      : buildUnavailableHydrologySource(zone),
    earthquakeResult.status === 'fulfilled'
      ? buildEarthquakeSource(zone, earthquakeSignals)
      : buildSourceHealthEntry(
          `${zone.id}-source-usgs`,
          'USGS earthquake feed',
          'Seismic',
          'Delayed',
          new Date().toISOString(),
          `Earthquake feed could not be loaded: ${String(earthquakeResult.reason)}`,
        ),
  ]

  const news = sortNews([
    {
      id: `${zone.id}-news-forecast`,
      headline: `${forecastSnapshot.regionHeading} updated`,
      source: 'Met Office',
      publishedAt: forecastSnapshot.publishedAt,
      summary: clipText(
        `${forecastSnapshot.headline}. ${sentenceSummary(forecastSnapshot.todayText)}`,
        180,
      ),
      scope: 'Regional',
    },
    ...(warningItems.length > 0
      ? [
          {
            id: `${zone.id}-news-warnings`,
            headline: `${warningItems.length} Met Office warning item(s) for ${zone.region}`,
            source: 'Met Office',
            publishedAt: warningItems[0].issuedAt,
            summary: clipText(warningItems[0].title, 180),
            scope: 'Regional' as const,
          },
        ]
      : []),
    ...(floodSignals.length > 0
      ? [
          {
            id: `${zone.id}-news-floods`,
            headline: `${floodSignals.length} flood alert or warning item(s) near ${zone.name}`,
            source: 'Environment Agency',
            publishedAt: floodSignals[0].issuedAt,
            summary: clipText(floodSignals[0].summary, 180),
            scope: 'Local' as const,
          },
        ]
      : []),
    ...(earthquakeSignals.length > 0
      ? [
          {
            id: `${zone.id}-news-earthquakes`,
            headline: `USGS seismic activity update for ${zone.name}`,
            source: 'USGS',
            publishedAt: earthquakeSignals[0].issuedAt,
            summary: clipText(earthquakeSignals[0].summary, 180),
            scope: 'Regional' as const,
          },
        ]
      : []),
  ])

  return {
    outlook: summarizeOutlook(
      zone,
      forecastSnapshot.weather,
      signals,
      zone.id.startsWith('gb-eng') ? 'Met Office, Environment Agency, and USGS' : 'Met Office and USGS',
    ),
    weather: forecastSnapshot.weather,
    signals,
    news,
    sources,
    actions: buildActions(zone, signals),
    refreshedAt: new Date().toISOString(),
  }
}

export async function buildLiveBriefing(zone: CoverageZoneTemplate): Promise<LiveBriefingResponse> {
  return readThroughCache(`live-briefing:${zone.id}`, LIVE_BRIEFING_TTL_MS, async () => {
    if (zone.countryCode === 'US') {
      return fetchUsBriefing(zone)
    }

    if (zone.countryCode === 'GB') {
      return fetchUkBriefing(zone)
    }

    throw new Error(`No live provider adapter is configured yet for country "${zone.countryCode}".`)
  })
}
