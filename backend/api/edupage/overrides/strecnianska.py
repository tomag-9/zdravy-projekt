"""EMŠ Strečnianska 15 — skratka bola uncertain (fuzzy match len na NO
GLUTEN), potvrdené s userom 1.9.2026: "nGnS" = NO GLUTEN – NO SOJA
(existujúca diéta, pk 116).
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NGNS": LetterRule(diet="NO GLUTEN – NO SOJA"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def strecnianska_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
