"""Seed data and matching rules for the desktop MVP.

The project currently runs with in-memory demo data so contributors can work
on interaction flows without needing a database. This module is the single
source of truth for that dataset and the current dispatch matching rule.
"""

from __future__ import annotations

from copy import deepcopy

from .models import (
    AppState,
    Assignment,
    Incident,
    IncidentUpdate,
    InfoCard,
    ResourceNode,
    SupportRequest,
    TRUST_RANK,
    VolunteerOffer,
)


def build_seed_state() -> AppState:
    """Return a fresh copy of the in-memory demo dataset."""

    incidents = [
        Incident(
            id="river-flood",
            name="River flood response",
            status="Active",
            severity="Severe",
            window="Live now · next update 10:45",
            location="South bank, station quarter, riverside flats",
            summary=(
                "Ground-floor flooding is spreading block to block. Priority is power safety, "
                "welfare checks, medicine pickup, and moving residents away from damp and cold."
            ),
            households_checked_in=1842,
            playbooks=["Flood response", "Door-knock sweep", "Medical pickup"],
            updates=[
                IncidentUpdate(
                    id="update-1",
                    time="10:12",
                    source="Council flood desk",
                    title="Substation B isolated",
                    detail=(
                        "Crews cut power to three riverside blocks. Battery charging point "
                        "opened at the library annexe."
                    ),
                    label="Verified",
                ),
                IncidentUpdate(
                    id="update-2",
                    time="09:56",
                    source="Harbor tower lead",
                    title="Lift access suspended",
                    detail=(
                        "Building staff switched to stairwell assistance and manual welfare "
                        "checks for floors 8 to 14."
                    ),
                    label="Building update",
                ),
                IncidentUpdate(
                    id="update-3",
                    time="09:34",
                    source="Primary care network",
                    title="Pharmacy reroute confirmed",
                    detail=(
                        "Critical prescriptions are being redirected to the market clinic pickup "
                        "desk until 18:00."
                    ),
                    label="Health",
                ),
            ],
        ),
        Incident(
            id="heatwave-prep",
            name="Heatwave readiness",
            status="Monitoring",
            severity="Elevated",
            window="Starts tomorrow · cooling center brief at 16:00",
            location="Town center, school cluster, sheltered housing",
            summary=(
                "Volunteer coordinators are preparing cooling center coverage, hydration "
                "deliveries, and daily check-in schedules for vulnerable residents."
            ),
            households_checked_in=923,
            playbooks=["Cooling centers", "Medication storage", "Daily welfare calls"],
            updates=[
                IncidentUpdate(
                    id="update-4",
                    time="08:18",
                    source="Public health unit",
                    title="Amber heat advisory issued",
                    detail=(
                        "High temperatures are forecast through Saturday. Extra attention is "
                        "needed for older adults and infants."
                    ),
                    label="Verified",
                ),
                IncidentUpdate(
                    id="update-5",
                    time="Yesterday",
                    source="School partnership",
                    title="Hall confirmed as cooling site",
                    detail=(
                        "The east hall can host 120 residents with power, water refill, and "
                        "accessible toilets."
                    ),
                    label="Site ready",
                ),
            ],
        ),
        Incident(
            id="storm-recovery",
            name="Storm recovery",
            status="Recovery",
            severity="Stabilizing",
            window="Recovery mode · debris and claims support",
            location="North terraces and allotments",
            summary=(
                "Immediate danger has passed. The focus is debris removal, temporary roofing, "
                "insurance evidence capture, and benefits paperwork."
            ),
            households_checked_in=611,
            playbooks=["Claims support", "Cleanup rotation", "Tool library"],
            updates=[
                IncidentUpdate(
                    id="update-6",
                    time="Yesterday",
                    source="Insurance volunteer cell",
                    title="Photo evidence guide posted",
                    detail=(
                        "Residents now have a shared checklist for documenting roof, water, and "
                        "freezer losses before cleanup."
                    ),
                    label="Recovery",
                )
            ],
        ),
    ]

    requests = [
        SupportRequest(
            id="req-101",
            household="Flat 12, Harbor Tower",
            zone="Riverside",
            need="Medicine pickup",
            detail="Insulin refill needed before 12:30. Resident cannot leave due to stairs.",
            priority="Critical",
            status="Awaiting match",
            eta="12 min target",
            match_tags=["medical", "transport"],
        ),
        SupportRequest(
            id="req-102",
            household="17 Alder Row",
            zone="Riverside",
            need="Portable power",
            detail="Phone battery at 4 percent. One resident uses a hearing aid charger.",
            priority="High",
            status="Awaiting match",
            eta="25 min target",
            match_tags=["power"],
        ),
        SupportRequest(
            id="req-103",
            household="Maple Court 2B",
            zone="Hilltop",
            need="Welfare check",
            detail="Neighbor has not responded to two knocks this morning. Limited mobility.",
            priority="Critical",
            status="Assigned",
            eta="Volunteer en route",
            match_tags=["welfare", "access"],
            assigned_to="Ravi + building porter",
        ),
        SupportRequest(
            id="req-104",
            household="Station Mews 6",
            zone="Town Centre",
            need="Childcare bridge",
            detail=(
                "Parent is stuck at station due to service outage and school closes at 15:00."
            ),
            priority="Routine",
            status="Awaiting match",
            eta="By 14:30",
            match_tags=["childcare", "transport"],
        ),
        SupportRequest(
            id="req-105",
            household="Pier House 4C",
            zone="Riverside",
            need="Dry shelter overnight",
            detail="Leak has reached electrics. Two adults, one child, and a dog.",
            priority="High",
            status="Resolved",
            eta="Placed at church hall",
            match_tags=["shelter"],
            assigned_to="St. Anne shelter desk",
        ),
    ]

    offers = [
        VolunteerOffer(
            id="offer-201",
            provider="Mara, nurse volunteer",
            title="Medical pickup and triage",
            zone="Cross-zone",
            availability="Available now",
            capacity="2 runs before noon",
            response_time="10 min",
            trust="Verified",
            skill_tags=["medical", "transport"],
        ),
        VolunteerOffer(
            id="offer-202",
            provider="Luis, residents association",
            title="Battery packs and charging",
            zone="Riverside",
            availability="Available now",
            capacity="6 devices",
            response_time="14 min",
            trust="Known",
            skill_tags=["power"],
        ),
        VolunteerOffer(
            id="offer-203",
            provider="Amina, school parent group",
            title="Emergency childcare handoff",
            zone="Town Centre",
            availability="From 13:45",
            capacity="3 children",
            response_time="22 min",
            trust="Known",
            skill_tags=["childcare", "transport"],
        ),
        VolunteerOffer(
            id="offer-204",
            provider="Ravi, block captain",
            title="Stairwell welfare checks",
            zone="Riverside",
            availability="In progress",
            capacity="Tower floors 8 to 14",
            response_time="Already on site",
            trust="Verified",
            skill_tags=["welfare", "access"],
        ),
        VolunteerOffer(
            id="offer-205",
            provider="St. Anne hall team",
            title="Dry shelter and pet space",
            zone="Hilltop",
            availability="Beds open",
            capacity="14 beds + pets",
            response_time="18 min",
            trust="Verified",
            skill_tags=["shelter"],
        ),
    ]

    assignments = [
        Assignment(
            id="asg-301",
            request_id="req-103",
            request_label="Maple Court welfare check",
            provider="Ravi + building porter",
            zone="Hilltop",
            eta="On site",
            status="In progress",
        ),
        Assignment(
            id="asg-302",
            request_id="req-105",
            request_label="Pier House dry shelter",
            provider="St. Anne hall team",
            zone="Riverside",
            eta="Completed",
            status="Closed",
        ),
    ]

    resources = [
        ResourceNode(
            id="res-1",
            name="Library annexe",
            type="Charging point",
            zone="Town Centre",
            status="Open",
            detail="24 seats, phone charging, hot drinks, wheelchair access",
            distance="0.8 mi",
        ),
        ResourceNode(
            id="res-2",
            name="Market clinic desk",
            type="Medicine pickup",
            zone="Town Centre",
            status="Open until 18:00",
            detail="Prescription reroute for flood-affected residents",
            distance="1.1 mi",
        ),
        ResourceNode(
            id="res-3",
            name="St. Anne church hall",
            type="Shelter",
            zone="Hilltop",
            status="Beds available",
            detail="Family sleeping space, pet corner, blankets, tea",
            distance="1.7 mi",
        ),
        ResourceNode(
            id="res-4",
            name="Depot yard",
            type="Sandbag point",
            zone="Riverside",
            status="Restocking",
            detail="Two pallets due at 11:15. Volunteers needed for handoff.",
            distance="0.5 mi",
        ),
    ]

    architecture_modules = [
        InfoCard(
            title="Incident feed",
            detail="Time-stamped, verified updates with clear ownership and localized playbooks.",
        ),
        InfoCard(
            title="Household status",
            detail=(
                "Safe, need help, urgent, and offline modes with accessibility notes and "
                "fallback contacts."
            ),
        ),
        InfoCard(
            title="Requests and offers",
            detail="A lightweight exchange for needs, volunteer capacity, and location-aware matching.",
        ),
        InfoCard(
            title="Dispatch and audit",
            detail="Coordinator queue, assignment trail, and follow-through into recovery tasks.",
        ),
        InfoCard(
            title="Low-bandwidth delivery",
            detail="SMS, email, print export, and simple web surfaces for uneven connectivity.",
        ),
        InfoCard(
            title="Self-hosting kits",
            detail="Package the backend with straightforward deployment for schools and nonprofits.",
        ),
    ]

    operating_principles = [
        InfoCard(
            title="Useful on quiet days",
            detail=(
                "The network stays alive through drills, notices, volunteer rosters, and "
                "seasonal prep."
            ),
        ),
        InfoCard(
            title="Privacy before convenience",
            detail=(
                "Minimal resident data, role-based access, and clear retention rules for "
                "sensitive cases."
            ),
        ),
        InfoCard(
            title="Trust is explicit",
            detail="Verified sources are marked, rumors are not, and every action has an owner.",
        ),
        InfoCard(
            title="Not emergency services",
            detail="The product coordinates communities; it does not replace professional response.",
        ),
    ]

    normal_day_scenarios = [
        InfoCard(
            title="Preparedness drills",
            detail="Run monthly check-in tests and update household access needs before an incident.",
        ),
        InfoCard(
            title="Volunteer rosters",
            detail="Keep neighborhood captains, first-aiders, and translators easy to reach.",
        ),
        InfoCard(
            title="Building notices",
            detail="Use the same channels for maintenance notices, school closures, and service changes.",
        ),
    ]

    return deepcopy(
        AppState(
            incidents=incidents,
            requests=requests,
            offers=offers,
            assignments=assignments,
            resources=resources,
            architecture_modules=architecture_modules,
            operating_principles=operating_principles,
            normal_day_scenarios=normal_day_scenarios,
            readiness_checklist=[
                "Backup contact stored",
                "Mobility and access notes confirmed",
                "Medicine pickup plan set",
                "Charging point nearby",
            ],
        )
    )


def find_best_offer(request: SupportRequest, offers: list[VolunteerOffer]) -> VolunteerOffer | None:
    """Return the best compatible offer for a request.

    The current heuristic prefers:
    1. same-zone offers over cross-zone offers
    2. higher-trust volunteers over lower-trust volunteers
    """

    compatible_offers = [
        offer
        for offer in offers
        if (offer.zone == "Cross-zone" or offer.zone == request.zone)
        and any(tag in offer.skill_tags for tag in request.match_tags)
    ]

    compatible_offers.sort(
        key=lambda offer: (
            0 if offer.zone == request.zone else 1,
            TRUST_RANK[offer.trust],
        )
    )
    return compatible_offers[0] if compatible_offers else None
