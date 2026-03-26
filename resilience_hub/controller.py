"""Application state orchestration for the desktop interface.

The controller owns mutable view state and exposes a small API that the
Qt window can call. This keeps filtering, selection, dispatching, and
assignment rules out of the widget layer so the UI code remains readable.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .models import (
    ASSIGNMENT_PROGRESSION,
    BOARD_FILTERS,
    HOUSEHOLD_STATES,
    PRIORITY_RANK,
    ROLE_VIEWS,
    ZONE_FILTERS,
    AppState,
    Assignment,
    HouseholdStatus,
    Incident,
    ResourceNode,
    SupportRequest,
    VolunteerOffer,
)
from .seed import build_seed_state, find_best_offer


@dataclass(slots=True)
class DashboardMetrics:
    """High-level numbers shown in the hero summary panel."""

    households_checked_in: int
    open_requests: int
    active_assignments: int
    resolved_requests: int


class AppController:
    """Owns app state, filters, selections, and workflow actions.

    The window delegates all stateful behavior here. The controller is
    intentionally thin: it wraps the seed state and exposes query/mutation
    methods that line up with the screens and actions in the MVP.
    """

    def __init__(self) -> None:
        self.state: AppState = build_seed_state()
        self.selected_incident_id = self.state.incidents[0].id
        self.household_status: HouseholdStatus = "Need help"
        self.last_check_in_at = "10:21"
        self.role_view = ROLE_VIEWS[0]
        self.board_filter = BOARD_FILTERS[0]
        self.focus_zone = ZONE_FILTERS[0]
        self.dispatch_message = "Dispatch lane ready. Prioritizing critical requests in the current zone."

    def current_incident(self) -> Incident:
        """Return the currently selected incident."""
        return next(incident for incident in self.state.incidents if incident.id == self.selected_incident_id)

    def dashboard_metrics(self) -> DashboardMetrics:
        """Compute summary metrics used by the hero panel."""
        return DashboardMetrics(
            households_checked_in=self.current_incident().households_checked_in,
            open_requests=sum(1 for request in self.state.requests if request.status == "Awaiting match"),
            active_assignments=sum(
                1 for assignment in self.state.assignments if assignment.status != "Closed"
            ),
            resolved_requests=sum(1 for request in self.state.requests if request.status == "Resolved"),
        )

    def role_note(self) -> str:
        """Explain the implications of the currently selected role view."""
        if self.role_view == "Coordinator":
            return "Coordinator mode centers dispatch, triage, and verified updates."
        return "Resident mode centers check-ins, nearby support, and trusted instructions."

    def visible_requests(self) -> list[SupportRequest]:
        """Return requests after applying the active zone and board filters."""
        items: list[SupportRequest] = []
        for request in self.state.requests:
            zone_match = self.focus_zone == "All sectors" or request.zone == self.focus_zone
            if not zone_match:
                continue
            if self.board_filter == "Urgent" and request.priority != "Critical":
                continue
            if self.board_filter == "Resolved" and request.status != "Resolved":
                continue
            if self.board_filter == "Open" and request.status == "Resolved":
                continue
            items.append(request)
        return items

    def visible_offers(self) -> list[VolunteerOffer]:
        """Return volunteer offers that should appear for the current zone."""
        return [
            offer
            for offer in self.state.offers
            if self.focus_zone == "All sectors"
            or offer.zone == self.focus_zone
            or offer.zone == "Cross-zone"
        ]

    def visible_resources(self) -> list[ResourceNode]:
        """Return local support nodes filtered by the current zone."""
        return [
            resource
            for resource in self.state.resources
            if self.focus_zone == "All sectors" or resource.zone == self.focus_zone
        ]

    def set_selected_incident_by_index(self, index: int) -> None:
        """Select an incident from the list widget index."""
        if 0 <= index < len(self.state.incidents):
            self.selected_incident_id = self.state.incidents[index].id

    def set_household_status(self, next_status: HouseholdStatus) -> None:
        """Update the current household check-in state and timestamp."""
        if next_status not in HOUSEHOLD_STATES:
            return
        self.household_status = next_status
        self.last_check_in_at = datetime.now().strftime("%H:%M")

    def set_role_view(self, role_view: str) -> None:
        """Switch between coordinator and resident framing."""
        if role_view in ROLE_VIEWS:
            self.role_view = role_view

    def set_board_filter(self, board_filter: str) -> None:
        """Update the request board filter."""
        if board_filter in BOARD_FILTERS:
            self.board_filter = board_filter

    def set_focus_zone(self, zone: str) -> None:
        """Update the active geographic focus for board queries."""
        if zone in ZONE_FILTERS:
            self.focus_zone = zone

    def dispatch_next_request(self) -> None:
        """Match the next dispatchable request against the best available offer.

        Matching is intentionally conservative for the MVP:
        1. only open requests in the active zone are considered
        2. higher-priority requests are considered first
        3. the best offer is chosen by zone specificity and trust rank
        """

        candidates = [
            request
            for request in self.state.requests
            if request.status == "Awaiting match"
            and (self.focus_zone == "All sectors" or request.zone == self.focus_zone)
        ]
        candidates.sort(key=lambda request: PRIORITY_RANK[request.priority])

        if not candidates:
            self.dispatch_message = "No open requests match the current dispatch zone."
            return

        next_request = candidates[0]
        best_offer = find_best_offer(next_request, self.state.offers)
        if best_offer is None:
            self.dispatch_message = f"No compatible offer is available yet for {next_request.need.lower()}."
            return

        next_request.status = "Assigned"
        next_request.assigned_to = best_offer.provider
        next_request.eta = best_offer.response_time
        self.state.assignments.insert(
            0,
            Assignment(
                id=f"asg-{301 + len(self.state.assignments)}",
                request_id=next_request.id,
                request_label=f"{next_request.household} · {next_request.need}",
                provider=best_offer.provider,
                zone=next_request.zone,
                eta=best_offer.response_time,
                status="Dispatching",
            ),
        )
        self.dispatch_message = (
            f"{next_request.need} assigned to {best_offer.provider}. ETA {best_offer.response_time}."
        )

    def advance_assignment(self, assignment_id: str) -> None:
        """Move an assignment to its next lifecycle state.

        Closing an assignment also resolves the underlying request so both
        panes stay consistent.
        """

        assignment = next((item for item in self.state.assignments if item.id == assignment_id), None)
        if assignment is None:
            return

        assignment.status = ASSIGNMENT_PROGRESSION[assignment.status]
        if assignment.status == "Closed":
            request = next((item for item in self.state.requests if item.id == assignment.request_id), None)
            if request is not None:
                request.status = "Resolved"
                request.eta = "Completed"
