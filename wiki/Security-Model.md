# Security Model

Emergency Centre is public by default and does not require accounts in the open-source baseline.

## Browser Layer

The browser currently stores:

- configured coverage records
- polling interval
- sound preference
- browser notification preference
- unit preference

Do not store secrets in browser local storage.

## API Layer

The local API service is intentionally narrow.

Current posture:

- explicit catalog routes only
- explicit live and demo briefing routes only
- no generic open proxy
- no account storage
- stale fallback state is exposed through response freshness metadata rather than silently pretending the data is current

## Step-By-Step: Safer Feed Integration

1. Keep provider secrets on the server side.
2. Normalize upstream data before it reaches users.
3. Keep routes explicit and documented.
4. Label source names clearly in the returned data.
5. Show delayed or manual-review states visibly.
6. Surface stale snapshots explicitly if the upstream refresh fails after a previous success.
7. Avoid making unofficial data look authoritative.

## Future Risk Guardrails

If future server-side fetch routes are added:

- keep them allowlisted
- document every upstream dependency
- add rate limiting if public exposure increases
- do not introduce an unrestricted proxy
