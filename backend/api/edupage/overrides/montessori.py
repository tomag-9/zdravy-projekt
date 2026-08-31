"""Montessori (škola + škôlka, Borínska) — skratka "Iná..NmNgNe" sa
fuzzy-matchovala len na NO MILK/NO GLUTEN.

EduPage vlastný `nazov` vypisuje celú kombináciu jednoznačne:
`nazov="Iná NmNgNe..."` = bez mlieka + bez lepku + bez vajec. Engine chytí
len prvý sadnúci fragment (`nmng`) a vajcia potichu zahodí. Nahlásené
Stanom 31.8.2026. Diéta založená v appke s pomlčkovým oddeľovačom
(staršia konvencia, pk 122).
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "INÁ..NMNGNE": LetterRule(diet="NO MILK – NO GLUTEN – NO EGG"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def montessori_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
