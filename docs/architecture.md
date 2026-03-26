# Architecture Notes

This document describes how the current PyQt MVP is structured and why the code is split the way it is.

## Design goals

The current codebase is intentionally optimized for:

- readability over abstraction density
- fast onboarding for contributors
- clear separation between view code and workflow logic
- easy replacement of seeded in-memory state with persistence later
- explicit feature mapping between product behavior and code modules

## Current layers

### 1. Entry layer

- `main.py`
- `resilience_hub/app.py`

Responsibilities:

- create the Qt application
- apply the global stylesheet
- create and show the main window

This layer should stay extremely small. It should not contain feature logic.

### 2. View layer

- `resilience_hub/main_window.py`

Responsibilities:

- build the widget tree
- own Qt widget references
- translate controller state into visible UI
- forward user actions to the controller

Non-responsibilities:

- request filtering rules
- dispatch selection logic
- assignment lifecycle rules
- seeded dataset construction

The view layer is allowed to know how data should be presented, but it should not decide business behavior.

### 3. Controller layer

- `resilience_hub/controller.py`

Responsibilities:

- own mutable application state
- expose query methods used by the window
- expose user-action methods such as:
  - incident selection
  - household status changes
  - board filter changes
  - dispatching
  - assignment advancement

This layer is the current home for workflow rules. If the app gains a real backend, much of this logic can move into service or repository classes without forcing a view rewrite.

### 4. Domain model layer

- `resilience_hub/models.py`

Responsibilities:

- define shared dataclasses
- define shared enums/constants used by the UI and controller

These models are plain data carriers. They deliberately do not contain UI logic.

### 5. Seed and demo logic layer

- `resilience_hub/seed.py`

Responsibilities:

- create the in-memory demo dataset
- define the current volunteer matching heuristic

Because the project still runs without persistence, this module is the current source of truth for demo behavior.

### 6. Theme layer

- `resilience_hub/theme.py`

Responsibilities:

- hold the centralized Qt stylesheet

Keeping styling separate from widget composition makes `main_window.py` easier to read and keeps visual changes isolated.

## Main application flow

### Startup

1. `main.py` imports and runs `resilience_hub.app.main()`.
2. `app.py` creates `QApplication`, applies the theme, and shows `MainWindow`.
3. `MainWindow` creates an `AppController`.
4. `MainWindow` builds the static UI shell.
5. `MainWindow.refresh_all()` pulls the initial state from the controller and fills the screen.

### Runtime interaction

1. A user clicks a control in the window.
2. The corresponding slot method in `MainWindow` is called.
3. That method delegates the state change to `AppController`.
4. The window calls `refresh_all()`.
5. `refresh_all()` repopulates the affected panels from controller state.

This is intentionally simple. The MVP chooses clarity over granular update optimization.

## Feature-to-module mapping

### Incident board

- data: `models.py`, `seed.py`
- selection state: `controller.py`
- rendering: `main_window.py`

### Household check-in

- household states: `models.py`
- state mutation: `controller.py`
- buttons and status chip: `main_window.py`

### Verified update feed

- seeded updates: `seed.py`
- current incident selection: `controller.py`
- feed cards: `main_window.py`

### Request/offer board

- seeded requests and offers: `seed.py`
- filtering: `controller.py`
- card rendering: `main_window.py`

### Dispatch lane

- assignment model: `models.py`
- dispatch logic and progression: `controller.py`
- assignment cards: `main_window.py`

### Open-source section

- informational card models: `models.py`
- seeded explanatory content: `seed.py`
- rendering: `main_window.py`

## Current dispatch heuristic

The current matching logic is intentionally simple and documented so contributors know exactly what the MVP is doing.

When `dispatch_next_request()` runs:

1. only requests with status `Awaiting match` are considered
2. requests are restricted to the active zone unless the board is set to `All sectors`
3. candidates are sorted by priority rank
4. the best volunteer offer is chosen by:
   - same-zone offers before cross-zone offers
   - higher trust before lower trust
5. a new `Assignment` is created and inserted at the top of the assignment list

This is not meant to be the final matching engine. It is only the first transparent rule set.

## Why the window refreshes whole sections

The current implementation rebuilds dynamic panel content after actions instead of trying to surgically update individual labels and cards.

That tradeoff is deliberate:

- the app is small
- the data volume is low
- the code is easier to reason about
- contributors can change card structure without chasing partial update bugs

If performance ever becomes a real concern, the refresh behavior can be narrowed later.

## Future architectural direction

The intended next evolution is:

1. persistence and repositories
2. backend services for incidents, requests, offers, and assignments
3. notification adapters for SMS and email
4. authentication and role-based access
5. possibly multiple clients sharing a common service layer

When that happens, the controller can become an application service adapter rather than the main state owner.
