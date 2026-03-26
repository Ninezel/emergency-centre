import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { coverageCatalogData } from '../src/data/coverageCatalogData'
import { readBriefingSnapshot } from '../server/services/briefingSnapshotStore'
import { mapFloodWarnings } from '../server/services/providers/environmentAgencyProvider'
import {
  mapMetOfficeWarnings,
  parseMetOfficeForecastPage,
  parseMetOfficeWarningChannel,
} from '../server/services/providers/metOfficeProvider'
import { buildUsWeatherSnapshot, mapNwsAlerts } from '../server/services/providers/nwsProvider'
import { mapEarthquakes } from '../server/services/providers/usgsProvider'

const fixturesPath = resolve(import.meta.dirname, 'fixtures')
const londonZone = coverageCatalogData.find((zone) => zone.id === 'gb-eng-greater-london-central')!
const sanFranciscoZone = coverageCatalogData.find((zone) => zone.id === 'us-ca-san-francisco-bay')!

function loadFixture(name: string) {
  return readFileSync(resolve(fixturesPath, name), 'utf8')
}

describe('provider parsers', () => {
  it('parses Met Office forecast pages into a weather snapshot', () => {
    const snapshot = parseMetOfficeForecastPage(loadFixture('met-office-forecast.html'), londonZone)

    expect(snapshot.regionHeading).toContain('London')
    expect(snapshot.weather.temperatureC).toBe(13)
    expect(snapshot.weather.windKph).toBeGreaterThan(25)
    expect(snapshot.weather.rainChance).toBe(80)
    expect(snapshot.weather.condition).toContain('Heavy rain moving east')
  })

  it('parses Met Office warning RSS items into signal cards', () => {
    const channel = parseMetOfficeWarningChannel(loadFixture('met-office-warnings.xml'))
    const warningSignals = mapMetOfficeWarnings(londonZone, Array.isArray(channel?.item) ? channel.item : [])

    expect(warningSignals).toHaveLength(2)
    expect(warningSignals[0].severity).toBe('High')
    expect(warningSignals[0].category).toBe('flood')
    expect(warningSignals[1].severity).toBe('Moderate')
    expect(warningSignals[0].link).toContain('amber-rain')
  })

  it('maps NWS forecast periods and active alerts', () => {
    const forecast = JSON.parse(loadFixture('nws-forecast.json'))
    const alerts = JSON.parse(loadFixture('nws-alerts.json'))
    const weather = buildUsWeatherSnapshot(forecast, sanFranciscoZone)
    const signals = mapNwsAlerts(
      sanFranciscoZone,
      alerts,
      'https://api.weather.gov/alerts/active?point=37.7749,-122.4194',
    )

    expect(weather.temperatureC).toBeGreaterThan(16)
    expect(weather.windKph).toBeGreaterThan(30)
    expect(weather.rainChance).toBe(35)
    expect(signals).toHaveLength(1)
    expect(signals[0].severity).toBe('High')
    expect(signals[0].status).toBe('Live')
  })

  it('filters Environment Agency flood items to active warnings only', () => {
    const payload = JSON.parse(loadFixture('environment-agency-floods.json'))
    const signals = mapFloodWarnings(londonZone, payload.items)

    expect(signals).toHaveLength(1)
    expect(signals[0].category).toBe('flood')
    expect(signals[0].severity).toBe('High')
    expect(signals[0].status).toBe('Live')
  })

  it('filters USGS earthquakes by distance and magnitude rules', () => {
    const payload = JSON.parse(loadFixture('usgs-earthquakes.json'))
    const signals = mapEarthquakes(sanFranciscoZone, payload)

    expect(signals).toHaveLength(2)
    expect(signals[0].severity).toBe('Critical')
    expect(signals[1].severity).toBe('Moderate')
    expect(signals[0].link).toContain('ci402')
  })
})

describe('briefing snapshot store', () => {
  it('returns stale snapshots while a background refresh is in flight', async () => {
    let callCount = 0

    const loader = async () => {
      callCount += 1

      if (callCount === 1) {
        return {
          outlook: 'Live data',
          weather: {
            temperatureC: 10,
            condition: 'Cloudy',
            windKph: 20,
            rainChance: 30,
            advisory: 'Cloud cover remains in place.',
          },
          signals: [],
          news: [],
          sources: [],
          actions: [],
          refreshedAt: new Date(Date.now() - 180_000).toISOString(),
          freshness: {
            status: 'live' as const,
            checkedAt: new Date().toISOString(),
            snapshotAgeMinutes: 0,
            message: 'Live provider data refreshed successfully.',
          },
        }
      }

      await new Promise((resolvePromise) => {
        setTimeout(resolvePromise, 25)
      })

      return {
        outlook: 'Refreshed data',
        weather: {
          temperatureC: 11,
          condition: 'Clearing',
          windKph: 18,
          rainChance: 10,
          advisory: 'Conditions are improving.',
        },
        signals: [],
        news: [],
        sources: [],
        actions: [],
        refreshedAt: new Date().toISOString(),
        freshness: {
          status: 'live' as const,
          checkedAt: new Date().toISOString(),
          snapshotAgeMinutes: 0,
          message: 'Live provider data refreshed successfully.',
        },
      }
    }

    const fresh = await readBriefingSnapshot('test-snapshot', 1, loader)
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 5)
    })
    const stale = await readBriefingSnapshot('test-snapshot', 1, loader)

    expect(fresh.freshness.status).toBe('live')
    expect(stale.freshness.status).toBe('stale')
    expect(stale.outlook).toBe('Live data')
  })
})
