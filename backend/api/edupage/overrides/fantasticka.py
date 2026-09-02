"""Fantastická (Škola aj Škôlka) — dve samostatné EduPage pripojenia
(`szsfan`, `fantastickaskolka`), preto dva nezávislé rules dicty/hooky v
jednom súbore — spoločný len názvom, nie feedom.

## Fantastická Škola (szsfan)

Skratka "HITNMNGnSnKnFC" sa fuzzy-matchovala len na NO MILK/NO GLUTEN.
EduPage vlastný `nazov` vypisuje celú kombináciu jednoznačne:
`nazov="HITnomilk/noGlu/noSoja/noKuk/noRafcukor"` = HISTAMIN + bez mlieka +
bez lepku + bez sóje + bez kukurice + bez rafinovaného cukru. Generický
engine si všimne len prvý sadnúci fragment (`nmng`) a zvyšné štyri
obmedzenia potichu zahodí — nahlásené Stanom 31.8.2026.

Diéta `NO MILK – NO GLUTEN – HISTAMIN – NO SOJA – NO CUKOR – NO KUKURICA`
(pk 123) založená v appke 31.8.2026 (nahrádza pôvodné pk 117, ktoré pri
úprave nepridalo kukuricu do názvu a muselo sa zmazať a znova založiť).

## Fantastická Škôlka (fantastickaskolka)

Skratka "B" (riadok s `nazov` "MŠ nM/nG") sa fuzzy-matchovala na
NO MILK/NO GLUTEN — user 2.9.2026 potvrdil, že je to správne (riadok v
EduPage naozaj popisuje "MŠ nM/nG" = MŠ bez mlieka/bez lepku).
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "HITNMNGNSNKNFC": LetterRule(
        diet="NO MILK – NO GLUTEN – HISTAMIN – NO SOJA – NO CUKOR – NO KUKURICA"
    ),
}

_SKOLKA_RULES: dict[str, LetterRule] = {
    "B": LetterRule(diet="NO MILK/NO GLUTEN"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def fantasticka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno (Fantastická Škola), alebo None → nech
    rozhodne engine."""
    return _RULES.get(_kluc(skratka))


def fantastickaskolka_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno (Fantastická Škôlka), alebo None → nech
    rozhodne engine."""
    return _SKOLKA_RULES.get(_kluc(skratka))
