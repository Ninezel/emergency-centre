import type { LiveBriefingResponse, LocationProfile } from '../types'

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeFreshness(value: unknown): LiveBriefingResponse['freshness'] {
  if (!value || typeof value !== 'object') {
    return {
      status: 'live',
      checkedAt: new Date().toISOString(),
      snapshotAgeMinutes: 0,
      message: 'Live provider data refreshed successfully.',
    }
  }

  const candidate = value as Partial<LiveBriefingResponse['freshness']>

  return {
    status: candidate.status === 'stale' ? 'stale' : 'live',
    checkedAt:
      typeof candidate.checkedAt === 'string' && candidate.checkedAt.trim()
        ? candidate.checkedAt
        : new Date().toISOString(),
    snapshotAgeMinutes: Math.max(0, Number(candidate.snapshotAgeMinutes) || 0),
    message:
      typeof candidate.message === 'string' && candidate.message.trim()
        ? candidate.message
        : 'Live provider data refreshed successfully.',
  }
}

export async function fetchLiveBriefing(profile: LocationProfile): Promise<LiveBriefingResponse> {
  const response = await fetch(profile.briefingUrl, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Feed request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as Partial<LiveBriefingResponse> & {
    hazards?: unknown
  }

  if (!payload.outlook || !payload.weather) {
    throw new Error('Feed response is missing required briefing fields.')
  }

  return {
    outlook: payload.outlook,
    weather: payload.weather,
    signals: ensureArray(payload.signals ?? payload.hazards),
    news: ensureArray(payload.news),
    sources: ensureArray(payload.sources),
    actions: ensureArray(payload.actions),
    refreshedAt: payload.refreshedAt,
    freshness: normalizeFreshness(payload.freshness),
  }
}
