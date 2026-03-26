"""Primary PyQt window for the Civic Beacon desktop client.

The window is responsible for:
- building the widget tree
- reflecting controller state into widgets
- forwarding user actions back to the controller

It is intentionally kept as a view layer. Filtering, dispatch logic, and
assignment state transitions live in ``controller.py``.
"""

from __future__ import annotations

from typing import Iterable

from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QDesktopServices
from PyQt6.QtWidgets import (
    QComboBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from .controller import AppController, DashboardMetrics
from .models import (
    BOARD_FILTERS,
    HOUSEHOLD_STATES,
    ROLE_VIEWS,
    ZONE_FILTERS,
    Assignment,
    HouseholdStatus,
    Incident,
)


def clear_layout(layout: QVBoxLayout | QHBoxLayout | QGridLayout) -> None:
    """Recursively delete all child widgets from a Qt layout."""

    while layout.count():
        item = layout.takeAt(0)
        widget = item.widget()
        child_layout = item.layout()

        if widget is not None:
            widget.deleteLater()
        elif child_layout is not None:
            clear_layout(child_layout)  # type: ignore[arg-type]


class MainWindow(QMainWindow):
    """Main application window for the current desktop MVP."""

    def __init__(self) -> None:
        super().__init__()
        self.controller = AppController()

        self.setWindowTitle("Civic Beacon")
        self.resize(1500, 1020)

        self._build_ui()
        self.refresh_all()

    def _build_ui(self) -> None:
        """Build the static widget structure for the full window."""

        root = QWidget(objectName="Root")
        self.setCentralWidget(root)

        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(16, 16, 16, 16)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        root_layout.addWidget(scroll)

        content = QWidget()
        scroll.setWidget(content)

        content_layout = QVBoxLayout(content)
        content_layout.setSpacing(18)
        content_layout.setContentsMargins(0, 0, 0, 0)

        content_layout.addWidget(self._build_header())
        content_layout.addWidget(self._build_hero())
        content_layout.addWidget(self._build_operations())
        content_layout.addWidget(self._build_response_board())
        content_layout.addWidget(self._build_open_source_section())
        content_layout.addStretch(1)

    def _build_header(self) -> QFrame:
        frame = QFrame(objectName="HeaderBar")
        layout = QHBoxLayout(frame)
        layout.setContentsMargins(18, 14, 18, 14)

        brand_box = QVBoxLayout()
        brand_box.addWidget(QLabel("Civic Beacon", objectName="BrandTitle"))
        brand_box.addWidget(QLabel("Open-source community operations in PyQt", objectName="BrandSubtitle"))

        nav_box = QHBoxLayout()
        for label in ("Operations", "Response board", "Open source"):
            nav_box.addWidget(QLabel(label, objectName="BodyText"))
        nav_box.addStretch(1)

        support_button = QPushButton("Support on Ko-Fi", objectName="SecondaryButton")
        support_button.clicked.connect(self.open_support_link)

        layout.addLayout(brand_box, 2)
        layout.addLayout(nav_box, 2)
        layout.addWidget(support_button, 0, Qt.AlignmentFlag.AlignRight)
        return frame

    def _build_hero(self) -> QWidget:
        wrapper = QWidget()
        layout = QHBoxLayout(wrapper)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(18)

        layout.addWidget(self._build_hero_copy(), 5)
        layout.addWidget(self._build_hero_summary_panel(), 4)
        return wrapper

    def _build_hero_copy(self) -> QFrame:
        frame = QFrame(objectName="HeroCopy")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(14)

        layout.addWidget(QLabel("AGPL-3.0-or-later • self-hostable • donation funded", objectName="Eyebrow"))

        hero_title = QLabel(
            "Coordinate the people who can help before local disruption turns into chaos.",
            objectName="HeroTitle",
        )
        hero_title.setWordWrap(True)
        layout.addWidget(hero_title)

        hero_text = QLabel(
            "Civic Beacon is a desktop command surface for neighborhoods, buildings, schools, "
            "and civic groups to track incidents, collect check-ins, route requests, and keep "
            "recovery work accountable.",
            objectName="BodyText",
        )
        hero_text.setWordWrap(True)
        layout.addWidget(hero_text)

        action_row = QHBoxLayout()
        dispatch_button = QPushButton("Dispatch next request", objectName="PrimaryButton")
        dispatch_button.clicked.connect(self.dispatch_next_request)
        donate_button = QPushButton("Donate via Ko-Fi", objectName="SecondaryButton")
        donate_button.clicked.connect(self.open_support_link)
        action_row.addWidget(dispatch_button)
        action_row.addWidget(donate_button)
        action_row.addStretch(1)
        layout.addLayout(action_row)

        layout.addWidget(
            QLabel(
                "Resident check-ins   •   Verified incident feed   •   Request and offer matching   •   Dispatch audit trail",
                objectName="MutedText",
            )
        )
        layout.addStretch(1)
        return frame

    def _build_hero_summary_panel(self) -> QFrame:
        frame = QFrame(objectName="HeroPanel")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        layout.addWidget(QLabel("Active scenario", objectName="DarkKicker"))

        self.summary_name_label = QLabel(objectName="DarkTitle")
        self.summary_name_label.setWordWrap(True)
        layout.addWidget(self.summary_name_label)

        self.summary_status_chip = self._make_chip("Active", "Active")
        layout.addWidget(self.summary_status_chip, 0, Qt.AlignmentFlag.AlignLeft)

        self.summary_description_label = QLabel(objectName="DarkText")
        self.summary_description_label.setWordWrap(True)
        layout.addWidget(self.summary_description_label)

        metric_grid = QGridLayout()
        metric_grid.setHorizontalSpacing(12)
        metric_grid.setVerticalSpacing(12)
        self.metric_value_labels: dict[str, QLabel] = {}
        metric_definitions = (
            ("checked_in", "Households checked in"),
            ("open_requests", "Open requests"),
            ("active_assignments", "Active assignments"),
            ("resolved", "Resolved today"),
        )

        for index, (key, label) in enumerate(metric_definitions):
            card, value_label = self._make_metric_card(label)
            self.metric_value_labels[key] = value_label
            metric_grid.addWidget(card, index // 2, index % 2)
        layout.addLayout(metric_grid)

        role_row = QHBoxLayout()
        role_row.addWidget(QLabel("Role view", objectName="DarkKicker"))

        self.role_combo = QComboBox(objectName="FilterCombo")
        self.role_combo.addItems(ROLE_VIEWS)
        self.role_combo.currentTextChanged.connect(self.on_role_view_changed)
        role_row.addWidget(self.role_combo)
        role_row.addStretch(1)
        layout.addLayout(role_row)

        self.role_note_label = QLabel(objectName="DarkMeta")
        self.role_note_label.setWordWrap(True)
        layout.addWidget(self.role_note_label)
        return frame

    def _build_operations(self) -> QWidget:
        wrapper = QWidget()
        layout = QHBoxLayout(wrapper)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(18)

        layout.addWidget(self._build_incident_panel(), 3)
        layout.addWidget(self._build_checkin_panel(), 3)
        layout.addWidget(self._build_feed_panel(), 4)
        return wrapper

    def _build_incident_panel(self) -> QFrame:
        frame, body = self._make_panel("Incident board", "Switch response context")
        self.incident_window_label = QLabel(objectName="PanelMeta")
        body.addWidget(self.incident_window_label)

        self.incident_list = QListWidget(objectName="IncidentList")
        self.incident_list.currentRowChanged.connect(self.on_incident_selected)
        body.addWidget(self.incident_list)

        self.playbooks_label = QLabel(objectName="BodyText")
        self.playbooks_label.setWordWrap(True)
        body.addWidget(self.playbooks_label)
        return frame

    def _build_checkin_panel(self) -> QFrame:
        frame, body = self._make_panel("Resident actions", "Household check-in")
        self.household_chip_label = self._make_chip(self.controller.household_status, self.controller.household_status)
        body.addWidget(self.household_chip_label, 0, Qt.AlignmentFlag.AlignLeft)

        self.last_checkin_label = QLabel(objectName="BodyText")
        self.last_checkin_label.setWordWrap(True)
        body.addWidget(self.last_checkin_label)

        status_grid = QGridLayout()
        self.status_buttons: dict[str, QPushButton] = {}
        for index, status in enumerate(HOUSEHOLD_STATES):
            button = QPushButton(status, objectName="StatusButton")
            button.setCheckable(True)
            button.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
            button.clicked.connect(
                lambda checked=False, next_status=status: self.on_household_status_clicked(next_status)
            )
            self.status_buttons[status] = button
            status_grid.addWidget(button, index // 2, index % 2)

        body.addLayout(status_grid)
        body.addWidget(QLabel("Readiness checklist", objectName="PanelKicker"))
        self.checklist_layout = QVBoxLayout()
        body.addLayout(self.checklist_layout)
        body.addStretch(1)
        return frame

    def _build_feed_panel(self) -> QFrame:
        frame, body = self._make_panel("Verified updates", "Incident feed")
        self.feed_location_label = QLabel(objectName="PanelMeta")
        body.addWidget(self.feed_location_label)
        self.feed_cards_layout = QVBoxLayout()
        body.addLayout(self.feed_cards_layout)
        body.addStretch(1)
        return frame

    def _build_response_board(self) -> QFrame:
        frame = QFrame(objectName="Panel")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        heading_row = QHBoxLayout()
        heading_copy = QVBoxLayout()
        heading_copy.addWidget(QLabel("Response board", objectName="PanelKicker"))

        heading_title = QLabel("Requests, offers, and dispatch in one operational surface", objectName="PanelTitle")
        heading_title.setWordWrap(True)
        heading_copy.addWidget(heading_title)
        heading_row.addLayout(heading_copy)

        controls = QHBoxLayout()
        self.board_filter_combo = QComboBox(objectName="FilterCombo")
        self.board_filter_combo.addItems(BOARD_FILTERS)
        self.board_filter_combo.currentTextChanged.connect(self.on_board_filter_changed)

        self.zone_filter_combo = QComboBox(objectName="FilterCombo")
        self.zone_filter_combo.addItems(ZONE_FILTERS)
        self.zone_filter_combo.currentTextChanged.connect(self.on_zone_filter_changed)

        dispatch_button = QPushButton("Dispatch next request", objectName="PrimaryButton")
        dispatch_button.clicked.connect(self.dispatch_next_request)

        controls.addWidget(self.board_filter_combo)
        controls.addWidget(self.zone_filter_combo)
        controls.addWidget(dispatch_button)
        controls.addStretch(1)
        heading_row.addLayout(controls, 2)
        layout.addLayout(heading_row)

        self.dispatch_message_label = QLabel(objectName="BodyText")
        self.dispatch_message_label.setWordWrap(True)
        layout.addWidget(self.dispatch_message_label)

        grid = QGridLayout()
        grid.setHorizontalSpacing(16)
        grid.setVerticalSpacing(16)

        requests_panel, requests_body = self._make_panel("Requests", "Needs queue")
        self.request_count_label = QLabel(objectName="PanelMeta")
        requests_body.addWidget(self.request_count_label)
        self.requests_layout = QVBoxLayout()
        requests_body.addLayout(self.requests_layout)

        offers_panel, offers_body = self._make_panel("Offers", "Volunteer capacity")
        self.offer_count_label = QLabel(objectName="PanelMeta")
        offers_body.addWidget(self.offer_count_label)
        self.offers_layout = QVBoxLayout()
        offers_body.addLayout(self.offers_layout)

        assignments_panel, assignments_body = self._make_panel("Dispatch lane", "Assignment trail")
        self.assignment_count_label = QLabel(objectName="PanelMeta")
        assignments_body.addWidget(self.assignment_count_label)
        self.assignments_layout = QVBoxLayout()
        assignments_body.addLayout(self.assignments_layout)

        resources_panel, resources_body = self._make_panel("Resource map", "Local support nodes")
        self.resource_count_label = QLabel(objectName="PanelMeta")
        resources_body.addWidget(self.resource_count_label)
        self.resources_layout = QVBoxLayout()
        resources_body.addLayout(self.resources_layout)

        grid.addWidget(requests_panel, 0, 0)
        grid.addWidget(offers_panel, 0, 1)
        grid.addWidget(assignments_panel, 1, 0)
        grid.addWidget(resources_panel, 1, 1)
        layout.addLayout(grid)
        return frame

    def _build_open_source_section(self) -> QWidget:
        wrapper = QWidget()
        layout = QHBoxLayout(wrapper)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(18)

        left_panel, left_body = self._make_panel("Open-source foundation", "Built for communities, not extracted from them")
        intro = QLabel(
            "The project is licensed under AGPL-3.0-or-later so hosted improvements come back to "
            "the commons. Anyone can self-host, adapt, audit, and deploy it for free.",
            objectName="BodyText",
        )
        intro.setWordWrap(True)
        left_body.addWidget(intro)
        for card in self.controller.state.architecture_modules:
            left_body.addWidget(self._make_info_card(card.title, card.detail))
        left_body.addStretch(1)

        right_column = QVBoxLayout()

        principles_panel, principles_body = self._make_panel("Operating principles", "Guardrails that matter in real crises")
        for card in self.controller.state.operating_principles:
            principles_body.addWidget(self._make_info_card(card.title, card.detail))

        quiet_panel, quiet_body = self._make_panel("Quiet-day value", "Why this stays useful between emergencies")
        for card in self.controller.state.normal_day_scenarios:
            quiet_body.addWidget(self._make_info_card(card.title, card.detail))

        support_panel, support_body = self._make_panel("Support the maintainer", "Keep the software free")
        support_text = QLabel(
            "This project is free to use and self-host. If it helps your building, neighborhood, "
            "school, or mutual-aid group, support ongoing development on Ko-Fi.",
            objectName="BodyText",
        )
        support_text.setWordWrap(True)
        support_button = QPushButton("Donate via Ko-Fi", objectName="PrimaryButton")
        support_button.clicked.connect(self.open_support_link)
        support_hint = QLabel("Support link: ko-fi.com/ninezel", objectName="SupportHint")
        support_body.addWidget(support_text)
        support_body.addWidget(support_button, 0, Qt.AlignmentFlag.AlignLeft)
        support_body.addWidget(support_hint)
        support_body.addStretch(1)

        right_column.addWidget(principles_panel)
        right_column.addWidget(quiet_panel)
        right_column.addWidget(support_panel)

        right_wrap = QWidget()
        right_wrap.setLayout(right_column)
        layout.addWidget(left_panel, 6)
        layout.addWidget(right_wrap, 4)
        return wrapper

    def _make_panel(self, kicker: str, title: str) -> tuple[QFrame, QVBoxLayout]:
        """Create a standard section panel with a heading."""

        frame = QFrame(objectName="Panel")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)
        layout.addWidget(QLabel(kicker, objectName="PanelKicker"))

        title_label = QLabel(title, objectName="PanelTitle")
        title_label.setWordWrap(True)
        layout.addWidget(title_label)
        return frame, layout

    def _make_metric_card(self, label: str) -> tuple[QFrame, QLabel]:
        frame = QFrame(objectName="MetricCard")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(6)
        layout.addWidget(QLabel(label, objectName="MetricLabel"))
        value_label = QLabel("0", objectName="MetricValue")
        layout.addWidget(value_label)
        return frame, value_label

    def _make_chip(self, text: str, tone: str) -> QLabel:
        chip = QLabel(text)
        chip.setAlignment(Qt.AlignmentFlag.AlignCenter)
        chip.setStyleSheet(self._chip_stylesheet(tone))
        return chip

    def _chip_stylesheet(self, tone: str) -> str:
        slug = tone.lower().replace(" ", "-")

        if slug in {"active", "dispatching", "critical", "urgent"}:
            fg, bg = "#fff5ef", "#b64230"
        elif slug in {"monitoring", "high"}:
            fg, bg = "#fff8e8", "#cc8b1f"
        elif slug in {"recovery", "resolved", "closed", "safe", "verified", "known", "open", "beds-available"}:
            fg, bg = "#effcf5", "#2d7a56"
        elif slug in {"assigned", "in-progress", "building-update", "health", "site-ready", "stabilizing"}:
            fg, bg = "#eefafd", "#1b7f8b"
        else:
            fg, bg = "#18343d", "#e7ecec"

        return (
            f"background:{bg}; color:{fg}; border-radius:11px; padding:5px 10px; "
            "font-size:11px; font-weight:700;"
        )

    def _make_info_card(self, title: str, detail: str) -> QFrame:
        frame = QFrame(objectName="Card")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(6)
        title_label = QLabel(title, objectName="CardTitle")
        body_label = QLabel(detail, objectName="BodyText")
        body_label.setWordWrap(True)
        layout.addWidget(title_label)
        layout.addWidget(body_label)
        return frame

    def _make_record_card(
        self,
        *,
        title: str,
        subtitle: str,
        detail: str,
        chips: Iterable[tuple[str, str]],
        footer_left: str = "",
        footer_right: str = "",
    ) -> QFrame:
        """Create a generic data card used across feeds and boards."""

        frame = QFrame(objectName="Card")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)

        top_row = QHBoxLayout()
        heading = QVBoxLayout()
        title_label = QLabel(title, objectName="CardTitle")
        subtitle_label = QLabel(subtitle, objectName="CardMeta")
        title_label.setWordWrap(True)
        subtitle_label.setWordWrap(True)
        heading.addWidget(title_label)
        heading.addWidget(subtitle_label)
        top_row.addLayout(heading, 1)

        chips_row = QHBoxLayout()
        for chip_text, tone in chips:
            chips_row.addWidget(self._make_chip(chip_text, tone))
        top_row.addLayout(chips_row)
        layout.addLayout(top_row)

        detail_label = QLabel(detail, objectName="BodyText")
        detail_label.setWordWrap(True)
        layout.addWidget(detail_label)

        if footer_left or footer_right:
            footer = QHBoxLayout()
            left_label = QLabel(footer_left, objectName="MutedText")
            right_label = QLabel(footer_right, objectName="MutedText")
            left_label.setWordWrap(True)
            right_label.setWordWrap(True)
            footer.addWidget(left_label, 1)
            footer.addWidget(right_label, 1, Qt.AlignmentFlag.AlignRight)
            layout.addLayout(footer)
        return frame

    def _make_assignment_card(self, assignment: Assignment) -> QFrame:
        """Create the dispatch card that includes an advance button."""

        frame = QFrame(objectName="Card")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)

        top_row = QHBoxLayout()
        text_box = QVBoxLayout()
        title = QLabel(assignment.request_label, objectName="CardTitle")
        subtitle = QLabel(f"{assignment.provider} • {assignment.zone}", objectName="CardMeta")
        title.setWordWrap(True)
        subtitle.setWordWrap(True)
        text_box.addWidget(title)
        text_box.addWidget(subtitle)
        top_row.addLayout(text_box, 1)
        top_row.addWidget(self._make_chip(assignment.status, assignment.status), 0, Qt.AlignmentFlag.AlignRight)
        layout.addLayout(top_row)

        layout.addWidget(QLabel(assignment.eta, objectName="BodyText"))

        button_row = QHBoxLayout()
        button_row.addStretch(1)
        advance_button = QPushButton("Advance", objectName="SecondaryButton")
        advance_button.setEnabled(assignment.status != "Closed")
        advance_button.clicked.connect(
            lambda checked=False, assignment_id=assignment.id: self.advance_assignment(assignment_id)
        )
        button_row.addWidget(advance_button)
        layout.addLayout(button_row)
        return frame

    def refresh_all(self) -> None:
        """Push the current controller state into all visible widgets."""

        incident = self.controller.current_incident()
        metrics = self.controller.dashboard_metrics()

        self._refresh_hero_panel(incident, metrics)
        self._refresh_incident_panel(incident)
        self._refresh_checkin_panel()
        self._refresh_feed_panel(incident)
        self._refresh_response_panels()

    def _refresh_hero_panel(self, incident: Incident, metrics: DashboardMetrics) -> None:
        self.summary_name_label.setText(incident.name)
        self.summary_status_chip.setText(incident.status)
        self.summary_status_chip.setStyleSheet(self._chip_stylesheet(incident.status))
        self.summary_description_label.setText(incident.summary)

        self.metric_value_labels["checked_in"].setText(f"{metrics.households_checked_in:,}")
        self.metric_value_labels["open_requests"].setText(str(metrics.open_requests))
        self.metric_value_labels["active_assignments"].setText(str(metrics.active_assignments))
        self.metric_value_labels["resolved"].setText(str(metrics.resolved_requests))

        self.role_combo.blockSignals(True)
        self.role_combo.setCurrentText(self.controller.role_view)
        self.role_combo.blockSignals(False)
        self.role_note_label.setText(self.controller.role_note())

    def _refresh_incident_panel(self, incident: Incident) -> None:
        self.incident_window_label.setText(incident.window)
        self.feed_location_label.setText(incident.location)
        self.playbooks_label.setText("Playbooks: " + " • ".join(incident.playbooks))

        self.incident_list.blockSignals(True)
        self.incident_list.clear()
        for candidate in self.controller.state.incidents:
            item = QListWidgetItem(f"{candidate.name}\n{candidate.location}")
            self.incident_list.addItem(item)
            if candidate.id == self.controller.selected_incident_id:
                self.incident_list.setCurrentItem(item)
        self.incident_list.blockSignals(False)

    def _refresh_checkin_panel(self) -> None:
        self.household_chip_label.setText(self.controller.household_status)
        self.household_chip_label.setStyleSheet(self._chip_stylesheet(self.controller.household_status))
        self.last_checkin_label.setText(
            "Use this to report status during drills or live incidents. "
            f"Last updated at {self.controller.last_check_in_at}."
        )

        for status, button in self.status_buttons.items():
            button.setChecked(status == self.controller.household_status)

        clear_layout(self.checklist_layout)
        for item in self.controller.state.readiness_checklist:
            self.checklist_layout.addWidget(QLabel(f"• {item}", objectName="BodyText"))

    def _refresh_feed_panel(self, incident: Incident) -> None:
        clear_layout(self.feed_cards_layout)
        for update in incident.updates:
            self.feed_cards_layout.addWidget(
                self._make_record_card(
                    title=update.title,
                    subtitle=f"{update.time} • {update.source}",
                    detail=update.detail,
                    chips=[(update.label, update.label)],
                )
            )

    def _refresh_response_panels(self) -> None:
        visible_requests = self.controller.visible_requests()
        visible_offers = self.controller.visible_offers()
        visible_resources = self.controller.visible_resources()

        self.board_filter_combo.blockSignals(True)
        self.board_filter_combo.setCurrentText(self.controller.board_filter)
        self.board_filter_combo.blockSignals(False)
        self.zone_filter_combo.blockSignals(True)
        self.zone_filter_combo.setCurrentText(self.controller.focus_zone)
        self.zone_filter_combo.blockSignals(False)

        self.dispatch_message_label.setText(self.controller.dispatch_message)
        self.request_count_label.setText(f"{len(visible_requests)} visible")
        self.offer_count_label.setText(f"{len(visible_offers)} visible")
        self.assignment_count_label.setText(f"{len(self.controller.state.assignments)} total")
        self.resource_count_label.setText(f"{len(visible_resources)} visible")

        clear_layout(self.requests_layout)
        for request in visible_requests:
            self.requests_layout.addWidget(
                self._make_record_card(
                    title=request.need,
                    subtitle=f"{request.household} • {request.zone}",
                    detail=request.detail,
                    chips=[(request.priority, request.priority), (request.status, request.status)],
                    footer_left=request.eta,
                    footer_right=request.assigned_to or "Awaiting dispatch",
                )
            )

        clear_layout(self.offers_layout)
        for offer in visible_offers:
            self.offers_layout.addWidget(
                self._make_record_card(
                    title=offer.title,
                    subtitle=f"{offer.provider} • {offer.zone}",
                    detail=offer.capacity,
                    chips=[(offer.trust, offer.trust)],
                    footer_left=offer.availability,
                    footer_right=offer.response_time,
                )
            )

        clear_layout(self.assignments_layout)
        for assignment in self.controller.state.assignments:
            self.assignments_layout.addWidget(self._make_assignment_card(assignment))

        clear_layout(self.resources_layout)
        for resource in visible_resources:
            self.resources_layout.addWidget(
                self._make_record_card(
                    title=resource.name,
                    subtitle=f"{resource.type} • {resource.zone}",
                    detail=resource.detail,
                    chips=[(resource.status, resource.status)],
                    footer_left=resource.status,
                    footer_right=resource.distance,
                )
            )

    def on_incident_selected(self, row: int) -> None:
        self.controller.set_selected_incident_by_index(row)
        self.refresh_all()

    def on_household_status_clicked(self, next_status: HouseholdStatus) -> None:
        self.controller.set_household_status(next_status)
        self.refresh_all()

    def on_role_view_changed(self, next_view: str) -> None:
        self.controller.set_role_view(next_view)
        self.refresh_all()

    def on_board_filter_changed(self, next_filter: str) -> None:
        self.controller.set_board_filter(next_filter)
        self.refresh_all()

    def on_zone_filter_changed(self, next_zone: str) -> None:
        self.controller.set_focus_zone(next_zone)
        self.refresh_all()

    def dispatch_next_request(self) -> None:
        self.controller.dispatch_next_request()
        self.refresh_all()

    def advance_assignment(self, assignment_id: str) -> None:
        self.controller.advance_assignment(assignment_id)
        self.refresh_all()

    def open_support_link(self) -> None:
        QDesktopServices.openUrl(QUrl("https://ko-fi.com/ninezel"))
