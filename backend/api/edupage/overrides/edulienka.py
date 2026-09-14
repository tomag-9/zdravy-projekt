"""MŠ EduLienka — potvrdené skratky diétnych menu z EduPage.

EduPage pri týchto riadkoch používa vlastné prefixy ``cms`` a pri kombinácii
``cmsNMNE`` generický fuzzy matcher vyberal len poslednú zložku (NO EGG).
Tieto pravidlá sú potvrdené prevádzkou 14. 9. 2026, preto sú explicitné a
nesmú vytvárať ``uncertain_diets`` upozornenie.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "CMSNM": LetterRule(diet="NO MILK"),
    "CMSNMNE": LetterRule(diet="NO MILK – NO EGG"),
    "CMSNMNG": LetterRule(diet="NO MILK – NO GLUTEN"),
    "HISTAMIN, NO GLUTEN": LetterRule(diet="NO GLUTEN – HISTAMIN"),
}


def edulienka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť potvrdenú diétu EduLienky, inak nechaj rozhodnúť engine."""
    return _RULES.get((skratka or "").strip().upper())
