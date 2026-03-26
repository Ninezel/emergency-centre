# Contributing

Resilience Hub is an open-source public-good project. Contributions are welcome, but the bar should stay practical: reliability, accessibility, privacy, and clear operational behavior matter more than feature count.

## Before you start

- Read the README and architecture notes.
- Read `docs/feature-reference.md` before changing user-visible behavior.
- Read `docs/developer-guide.md` before restructuring the codebase.
- Prefer issues and pull requests that are small enough to review cleanly.
- If a change affects trust, privacy, alerting, or incident workflow, explain the operational impact.

## Local setup

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

For a quick syntax check:

```bash
python -m compileall main.py resilience_hub
```

## What to prioritize

- incident clarity over visual novelty
- low-bandwidth and accessibility support
- explicit data ownership and auditability
- straightforward self-hosting
- predictable desktop workflows for coordinators under stress

## Pull request guidance

- Describe the problem first, then the implementation.
- Include screenshots or short notes for interface changes.
- Call out tradeoffs and missing follow-up work.
- Avoid unrelated refactors in the same pull request.

## Maintainer support

If this project helps your community, support ongoing work on Ko-Fi:

- https://ko-fi.com/ninezel
