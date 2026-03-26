import type { CoverageZoneTemplate } from '../types.js'

const USGS_DAY_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
const NWS_POINTS_URL_TEMPLATE = 'https://api.weather.gov/points/{lat},{lng}'
const NWS_ALERTS_URL_TEMPLATE = 'https://api.weather.gov/alerts/active?point={lat},{lng}'
const ENVIRONMENT_AGENCY_FLOOD_URL_TEMPLATE =
  'https://environment.data.gov.uk/flood-monitoring/id/floods?lat={lat}&long={lng}&dist={radiusKm}&min-severity={minimumSeverityLevel}'

function createUsProviders(): CoverageZoneTemplate['providers'] {
  return [
    {
      id: 'nws',
      label: 'National Weather Service',
      pointsUrlTemplate: NWS_POINTS_URL_TEMPLATE,
      alertsUrlTemplate: NWS_ALERTS_URL_TEMPLATE,
    },
    {
      id: 'usgs',
      label: 'USGS Earthquake Hazards Program',
      feedUrl: USGS_DAY_URL,
      radiusKm: 350,
      extendedRadiusKm: 900,
      extendedMagnitude: 6,
      minimumMagnitude: 2.5,
    },
  ]
}

function createUkProviders(config: {
  forecastPageUrl: string
  warningsUrl: string
  includeFlood: boolean
}): CoverageZoneTemplate['providers'] {
  return [
    {
      id: 'met-office',
      label: 'Met Office',
      forecastPageUrl: config.forecastPageUrl,
      warningsUrl: config.warningsUrl,
    },
    ...(config.includeFlood
      ? [
          {
            id: 'environment-agency',
            label: 'Environment Agency',
            floodUrlTemplate: ENVIRONMENT_AGENCY_FLOOD_URL_TEMPLATE,
            radiusKm: 35,
            minimumSeverityLevel: 3,
          } as const,
        ]
      : []),
    {
      id: 'usgs',
      label: 'USGS Earthquake Hazards Program',
      feedUrl: USGS_DAY_URL,
      radiusKm: 350,
      extendedRadiusKm: 900,
      extendedMagnitude: 6,
      minimumMagnitude: 2.5,
    },
  ]
}

export const coverageCatalogData: readonly CoverageZoneTemplate[] = [
  {
    id: 'gb-eng-greater-london-central',
    name: 'Greater London Central',
    region: 'Greater London',
    regionCode: 'greater-london',
    country: 'United Kingdom',
    countryCode: 'GB',
    aliases: ['Central London', 'Westminster', 'South Bank'],
    locationCodes: ['SW1A', 'EC4M', 'WC2N', 'SE1'],
    coordinates: { lat: 51.5074, lng: -0.1278 },
    providers: createUkProviders({
      forecastPageUrl: 'https://weather.metoffice.gov.uk/forecast/gcpvj0v07',
      warningsUrl: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/se',
      includeFlood: true,
    }),
  },
  {
    id: 'gb-eng-greater-manchester',
    name: 'Greater Manchester Core',
    region: 'North West England',
    regionCode: 'north-west-england',
    country: 'United Kingdom',
    countryCode: 'GB',
    aliases: ['Manchester City Centre', 'Salford', 'MediaCity'],
    locationCodes: ['M1', 'M2', 'M3', 'M4'],
    coordinates: { lat: 53.4808, lng: -2.2426 },
    providers: createUkProviders({
      forecastPageUrl: 'https://weather.metoffice.gov.uk/forecast/gcw2hzs1u',
      warningsUrl: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/nw',
      includeFlood: true,
    }),
  },
  {
    id: 'gb-eng-west-midlands',
    name: 'Birmingham And West Midlands Core',
    region: 'West Midlands',
    regionCode: 'west-midlands',
    country: 'United Kingdom',
    countryCode: 'GB',
    aliases: ['Birmingham City Centre', 'Digbeth', 'Jewellery Quarter'],
    locationCodes: ['B1', 'B2', 'B3', 'B4'],
    coordinates: { lat: 52.4862, lng: -1.8904 },
    providers: createUkProviders({
      forecastPageUrl: 'https://weather.metoffice.gov.uk/forecast/gcqdt4b2x',
      warningsUrl: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/wm',
      includeFlood: true,
    }),
  },
  {
    id: 'gb-wls-cardiff-vale',
    name: 'Cardiff And Vale',
    region: 'South East Wales',
    regionCode: 'south-east-wales',
    country: 'United Kingdom',
    countryCode: 'GB',
    aliases: ['Cardiff Bay', 'Vale of Glamorgan', 'Cardiff Centre'],
    locationCodes: ['CF10', 'CF11', 'CF14', 'CF23'],
    coordinates: { lat: 51.4816, lng: -3.1791 },
    providers: createUkProviders({
      forecastPageUrl: 'https://weather.metoffice.gov.uk/forecast/gcjszevgx',
      warningsUrl: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/wl',
      includeFlood: false,
    }),
  },
  {
    id: 'gb-sct-edinburgh-lothians',
    name: 'Edinburgh And Lothians',
    region: 'Lothian',
    regionCode: 'lothian',
    country: 'United Kingdom',
    countryCode: 'GB',
    aliases: ['Edinburgh City Centre', 'Leith', 'Midlothian'],
    locationCodes: ['EH1', 'EH2', 'EH3', 'EH6'],
    coordinates: { lat: 55.9533, lng: -3.1883 },
    providers: createUkProviders({
      forecastPageUrl: 'https://weather.metoffice.gov.uk/forecast/gcvwr3zrw',
      warningsUrl: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/dg',
      includeFlood: false,
    }),
  },
  {
    id: 'gb-nir-belfast-metro',
    name: 'Belfast Metro',
    region: 'Belfast',
    regionCode: 'belfast',
    country: 'United Kingdom',
    countryCode: 'GB',
    aliases: ['Belfast City Centre', 'Titanic Quarter', 'East Belfast'],
    locationCodes: ['BT1', 'BT2', 'BT3', 'BT7'],
    coordinates: { lat: 54.5973, lng: -5.93 },
    providers: createUkProviders({
      forecastPageUrl: 'https://weather.metoffice.gov.uk/forecast/gcey94cuf',
      warningsUrl: 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/ni',
      includeFlood: false,
    }),
  },
  {
    id: 'us-ca-san-francisco-bay',
    name: 'San Francisco Bay Core',
    region: 'California Bay Area',
    regionCode: 'california-bay-area',
    country: 'United States',
    countryCode: 'US',
    aliases: ['San Francisco', 'Oakland', 'Bay Area'],
    locationCodes: ['941', '940', '946'],
    coordinates: { lat: 37.7749, lng: -122.4194 },
    providers: createUsProviders(),
  },
  {
    id: 'us-ca-los-angeles-metro',
    name: 'Los Angeles Metro',
    region: 'Southern California',
    regionCode: 'southern-california',
    country: 'United States',
    countryCode: 'US',
    aliases: ['Downtown Los Angeles', 'Hollywood', 'Santa Monica'],
    locationCodes: ['900', '901', '902', '903'],
    coordinates: { lat: 34.0522, lng: -118.2437 },
    providers: createUsProviders(),
  },
  {
    id: 'us-ny-new-york-city-core',
    name: 'New York City Core',
    region: 'New York Downstate',
    regionCode: 'new-york-downstate',
    country: 'United States',
    countryCode: 'US',
    aliases: ['Manhattan', 'Brooklyn', 'NYC'],
    locationCodes: ['100', '101', '112'],
    coordinates: { lat: 40.7128, lng: -74.006 },
    providers: createUsProviders(),
  },
  {
    id: 'us-il-chicago-metro',
    name: 'Chicago Metro',
    region: 'Chicagoland',
    regionCode: 'chicagoland',
    country: 'United States',
    countryCode: 'US',
    aliases: ['Chicago Loop', 'North Side', 'Cook County'],
    locationCodes: ['606', '607'],
    coordinates: { lat: 41.8781, lng: -87.6298 },
    providers: createUsProviders(),
  },
  {
    id: 'us-tx-houston-metro',
    name: 'Houston Metro',
    region: 'Texas Gulf Coast',
    regionCode: 'texas-gulf-coast',
    country: 'United States',
    countryCode: 'US',
    aliases: ['Houston', 'Pasadena', 'Katy'],
    locationCodes: ['770', '772', '773', '774'],
    coordinates: { lat: 29.7604, lng: -95.3698 },
    providers: createUsProviders(),
  },
  {
    id: 'us-fl-miami-dade-core',
    name: 'Miami-Dade Core',
    region: 'South Florida',
    regionCode: 'south-florida',
    country: 'United States',
    countryCode: 'US',
    aliases: ['Miami', 'Miami Beach', 'Doral'],
    locationCodes: ['331', '332'],
    coordinates: { lat: 25.7617, lng: -80.1918 },
    providers: createUsProviders(),
  },
  {
    id: 'us-wa-seattle-puget-sound',
    name: 'Seattle Puget Sound',
    region: 'Puget Sound',
    regionCode: 'puget-sound',
    country: 'United States',
    countryCode: 'US',
    aliases: ['Seattle', 'Bellevue', 'Tacoma'],
    locationCodes: ['980', '981'],
    coordinates: { lat: 47.6062, lng: -122.3321 },
    providers: createUsProviders(),
  },
] as const
