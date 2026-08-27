"""MŠ Felix Karlovská — skratka "NE bez O,A,S,S" sa fuzzy-matchovala len na NO EGG.

`NE` (no egg) je exaktná skratka, ale zvyšok `bez O,A,S,S` (bez Orechov,
Arašídov, Sóje, Sezamu) sa pri generickom parsovaní úplne stráca — engine
vyberie prvý sadnúci fragment a skončí. Reálna tabuľka
(`test/data/real/24.8.2026_tabuľka_NOVÁ4.xlsx`, blok Felix/IUVENTA) má
presne tento riadok vypísaný celý:

    "noegg bez Orechov, Arašídov, Sóje, Sezamu EPIPEN"

T.j. dieťa s alergiou na úrovni EpiPenu — appka ho predtým viedla len ako
"bez vajec", čo je nebezpečne neúplné.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NE BEZ O,A,S,S": LetterRule(diet="NO EGG/NO ORECH/NO ARASIDY/NO SOJA/NO SEZAM"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def felixkarloveska_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
