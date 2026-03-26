# Developer Guide

This guide is for programmers working on the Resilience Hub desktop codebase.

## Setup

### Recommended local flow

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Low disk-space workaround

If `C:` is full on this machine, redirect temp/cache paths before install:

```powershell
$env:TEMP='g:\Projects\.tmp'
$env:TMP='g:\Projects\.tmp'
$env:PIP_CACHE_DIR='g:\Projects\.pip-cache'
```

## Verification commands

Syntax verification:

```powershell
python -m compileall main.py resilience_hub
```

Headless launch verification:

```powershell
$env:QT_QPA_PLATFORM='offscreen'
python -c "from resilience_hub.app import main; raise SystemExit(0)"
```

For a real UI run, use:

```powershell
python main.py
```

## Code map

### `main.py`

Local repository entrypoint. Keep this minimal.

### `resilience_hub/app.py`

Bootstraps `QApplication`, applies styling, and shows the main window.

### `resilience_hub/theme.py`

Centralized stylesheet. Visual changes should generally start here instead of being mixed into widget code.

### `resilience_hub/models.py`

Shared dataclasses and constant option lists. If a new screen or workflow needs new domain data, add the model here first.

### `resilience_hub/seed.py`

The in-memory dataset used by the MVP. Also holds the current volunteer matching heuristic.

### `resilience_hub/controller.py`

The workflow layer. This is the place for:

- stateful selections
- filtering logic
- dispatch logic
- assignment lifecycle rules
- future application-service integration

### `resilience_hub/main_window.py`

The view layer. This file should focus on:

- building widgets
- refreshing widgets from controller state
- forwarding Qt signals to controller actions

If a method starts deciding product rules, it probably belongs in `controller.py`.

## State ownership rules

Use these rules when making changes:

- widget references belong to `MainWindow`
- mutable product state belongs to `AppController`
- static domain structures belong to `models.py`
- demo content belongs to `seed.py`
- look-and-feel belongs to `theme.py`

This split is the main reason the project remains readable.

## Adding a new feature

Use this sequence:

1. Define or extend the domain data in `models.py`.
2. Add or update seed content in `seed.py`.
3. Add controller queries/actions in `controller.py`.
4. Build or refresh widgets in `main_window.py`.
5. Document the feature in `docs/feature-reference.md`.
6. Update `docs/architecture.md` if the structure or responsibilities changed.

## When to refactor

Refactor when:

- a window method is mixing rendering and workflow decisions
- a panel starts owning state that should be reusable elsewhere
- a data shape is implied in several places but defined nowhere
- seeded content becomes hard to trace

Do not refactor just to create more layers. The code should become clearer, not more abstract.

## Coding style expectations

- Prefer straightforward method names that describe behavior clearly.
- Keep widget-building helpers short and focused.
- Add docstrings when a class or function has a specific responsibility.
- Use comments sparingly and only when they explain intent or a non-obvious tradeoff.
- Prefer readable repetition over opaque abstraction in UI composition.
- Keep business rules explicit so contributors can audit them quickly.

## Current workflow rules

### Dispatching

- only `Awaiting match` requests are dispatchable
- zone filtering is applied unless the UI is set to `All sectors`
- requests are ordered by priority rank
- the selected offer prefers same-zone coverage and higher trust

### Assignment advancement

- assignments move through a fixed progression
- closing an assignment also resolves the linked request

These rules are intentionally simple and should stay easy to audit.

## Documentation responsibilities

If you change behavior, update docs in the same change.

At minimum:

- update `docs/feature-reference.md` for user-visible changes
- update `docs/architecture.md` for structural changes
- update `README.md` if setup or project scope changed
