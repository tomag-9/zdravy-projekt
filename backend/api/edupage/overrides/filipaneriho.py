"""MŠ Filipáneriho — skratky boli uncertain (fuzzy match), potvrdené s userom
1.9.2026 na isté pravidlá:

    "No med,mak,orechy"  → "NO MED, MAK, ORECH" (existujúca diéta, pk 56 —
                            čiarkový formát, nie novo založená pomlčková verzia)
    "No zemiak"          → NO ZEMIAK
    "No orech"           → NO ORECH
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NO MED,MAK,ORECHY": LetterRule(diet="NO MED, MAK, ORECH"),
    "NO ZEMIAK": LetterRule(diet="NO ZEMIAK"),
    "NO ORECH": LetterRule(diet="NO ORECH"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def filipaneriho_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
