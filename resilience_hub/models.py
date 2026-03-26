"""Shared domain models and UI-facing constants.

These dataclasses represent the current MVP state for the desktop app.
They are intentionally simple and immutable in shape so future persistence
or API work can map onto them without redesigning the UI contract.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

IncidentStatus = Literal["Active", "Monitoring", "Recovery"]
HouseholdStatus = Literal["Safe", "Need help", "Urgent", "Offline"]
RequestPriority = Literal["Critical", "High", "Routine"]
RequestStatus = Literal["Awaiting match", "Assigned", "Resolved"]
AssignmentStatus = Literal["Dispatching", "In progress", "Closed"]
TrustLevel = Literal["Verified", "Known", "New"]

ROLE_VIEWS = ("Coordinator", "Resident")
BOARD_FILTERS = ("Open", "Urgent", "Resolved")
ZONE_FILTERS = ("All sectors", "Riverside", "Hilltop", "Town Centre")
HOUSEHOLD_STATES = ("Safe", "Need help", "Urgent", "Offline")

PRIORITY_RANK: dict[RequestPriority, int] = {
    "Critical": 0,
    "High": 1,
    "Routine": 2,
}

TRUST_RANK: dict[TrustLevel, int] = {
    "Verified": 0,
    "Known": 1,
    "New": 2,
}

ASSIGNMENT_PROGRESSION: dict[AssignmentStatus, AssignmentStatus] = {
    "Dispatching": "In progress",
    "In progress": "Closed",
    "Closed": "Closed",
}


@dataclass(slots=True)
class IncidentUpdate:
    """A time-stamped update shown in the verified incident feed."""

    id: str
    time: str
    source: str
    title: str
    detail: str
    label: str


@dataclass(slots=True)
class Incident:
    """The top-level operational context selected in the dashboard."""

    id: str
    name: str
    status: IncidentStatus
    severity: str
    window: str
    location: str
    summary: str
    households_checked_in: int
    updates: list[IncidentUpdate]
    playbooks: list[str]


@dataclass(slots=True)
class SupportRequest:
    """A resident or household need that should be routed to support."""

    id: str
    household: str
    zone: str
    need: str
    detail: str
    priority: RequestPriority
    status: RequestStatus
    eta: str
    match_tags: list[str]
    assigned_to: str | None = None


@dataclass(slots=True)
class VolunteerOffer:
    """A volunteer or organization capability available for dispatch."""

    id: str
    provider: str
    title: str
    zone: str
    availability: str
    capacity: str
    response_time: str
    trust: TrustLevel
    skill_tags: list[str]


@dataclass(slots=True)
class Assignment:
    """A concrete match between a request and an offer."""

    id: str
    request_id: str
    request_label: str
    provider: str
    zone: str
    eta: str
    status: AssignmentStatus


@dataclass(slots=True)
class ResourceNode:
    """A fixed local support location such as a shelter or clinic desk."""

    id: str
    name: str
    type: str
    zone: str
    status: str
    detail: str
    distance: str


@dataclass(slots=True)
class InfoCard:
    """Static explanatory content displayed in the open-source section."""

    title: str
    detail: str


@dataclass(slots=True)
class AppState:
    """All seeded data needed by the current desktop MVP."""

    incidents: list[Incident]
    requests: list[SupportRequest]
    offers: list[VolunteerOffer]
    assignments: list[Assignment]
    resources: list[ResourceNode]
    architecture_modules: list[InfoCard]
    operating_principles: list[InfoCard]
    normal_day_scenarios: list[InfoCard]
    readiness_checklist: list[str]
