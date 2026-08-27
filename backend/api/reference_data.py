"""Shared reference data used by migrations, seed commands and defaults."""

DEFAULT_DIETS = [
    ("NO MILK", "Bez mlieka a mliečnych výrobkov."),
    ("NO GLUTEN", "Bez lepku."),
    ("NO MILK/NO GLUTEN", "Bez mlieka a lepku."),
    ("VEGGIE", "Vegetariánska strava."),
    ("HISTAMIN", "Nízkohistamínová strava."),
    ("NONONO", "Bez mlieka, lepku a vajec."),
    ("NO ORECH", "Bez orechov."),
    ("NO PARADAJKA", "Bez paradajok."),
    ("NO FISH", "Bez rýb."),
    ("NO EGG", "Bez vajec."),
    ("NO ZEMIAK", "Bez zemiakov."),
    ("NO SOJA", "Bez sóje."),
    ("NO ZELER", "Bez zeleru."),
]

DEFAULT_DIET_NAMES = [name for name, _description in DEFAULT_DIETS]

OPERATION_SPECIFIC_DIETS = [
    ("DIA", "Diabetická strava."),
    # British School (#531) hlási tieto po anglicky (Vegan/noPork/noRedMeat/
    # noSugar) — založené v slovenskej podobe, EduPage mapovanie v
    # `edupage_scraper._NAZOV_KEYWORD_MAP`. Operation-specific ako DIA: nie sú
    # dosť univerzálne na to, aby boli default-visible pre každú novú
    # prevádzku — treba ich zapnúť ručne tam, kde majú zmysel.
    ("VEGAN", "Vegánska strava — bez všetkých živočíšnych produktov."),
    ("NO BRAVCOVINA", "Bez bravčového mäsa."),
    ("NO CERVENE MASO", "Bez červeného mäsa."),
    ("NO CUKOR", "Bez cukru."),
    # Cvernička/MŠ Felix Karlovská/Zdravé Brúško (#527) — kombinované diéty,
    # ktoré `edupage_scraper` fuzzy vrstva predtým tíško orezala na jednu
    # zložku (napr. "nMnOnJnPnČnŠnZEL" → len "NO MILK/NO GLUTEN", hoci reálne
    # ide o 7 rôznych vylúčení). letter_hook v `api/edupage/overrides/`
    # priraďuje tieto skratky priamo na plný názov, viď tam pre EduPage
    # nazov/skratka zdroj. Základné zložky pridané samostatne aj ako
    # base diéty pre prípadné budúce opätovné použitie.
    ("NO JAHODA", "Bez jahôd."),
    ("NO KAKAO", "Bez kakaa."),
    ("NO SKORICA", "Bez škorice."),
    ("NO ARASIDY", "Bez arašidov."),
    ("NO SEZAM", "Bez sezamu."),
    ("NO HORCICA", "Bez horčice (Cvernička)."),
    ("NO MILK/NO KAKAO/NO JAHODA", "Bez mlieka, kakaa a jahôd (Cvernička)."),
    (
        "NO MILK/NO ORECH/NO PARADAJKA/NO JAHODA/NO KAKAO/NO SKORICA/NO ZELER",
        "Bez mlieka, orechov, paradajok, jahôd, kakaa, škorice a zeleru "
        "(Cvernička, nová diéta).",
    ),
    (
        "NO EGG/NO ORECH/NO ARASIDY/NO SOJA/NO SEZAM",
        "Bez vajec, orechov, arašidov, sóje a sezamu — EpiPen (MŠ Felix Karlovská).",
    ),
    ("NO MILK/NO EGG", "Bez mlieka a vajec (Zdravé Brúško)."),
    # British School (#527) — skratky s koncovým "+" nesú len prvú diétu,
    # zvyšok (naviac reštrikcie) je v mene platiteľskej skupiny (payer), nie
    # v menu skratke — a tá sa líši dieťa od dieťaťa. Payer_hook v
    # `api/edupage/overrides/britishschool.py` priraďuje presné kombinácie
    # podľa mena platiteľa, viď tam pre zdrojové EduPage payer labely.
    ("NO HUBY", "Bez húb."),
    ("NO KIWI", "Bez kiwi."),
    ("NO JABLKO", "Bez jabĺk."),
    ("NO BOBULE", "Bez bobuľového ovocia."),
    ("NO ANANAS", "Bez ananásu."),
    ("NO STRUKOVINY", "Bez strukovín."),
    ("REFLUX", "Refluxová diéta (zdravotné obmedzenie, nie potravinová alergia)."),
    ("NO MILK/REFLUX", "Bez mlieka, refluxová diéta (British School)."),
    ("NO MILK/VEGGIE", "Bez mlieka, vegetariánska strava (British School, učiteľ)."),
    ("NO ORECH/NO FISH", "Bez orechov a rýb (British School)."),
    ("NO ORECH/NO KIWI", "Bez orechov a kiwi (British School)."),
    (
        "NO ORECH/NO JABLKO/NO JAHODA",
        "Bez orechov, jabĺk a jahôd (British School).",
    ),
    ("NO ORECH/NO SEZAM", "Bez orechov a sezamu (British School)."),
    (
        "NONONO/NO BRAVCOVINA/NO BOBULE",
        "Bez mlieka, lepku, vajec, bravčoviny a bobuľového ovocia (British School).",
    ),
    (
        "NONONO/NO ANANAS/NO STRUKOVINY/HISTAMIN",
        "Bez mlieka, lepku, vajec, ananásu, strukovín, nízkohistamínová "
        "(British School).",
    ),
]

ALL_DIETS = DEFAULT_DIETS + OPERATION_SPECIFIC_DIETS
