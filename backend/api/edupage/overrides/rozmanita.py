"""MŠ Rozmanitá — skratky boli uncertain/fuzzy-matchovali neúplne, potvrdené
s userom 1.9.2026:

    "NoMO"  → NO MILK – NO ORECH (existujúca diéta, pk 121)
    "NNNO"/"NoNoNo bezO" → NONONO, NO ORECH (existujúca diéta, pk 67) —
        fuzzy match padal len na NONONO, orech sa strácal
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NOMO": LetterRule(diet="NO MILK – NO ORECH"),
    "NNNO": LetterRule(diet="NONONO, NO ORECH"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def rozmanita_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
