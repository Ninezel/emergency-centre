# Feature Reference

This document describes every user-facing feature in the current desktop MVP and the behavior expected from each part of the interface.

## 1. Header

Purpose:

- identify the product
- reinforce that it is open source
- expose the maintainer support link

Current elements:

- product name
- short product descriptor
- lightweight section labels
- `Support on Ko-Fi` button

Implementation note:

- built in `MainWindow._build_header()`

## 2. Hero section

Purpose:

- explain the mission of the product at first glance
- provide quick access to the most important action
- show current operational status

### Left side

Elements:

- licensing and positioning line
- primary product statement
- short summary paragraph
- primary dispatch button
- Ko-Fi button
- short capability strip

Behavior:

- clicking `Dispatch next request` runs the same workflow used by the response board
- clicking `Donate via Ko-Fi` opens the maintainer support page in the default browser

### Right side

Elements:

- currently selected incident name
- incident status chip
- incident summary
- four summary metrics
- role selector
- role note

Metrics shown:

- households checked in
- open requests
- active assignments
- resolved requests

Role selector behavior:

- `Coordinator` frames the UI as an operational dashboard
- `Resident` changes the explanatory note only in the current MVP

Implementation note:

- built in `_build_hero_copy()` and `_build_hero_summary_panel()`
- values come from `AppController.dashboard_metrics()` and `AppController.role_note()`

## 3. Incident board

Purpose:

- switch operational context between incidents
- display incident timing and associated playbooks

Current incidents in seed data:

- River flood response
- Heatwave readiness
- Storm recovery

Behavior:

- selecting a different incident updates:
  - hero summary name and status
  - incident summary text
  - playbooks
  - verified update feed

Implementation note:

- list selection is handled in `on_incident_selected()`
- actual selection state lives in `AppController.selected_incident_id`

## 4. Household check-in

Purpose:

- model a resident-facing status report during drills or live incidents

Available states:

- `Safe`
- `Need help`
- `Urgent`
- `Offline`

Behavior:

- clicking a state updates the visible status chip
- the `last updated` timestamp refreshes
- only one status can be active at a time

Current MVP scope:

- the state is local and in-memory only
- no server sync or multi-user presence exists yet

Implementation note:

- status options are defined in `models.py`
- state mutation happens in `AppController.set_household_status()`

## 5. Readiness checklist

Purpose:

- show static preparedness items that remain relevant outside active incidents

Current items:

- Backup contact stored
- Mobility and access notes confirmed
- Medicine pickup plan set
- Charging point nearby

Behavior:

- informational only in the current MVP

## 6. Verified incident feed

Purpose:

- present trusted, time-stamped incident updates tied to the selected incident

Each update shows:

- label chip
- title
- detail text
- time and source

Behavior:

- feed contents change when the selected incident changes
- updates are read-only in the current MVP

Implementation note:

- update data comes from `seed.py`
- feed cards are rebuilt in `_refresh_feed_panel()`

## 7. Response board

Purpose:

- put the active operational workflow on one screen

Top-level controls:

- board filter selector
- zone selector
- `Dispatch next request` button

### Board filter

Options:

- `Open`
- `Urgent`
- `Resolved`

Behavior:

- `Open` hides resolved requests
- `Urgent` shows only critical-priority requests
- `Resolved` shows only resolved requests

### Zone filter

Options:

- `All sectors`
- `Riverside`
- `Hilltop`
- `Town Centre`

Behavior:

- filters requests and resources to the selected zone
- offers remain visible if they are either in-zone or `Cross-zone`

## 8. Needs queue

Purpose:

- display requests requiring attention

Each request card shows:

- need title
- household and zone
- detail text
- priority chip
- status chip
- ETA / target
- assignee if present

Implementation note:

- request filtering is handled by `AppController.visible_requests()`

## 9. Volunteer capacity

Purpose:

- show available offers that can satisfy current requests

Each offer card shows:

- offer title
- provider and zone
- capacity summary
- trust chip
- availability
- response time

Implementation note:

- visibility rules are handled by `AppController.visible_offers()`

## 10. Dispatch lane

Purpose:

- track active and completed assignments

Each assignment card shows:

- request label
- provider and zone
- status chip
- ETA text
- `Advance` button

Assignment lifecycle:

- `Dispatching`
- `In progress`
- `Closed`

Behavior:

- clicking `Advance` moves the assignment to the next state
- when an assignment reaches `Closed`, the linked request becomes `Resolved`

Implementation note:

- lifecycle rules live in `AppController.advance_assignment()`

## 11. Resource map panel

Purpose:

- list fixed support nodes relevant to the selected zone

Current seeded node types:

- charging point
- medicine pickup
- shelter
- sandbag point

Each resource card shows:

- resource name
- type and zone
- detail text
- status
- distance

Current MVP note:

- this is a structured list, not a geographic map widget yet

## 12. Open-source foundation panel

Purpose:

- explain how the project is intended to be used and governed

Content currently shown:

- AGPL positioning statement
- architecture module cards

These cards are seeded from `seed.py` so the content remains easy to edit.

## 13. Operating principles panel

Purpose:

- communicate non-negotiable product guardrails

Current principles:

- useful on quiet days
- privacy before convenience
- trust is explicit
- not emergency services

## 14. Quiet-day value panel

Purpose:

- explain how the platform remains useful between emergencies

Current scenarios:

- preparedness drills
- volunteer rosters
- building notices

## 15. Maintainer support panel

Purpose:

- keep donation support visible without gating the product

Behavior:

- button opens `https://ko-fi.com/ninezel`

## 16. Current limitations

The MVP is intentionally local and self-contained. It does not yet include:

- persistence
- authentication
- networked multi-user sync
- actual SMS or email delivery
- a real geographic map widget
- operator audit history beyond the current in-memory assignment list

These limitations are deliberate for the first PyQt baseline.
