# Coverage Zones

Emergency Centre ships with a starter directory for:

- `United Kingdom`
- `United States`

The starter directory is there to bootstrap setup quickly. It is not meant to be a global geocoder.

## Step-By-Step: Use The Starter Directory

1. Open the setup panel in the app.
2. Choose a country.
3. Choose a region or state.
4. Choose a coverage area.
5. Click `Load selected coverage zone`.
6. Review the prefilled metadata.
7. Add a custom feed URL, or leave the field blank to use the built-in live provider API route.
8. Click `Add coverage area`.
9. Click `Refresh feeds now` if you want to force the first sync immediately.

## Step-By-Step: Use Postcode Or ZIP Lookup

1. Open the setup panel.
2. Find the `Find by postcode or ZIP code` field.
3. Enter a UK postcode like `SW1A 1AA` or a US ZIP like `94103`.
4. Click `Find zone`.
5. Select the matching starter zone.
6. Confirm the coverage metadata looks correct.
7. Add a custom feed URL or use the built-in live endpoint.
8. Save the coverage area.

## What Gets Prefilled

When a starter zone is loaded, Emergency Centre fills:

- coverage name
- region
- country
- aliases
- location codes
- coordinates

If the feed URL is blank, it also fills:

- `/api/briefings/live/:zoneId`

The demo fallback route is still available manually:

- `/api/briefings/demo/:zoneId`

## Important Limits

- starter zones are curated, not exhaustive
- the current starter list is intentionally small
- self-hosters can still add manual coverage areas
- future releases can add more countries and deeper regional coverage
