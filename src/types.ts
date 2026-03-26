export type SignalCategory =
  | 'weather'
  | 'storm'
  | 'flood'
  | 'earthquake'
  | 'wildfire'
  | 'heat'
  | 'air-quality'
  | 'infrastructure'
  | 'transport'
  | 'airspace'
  | 'public-safety'
  | 'civil-defense'
  | 'other'

export type HazardCategory = SignalCategory

export type Severity = 'Critical' | 'High' | 'Moderate' | 'Advisory'
export type LocationMode = 'directory' | 'search' | 'suggestion'
export type FeedFetchStatus = 'idle' | 'syncing' | 'live' | 'error'
export type UnitSystem = 'metric' | 'imperial'
export type SourceTransport = 'API' | 'RSS' | 'Scraped page' | 'Derived'
export type BriefingFreshnessStatus = 'live' | 'stale'

export interface Coordinates {
  lat: number
  lng: number
}

export interface WeatherSnapshot {
  temperatureC: number
  condition: string
  windKph: number
  rainChance: number
  advisory: string
}

export interface NewsItem {
  id: string
  headline: string
  source: string
  publishedAt: string
  summary: string
  scope: 'Local' | 'Regional' | 'National' | 'Global'
  link?: string
}

export interface SignalItem {
  id: string
  title: string
  category: SignalCategory
  severity: Severity
  status: 'Live' | 'Monitoring' | 'Recovery'
  issuedAt: string
  source: string
  coverage: string
  summary: string
  hotspotLabel: string
  reactionCount: number
  tags: string[]
  link?: string
}

export type HazardSignal = SignalItem

export interface SourceHealth {
  id: string
  name: string
  type:
    | 'Weather'
    | 'Hydrology'
    | 'Seismic'
    | 'Wildfire'
    | 'Airspace'
    | 'Transport'
    | 'Infrastructure'
    | 'News'
    | 'Civil'
    | 'Other'
  status: 'Healthy' | 'Delayed' | 'Manual review'
  lastSync: string
  note: string
  method?: SourceTransport
  link?: string
  fetchedAt?: string
}

export interface ReadinessAction {
  id: string
  title: string
  description: string
  whenToUse: string
}

export interface BriefingFreshness {
  status: BriefingFreshnessStatus
  checkedAt: string
  snapshotAgeMinutes: number
  message: string
}

export interface NwsZoneProviderConfig {
  id: 'nws'
  label: string
  pointsUrlTemplate: string
  alertsUrlTemplate: string
}

export interface MetOfficeZoneProviderConfig {
  id: 'met-office'
  label: string
  forecastPageUrl: string
  warningsUrl: string
}

export interface EnvironmentAgencyZoneProviderConfig {
  id: 'environment-agency'
  label: string
  floodUrlTemplate: string
  radiusKm: number
  minimumSeverityLevel: number
}

export interface UsgsZoneProviderConfig {
  id: 'usgs'
  label: string
  feedUrl: string
  radiusKm: number
  extendedRadiusKm: number
  extendedMagnitude: number
  minimumMagnitude: number
}

export type CoverageZoneProviderConfig =
  | NwsZoneProviderConfig
  | MetOfficeZoneProviderConfig
  | EnvironmentAgencyZoneProviderConfig
  | UsgsZoneProviderConfig

export interface LocationProfile {
  id: string
  name: string
  region: string
  country: string
  aliases: string[]
  locationCodes: string[]
  coordinates: Coordinates
  briefingUrl: string
  outlook: string
  weather: WeatherSnapshot
  signals: SignalItem[]
  news: NewsItem[]
  sources: SourceHealth[]
  actions: ReadinessAction[]
  lastUpdatedAt: string
  fetchStatus: FeedFetchStatus
  fetchError: string | null
  freshness: BriefingFreshness
}

export interface LocationSuggestion {
  id: string
  profile: LocationProfile
  primaryLabel: string
  secondaryLabel: string
  matchedText: string
  matchKind: 'code' | 'alias' | 'place' | 'region' | 'country'
}

export interface LiveBriefingResponse {
  outlook: string
  weather: WeatherSnapshot
  signals: SignalItem[]
  news: NewsItem[]
  sources: SourceHealth[]
  actions: ReadinessAction[]
  refreshedAt?: string
  freshness: BriefingFreshness
}

export interface AppSetup {
  pollingIntervalSeconds: number
  soundEnabled: boolean
  browserNotificationsEnabled: boolean
  soundVolume: number
  unitSystem: UnitSystem
  coverageProfiles: LocationProfile[]
}

export interface CoverageDraft {
  name: string
  region: string
  country: string
  aliases: string[]
  locationCodes: string[]
  latitude: number
  longitude: number
  briefingUrl: string
}

export interface CoverageZoneTemplate {
  id: string
  name: string
  region: string
  regionCode: string
  country: string
  countryCode: string
  aliases: string[]
  locationCodes: string[]
  coordinates: Coordinates
  providers: CoverageZoneProviderConfig[]
}

export interface CoverageZoneSuggestion {
  id: string
  zone: CoverageZoneTemplate
  matchedText: string
  matchKind: 'code' | 'alias' | 'place' | 'region' | 'country'
}

export type SetupSettingsUpdate = Partial<
  Pick<
    AppSetup,
    'pollingIntervalSeconds' | 'soundEnabled' | 'browserNotificationsEnabled' | 'soundVolume' | 'unitSystem'
  >
>

export interface SelectedLocation {
  label: string
  coordinates: Coordinates
  mode: LocationMode
  profile: LocationProfile
  confidenceLabel: string
}

export interface LocationBriefing {
  selectedLocation: SelectedLocation
  headline: string
  metrics: {
    activeSignals: number
    criticalSignals: number
    monitoredCategories: number
    sourceConfidence: string
    lastRefresh: string
  }
  signalFeed: SignalItem[]
  weather: WeatherSnapshot
  newsFeed: NewsItem[]
  sourceHealth: SourceHealth[]
  actions: ReadinessAction[]
}
