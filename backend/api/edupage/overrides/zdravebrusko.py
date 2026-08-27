"""Zdravé Brúško — skratka "dsbNMNE" sa fuzzy-matchovala len na NO EGG.

`compact_sk.endswith("ne")` pravidlo v generickom engine chytí "no egg" skôr,
než si všimne, že skratka obsahuje aj "nm" (no milk) — "no milk" časť sa
tíško stratí. EduPage vlastný `nazov` to tentoraz vypíše priamo a
jednoznačne: `nazov="NoMilk/NoEgg"`. Rovnaká kombinácia (samostatná diéta
"No Milk NO EGG") existuje aj u MŠ Libellus v tej istej reálnej tabuľke —
nejde o výmysel, je to bežná kombinácia.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "DSBNMNE": LetterRule(diet="NO MILK/NO EGG"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def zdravebrusko_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
