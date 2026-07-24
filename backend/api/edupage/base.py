"""Per-prevádzka konfigurácia EduPage scrapingu.

Engine (`api.edupage_scraper`) parsuje HTML rovnako pre všetky školy. Rozdiely medzi
prevádzkami sú *dáta*, nie *kód* — držíme ich tu ako deklaratívny config a aplikujeme
až na výsledok parsovania.

Výnimka: `override_hook` pre prevádzky, kde config nestačí (Krásňanko).
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from api.edupage_scraper import ScrapeResult

BREAKFAST = "breakfast"
LUNCH = "lunch"
OLOVRANT = "olovrant"


@dataclass(frozen=True)
class LetterRule:
    """Ako vyhodnotiť jedno menu písmeno, keď engine sám nestačí.

    `None` v poli = nechaj engine rozhodnúť. `portion` prebíja `porcia` kód payera —
    práve preto tento hook existuje: niektoré školy nesú porciu v menu skratke
    (Krásňanko `KZ` = dospelý), nie v payer configu.
    """

    portion: str | None = None
    menu: str | None = None
    diet: str | None = None
    flag: str | None = None  # napr. "!" — vyžaduje manuálnu kontrolu


# Hook beží pri parsovaní, na každé menu písmeno pred agregáciou.
LetterHook = Callable[[str, str, str], LetterRule | None]  # (letter, skratka, nazov)


@dataclass(frozen=True)
class PayerRule:
    """Ako upraviť jeden payer label, keď engine sám nestačí.

    Na rozdiel od `LetterRule` (rieši menu písmeno) beží na payer LABELI. Existuje pre
    školy, kde je v labeli zakódované niečo, čo kazí buď matching prevádzky, alebo diétu —
    typicky Školička, kde prefix `B `/`BM ` je DODÁVATEĽ (Bruško / Bruško Milk), nie
    súčasť názvu výdajne. `match_name` sa použije na priradenie prevádzky namiesto surového
    labelu; `None` polia = nechaj engine/config rozhodnúť.
    """

    match_name: str | None = (
        None  # názov pre match_prevadzka (bez dodávateľského prefixu)
    )
    diet: str | None = None
    portion: str | None = None


# Hook beží na každý payer label pred agregáciou.
PayerHook = Callable[[str], PayerRule | None]  # (payer_name)


class OlovrantMode(StrEnum):
    """Odkiaľ berieme olovrant pre danú prevádzku.

    Viď test/data/output/olovrant_klasifikacia_2026-07-09.md — tri kategórie.
    """

    EDUPAGE = "edupage"  # C: olovrant má vlastný jid, berieme priamo
    ODVODIT_Z_OBEDU = "odvodit_z_obedu"  # A: škola olovrant neobjednáva, = obed
    MIMO_APPKY = "mimo_appky"  # B: olovrant sa účtuje iným kanálom
    NEZNAMY = "neznamy"  # zatiaľ nepotvrdené — nehádame, hlásime warning


@dataclass(frozen=True)
class PrevadzkaConfig:
    subdomena: str
    ucty: tuple[str, ...]  # účtovné názvy (1..N — split prevádzky majú viac)
    olovrant_mode: OlovrantMode
    poznamka: str = ""
    letter_hook: LetterHook | None = None
    payer_hook: PayerHook | None = None


def apply_config(result: ScrapeResult, config: PrevadzkaConfig) -> ScrapeResult:
    """Aplikuj per-prevádzka pravidlá na výsledok scrapingu.

    Mutuje a vracia `result`. Prázdny deň (žiadny obed) nechávame tak — škola bola
    zatvorená, nie je to chyba.

    Nezhody configu s realitou idú do `config_notes`, nie do `warnings`: `warnings`
    znamená „scrape zlyhal, neimportuj nič" (viď `tasks.py`), a config drift takým
    zlyhaním nie je.
    """
    order_data = result.order_data
    lunch = order_data.get(LUNCH)
    has_olovrant = bool(order_data.get(OLOVRANT))

    match config.olovrant_mode:
        case OlovrantMode.ODVODIT_Z_OBEDU:
            if has_olovrant:
                # Škola začala olovrant objednávať cez EduPage → config je zastaraný.
                result.config_notes.append(
                    f"{config.subdomena}: olovrant_mode=odvodit_z_obedu, "
                    f"ale EduPage olovrant reálne obsahuje — over config"
                )
            if lunch:
                order_data[OLOVRANT] = copy.deepcopy(lunch)

        case OlovrantMode.MIMO_APPKY:
            if has_olovrant:
                result.config_notes.append(
                    f"{config.subdomena}: olovrant_mode=mimo_appky, "
                    f"ale EduPage olovrant obsahuje — over config"
                )
                order_data.pop(OLOVRANT, None)

        case OlovrantMode.EDUPAGE:
            if lunch and not has_olovrant:
                result.config_notes.append(
                    f"{config.subdomena}: očakávaný olovrant z EduPage chýba "
                    f"(obed prítomný)"
                )

        case OlovrantMode.NEZNAMY:
            if lunch and not has_olovrant:
                result.config_notes.append(
                    f"{config.subdomena}: olovrant_mode nepotvrdený a olovrant chýba "
                    f"— netipujeme, treba doplniť config"
                )

    return result
