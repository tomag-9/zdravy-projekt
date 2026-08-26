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
]

ALL_DIETS = DEFAULT_DIETS + OPERATION_SPECIFIC_DIETS
