# Self Hosting

Emergency Centre can be self-hosted in two basic modes:

- frontend plus local API
- frontend only, if every briefing URL is already public and browser-safe

## Recommended Local Setup

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run dev`.
4. Confirm the frontend opens.
5. Confirm `http://localhost:8787/api/health` responds.

## Production Build

Run:

```powershell
npm run build
```

This produces:

- `dist/` for the frontend
- `dist-server/` for the API

## Run The Built API

```powershell
node dist-server/server/index.js
```

## Environment

Optional variables:

- `EC_API_PORT`
- `EC_API_ORIGIN`

## Hosting Notes

- keep secret-bearing provider integrations on the server side
- do not rely on browser local storage for secrets
- keep the API behind your own ingress and monitoring if you expose it publicly
- document any custom provider adapters you add
