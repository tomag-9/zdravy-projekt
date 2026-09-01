"""Zdravé Brúško — skratka "dsbNMNE" sa fuzzy-matchovala len na NO EGG.

`compact_sk.endswith("ne")` pravidlo v generickom engine chytí "no egg" skôr,
než si všimne, že skratka obsahuje aj "nm" (no milk) — "no milk" časť sa
tíško stratí. EduPage vlastný `nazov` to tentoraz vypíše priamo a
jednoznačne: `nazov="NoMilk/NoEgg"`. Rovnaká kombinácia (samostatná diéta
"No Milk NO EGG") existuje aj u MŠ Libellus v tej istej reálnej tabuľke —
nejde o výmysel, je to bežná kombinácia.

Zdieľaný feed pre 5 celkov (Deutsche Schule "dsb", MŠ Heyrovského 4 "mšHey.",
MŠ Malokarpatké nám. 6 "mšMal.", ZŠ Malokarpatská "zšla" — rozdelené cez
`edupage_match`, viď CLAUDE.md). Potvrdené s userom 1.9.2026, doplnené z
"uncertain" fuzzy matchov na isté pravidlá:
- `dsbNNN SJ` = mlieko+lepok+vajcia+sója → "NONONO – NO SOJA" (pk 125)
- `dsbNGNM` = mlieko+lepok → "NO MILK – NO GLUTEN" (pk 84)
- `zšlaNMnEnOnJ` = mlieko+vajcia+orechy+jablko → nová kombinácia (posledné
  písmeno "J" bolo pôvodne neisté, `flag="!"` žiadal manuálnu kontrolu; user
  1.9.2026 potvrdil jablko, nie jahodu — flag odstránený, diéta je istá).
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "DSBNMNE": LetterRule(diet="NO MILK/NO EGG"),
    "DSBNM": LetterRule(diet="NO MILK"),
    "DSBNNN SJ": LetterRule(diet="NONONO – NO SOJA"),
    "DSBNGNM": LetterRule(diet="NO MILK – NO GLUTEN"),
    "DSBNO": LetterRule(diet="NO ORECH"),
    "MŠHEY. NG": LetterRule(diet="NO GLUTEN"),
    "MŠMAL. NM": LetterRule(diet="NO MILK"),
    "MŠMAL. NG": LetterRule(diet="NO GLUTEN"),
    "ZŠLANG": LetterRule(diet="NO GLUTEN"),
    "ZŠLANMNENONJ": LetterRule(diet="NO MILK – NO EGG – NO ORECH – NO JABLKO"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def zdravebrusko_letter_hook(
    letter: str, skratka: str, nazov: str
) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
