"""Školička (skolickams) — payer labely nesú DODÁVATEĽA, nie len výdajňu.

Kontext (potvrdené Stanom 7/13/2026):

    B - Lúka        Bruško klasik, výdajňa Lúka
    B - Les         Bruško klasik, výdajňa Les
    BM - Lúka sd    Bruško Milk = bezMliečne (NO MILK), výdajňa Lúka
    B - Les sd      Bruško klasik, výdajňa Les

Školičke kedysi vozili stravu dvaja dodávatelia (Bruško = `B`, Zdravý Dom), odtiaľ
prefix `B`. `B` = klasik od nás, `BM` = „Bruško Milk" = **NO MILK**. Prefix dodávateľa
nás pri agregácii NEZAUJÍMA — počty sa **sčítavajú** bez ohľadu na `B`/`BM`
(potvrdené userom). Preto ho pred priradením prevádzky odstrihneme, aby `B - Les`
prefixovo sadlo na `edupage_match = "Les"`, a z `BM` odvodíme diétu NO MILK.

`sd` (napr. „BM - Lúka sd") Stano explicitne nedodefinoval; keďže sa všetko sčítava,
je pre agregáciu bezvýznamné a v `match_name` ho necháme (`"Lúka sd"` stále
prefixovo sadne na `"Lúka"`).

`Lúka` aj `Les`: všetci (učiteľ aj dieťa) majú **detskú porciu** — to však rieši už
default (payer `porcia=0` → `Škôlka`), takže porciu tu nenútime.

Živé payer labely (guest dump 6/2026): `B/BM - {Lúka,Les} [sd|učiteľ]` + `Hosť`.
Po strippnutí `sd`/`učiteľ` variantov prefixovo sadnú na `Lúka`/`Les`. `Hosť` (hosť bez
výdajne) rozhodnutím usera 7/13 **rátame k Lúke** — prepíšeme `match_name` na `Lúka`.
Stupne 1./2. sa cez tento EduPage neobjednávajú (v guest dátach nie sú).
"""

from __future__ import annotations

import re

from ..base import PayerRule

# Vedúci token "B" alebo "BM" oddelený pomlčkou = dodávateľ.
_SUPPLIER_PREFIX_RE = re.compile(r"^\s*(BM|B)\s*[-–]\s*(.+)$", re.IGNORECASE)

_LUKA = "Lúka"


def skolickams_payer_hook(payer_name: str) -> PayerRule | None:
    """Odstrihni dodávateľský prefix `B`/`BM`; z `BM` odvoď NO MILK; `Hosť`→Lúka."""
    name = (payer_name or "").strip()

    # Hosť nemá výdajňu — rozhodnutím usera ho rátame k Lúke.
    if name.lower() == "hosť":
        return PayerRule(match_name=_LUKA)

    match = _SUPPLIER_PREFIX_RE.match(name)
    if match is None:
        return None
    supplier, zvysok = match.group(1).upper(), match.group(2).strip()
    diet = "NO MILK" if supplier == "BM" else None
    return PayerRule(match_name=zvysok, diet=diet)
