# Resilience Hub

Open-source community resilience software for neighborhoods, apartment buildings, schools, and local organizations.

Resilience Hub helps communities coordinate before, during, and after local disruptions. The current MVP is a PyQt desktop application focused on incident updates, household check-ins, requests and offers, dispatch tracking, and local support nodes.

[Support ongoing development on Ko-Fi](https://ko-fi.com/ninezel)

## Documentation

Start here if you are contributing to the codebase:

- [Architecture notes](./docs/architecture.md)
- [Feature reference](./docs/feature-reference.md)
- [Developer guide](./docs/developer-guide.md)

## Why this exists

Most local response work is still scattered across group chats, spreadsheets, phone trees, paper notes, and rumor. This project aims to provide a shared operations layer that is:

- free to use
- self-hostable
- privacy-conscious
- useful on ordinary days as well as emergency days

## Current MVP

- PyQt desktop command surface
- Incident board with verified updates
- Household check-in flow for residents
- Request and volunteer-offer queues
- Basic dispatch matching with assignment progression
- Resource map for shelters, clinics, charging points, and local support nodes
- Open-source architecture and principles surfaced in the app

## Repository layout

- `main.py`: local entrypoint for running the desktop app
- `resilience_hub/app.py`: Qt application bootstrap
- `resilience_hub/main_window.py`: view layer and widget composition
- `resilience_hub/controller.py`: state orchestration and workflow actions
- `resilience_hub/models.py`: dataclasses and shared constants
- `resilience_hub/seed.py`: in-memory dataset and matching rules
- `resilience_hub/theme.py`: centralized Qt stylesheet
- `docs/`: architecture, feature, and contributor documentation

## Stack

- Python 3.11+
- PyQt6
- Standard-library data model and seeded local state

## Getting started

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

If your machine has a full `C:` drive, redirect temp and cache to `G:` before installing:

```bash
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:PIP_CACHE_DIR='g:\Projects\.pip-cache'
```

## Project direction

Near-term priorities:

- add a real data model and persistence layer behind the desktop client
- add authentication and role-based access
- add SMS and email adapters
- add a real incident map and geospatial filtering
- add recovery workflows for claims, cleanup, and aid tracking
- separate backend services from the operator desktop interface

## Code quality goals

The current codebase is organized around a few explicit rules:

- keep workflow logic out of the window class
- keep the seeded dataset in one place
- prefer clear, named methods over clever abstractions
- write docs for both product behavior and implementation behavior
- make it easy to swap the in-memory state for persistence later

## Principles

- Trust must be explicit. Verified updates are clearly labeled.
- The platform must stay useful in quiet periods through drills, notices, and volunteer coordination.
- Community coordination is not the same thing as emergency services.
- Residents should not need modern hardware or perfect connectivity to participate.

## Supporting the project

The software is free and open source. If it helps your community, support ongoing maintenance and development:

- Ko-Fi: https://ko-fi.com/ninezel

## License

Licensed under `AGPL-3.0-or-later`. See [LICENSE](./LICENSE).
