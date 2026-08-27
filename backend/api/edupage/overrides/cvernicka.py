"""Cvernička — zložené skratky, ktoré fuzzy vrstva orezáva na jednu diétu.

Škola kóduje viacnásobné vylúčenia do jednej skratky (`nMnOnJnPnČnŠnZEL`).
`resolve_diet_name`/`_resolve_diet_name_with_confidence` (generický engine)
z toho fuzzy-matchne len prvý sadnúci fragment — vidno to teraz aj v
`uncertain_diets` (#527), ale samotné priradenie ostávalo nesprávne: obe
skratky sa hlásili ako "NO MILK/NO GLUTEN", hoci lepok sa v žiadnej z nich
vôbec nevyskytuje.

EduPage vlastný `nazov` (nie skratka) skutočný obsah spoľahlivo vypíše:

    nMnČnJ            nazov="NMnKako,nJahody"                → No Milk, No Kakao, No Jahody
    nMnOnJnPnČnŠnZEL  nazov="nMnOREnPARnJAHnKAKnŠKOnZELER"    → No Milk, No Orech, No Paradajka,
                                                                  No Jahoda, No Kakao, No Škorica,
                                                                  No Zeler (klient sám označil
                                                                  "!!!NOVÁ DIÉTA!!!" v reálnej
                                                                  tabuľke, over_edupage 27.8.2026)
    AnHorčica         nazov="Klasik/noHorčica"                → No Horčica (samostatný riadok s
                                                                  gramážou v Hárok1, 27.8.2026 —
                                                                  bez tohto letter_hooku by
                                                                  `resolve_menu_variant` skratku
                                                                  potichu absorbovalo do Menu A,
                                                                  lebo obsahuje "klasik")

Overené priamo na živom EduPage (26.–27.8.2026) aj krížovo v
`test/data/real/26.8.2026_tabuľka_NOVA_6.xlsx` a `27.8.2026_tabuľka_NOVA_61.xlsx`
(Hárok1, blok Cvernička).
"""

from __future__ import annotations

from ..base import LetterRule

_RULES: dict[str, LetterRule] = {
    "NMNČNJ": LetterRule(diet="NO MILK/NO KAKAO/NO JAHODA"),
    "NMNONJNPNČNŠNZEL": LetterRule(
        diet="NO MILK/NO ORECH/NO PARADAJKA/NO JAHODA/NO KAKAO/NO SKORICA/NO ZELER"
    ),
    "ANHORČICA": LetterRule(diet="NO HORCICA"),
}


def _kluc(skratka: str) -> str:
    return skratka.strip().upper()


def cvernicka_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Vráť pravidlo pre menu písmeno, alebo None → nech rozhodne engine."""
    return _RULES.get(_kluc(skratka))
