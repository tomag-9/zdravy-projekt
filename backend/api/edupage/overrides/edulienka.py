"""MŠ EduLienka — potvrdená menu skratka z EduPage.

`cmsNM`/`cmsNMNE`/`cmsNMNG` boli sem pri založení tohto hooku (commit df85b03,
14.9.2026) priradené omylom — overené s userom 15.9.2026: MŠ Edulienka v EduPage
žiadne skratky s prefixom ``cms`` nemá. Ten prefix patrí **CMŠ Ivanka**, ktorá
zdieľa EduPage feed so ZŠ Ivanka pri Dunaji (`edupage/overrides/ivanka.py`) —
potvrdzuje to aj samotný `typy_platitelov` adresár feedov, kde sú tieto skupiny
priamo pomenované „CMS Ivanka …", a produkčné `scrape_flags` s `cms`-skratkami
viseli na prevádzke „ZŠ Ivanka pri Dunaji", nikdy na „MŠ Edulienka".

Rovnaký hook mal aj druhú chybu: `_RULES` bol kľúčovaný celým `nazov`
(``"HISTAMIN, NO GLUTEN"``), ale skutočná skratka, ktorú EduPage pre toto
menu písmeno posiela, je ``nGH`` (`nazov="NGH"`, overené naživo 15.9.2026) —
kľúč sa tak nikdy netrafil. Padalo to cez na generický
`_SKRATKA_MAP["NGH"] = "HISTAMIN, NO GLUTEN"`, ktorého hodnota má opačné
poradie slov než založená diéta „NO GLUTEN – HISTAMIN" — normalizácia
(`_normalise_key`) poradie slov nemení, takže kanonický lookup zlyhal a
appka to hlásila ako `unmapped: J:HISTAMIN, NO GLUTEN` (user-reported
15.9.2026), hoci rovnaká diéta v ten istý deň inde už mala count. Kľúč je
teraz skutočná skratka.
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NGH": LetterRule(diet="NO GLUTEN – HISTAMIN"),
}


def edulienka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť potvrdenú diétu EduLienky, inak nechaj rozhodnúť engine."""
    return _RULES.get((skratka or "").strip().upper())
