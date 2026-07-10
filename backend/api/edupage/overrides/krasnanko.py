"""Krásňanko — jediná prevádzka, kde deklaratívny config nestačí.

Škola kóduje zamestnanecký status priamo do menu skratky:

    K     Klasik                 → klasik, detská porcia
    K-D   „Klasik domov"         → klasik, detská porcia (názov klame, je to detská)
    NM    No Milk                → NO MILK, detská porcia
    NG    No Gluten              → NO GLUTEN, detská porcia
    KZ    Klasik dospelý Z       → klasik, DOSPELÁ porcia   (Z = zamestnanec)
    NMZ   No milk dospelý Z      → NO MILK, DOSPELÁ porcia
    KZD   Klasik detská Z        → klasik, detská porcia    + flag „!"
    NMZD  No milk detská Z       → NO MILK, detská porcia   + flag „!"
    DIA   Dia                    → DIA

Zamestnanecký status (`Z`) nás v KAVZE nezaujíma — škola ho tam len eviduje. Dôležitá
je **porcia**, a tú engine z `porcia` kódu payera prečíta zle: payer `Klasik Z` má
`porcia=0` (Škôlka), hoci `KZ` je dospelý. Preto porciu určujeme zo skratky.

`ZD` (zamestnanec + detská porcia) zaraďujeme ako MS/Škôlka, ale necháme flag „!",
lebo kombinácia je nezvyčajná a chceme ju vedieť skontrolovať.
"""

from __future__ import annotations

from ..base import LetterRule

DETSKA = "Škôlka"
DOSPELA = "Dospelý (SŠ)"

# skratka (upper, bez medzier/pomlčiek) → pravidlo
_RULES: dict[str, LetterRule] = {
    "K": LetterRule(portion=DETSKA, menu="A"),
    "KD": LetterRule(portion=DETSKA, menu="A"),
    "NM": LetterRule(portion=DETSKA, diet="NO MILK"),
    "NG": LetterRule(portion=DETSKA, diet="NO GLUTEN"),
    "KZ": LetterRule(portion=DOSPELA, menu="A"),
    "NMZ": LetterRule(portion=DOSPELA, diet="NO MILK"),
    "KZD": LetterRule(portion=DETSKA, menu="A", flag="!"),
    "NMZD": LetterRule(portion=DETSKA, diet="NO MILK", flag="!"),
    "DIA": LetterRule(portion=DETSKA, diet="DIA"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper().replace("-", "").replace(" ", "")


def krasnanko_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
