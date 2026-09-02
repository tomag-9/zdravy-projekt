"""CMŠ Pezinok — skratka "H" nie je HISTAMIN, je to "Hlavná budova".

Generický `_SKRATKA_MAP["H"] = "HISTAMIN"` (British School konvencia) by túto
skratku exaktne namatchoval na diétu Histamín. Naživo (2.9.2026) je "H" =
"Hlavná budova" — administratívna skupina (aj vlastný payer typ, cena 0), nie
diéta. User 2.9.2026 potvrdil, že sa nemá vôbec počítať.
"""

from __future__ import annotations

from ..base import LetterRule


def cmspezinok_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    if skratka.strip().upper() == "H":
        return LetterRule(skip=True)
    return None
