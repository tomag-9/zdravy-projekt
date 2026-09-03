"""Krásňanko — jediná prevádzka, kde deklaratívny config nestačí.

Škola kóduje zamestnanecký status priamo do menu skratky. **Pôvodná** schéma
(do ~2.9.2026):

    K     Klasik                 → klasik, detská porcia
    K-D   „Klasik domov"         → klasik, detská porcia (názov klame, je to detská)
    NM    No Milk                → NO MILK, detská porcia
    NG    No Gluten              → NO GLUTEN, detská porcia
    KZ    Klasik dospelý Z       → klasik, DOSPELÁ porcia   (Z = zamestnanec)
    NMZ   No milk dospelý Z      → NO MILK, DOSPELÁ porcia
    KZD   Klasik detská Z        → klasik, detská porcia   (Klasik detská, berieme tak)
    NMZD  No milk detská Z       → NO MILK, detská porcia
    DIA   Dia                    → DIA

Škola skratky na strane EduPage **3.9.2026 kompletne premenovala** (živý guest
dump, nazovMenu) na:

    DK    Dieťa klasik           → klasik, detská porcia
    DNM   Dieťa no milk          → NO MILK, detská porcia
    DNG   Dieťa no gluten        → NO GLUTEN, detská porcia
    ZK    Dospelý klasik         → klasik, DOSPELÁ porcia
    ZNM   Dospelý no milk        → NO MILK, DOSPELÁ porcia
    ZNG   Dospelý no gluten      → NO GLUTEN, DOSPELÁ porcia
    PDK   Predškolák klasik      → klasik, PREDŠKOLÁK porcia
    PDNM  Predškolák no milk     → NO MILK, PREDŠKOLÁK porcia
    PDNG  Predškolák no gluten   → NO GLUTEN, PREDŠKOLÁK porcia
    Z1/2K Dospelý 1/2 klasik     → klasik, detská porcia (výnimka, viď nižšie)

Kriticky: **`DNM` teraz znamená niečo iné než predtým** — pôvodne "D" = Dospelý
(zamestnanec), po premenovaní "D" = Dieťa. Bez tejto opravy by sa detské NO MILK
objednávky ticho počítali do dospelej porcie (nahlásené userom 3.9.2026: "ZK
dospelý - 1 je 2"). Staré kľúče necháme pre prípad, že sa ešte niekde vyskytnú
(neškodné, ak nie), ale `DNM` presúvame na nový (správny) význam.

Zamestnanecký status (`Z`) nás v KAVZE nezaujíma — škola ho tam len eviduje. Dôležitá
je **porcia**, a tú engine z `porcia` kódu payera prečíta zle: payer `Klasik Z` má
`porcia=0` (Škôlka), hoci `KZ`/`ZK` je dospelý. Preto porciu určujeme zo skratky.

`ZD` (zamestnanec + detská porcia) = klasik detská porcia, berieme ju tak bez ďalšej
kontroly — nie je to nič výnimočné (potvrdené userom 7/13), preto žiadny attention flag.
"""

from __future__ import annotations

from ..base import LetterRule

DETSKA = "Škôlka"
DOSPELA = "Dospelý (SŠ)"
PREDSKOLAK = "Predškolák"

# skratka (upper, bez medzier/pomlčiek) → pravidlo
_RULES: dict[str, LetterRule] = {
    "K": LetterRule(portion=DETSKA, menu="A"),
    "KD": LetterRule(portion=DETSKA, menu="A"),
    "NM": LetterRule(portion=DETSKA, diet="NO MILK"),
    "NG": LetterRule(portion=DETSKA, diet="NO GLUTEN"),
    "KZ": LetterRule(portion=DOSPELA, menu="A"),
    "NMZ": LetterRule(portion=DOSPELA, diet="NO MILK"),
    "KZD": LetterRule(portion=DETSKA, menu="A"),
    "NMZD": LetterRule(portion=DETSKA, diet="NO MILK"),
    "DIA": LetterRule(portion=DETSKA, diet="DIA"),
    # "PD" = Predškolák (pôvodná schéma).
    "PDNM": LetterRule(portion=PREDSKOLAK, diet="NO MILK"),
    # "Z1/2" = Dospelý 1/2 (zamestnanec, ale porcia MŠ — NIE dospelá, hoci
    # obsahuje "zamestnanec"; na rozdiel od KZ/NMZ vyššie).
    "Z1/2NM": LetterRule(portion=DETSKA, diet="NO MILK"),
    "Z1/2K": LetterRule(portion=DETSKA, menu="A"),
    # Nová schéma (3.9.2026, viď docstring) — "D" = Dieťa (NIE Dospelý,
    # narozdiel od pôvodnej schémy vyššie), "Z" = Zamestnanec/dospelý,
    # "PD" = Predškolák.
    "DK": LetterRule(portion=DETSKA, menu="A"),
    "DNM": LetterRule(portion=DETSKA, diet="NO MILK"),
    "DNG": LetterRule(portion=DETSKA, diet="NO GLUTEN"),
    "ZK": LetterRule(portion=DOSPELA, menu="A"),
    "ZNM": LetterRule(portion=DOSPELA, diet="NO MILK"),
    "ZNG": LetterRule(portion=DOSPELA, diet="NO GLUTEN"),
    "PDK": LetterRule(portion=PREDSKOLAK, menu="A"),
    "PDNG": LetterRule(portion=PREDSKOLAK, diet="NO GLUTEN"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper().replace("-", "").replace(" ", "")


def krasnanko_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
