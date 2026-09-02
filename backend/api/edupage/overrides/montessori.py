"""Montessori (škola + škôlka, Borínska) — z EduPage sa počíta LEN písmeno 'Iná'.

Písmená A-J (overené naživo 4.8.2026, viď `seed_new_edupage_2026_08`):
A="Iná"/"MŠ/ZŠ Iná", B="MŠ"/"MŠ Bežná", C="ZŠ"/"ZŠ Bežná",
D="Iná NmNo"/"Iná NOmilk,NOgluten", E=".."/"...", F="ZŠ 1."/".ZS 1 stupeň",
G="ZŠ FK 2."/"ZŠ FoodKut 2.", H="ZŠ zam."/"Zamestnanec Bežná",
I="FK zam."/"Zamestnanec FoodKut", J="FK MŠ bezl."/"MŠ FoodKut bezlepková".

Pôvodne sa z EduPage počítali všetky písmená (B/C ako bežné menu, H/I ako
zamestnanecká dospelá porcia) a appka len opravovala fuzzy-match diét (napr.
"Iná..NmNgNe" sa matchovalo len na NO MILK/NO GLUTEN, vajcia sa strácali —
nahlásené Stanom 31.8.2026, pk 122). User 2.9.2026 ale potvrdil, že appka má
z EduPage rátať VÝHRADNE 'Iná' skupinu (A, D a ich diétne varianty ako "Iná
NmNgNe") — všetko ostatné (bežné MŠ/ZŠ menu aj zamestnanecké porcie) sa má z
EduPage ignorovať (`skip=True` na `LetterRule`, viď `edupage_scraper._parse`).

`_kluc` normalizuje bodky/medzery na okrajoch aj uprostred nekonzistentne
posielanej skratky (".Iná NmNgNe." aj "Iná..NmNgNe"), aby oba tvary padli na
rovnaký kľúč (nahlásené 1.9.2026: skratka ".Iná NmNgNe." na kľúč "INÁ..NMNGNE"
nesadla a E sa tíško zlúčilo s D pod NO MILK/NO GLUTEN bez vajec).
"""

from __future__ import annotations

import re

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    # "Iná NmNgNe" fuzzy-matchovala len na prvý sadnúci fragment (nmng) a stratila
    # vajcia — EduPage vlastný nazov ju vypisuje jednoznačne celú.
    "INÁ NMNGNE": LetterRule(diet="NO MILK – NO GLUTEN – NO EGG"),
    # "Iná NmNg" (bez vajec) fuzzy-matchovala na NO MILK/NO GLUTEN — user
    # 2.9.2026 potvrdil, že je to správne (na rozdiel od "Iná NmNgNe" vyššie,
    # táto skratka vajcia naozaj neobsahuje).
    "INÁ NMNG": LetterRule(diet="NO MILK/NO GLUTEN"),
}


def _kluc(skratka: str) -> str:
    """Normalizuj skratku pre lookup/porovnanie v `_RULES`/prefixe 'INÁ'."""
    cleaned = skratka.replace(".", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.upper()


def montessori_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine.

    Písmená mimo 'Iná' skupiny sa preskočia úplne (`skip=True`) — appka ich z
    EduPage nemá počítať.
    """
    kluc = _kluc(skratka)
    if not kluc.startswith("INÁ"):
        return LetterRule(skip=True)
    return _RULES.get(kluc)
