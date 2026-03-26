import type { CoverageZoneTemplate, WeatherSnapshot } from '../../../src/types.js'
import { fetchCachedJson } from '../providerCache.js'
import {
  buildSourceHealthEntry,
  categoryFromText,
  clipText,
  compactStrings,
  fahrenheitToCelsius,
  fillTemplate,
  getLatestTimestamp,
  getProviderConfig,
  parseWindKph,
  sentenceSummary,
  severityFromNws,
  toArray,
  toIso,
  type ProviderContribution,
} from './shared.js'

const NWS_TTL_MS = 180_000
const NWS_POINT_TTL_MS = 86_400_000

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

export function buildUsWeatherSnapshot(forecast: NwsForecastResponse, zone: CoverageZoneTemplate): WeatherSnapshot {
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

export function mapNwsAlerts(zone: CoverageZoneTemplate, response: NwsAlertsResponse, alertsUrl: string) {
  return toArray(response.features)
    .filter((feature) => {
      const status = feature.properties.status?.toLowerCase()
      const messageType = feature.properties.messageType?.toLowerCase()
      return status === 'actual' && (messageType === 'alert' || messageType === 'update')
    })
    .map((feature) => {
      const title = feature.properties.headline || feature.properties.event || 'NWS alert'
      const description = feature.properties.description || feature.properties.instruction || ''

      return {
        id: feature.properties.id || feature.id,
        title,
        category: categoryFromText(title, description),
        severity: severityFromNws(feature.properties.severity),
        status:
          feature.properties.urgency?.toLowerCase() === 'future'
            ? ('Monitoring' as const)
            : ('Live' as const),
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
        link: alertsUrl,
      }
    })
}

export async function fetchNwsProvider(zone: CoverageZoneTemplate): Promise<ProviderContribution> {
  const provider = getProviderConfig(zone, 'nws')

  if (!provider) {
    throw new Error(`Zone "${zone.id}" is missing the NWS provider configuration.`)
  }

  const templateValues = {
    lat: zone.coordinates.lat.toFixed(4),
    lng: zone.coordinates.lng.toFixed(4),
  }
  const pointUrl = fillTemplate(provider.pointsUrlTemplate, templateValues)
  const alertsUrl = fillTemplate(provider.alertsUrlTemplate, templateValues)

  const point = await fetchCachedJson<NwsPointResponse>(
    pointUrl,
    NWS_POINT_TTL_MS,
    undefined,
    'application/geo+json, application/json',
  )
  const [forecast, alertsResult] = await Promise.allSettled([
    fetchCachedJson<NwsForecastResponse>(
      point.properties.forecast,
      NWS_TTL_MS,
      undefined,
      'application/geo+json, application/json',
    ),
    fetchCachedJson<NwsAlertsResponse>(alertsUrl, NWS_TTL_MS, undefined, 'application/geo+json, application/json'),
  ])

  if (forecast.status !== 'fulfilled') {
    throw forecast.reason
  }

  const weather = buildUsWeatherSnapshot(forecast.value, zone)
  const alertSignals = alertsResult.status === 'fulfilled' ? mapNwsAlerts(zone, alertsResult.value, alertsUrl) : []
  const refreshedAt = toIso(forecast.value.properties.updated)

  return {
    providerId: provider.id,
    providerLabel: provider.label,
    weather,
    signals: alertSignals,
    news:
      compactStrings([forecast.value.properties.updated]).length > 0
        ? [
            {
              id: `${zone.id}-news-nws-forecast`,
              headline: `NWS forecast refreshed for ${zone.name}`,
              source: `NWS ${point.properties.cwa || 'forecast office'}`,
              publishedAt: refreshedAt,
              summary: clipText(
                `${forecast.value.properties.periods[0]?.name}: ${
                  forecast.value.properties.periods[0]?.shortForecast || weather.condition
                }.`,
                180,
              ),
              scope: 'Local',
              link: point.properties.forecast,
            },
            ...(alertSignals.length > 0
              ? [
                  {
                    id: `${zone.id}-news-nws-alerts`,
                    headline: `${alertSignals.length} active NWS alert(s) near ${zone.name}`,
                    source: 'NWS',
                    publishedAt: alertSignals[0].issuedAt,
                    summary: clipText(alertSignals[0].title, 180),
                    scope: 'Regional' as const,
                    link: alertsUrl,
                  },
                ]
              : []),
          ]
        : [],
    sources: [
      buildSourceHealthEntry({
        id: `${zone.id}-source-nws-forecast`,
        name: `NWS forecast ${point.properties.cwa || ''}`.trim(),
        type: 'Weather',
        status: 'Healthy',
        lastSync: refreshedAt,
        note: `Forecast periods loaded from the official NWS grid forecast for ${zone.name}.`,
        method: 'API',
        link: point.properties.forecast,
      }),
      alertsResult.status === 'fulfilled'
        ? buildSourceHealthEntry({
            id: `${zone.id}-source-nws-alerts`,
            name: 'NWS active alerts',
            type: 'Weather',
            status: 'Healthy',
            lastSync: getLatestTimestamp(alertSignals.map((signal) => signal.issuedAt), refreshedAt),
            note:
              alertSignals.length > 0
                ? `${alertSignals.length} active NWS alert(s) currently match this coverage point.`
                : 'No active NWS alerts currently match this coverage point.',
            method: 'API',
            link: alertsUrl,
          })
        : buildSourceHealthEntry({
            id: `${zone.id}-source-nws-alerts`,
            name: 'NWS active alerts',
            type: 'Weather',
            status: 'Delayed',
            lastSync: new Date().toISOString(),
            note: `Active alerts could not be loaded: ${String(alertsResult.reason)}`,
            method: 'API',
            link: alertsUrl,
          }),
    ],
    refreshedAt,
  }
}
