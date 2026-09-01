"""Montessori (škola + škôlka, Borínska) — skratka "Iná..NmNgNe" sa
fuzzy-matchovala len na NO MILK/NO GLUTEN.

EduPage vlastný `nazov` vypisuje celú kombináciu jednoznačne:
`nazov="Iná NmNgNe..."` = bez mlieka + bez lepku + bez vajec. Engine chytí
len prvý sadnúci fragment (`nmng`) a vajcia potichu zahodí. Nahlásené
Stanom 31.8.2026. Diéta založená v appke s pomlčkovým oddeľovačom
(staršia konvencia, pk 122).

Písmená A-J (overené naživo 4.8.2026, viď `seed_new_edupage_2026_08`):
A="Iná"/"MŠ/ZŠ Iná", B="MŠ"/"MŠ Bežná", C="ZŠ"/"ZŠ Bežná",
D="Iná NmNo"/"Iná NOmilk,NOgluten", E=".."/"...", F="ZŠ 1."/".ZS 1 stupeň",
G="ZŠ FK 2."/"ZŠ FoodKut 2.", H="ZŠ zam."/"Zamestnanec Bežná",
I="FK zam."/"Zamestnanec FoodKut", J="FK MŠ bezl."/"MŠ FoodKut bezlepková".

C ("ZŠ Bežná" — bežná/regular ZŠ porcia) nie je diéta, ale `resolve_menu_variant`
ho nespoznal ako štandardné menu-písmeno, tak engine skúsil fuzzy diet-match,
zlyhal a nahlásil ako neznámu diétu (žiaden warning ale žiadne dáta — Montessori
2026-08-31/09-01, code review). H/I ("Zamestnanec...") sú zamestnanecké porcie =
DOSPELÁ (rovnaký princíp ako Krásňanko `KZ`), nie diéta ani zvláštny prípad.

A ("Iná"/"MŠ/ZŠ Iná") ostáva zatiaľ bez pravidla — nepotvrdené, čo presne
znamená (per user 1.9.2026); necháva sa na existujúce správanie (potichu
skončí pod MŠ cez match_prevadzka, per seed komentár), kým sa to nevyjasní.
B/F/G/J nefigurovali v žiadnom nahlásenom probléme — nechané bez zásahu.
"""

from __future__ import annotations

import re

from ..base import LetterRule

DOSPELA = "Dospelý (SŠ)"

_RULES: dict[str, LetterRule] = {
    "INÁ NMNGNE": LetterRule(diet="NO MILK – NO GLUTEN – NO EGG"),
    "ZŠ": LetterRule(menu="A"),
    "ZŠ ZAM": LetterRule(portion=DOSPELA, menu="A"),
    "FK ZAM": LetterRule(portion=DOSPELA, menu="A"),
}


def _kluc(skratka: str) -> str:
    """Normalizuj skratku pre lookup v `_RULES`.

    Škola posiela "Iná..NmNgNe" aj ".Iná NmNgNe." (bodky/medzery na okrajoch aj
    uprostred nekonzistentne) — bodky nahrádzame medzerou a whitespace zrátame,
    aby oba tvary padli na rovnaký kľúč (nahlásené 1.9.2026: skratka ".Iná
    NmNgNe." na kľúč "INÁ..NMNGNE" nesadla a E sa tíško zlúčilo s D pod
    NO MILK/NO GLUTEN bez vajec).
    """
    cleaned = skratka.replace(".", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.upper()


def montessori_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
