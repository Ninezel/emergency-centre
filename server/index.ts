import express from 'express'
import { buildDemoBriefing } from './services/demoBriefingService.js'
import { buildLiveBriefing } from './services/liveBriefingService.js'
import {
  getCoverageZoneById,
  listCoverageCountries,
  listCoverageRegions,
  listCoverageZones,
  lookupCoverageZones,
} from './services/catalogService.js'

const app = express()
const port = Number.parseInt(process.env.EC_API_PORT ?? '8787', 10)

app.disable('x-powered-by')

app.get('/api', (_request, response) => {
  response.json({
    service: 'emergency-centre-api',
    version: '0.1.0',
    endpoints: [
      '/api/health',
      '/api/catalog/countries',
      '/api/catalog/regions?country=GB',
      '/api/catalog/zones?country=GB&region=greater-london',
      '/api/catalog/lookup?q=SW1A%201AA&country=GB',
      '/api/catalog/zones/:zoneId',
      '/api/briefings/live/:zoneId',
      '/api/briefings/demo/:zoneId',
    ],
  })
})

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'emergency-centre-api',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/catalog/countries', (_request, response) => {
  response.json({
    countries: listCoverageCountries(),
  })
})

app.get('/api/catalog/regions', (request, response) => {
  const country = typeof request.query.country === 'string' ? request.query.country : null

  response.json({
    regions: listCoverageRegions(country),
  })
})

app.get('/api/catalog/zones', (request, response) => {
  const country = typeof request.query.country === 'string' ? request.query.country : null
  const region = typeof request.query.region === 'string' ? request.query.region : null

  response.json({
    zones: listCoverageZones(country, region),
  })
})

app.get('/api/catalog/lookup', (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : ''
  const country = typeof request.query.country === 'string' ? request.query.country : null

  response.json({
    query,
    country,
    results: lookupCoverageZones(query, country),
  })
})

app.get('/api/catalog/zones/:zoneId', (request, response) => {
  const zone = getCoverageZoneById(request.params.zoneId)

  if (!zone) {
    response.status(404).json({
      error: 'coverage_zone_not_found',
      message: `No built-in coverage zone was found for "${request.params.zoneId}".`,
    })
    return
  }

  response.json({
    zone,
  })
})

app.get('/api/briefings/demo/:zoneId', (request, response) => {
  const zone = getCoverageZoneById(request.params.zoneId)

  if (!zone) {
    response.status(404).json({
      error: 'briefing_zone_not_found',
      message: `No demo briefing is available for "${request.params.zoneId}".`,
    })
    return
  }

  response.json(buildDemoBriefing(zone))
})

app.get('/api/briefings/live/:zoneId', async (request, response) => {
  const zone = getCoverageZoneById(request.params.zoneId)

  if (!zone) {
    response.status(404).json({
      error: 'briefing_zone_not_found',
      message: `No live briefing is available for "${request.params.zoneId}".`,
    })
    return
  }

  try {
    const briefing = await buildLiveBriefing(zone)
    response.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    response.set('X-EC-Data-State', briefing.freshness.status)
    response.json(briefing)
  } catch (error) {
    response.status(502).json({
      error: 'live_briefing_fetch_failed',
      message: `Live providers could not be loaded for "${request.params.zoneId}".`,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
})

app.listen(port, () => {
  console.log(`Emergency Centre API listening on http://localhost:${port}`)
})
