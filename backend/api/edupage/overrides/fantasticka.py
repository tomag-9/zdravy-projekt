"""Fantastická Škola — skratka "HITNMNGnSnKnFC" sa fuzzy-matchovala len na
NO MILK/NO GLUTEN.

EduPage vlastný `nazov` vypisuje celú kombináciu jednoznačne:
`nazov="HITnomilk/noGlu/noSoja/noKuk/noRafcukor"` = HISTAMIN + bez mlieka +
bez lepku + bez sóje + bez kukurice + bez rafinovaného cukru. Generický
engine si všimne len prvý sadnúci fragment (`nmng`) a zvyšné štyri
obmedzenia potichu zahodí — nahlásené Stanom 31.8.2026.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "HITNMNGNSNKNFC": LetterRule(
        diet="HISTAMIN/NO MILK/NO GLUTEN/NO SOJA/NO KUKURICA/NO CUKOR"
    ),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def fantasticka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
