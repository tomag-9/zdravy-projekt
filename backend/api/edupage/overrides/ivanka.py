"""ZŠ Ivanka pri Dunaji — tri skratky, kde fuzzy vrstva orezáva kombinovanú
diétu na jedno obmedzenie.

EduPage vlastný `nazov` vypisuje celý obsah jednoznačne:

    NGNF               nazov="NoGluten/NoFish"                → engine chytí len "NG" a
                                                                   stratí rybu
    NMNE               nazov="NoMilk/NoEgg"                    → rovnaký #527 vzor ako
                                                                   "dsbNMNE" (zdravebrusko)
                                                                   a Libellus — engine skratku
                                                                   chytí ako "no egg" a stratí
                                                                   mlieko
    MŠ NMNG bez ARAS   nazov="MŠ NoMilk/NoGluten bez Arašidov" → engine zastaví na
                                                                   "NO MILK/NO GLUTEN" a
                                                                   arašidy vôbec nevidí

Nahlásené Stanom 31.8.2026.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NGNF": LetterRule(diet="NO GLUTEN/NO FISH"),
    "NMNE": LetterRule(diet="NO MILK/NO EGG"),
    "MŠ NMNG BEZ ARAS": LetterRule(diet="NO MILK/NO GLUTEN/NO ARASIDY"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def ivanka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
