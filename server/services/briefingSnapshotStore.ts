import type { BriefingFreshnessStatus, LiveBriefingResponse } from '../../src/types.js'

interface SnapshotEntry {
  briefing: LiveBriefingResponse
  expiresAt: number
  lastFailure: string | null
  refreshPromise: Promise<void> | null
}

const snapshotEntries = new Map<string, SnapshotEntry>()

function computeSnapshotAgeMinutes(briefing: LiveBriefingResponse) {
  const refreshedAt = briefing.refreshedAt ? Date.parse(briefing.refreshedAt) : Number.NaN

  if (!Number.isFinite(refreshedAt)) {
    return 0
  }

  return Math.max(0, Math.round((Date.now() - refreshedAt) / 60_000))
}

function withFreshness(
  briefing: LiveBriefingResponse,
  status: BriefingFreshnessStatus,
  message: string,
): LiveBriefingResponse {
  return {
    ...briefing,
    freshness: {
      status,
      checkedAt: new Date().toISOString(),
      snapshotAgeMinutes: computeSnapshotAgeMinutes(briefing),
      message,
    },
  }
}

function storeSnapshot(cacheKey: string, briefing: LiveBriefingResponse, ttlMs: number) {
  const currentEntry = snapshotEntries.get(cacheKey)
  snapshotEntries.set(cacheKey, {
    briefing,
    expiresAt: Date.now() + ttlMs,
    lastFailure: null,
    refreshPromise: currentEntry?.refreshPromise ?? null,
  })
}

export async function readBriefingSnapshot(
  cacheKey: string,
  ttlMs: number,
  loader: () => Promise<LiveBriefingResponse>,
) {
  const existingEntry = snapshotEntries.get(cacheKey)

  if (!existingEntry) {
    const briefing = await loader()
    storeSnapshot(cacheKey, briefing, ttlMs)
    return withFreshness(briefing, 'live', 'Live provider data refreshed successfully.')
  }

  if (existingEntry.expiresAt > Date.now()) {
    return withFreshness(existingEntry.briefing, 'live', 'Live provider snapshot is current.')
  }

  if (!existingEntry.refreshPromise) {
    existingEntry.refreshPromise = loader()
      .then((briefing) => {
        snapshotEntries.set(cacheKey, {
          briefing,
          expiresAt: Date.now() + ttlMs,
          lastFailure: null,
          refreshPromise: null,
        })
      })
      .catch((error) => {
        const nextEntry = snapshotEntries.get(cacheKey)

        if (!nextEntry) {
          return
        }

        nextEntry.lastFailure = error instanceof Error ? error.message : String(error)
        nextEntry.refreshPromise = null
      })
  }

  return withFreshness(
    existingEntry.briefing,
    'stale',
    existingEntry.lastFailure
      ? `Serving the last-known-good snapshot while providers retry in the background. Last refresh error: ${existingEntry.lastFailure}`
      : 'Serving the last-known-good snapshot while providers refresh in the background.',
  )
}
