"""EMŠ Strečnianska 15 — skratka bola uncertain (fuzzy match len na NO
GLUTEN), potvrdené s userom 1.9.2026: "nGnS" = NO GLUTEN – NO SOJA
(existujúca diéta, pk 116).

`nMnG`/"noMilk/noGluten" išlo doteraz len cez generický fallback (funkčne
OK, ale krehké) — user 15.9.2026 potvrdil, že má byť explicitné pravidlo
ako ostatné skratky na tomto feede.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NGNS": LetterRule(diet="NO GLUTEN – NO SOJA"),
    "NMNG": LetterRule(diet="NO MILK – NO GLUTEN"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def strecnianska_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
