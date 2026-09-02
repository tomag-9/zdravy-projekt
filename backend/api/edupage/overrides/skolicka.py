"""Školička ZŠ (subdoména `skolicka`) — diéta je zakódovaná v payer labeli.

Guest URL overený naživo (viď `seed_skolicka_zs_2026_09`): payer labely majú tvar
`{1.stupeň|2.stupeň} - {variant}`, kde `variant` je buď `klasik` (bežné menu, žiadna
diéta), `vege`/`histamín` (tie už chytí generický `_NAZOV_KEYWORD_MAP` fragment-match
na celé slovo), alebo skratka zložená z písmen `B`/`N` (= "bez"/"no") + `M`/`G`
(mlieko/gluten) — `BM`, `NM`, `BG`, `NG`, ich kombinácia (`BM,BG`, `BMBG`, `nMnG`) a
samostatné `H` (Histamín skratkou, nie celým slovom).

Prefix `B`/`N` sa NEROZLIŠUJE — obe znamenajú "bez"/"no", líšia sa len tým, kto danú
skratku napísal (user 2.9.2026: "to prvé písmenko ignorujeme"). Preto sa `B` aj `N`
berú rovnako, matchuje sa len druhé písmeno (`M`=mlieko, `G`=gluten).

Prevádzku (1./2. stupeň, učiteľ) rieši `edupage_match` prefix na payer labeli priamo
(`seed_skolicka_zs_2026_09`) — tento hook rieši LEN diétu, `match_name` nechávame na
engine.
"""

from __future__ import annotations

import re
import unicodedata

from ..base import PayerRule

_VARIANT_RE = re.compile(r"[-–]\s*(.+)$")
_MILK_RE = re.compile(r"[BN]M")
_GLUTEN_RE = re.compile(r"[BN]G")


def _fold(value: str) -> str:
    """ASCII-fold + len písmená veľkými, ako inde v scraperi."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    letters = "".join(ch for ch in decomposed if ch.isalpha())
    return letters.upper()


def skolicka_zs_payer_hook(payer_name: str) -> PayerRule | None:
    """`BM`/`NM`/`BG`/`NG` (a kombinácie) → diéta; `H` → Histamín skratkou.

    `klasik`/`vege`/`histamín` (celé slová) necháme na generický engine — ten ich
    už fragment-matchom rozpozná správne (`vege`→VEGGIE, `histamín`→HISTAMIN).
    """
    match = _VARIANT_RE.search(payer_name or "")
    variant = match.group(1) if match else (payer_name or "")
    key = _fold(variant)

    if key == "H":
        return PayerRule(diet="HISTAMIN")

    has_milk = bool(_MILK_RE.search(key))
    has_gluten = bool(_GLUTEN_RE.search(key))
    if has_milk and has_gluten:
        return PayerRule(diet="NO MILK/NO GLUTEN")
    if has_milk:
        return PayerRule(diet="NO MILK")
    if has_gluten:
        return PayerRule(diet="NO GLUTEN")
    return None
