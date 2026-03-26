# Quick Start

This guide gets Emergency Centre running locally with the smallest possible path.

## Prerequisites

- Node.js installed
- npm available
- the repository cloned locally

## Step-By-Step

1. Open a terminal in the repository root.
2. Set temp and npm cache paths if your system drive is tight on space:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:npm_config_cache='g:\Projects\.npm-cache'
```

3. Install dependencies:

```powershell
npm install
```

4. Start the app and API together:

```powershell
npm run dev
```

5. Open the frontend URL printed by Vite.
6. Go to the setup panel.
7. Use the starter directory to load a UK or US coverage zone.
8. Leave the feed URL blank if you want to use the built-in live-provider API endpoint.
9. Add the coverage area.
10. Confirm the overview and signals panels populate.

## If You Only Want The API

```powershell
npm run dev:api
```

Then open:

- `http://localhost:8787/api/health`

## If You Want A Production Build

```powershell
npm run build
```

That builds:

- the frontend into `dist/`
- the API into `dist-server/`

Run the compiled API with:

```powershell
npm run start:api
```
