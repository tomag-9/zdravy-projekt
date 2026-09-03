"""Školička (skolickams) — payer labely nesú DODÁVATEĽA, nie len výdajňu.

Kontext (potvrdené Stanom 7/13/2026):

    B - Lúka        Bruško klasik, výdajňa Lúka
    B - Les         Bruško klasik, výdajňa Les
    BM - Lúka sd    Bruško Milk = bezMliečne (NO MILK), výdajňa Lúka
    B - Les sd      Bruško klasik, výdajňa Les

Školičke kedysi vozili stravu dvaja dodávatelia (Bruško = `B`, Zdravý Dom), odtiaľ
prefix `B`. `B` = klasik od nás, `BM` = „Bruško Milk" = **NO MILK**. Prefix dodávateľa
nás pri agregácii NEZAUJÍMA — počty sa **sčítavajú** bez ohľadu na `B`/`BM`
(potvrdené userom). Preto ho pred priradením prevádzky odstrihneme, aby `B - Les`
prefixovo sadlo na `edupage_match = "Les"`, a z `BM` odvodíme diétu NO MILK.

Škola prefix medzičasom premenovala na strane EduPage — živý guest dump (3.9.2026)
už posiela `nM - Lúka učiteľ`/`nM - Les`/`nM - Lúka sd`/`nM - Les sd` namiesto `BM -
...` (identická sémantika, len iný token). Pôvodný regex `BM`-only ho nerozpoznal,
takže sa NO MILK objednávka (raňajky, obed aj olovrant) ticho strácala — nahlásené
userom 3.9.2026 ("Lúka na raňajky nenačítalo NM"). `nM` je teraz uznávaný rovnocenne
s `BM`.

`sd` (napr. „BM - Lúka sd") Stano explicitne nedodefinoval; keďže sa všetko sčítava,
je pre agregáciu bezvýznamné a v `match_name` ho necháme (`"Lúka sd"` stále
prefixovo sadne na `"Lúka"`).

`Lúka` aj `Les`: všetci (učiteľ aj dieťa) majú **detskú porciu** — to však rieši už
default (payer `porcia=0` → `Škôlka`), takže porciu tu nenútime.

Živé payer labely (guest dump 6/2026): `B/BM - {Lúka,Les} [sd|učiteľ]` + `Hosť`.
Po strippnutí `sd`/`učiteľ` variantov prefixovo sadnú na `Lúka`/`Les`. `Hosť` (hosť bez
výdajne) rozhodnutím usera 7/13 **rátame k Lúke** — prepíšeme `match_name` na `Lúka`.
Stupne 1./2. sa cez tento EduPage neobjednávajú (v guest dátach nie sú).

`ŠPECI - Lúka` (payer type 13, live od 2.9.2026): jedno dieťa v triede Lúka so
špeciálnou stravou, nahlásené p. Berlakovi (rodič, 1.9.2026 večer) a potvrdené
p. Kohútom — bez lepku, orechov, strukovín, paradajok, papriky, pohánky, sóje,
quinoy. Na rozdiel od `B`/`BM` nesie tento prefix rovno celú diétu, nie len
dodávateľa — payer `porcia=3` by inak dal inú porciu než ostatní v triede, tak ju
tu explicitne pribijeme na detskú (rovnako ako Lúka/Les vždy).

Reálny guest dump (1.9.2026) ukázal, že „ŠPECI" nechodí len ako payer label — je to
aj samostatné menu písmeno (skratka `ŠPECI`, názov "noGLUT ORECH STRUK PARAD PAPRIKA
POH SOJA QUINOA"). Engine by ho bez `letter_hook` fuzzy-matchol len na jednu zložku
(padlo to na `NO ORECH`, flagnuté ako `uncertain`) a keďže diéta na úrovni písmena má
prednosť pred `payer_hook` diétou (`effective_diet = diet_name or payer_diet`),
`payer_hook` diéta by sa nikdy nepoužila. `letter_hook` nižšie preto rieši diétu
priamo na písmene; `payer_hook` diéta ostáva ako fallback pre prípad, že by payer 13
padol pod iné písmeno.
"""

from __future__ import annotations

import re
import unicodedata

from ..base import LetterRule, PayerRule

# Vedúci token "B"/"BM" (pôvodné, potvrdené 7/13/2026) alebo "nM" (škola
# dodávateľský prefix premenovala — živý guest dump 3.9.2026 už posiela
# "nM - Lúka učiteľ"/"nM - Les" namiesto "BM - ...", pôvodný regex ho
# nerozpoznal a NO MILK objednávka sa ticho strácala, viď modul docstring).
_SUPPLIER_PREFIX_RE = re.compile(r"^\s*(BM|B|nM)\s*[-–]\s*(.+)$", re.IGNORECASE)
# "ŠPECI - Lúka" — nenesie dodávateľa, ale rovno celú špeciálnu diétu.
_SPECI_PREFIX_RE = re.compile(r"^\s*[SŠ]PECI\s*[-–]\s*(.+)$", re.IGNORECASE)
_SPECI_DIET = (
    "NO GLUTEN – NO ORECH – NO STRUKOVINY – NO PARADAJKA – NO PAPRIKA – "
    "NO POHANKA – NO SOJA – NO QUINOA"
)

_LUKA = "Lúka"
_DETSKA = "Škôlka"


def _fold(value: str) -> str:
    """ASCII-fold + casefold, ako inde v scraperi (diakritika/velkosť nerozhoduje)."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).strip()


def skolickams_payer_hook(payer_name: str) -> PayerRule | None:
    """Odstrihni dodávateľský prefix `B`/`BM`; z `BM` odvoď NO MILK; `Hosť`→Lúka."""
    name = (payer_name or "").strip()

    # Hosť nemá výdajňu — rozhodnutím usera ho rátame k Lúke. Porovnávame ASCII-fold,
    # aby diakritika/veľkosť písmen nerozhodla ("Hosť"/"host"/"HOSŤ").
    if _fold(name) == "host":
        return PayerRule(match_name=_LUKA)

    speci_match = _SPECI_PREFIX_RE.match(name)
    if speci_match is not None:
        return PayerRule(
            match_name=speci_match.group(1).strip(),
            diet=_SPECI_DIET,
            portion=_DETSKA,
        )

    match = _SUPPLIER_PREFIX_RE.match(name)
    if match is None:
        return None
    supplier, zvysok = match.group(1).upper(), match.group(2).strip()
    diet = "NO MILK" if supplier in ("BM", "NM") else None
    return PayerRule(match_name=zvysok, diet=diet)


def skolickams_letter_hook(letter: str, skratka: str, nazov: str) -> LetterRule | None:
    """Menu písmeno so skratkou `ŠPECI` = plná špeciálna diéta (viď modul docstring)."""
    if _fold(skratka) == _fold("ŠPECI"):
        return LetterRule(diet=_SPECI_DIET)
    return None
