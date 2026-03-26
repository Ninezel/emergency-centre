import { XMLParser } from 'fast-xml-parser'
import type { CoverageZoneTemplate, WeatherSnapshot } from '../../../src/types.js'
import { fetchCachedText } from '../providerCache.js'
import {
  buildSourceHealthEntry,
  categoryFromText,
  clipText,
  compactStrings,
  fallbackRainChance,
  getProviderConfig,
  mphToKph,
  parseNumberList,
  parsePercent,
  severityFromMetOffice,
  sentenceSummary,
  stripTags,
  toArray,
  toIso,
  type ProviderContribution,
} from './shared.js'

const MET_OFFICE_TTL_MS = 600_000

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
  trimValues: true,
})

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

export function matchFirstGroup(source: string, pattern: RegExp, groupName: string) {
  const match = source.match(pattern)
  return match?.groups?.[groupName]?.trim() ?? null
}

export function parseMetOfficeForecastPage(html: string, zone: CoverageZoneTemplate): MetOfficeForecastSnapshot {
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

export function parseMetOfficeWarningChannel(xml: string) {
  return xmlParser.parse(xml)?.rss?.channel as MetOfficeRssChannel | undefined
}

export function mapMetOfficeWarnings(zone: CoverageZoneTemplate, items: MetOfficeRssItem[]) {
  return items.map((item, index) => {
    const title = stripTags(item.title ?? 'Met Office severe weather warning')
    const description = stripTags(item.description ?? '')

    return {
      id: item.guid || item.link || `${zone.id}-metoffice-warning-${index}`,
      title,
      category: categoryFromText(title, description),
      severity: severityFromMetOffice(`${title} ${description}`),
      status: 'Live' as const,
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
      link: item.link,
    }
  })
}

export async function fetchMetOfficeProvider(zone: CoverageZoneTemplate): Promise<ProviderContribution> {
  const provider = getProviderConfig(zone, 'met-office')

  if (!provider) {
    throw new Error(`Zone "${zone.id}" is missing the Met Office provider configuration.`)
  }

  const [forecastPageHtml, warningsXmlResult] = await Promise.allSettled([
    fetchCachedText(provider.forecastPageUrl, MET_OFFICE_TTL_MS),
    fetchCachedText(provider.warningsUrl, MET_OFFICE_TTL_MS, undefined, 'application/rss+xml, application/xml, text/xml'),
  ])

  if (forecastPageHtml.status !== 'fulfilled') {
    throw forecastPageHtml.reason
  }

  const forecastSnapshot = parseMetOfficeForecastPage(forecastPageHtml.value, zone)
  const warningChannel =
    warningsXmlResult.status === 'fulfilled'
      ? parseMetOfficeWarningChannel(warningsXmlResult.value)
      : undefined
  const warningItems = mapMetOfficeWarnings(zone, toArray(warningChannel?.item))

  return {
    providerId: provider.id,
    providerLabel: provider.label,
    weather: forecastSnapshot.weather,
    signals: warningItems,
    news: [
      {
        id: `${zone.id}-news-metoffice-forecast`,
        headline: `${forecastSnapshot.regionHeading} updated`,
        source: 'Met Office',
        publishedAt: forecastSnapshot.publishedAt,
        summary: clipText(`${forecastSnapshot.headline}. ${sentenceSummary(forecastSnapshot.todayText)}`, 180),
        scope: 'Regional',
        link: provider.forecastPageUrl,
      },
      ...(warningItems.length > 0
        ? [
            {
              id: `${zone.id}-news-metoffice-warnings`,
              headline: `${warningItems.length} Met Office warning item(s) for ${zone.region}`,
              source: 'Met Office',
              publishedAt: warningItems[0].issuedAt,
              summary: clipText(warningItems[0].title, 180),
              scope: 'Regional' as const,
              link: warningItems[0].link || provider.warningsUrl,
            },
          ]
        : []),
    ],
    sources: [
      buildSourceHealthEntry({
        id: `${zone.id}-source-metoffice-forecast`,
        name: `${zone.region} Met Office forecast`,
        type: 'Weather',
        status: 'Healthy',
        lastSync: forecastSnapshot.publishedAt,
        note: `Forecast page scraped successfully from the public Met Office forecast page for ${zone.name}.`,
        method: 'Scraped page',
        link: provider.forecastPageUrl,
      }),
      warningsXmlResult.status === 'fulfilled'
        ? buildSourceHealthEntry({
            id: `${zone.id}-source-metoffice-warnings`,
            name: warningChannel?.title || `${zone.region} Met Office warnings`,
            type: 'Weather',
            status: 'Healthy',
            lastSync: toIso(warningChannel?.pubDate, forecastSnapshot.publishedAt),
            note:
              warningItems.length > 0
                ? `${warningItems.length} severe weather warning item(s) were published for this regional RSS feed.`
                : `The regional severe weather warning RSS feed was checked and no active warning items were returned for ${zone.region}.`,
            method: 'RSS',
            link: provider.warningsUrl,
          })
        : buildSourceHealthEntry({
            id: `${zone.id}-source-metoffice-warnings`,
            name: `${zone.region} Met Office warnings`,
            type: 'Weather',
            status: 'Delayed',
            lastSync: new Date().toISOString(),
            note: `Regional warning feed could not be loaded: ${String(warningsXmlResult.reason)}`,
            method: 'RSS',
            link: provider.warningsUrl,
          }),
    ],
    refreshedAt: forecastSnapshot.publishedAt,
  }
}
