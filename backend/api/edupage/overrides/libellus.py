"""MŠ Libellus — dve skratky, kde fuzzy vrstva orezáva kombinovanú diétu na
jedno obmedzenie.

EduPage vlastný `nazov` vypisuje celý obsah jednoznačne:

    NENO   nazov="NoEgg/NoOrech" → engine chytí len "no egg" a orechy stratí
    NMNE   nazov="NoMilk/NoEgg"  → rovnaký #527 vzor ako "dsbNMNE" (zdravebrusko)
                                    a ZŠ Ivanka pri Dunaji — engine skratku chytí
                                    ako "no egg" a stratí mlieko

Nahlásené Stanom 31.8.2026.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NENO": LetterRule(diet="NO EGG/NO ORECH"),
    "NMNE": LetterRule(diet="NO MILK/NO EGG"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def libellus_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
