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

Platiteľská skupina "2.stupeň DIABETI" (typ_platitela 16) má v EduPage
nastavení preklep — `porcia=1` (1. stupeň), hoci vlastný `nazov` jasne hovorí
"2.stupeň". Všetky ostatné 2.stupňové skupiny na tomto feede (typ_platitela
4/5/6/12/13/14) majú správne `porcia=2` — len táto jedna má zle nastavený kód
(potvrdené user 3.9.2026: appka priradila diabetika do ZŠ 1.stupeň namiesto
2.stupňa). Chyba je v EduPage nastavení samotnej školy, nedá sa opraviť tam —
`fantasticka_payer_hook` ju obchádza podľa payer LABELU, ktorý je spoľahlivý.

## Fantastická Škôlka (fantastickaskolka)

Skratka "B" (riadok s `nazov` "MŠ nM/nG") sa fuzzy-matchovala na
NO MILK/NO GLUTEN — user 2.9.2026 potvrdil, že je to správne (riadok v
EduPage naozaj popisuje "MŠ nM/nG" = MŠ bez mlieka/bez lepku).
"""

from __future__ import annotations

import unicodedata

from ..base import LetterRule, PayerRule

_RULES: dict[str, LetterRule] = {
    "HITNMNGNSNKNFC": LetterRule(
        diet="NO MILK – NO GLUTEN – HISTAMIN – NO SOJA – NO CUKOR – NO KUKURICA"
    ),
}


def _fold(value: str) -> str:
    """ASCII-fold + len písmená a číslice veľkými (diakritika/interpunkcia
    nerozhoduje, ale číslo stupňa musí ostať zachované)."""
    decomposed = unicodedata.normalize("NFKD", (value or "").casefold())
    return "".join(ch for ch in decomposed if ch.isalnum()).upper()


def fantasticka_payer_hook(payer_name: str) -> PayerRule | None:
    """ "2.stupeň DIABETI" má v EduPage `porcia=1` napriek vlastnému názvu —
    prepíš porciu podľa spoľahlivého payer labelu (viď docstring modulu)."""
    key = _fold(payer_name)
    if key.startswith("2STUPEN") and "DIABET" in key:
        return PayerRule(portion="ZŠ 2.stupeň")
    return None


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
