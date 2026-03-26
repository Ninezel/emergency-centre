"""PyQt application bootstrap."""

from __future__ import annotations

import sys

from PyQt6.QtWidgets import QApplication

from .main_window import MainWindow
from .theme import APP_STYLESHEET


def main() -> int:
    """Create and run the desktop application."""

    app = QApplication(sys.argv)
    app.setApplicationName("Civic Beacon")
    app.setStyle("Fusion")
    app.setStyleSheet(APP_STYLESHEET)

    window = MainWindow()
    window.show()
    return app.exec()
