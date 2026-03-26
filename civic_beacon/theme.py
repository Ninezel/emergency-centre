"""Centralized visual theme for the PyQt client."""

APP_STYLESHEET = """
QWidget#Root { background: #f2eee5; }
QScrollArea { border: none; }
QFrame#HeaderBar, QFrame#HeroCopy, QFrame#HeroPanel, QFrame#Panel, QFrame#Card, QFrame#MetricCard {
    border: 1px solid #d9d2c8; border-radius: 24px;
}
QFrame#HeaderBar, QFrame#HeroCopy, QFrame#Panel, QFrame#Card {
    background: rgba(255, 251, 245, 0.92);
}
QFrame#HeroPanel { background: #18343d; border-color: #264f5b; }
QFrame#MetricCard { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.08); }
QLabel#BrandTitle { font-size: 22px; font-weight: 700; color: #18343d; }
QLabel#BrandSubtitle, QLabel#BodyText, QLabel#PanelMeta, QLabel#CardMeta, QLabel#MutedText { color: #50676d; }
QLabel#Eyebrow, QLabel#PanelKicker, QLabel#DarkKicker, QLabel#SupportHint {
    color: #688188; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
}
QLabel#HeroTitle { font-size: 40px; font-weight: 700; color: #18343d; }
QLabel#PanelTitle, QLabel#CardTitle { font-size: 22px; font-weight: 700; color: #18343d; }
QLabel#CardTitle { font-size: 16px; }
QLabel#DarkTitle, QLabel#DarkText, QLabel#DarkMeta, QLabel#MetricLabel, QLabel#MetricValue { color: #f7efe6; }
QLabel#DarkTitle { font-size: 24px; font-weight: 700; }
QLabel#DarkText { color: #d0dedf; }
QLabel#DarkMeta, QLabel#MetricLabel { color: #bdd1d5; }
QLabel#MetricLabel { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
QLabel#MetricValue { font-size: 26px; font-weight: 700; }
QPushButton#PrimaryButton, QPushButton#SecondaryButton, QPushButton#StatusButton {
    padding: 10px 16px; border-radius: 18px; font-weight: 600;
}
QPushButton#PrimaryButton { background: #db5d39; color: #fff9f2; border: 1px solid #db5d39; }
QPushButton#PrimaryButton:hover { background: #c85231; }
QPushButton#SecondaryButton { background: rgba(24,52,61,0.06); color: #18343d; border: 1px solid #d9d2c8; }
QPushButton#StatusButton { background: rgba(24,52,61,0.04); color: #18343d; border: 1px solid #d9d2c8; text-align: left; }
QPushButton#StatusButton:checked { background: rgba(219,93,57,0.12); border-color: #db5d39; }
QComboBox#FilterCombo, QListWidget#IncidentList {
    background: rgba(255,255,255,0.76); border: 1px solid #d9d2c8; border-radius: 16px; padding: 8px 12px; color: #18343d;
}
QListWidget#IncidentList::item { border-radius: 14px; padding: 12px; margin: 4px 0; }
QListWidget#IncidentList::item:selected { background: rgba(219,93,57,0.12); color: #18343d; }
"""
