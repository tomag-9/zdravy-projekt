"""Subdoména → PrevadzkaConfig.

Jedna tabuľka, jeden riadok na prevádzku. Väčšina škôl je „nudná" (olovrant má vlastný
jid, berieme priamo) — tie majú len `olovrant_mode=EDUPAGE`. Špecialitu rieši
`override_hook`, dnes iba Krásňanko.

Analýza, z ktorej tabuľka vychádza:
`test/data/output/edu_analyza_prevadzok_2026-07-09.md`
"""

from __future__ import annotations

from urllib.parse import urlparse

from .base import OlovrantMode, PrevadzkaConfig
from .overrides.britishschool import (
    british_school_letter_hook,
    british_school_payer_hook,
)
from .overrides.cvernicka import cvernicka_letter_hook
from .overrides.fantasticka import fantasticka_letter_hook
from .overrides.felixkarloveska import felixkarloveska_letter_hook
from .overrides.filipaneriho import filipaneriho_letter_hook
from .overrides.ivanka import ivanka_letter_hook
from .overrides.krasnanko import krasnanko_letter_hook
from .overrides.libellus import libellus_letter_hook
from .overrides.montessori import montessori_letter_hook
from .overrides.rozmanita import rozmanita_letter_hook
from .overrides.skolickams import skolickams_letter_hook, skolickams_payer_hook
from .overrides.strecnianska import strecnianska_letter_hook
from .overrides.zdravebrusko import zdravebrusko_letter_hook

_C = OlovrantMode.EDUPAGE

_CONFIGS: tuple[PrevadzkaConfig, ...] = (
    PrevadzkaConfig(
        subdomena="skolkapramienok",
        ucty=("Pramienok",),
        olovrant_mode=OlovrantMode.ODVODIT_Z_OBEDU,
        poznamka="Len jid=2 (obed). Olovrant = obed, potvrdené 6/6 dní v XLSX.",
    ),
    PrevadzkaConfig(
        subdomena="montessorisk",
        ucty=("Montesori škôlka", "montesori škola"),
        olovrant_mode=OlovrantMode.ODVODIT_Z_OBEDU,
        poznamka=(
            "nastavenia prázdne — žiadny samostatný olovrant jid. Real tabuľka "
            "potvrdzuje olovrant = obed 4/4 dní (27.–30.7.2026). "
            "'Iná..NmNgNe' fuzzy-matchovalo len na NO MILK/NO GLUTEN (#527, "
            "vajcia sa strácali) — letter_hook opravuje na plnú kombináciu."
        ),
        letter_hook=montessori_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="jollyhomeschool",
        ucty=("Jolly 1", "Jolly 2", "Jolly 3"),
        olovrant_mode=OlovrantMode.MIMO_APPKY,
        poznamka='XLSX: "olovrant samostatne". Split J1/J2/J3 rieši krok 3.',
    ),
    PrevadzkaConfig(
        subdomena="zsivanka",
        ucty=("Ivanka pri Dunaji",),
        olovrant_mode=OlovrantMode.EDUPAGE,
        poznamka=(
            "1.9.2026: prvé nenulové dáta potvrdili vlastný jid pre olovrant — "
            "líši sa od obeda aj diétou (Škôlka obed 'NO MILK – NO GLUTEN – NO "
            "ORECH' vs olovrant 'NO MILK/NO GLUTEN'), nie je to len kópia. "
            "Pozor: menu A=NM, nie klasik! NGNF/NMNE/'MŠ NMNG bez ARAS' "
            "fuzzy-matchovali len na jedno obmedzenie z viacerých (#527) — "
            "letter_hook opravuje na plné kombinácie."
        ),
        letter_hook=ivanka_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="szsfan",
        ucty=("SZŠ Fantastická",),
        olovrant_mode=_C,
        poznamka=(
            "ZŠ Fantastická — samostatná prevádzka od fantastickaskolka (MŠ). "
            "HITNMNGnSnKnFC fuzzy-matchovalo len na NO MILK/NO GLUTEN (#527) — "
            "letter_hook opravuje na plnú 6-násobnú kombináciu."
        ),
        letter_hook=fantasticka_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="edulienka",
        ucty=("Edulienka Palisády", "Edulienka Stupava"),
        olovrant_mode=_C,
        poznamka='Split podľa menu prefixu P/S. "+ dotácia" sa sčítava, nie dedup.',
    ),
    PrevadzkaConfig(
        subdomena="zdravebrusko",
        ucty=("Ďumbierska", "Lamač", "Malý", "Heyrovského"),
        olovrant_mode=_C,
        poznamka=(
            "SŠV → VEGGIE. Split areálov Lamač/Mal./Hey. rieši krok 3. "
            "dsbNMNE fuzzy-matchovalo len na NO EGG (#527) — letter_hook "
            "opravuje na NO MILK/NO EGG (EduPage nazov='NoMilk/NoEgg')."
        ),
        letter_hook=zdravebrusko_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="emsmelanchtona",
        ucty=("EMŠ Strečnianska 15",),
        olovrant_mode=_C,
        poznamka=(
            "Nová konfiguračná úloha len kvôli letter_hooku — predtým žiadny "
            "riadok, žiadny config drift zaznamenaný, tak `_C` (EDUPAGE) "
            "zachováva doterajšie správanie 1:1. 'nGnS' bol uncertain fuzzy "
            "match (len NO GLUTEN) — letter_hook potvrdzuje na NO GLUTEN – "
            "NO SOJA (user 1.9.2026)."
        ),
        letter_hook=strecnianska_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="dobrodruzstvo",
        ucty=("Dobrodružstvo",),
        olovrant_mode=_C,
        poznamka="bezlep→NO GLUTEN, bezlak→NO MILK (doplniť keyword mapu).",
    ),
    PrevadzkaConfig(
        subdomena="msfilipaneriho",
        ucty=("Filipa Neriho",),
        olovrant_mode=_C,
        poznamka=(
            "Olovrant EduPage < XLSX — kandidát na reconcile (krok 5). "
            "'No med,mak,orechy'/'No zemiak'/'No orech' boli uncertain fuzzy "
            "matche — letter_hook potvrdzuje na isté diéty (user 1.9.2026)."
        ),
        letter_hook=filipaneriho_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="skolkacvernicka",
        ucty=("Cvernička",),
        olovrant_mode=_C,
        poznamka=(
            "Olovrant EduPage < XLSX, rovnaká rodina ako msfilipaneriho/rozmanita "
            "(~4-5 detí denne, overené reconcile-real 17.-21.8.2026 — appka scrapuje "
            "EduPage do písmena zhodne, reálny nedostatok je v tom, čo škola cez "
            "EduPage vôbec eviduje). Predtým bez config riadku, teda aj bez "
            "config_notes diagnostiky pri úplnom výpadku olovrant jid-u. "
            "nMnČnJ a nMnOnJnPnČnŠnZEL fuzzy-matchovali obe len na "
            "NO MILK/NO GLUTEN (#527, lepok sa v nich vôbec nevyskytuje) — "
            "letter_hook opravuje na plné kombinované diéty."
        ),
        letter_hook=cvernicka_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="fantastickaskolka",
        ucty=("MŠ Fantastická",),
        olovrant_mode=_C,
        poznamka="0 payerov, len menu A. Najjednoduchšia — smoke test configu.",
    ),
    PrevadzkaConfig(
        subdomena="mslibellus",
        ucty=("Libellus",),
        olovrant_mode=_C,
        poznamka=(
            "ks-koeficient pečiva (jasle 1 / ZŠ 1,5 / dosp 2) — gramáž report. "
            "NENO/NMNE fuzzy-matchovali len na jedno obmedzenie z dvoch (#527) "
            "— letter_hook opravuje na plné kombinácie."
        ),
        letter_hook=libellus_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="rozmanita",
        ucty=("Rozmanitá Škôlka", "Rozmanitá Škola"),
        olovrant_mode=_C,
        poznamka=(
            "Split MŠ/ZŠ. NONONO chýba pri olovrante — reconcile (krok 5). "
            "'NoMO' bol uncertain fuzzy match (len NO MILK) — letter_hook "
            "potvrdzuje na NO MILK – NO ORECH (user 1.9.2026)."
        ),
        letter_hook=rozmanita_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="skolickams",
        ucty=("Školička Lúka", "Školička Les", "Školička 1.st.", "Školička 2.st."),
        olovrant_mode=_C,
        poznamka=(
            "Prefix B/BM = dodávateľ (Bruško/BruškoMilk), NIE výdajňa — strip pred "
            "matchom, BM→NO MILK, počty sčítavame. Lúka/Les detská porcia (default). "
            "Potvrdené Stanom 7/13/2026. Skratka `ŠPECI` (menu písmeno) = plná "
            "špeciálna diéta — letter_hook, payer diéta je len fallback (#527/#528)."
        ),
        payer_hook=skolickams_payer_hook,
        letter_hook=skolickams_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="msdobrehopastiera",
        ucty=("Klubík",),
        olovrant_mode=_C,
        poznamka="3 payery (MŠ/Učiteľ/Hosť), bez date-range.",
    ),
    PrevadzkaConfig(
        subdomena="msfelixkarloveska",
        ucty=("Felix",),
        olovrant_mode=_C,
        poznamka=(
            "Referenčne čistá kategória C — sedí s XLSX presne. "
            "'NE bez O,A,S,S' fuzzy-matchovalo len na NO EGG (#527) — "
            "letter_hook opravuje na plnú EpiPen kombináciu podľa XLSX."
        ),
        letter_hook=felixkarloveska_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="krasnanko",
        ucty=("Krasňanko",),
        olovrant_mode=_C,
        poznamka="Špeciál: skratky so Z (zamestnanec) a ZD (zam. detská porcia).",
        letter_hook=krasnanko_letter_hook,
    ),
    PrevadzkaConfig(
        subdomena="zdravyprojekt",
        ucty=("British School",),
        olovrant_mode=OlovrantMode.NEZNAMY,
        poznamka=(
            "Nový onboarding (#531, 26.8.2026) — olovrant_mode zatiaľ "
            "nepotvrdený, čaká na dáta. Skratky s koncovým '+' (nM+, NNN+, "
            "nN+, HIT+) nesú len prvú diétu, zvyšok je v mene platiteľskej "
            "skupiny — payer_hook priraďuje presné kombinácie (#527, viď "
            "overrides/britishschool.py pre zdrojové EduPage labely)."
        ),
        letter_hook=british_school_letter_hook,
        payer_hook=british_school_payer_hook,
    ),
)

BY_SUBDOMENA: dict[str, PrevadzkaConfig] = {c.subdomena: c for c in _CONFIGS}


def subdomena_z_url(mealsguest_url: str) -> str | None:
    """`https://krasnanko.edupage.org/menu/...` → `krasnanko`."""
    host = urlparse(mealsguest_url).hostname or ""
    if not host.endswith(".edupage.org"):
        return None
    return host.removesuffix(".edupage.org").lower() or None


def config_pre_url(mealsguest_url: str) -> PrevadzkaConfig | None:
    """Config pre danú guest URL, alebo None ak prevádzku nepoznáme.

    None = nová/neznáma škola. Engine ju odscrapuje generickým spôsobom — nechceme,
    aby onboarding novej školy padol len preto, že ešte nemá riadok v tabuľke.
    """
    subdomena = subdomena_z_url(mealsguest_url)
    if subdomena is None:
        return None
    return BY_SUBDOMENA.get(subdomena)
