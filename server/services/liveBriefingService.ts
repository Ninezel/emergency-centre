import type { CoverageZoneProviderConfig, CoverageZoneTemplate, LiveBriefingResponse } from '../../src/types.js'
import { readBriefingSnapshot } from './briefingSnapshotStore.js'
import { fetchEnvironmentAgencyProvider } from './providers/environmentAgencyProvider.js'
import { fetchMetOfficeProvider } from './providers/metOfficeProvider.js'
import { fetchNwsProvider } from './providers/nwsProvider.js'
import {
  buildActions,
  buildProviderFailureSource,
  countHealthySources,
  formatProviderLabelList,
  sortNews,
  sortSignals,
  summarizeOutlook,
  type ProviderContribution,
} from './providers/shared.js'
import { fetchUsgsProvider } from './providers/usgsProvider.js'

const LIVE_BRIEFING_TTL_MS = 120_000

const providerHandlers: Record<
  CoverageZoneProviderConfig['id'],
  (zone: CoverageZoneTemplate) => Promise<ProviderContribution>
> = {
  nws: fetchNwsProvider,
  'met-office': fetchMetOfficeProvider,
  'environment-agency': fetchEnvironmentAgencyProvider,
  usgs: fetchUsgsProvider,
}

async function composeLiveBriefing(zone: CoverageZoneTemplate): Promise<LiveBriefingResponse> {
  const providerResults = await Promise.allSettled(
    zone.providers.map(async (provider) => ({
      provider,
      contribution: await providerHandlers[provider.id](zone),
    })),
  )
  const fulfilledResults = providerResults.filter(
    (result): result is PromiseFulfilledResult<{ provider: CoverageZoneProviderConfig; contribution: ProviderContribution }> =>
      result.status === 'fulfilled',
  )
  const fulfilledEntries = fulfilledResults.map((result) => result.value)
  const rejectedResults = providerResults
    .map((result, index) => ({ result, provider: zone.providers[index] }))
    .filter(
      (
        entry,
      ): entry is {
        result: PromiseRejectedResult
        provider: CoverageZoneProviderConfig
      } => entry.result.status === 'rejected',
    )

  const weatherContribution = fulfilledEntries.find((result) => result.contribution.weather)

  if (!weatherContribution?.contribution.weather) {
    const firstFailure = rejectedResults[0]?.result.reason
    throw firstFailure instanceof Error ? firstFailure : new Error(String(firstFailure ?? 'No live weather provider succeeded.'))
  }

  const signals = sortSignals(fulfilledEntries.flatMap((result) => result.contribution.signals))
  const news = sortNews(fulfilledEntries.flatMap((result) => result.contribution.news))
  const sources = [
    ...fulfilledEntries.flatMap((result) => result.contribution.sources),
    ...rejectedResults.map((entry) => buildProviderFailureSource(zone, entry.provider, entry.result.reason)),
  ]
  const refreshedAt = new Date().toISOString()
  const providerLabels = fulfilledEntries.map((result) => result.provider.label)
  const successfulSourceCount = countHealthySources(sources)

  return {
    outlook: summarizeOutlook(zone, weatherContribution.contribution.weather, signals, providerLabels),
    weather: weatherContribution.contribution.weather,
    signals,
    news,
    sources,
    actions: buildActions(zone, signals),
    refreshedAt,
    freshness: {
      status: 'live',
      checkedAt: refreshedAt,
      snapshotAgeMinutes: 0,
      message: `Live provider data refreshed successfully from ${formatProviderLabelList(providerLabels)}. ${successfulSourceCount} source${successfulSourceCount === 1 ? '' : 's'} reported healthy status.`,
    },
  }
}

export async function buildLiveBriefing(zone: CoverageZoneTemplate): Promise<LiveBriefingResponse> {
  return readBriefingSnapshot(`live-briefing:${zone.id}`, LIVE_BRIEFING_TTL_MS, async () => composeLiveBriefing(zone))
}
