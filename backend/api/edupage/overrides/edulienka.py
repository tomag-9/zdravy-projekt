"""MŠ EduLienka — potvrdená menu skratka z EduPage.

`cmsNM`/`cmsNMNE`/`cmsNMNG` boli sem pri založení tohto hooku (commit df85b03,
14.9.2026) priradené omylom — overené s userom 15.9.2026: MŠ Edulienka v EduPage
žiadne skratky s prefixom ``cms`` nemá. Ten prefix patrí **CMŠ Ivanka**, ktorá
zdieľa EduPage feed so ZŠ Ivanka pri Dunaji (`edupage/overrides/ivanka.py`) —
potvrdzuje to aj samotný `typy_platitelov` adresár feedov, kde sú tieto skupiny
priamo pomenované „CMS Ivanka …", a produkčné `scrape_flags` s `cms`-skratkami
viseli na prevádzke „ZŠ Ivanka pri Dunaji", nikdy na „MŠ Edulienka".
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "HISTAMIN, NO GLUTEN": LetterRule(diet="NO GLUTEN – HISTAMIN"),
}


def edulienka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť potvrdenú diétu EduLienky, inak nechaj rozhodnúť engine."""
    return _RULES.get((skratka or "").strip().upper())
