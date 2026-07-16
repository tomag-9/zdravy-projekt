"""
Edupage mealsGuest HTML scraper.

Fetches the mealsGuest page for a school and extracts embedded order counts
(prehlad) from the server-rendered script tag. No headless browser needed —
the data is JSON embedded server-side on every page load.

Output format matches DailyOrder.data so imported orders look identical to
orders submitted through the UI.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import requests

from api.edupage import PrevadzkaConfig, apply_config, config_pre_url

logger = logging.getLogger(__name__)

ALLOWED_DIET_NAMES = {
    "NO MILK",
    "NO GLUTEN",
    "NO MILK/NO GLUTEN",
    "VEGGIE",
    "HISTAMIN",
    "NONONO",
    "NO ORECH",
    "NO PARADAJKA",
    "NO FISH",
    "NO EGG",
    "NO ZEMIAK",
    "NO SOJA",
    "NO ZELER",
    "DIA",
}
DEFAULT_PORTION_NAME = "Škôlka"
PORTION_CODE_MAP = {
    "0": "Škôlka",
    "1": "ZŠ 1.stupeň",
    "2": "ZŠ 2.stupeň",
    "3": "Dospelý (SŠ)",
    "4": "Dospelý (SŠ)",
}

PREDSKOLAK_PORTION_NAME = "Predškolák"
# EduPage nemá pre predškoláka vlastný kód porcie — školy ho hlásia cez názov
# platiteľskej skupiny (`Klasik - predškoláci`). Rozlíšenie je potrebné, lebo
# `porcia=1` zlieva predškolákov s naozajstným 1. stupňom, no účtujú sa inak
# (Edulienka: predškolák 1,25 porcie, prvostupniar 1).
_PREDSKOLAK_KEY_FRAGMENTS = ("predskolac", "predskolak")
# Zámerne len pre `porcia=1`: Predškolák má rovnaký gramážový koeficient ako
# `ZŠ 1.stupeň`, takže gramy ostávajú identické — je to len rozpad tohto kódu.
# Libellus a Krásňanko hlásia predškolákov ako `porcia=0` (MŠ gramáž), tých by
# preznačenie posunulo z 200 g na 250 g, preto sa ich toto pravidlo netýka.
_PREDSKOLAK_PORTION_CODE = "1"

# ------------------------------------------------------------------
# Known mappings: Edupage abbreviation → our Diet.name
# ------------------------------------------------------------------

_SKRATKA_MAP: dict[str, str] = {
    "BG": "NO GLUTEN",
    "BH": "HISTAMIN",
    "BM": "NO MILK",
    "BMBG": "NO MILK/NO GLUTEN",
    "NM": "NO MILK",
    "NOM": "NO MILK",
    "NG": "NO GLUTEN",
    "NOG": "NO GLUTEN",
    "NGNM": "NO MILK/NO GLUTEN",
    "NMNG": "NO MILK/NO GLUTEN",
    "NMG": "NO MILK/NO GLUTEN",
    "NE": "NO EGG",
    "NENO": "NO EGG",
    "NS": "NO SOJA",
    "HIS": "HISTAMIN",
    "HISTAMIN": "HISTAMIN",
    "HIT": "HISTAMIN",
    "H": "HISTAMIN",
    "NNN": "NONONO",
    "NNNO": "NONONO",
    "NF": "NO FISH",
    "NGNF": "NO GLUTEN",
    "NMNE": "NO MILK",
    "NMNO": "NO MILK",
    "NMZ": "NO MILK",
    "NMZD": "NO MILK",
    "V": "VEGGIE",
    "VEG": "VEGGIE",
    "VE": "VEGGIE",
    "PV": "VEGGIE",
    "SV": "VEGGIE",
    "VEGETAR": "VEGGIE",
    "DIA": "DIA",
}

# Keyword fragments in nazov → our Diet.name (checked after stripping spaces/slashes)
_NAZOV_KEYWORD_MAP: dict[str, str] = {
    "nomilk": "NO MILK",
    "bezmliecne": "NO MILK",
    "bezmlieka": "NO MILK",
    "nogluten": "NO GLUTEN",
    "nog": "NO GLUTEN",
    "bezglutenove": "NO GLUTEN",
    "bezlep": "NO GLUTEN",
    "nomilknogluten": "NO MILK/NO GLUTEN",
    "noglutennomilk": "NO MILK/NO GLUTEN",
    "nomilknog": "NO MILK/NO GLUTEN",
    "nomno": "NO MILK/NO GLUTEN",
    "nmg": "NO MILK/NO GLUTEN",
    "nmn": "NO MILK/NO GLUTEN",
    "bezmliecnebezglutenove": "NO MILK/NO GLUTEN",
    "noegg": "NO EGG",
    "bezvajec": "NO EGG",
    "bezvaj": "NO EGG",
    "nosoy": "NO SOJA",
    "nosoja": "NO SOJA",
    "bezsoje": "NO SOJA",
    "histamin": "HISTAMIN",
    "bezhistaminu": "HISTAMIN",
    "hit": "HISTAMIN",
    "nonono": "NONONO",
    "nnn": "NONONO",
    "nofish": "NO FISH",
    "bezryb": "NO FISH",
    "vegetar": "VEGGIE",
    "veggie": "VEGGIE",
    "vege": "VEGGIE",
    "nozeler": "NO ZELER",
    "noparadajka": "NO PARADAJKA",
    "noparadajky": "NO PARADAJKA",
    "noparadaj": "NO PARADAJKA",
    "noorech": "NO ORECH",
    "bezorech": "NO ORECH",
    "orech": "NO ORECH",
    "arasid": "NO ORECH",
    "nozemiak": "NO ZEMIAK",
    "dia": "DIA",
    "diabet": "DIA",
}

# Meal category by service-hour range (vydaj_od hour)
_MEAL_BY_HOUR: list[tuple[int, str]] = [
    (10, "breakfast"),  # vydaj_od < 10:00
    (15, "lunch"),  # vydaj_od 10:00–14:59
]
_DEFAULT_MEAL = "olovrant"  # vydaj_od ≥ 15:00
_MENU_NAME_RE = re.compile(r"^(?:menu\s*)?([ABC])$", re.IGNORECASE)
_PREFIXED_MENU_NAME_RE = re.compile(r"(?:^|\s)(?:menu\s*)?([ABC])$", re.IGNORECASE)
_CLASSIC_MENU_NAMES = {"klasik", "classic"}


def _normalise_key(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore")
    return re.sub(r"[\s/\-+.,_()]+", "", ascii_value.decode("ascii")).lower()


def _has_diet_signal(key: str) -> bool:
    return any(fragment in key for fragment in _NAZOV_KEYWORD_MAP)


def match_prevadzka(
    matches: dict[str, str], payer_name: str, menu_nazov: str
) -> str | None:
    """Priraď EduPage riadok prevádzke podľa `edupage_match` prefixu.

    Prevádzka je zakódovaná ako PREFIX payer labelu (`J1 1.st. klasik`, `B - Les`)
    alebo názvu menu (`Palisády nM`). Skúšame oboje. Match je `startswith`, nie
    substring — inak by krátky `edupage_match` (napr. `Les`) chytil aj nesúvisiaci
    label, kde sa ten reťazec vyskytne v strede. Dlhšie prefixy majú prednosť, aby
    `J1` neprebilo špecifickejší match.
    """
    payer_key = _normalise_key(payer_name)
    menu_key = _normalise_key(menu_nazov)
    for prefix in sorted(matches, key=len, reverse=True):
        prefix_key = _normalise_key(prefix)
        if not prefix_key:
            continue
        if payer_key.startswith(prefix_key) or menu_key.startswith(prefix_key):
            return matches[prefix]
    return None


# ------------------------------------------------------------------
# Public result type
# ------------------------------------------------------------------


@dataclass
class ScrapeResult:
    """Parsed order counts ready to be stored as DailyOrder.data."""

    date: date
    order_data: dict[str, Any]  # DailyOrder.data format (všetky prevádzky spolu)
    # {názov prevádzky: order_data} pri celkoch rozdelených na viac prevádzok.
    # Prázdne, ak sa split nerobil.
    order_data_by_prevadzka: dict[str, dict[str, Any]] = field(default_factory=dict)
    # EduPage riadky, ktoré nesadli na žiadnu prevádzku. Neprázdne = neúplný scrape.
    unmatched_prevadzka: list[str] = field(default_factory=list)
    unmapped_letters: list[str] = field(default_factory=list)
    # Scrape zlyhal štrukturálne — volajúci z toho robí "neimportuj nič".
    warnings: list[str] = field(default_factory=list)
    # Scrape prebehol, ale per-prevádzka config nesedí s realitou (škola zmenila
    # nastavenia). Diagnostika pre nás, NIE signál zlyhania — nesmie sa miešať
    # do `warnings`, inak by config drift zablokoval import platných objednávok.
    config_notes: list[str] = field(default_factory=list)
    # Písmená označené per-prevádzka hookom ako „skontroluj ručne" (napr. Krásňanko ZD).
    attention: list[str] = field(default_factory=list)
    # `attention` rozpadnuté podľa prevádzky, do ktorej porcie s daným flagom
    # reálne padli. Prázdne pri jedno-prevádzkovom scrape (vtedy platí `attention`).
    attention_by_prevadzka: dict[str, list[str]] = field(default_factory=dict)


# ------------------------------------------------------------------
# Core scraper
# ------------------------------------------------------------------


class EdupageScraper:
    TIMEOUT = 15

    def scrape(
        self,
        mealsguest_url: str,
        target_date: date,
        prevadzka_matches: dict[str, str] | None = None,
    ) -> ScrapeResult:
        url = self._inject_date(mealsguest_url, target_date)
        html = self._fetch(url)
        config = config_pre_url(mealsguest_url)
        result = self._parse(
            html, target_date, config=config, prevadzka_matches=prevadzka_matches
        )
        if config is not None:
            result = apply_config(result, config)
        return result

    # ------ HTTP ------

    def _fetch(self, url: str) -> str:
        resp = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ZdravyProjektBot/1.0)"},
            timeout=self.TIMEOUT,
        )
        resp.raise_for_status()
        return resp.text

    @staticmethod
    def _inject_date(url: str, target_date: date) -> str:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query, keep_blank_values=True)
        qs["date"] = [target_date.isoformat()]
        new_query = urlencode({k: v[0] for k, v in qs.items()})
        return urlunparse(parsed._replace(query=new_query))

    # ------ JSON extraction from HTML ------

    @staticmethod
    def _extract_block(html: str, key: str) -> Any | None:
        """Pull a JS object/array assigned to `key :` inside the strava_numeri(…) call."""
        pattern = (
            rf"{re.escape(key)}\s*:\s*([{{\[].+?)(?=,\s*\n?\s*[a-zA-Z_]\w*\s*:|\);\s*$)"
        )
        m = re.search(pattern, html, re.DOTALL)
        if not m:
            return None
        try:
            return json.loads(m.group(1).rstrip(","))
        except json.JSONDecodeError as exc:
            logger.debug("JSON parse failed for key=%s: %s", key, exc)
            return None

    # ------ jid → meal_key ------

    @staticmethod
    def _parse_iso_date(value: str) -> date | None:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _parse_hm(value: str) -> tuple[int, int]:
        """Parse an "H:MM"/"HH:MM" time string into a (hour, minute) tuple."""
        hour_str, _, minute_str = value.partition(":")
        try:
            return int(hour_str), int(minute_str or 0)
        except ValueError:
            return 12, 0

    @staticmethod
    def _row_valid_for_date(row: dict, target_date: date) -> bool:
        """Return True unless `target_date` falls outside the row's plati_od/plati_do."""
        plati_od = row.get("plati_od")
        if plati_od:
            parsed = EdupageScraper._parse_iso_date(plati_od)
            if parsed and target_date < parsed:
                return False
        plati_do = row.get("plati_do")
        if plati_do:
            parsed = EdupageScraper._parse_iso_date(plati_do)
            if parsed and target_date > parsed:
                return False
        return True

    @staticmethod
    def _build_jid_map(nastavenia: list[dict], target_date: date) -> dict[str, str]:
        """Return {jid_str: meal_key} using vydaj_od times from nastavenia.

        A school's olovrant (afternoon snack) window can start as early as
        14:30, which falls on the same side of the fixed hour thresholds as a
        lunch window ending at 14:00 (both have vydaj_od hour 14) — so two
        genuinely different service windows would resolve to the same
        meal_key and their headcounts would be summed together, silently
        doubling that meal's reported count. When more than one window in the
        same day resolves to the same meal, keep the earliest (chronologically)
        and shift later collisions to the next later meal slot that isn't
        already taken that day, so each real window keeps its own bucket.

        A `vydaj_normal` row is only valid while `target_date` falls within
        its own `plati_od`/`plati_do` range — a school that changed its
        serving schedule mid-year can have several such rows, and applying a
        row that isn't valid for the scraped date would silently attach the
        wrong (stale or not-yet-active) times to that day.
        """
        jid_map: dict[str, str] = {}
        # Single source of truth for meal ordering, shared with the hour
        # thresholds below - avoids a second, independently-maintained list.
        meal_sequence = [label for _, label in _MEAL_BY_HOUR] + [_DEFAULT_MEAL]

        for row in nastavenia:
            if row.get("setting") != "vydaj_normal":
                continue
            if not EdupageScraper._row_valid_for_date(row, target_date):
                continue
            try:
                hodnota = (
                    json.loads(row["hodnota"])
                    if isinstance(row["hodnota"], str)
                    else row["hodnota"]
                )
            except (json.JSONDecodeError, KeyError):
                continue
            for day_data in hodnota.values():
                if not isinstance(day_data, dict):
                    continue

                unseen = [
                    (jid, times.get("vydaj_od", "12:00"))
                    for jid, times in day_data.items()
                    if jid not in jid_map
                ]
                if not unseen:
                    continue
                # Chronological within the day - parsed as (hour, minute) so
                # unpadded times (e.g. "9:30") still sort before "14:00"
                # instead of a lexicographic string compare misordering them.
                unseen.sort(key=lambda pair: EdupageScraper._parse_hm(pair[1]))

                used_meals: set[str] = set()
                for jid, vydaj_od in unseen:
                    hour = EdupageScraper._parse_hm(vydaj_od)[0]
                    meal = _DEFAULT_MEAL
                    for threshold, label in _MEAL_BY_HOUR:
                        if hour < threshold:
                            meal = label
                            break

                    if meal in used_meals:
                        start = meal_sequence.index(meal)
                        for candidate in meal_sequence[start + 1 :]:
                            if candidate not in used_meals:
                                meal = candidate
                                break

                    used_meals.add(meal)
                    jid_map[jid] = meal
        return jid_map

    @staticmethod
    def _build_payer_map(
        typy_platitelov: list[dict], target_date: date
    ) -> dict[str, dict[str, str]]:
        """Return {typ_platitela_id: cleaned portion/diet metadata}.

        Like `vydaj_normal`, a `typy_platitelov` row is only valid while
        `target_date` falls within its own `plati_od`/`plati_do` range - a
        school can redefine payer groups (e.g. reassign a payer_id to a
        different diet/portion) mid-year, leaving older rows in the data.
        Applying a row that isn't valid for the scraped date would silently
        misclassify counts under a stale or not-yet-active payer mapping.
        """
        payer_map: dict[str, dict[str, str]] = {}
        for row in typy_platitelov:
            if not isinstance(row, dict):
                continue
            if not EdupageScraper._row_valid_for_date(row, target_date):
                continue
            hodnota = row.get("hodnota", {})
            if isinstance(hodnota, str):
                try:
                    hodnota = json.loads(hodnota)
                except json.JSONDecodeError:
                    continue
            if not isinstance(hodnota, dict):
                continue

            for payer_id, payer_data in hodnota.items():
                if not isinstance(payer_data, dict):
                    continue
                name = str(payer_data.get("nazov", "")).strip()
                portion_code = str(payer_data.get("porcia", "")).strip()
                payer_map[str(payer_id)] = {
                    "name": name,
                    "portion": EdupageScraper.resolve_payer_portion_name(
                        name, portion_code
                    ),
                    "diet": EdupageScraper.resolve_payer_diet_name(name) or "",
                }
        return payer_map

    # ------ diet name auto-match ------

    @staticmethod
    def resolve_diet_name(skratka: str, nazov: str) -> str:
        """
        Map an Edupage diet abbreviation/name to our Diet.name.

        Priority:
        1. Known skratka (abbreviation) exact match
        2. Keyword scan on normalised nazov
        3. Fallback: return nazov as-is (stored under that name in diets)
        """
        sk = skratka.strip().upper()
        if sk in _SKRATKA_MAP:
            return _SKRATKA_MAP[sk]

        compact_sk = _normalise_key(skratka)
        if any(fragment in compact_sk for fragment in ("nmng", "ngnm", "bmbg")):
            return "NO MILK/NO GLUTEN"
        if compact_sk.endswith("nmg") or compact_sk.endswith("ngm"):
            return "NO MILK/NO GLUTEN"
        if compact_sk.endswith("ngh"):
            return "NO GLUTEN"
        if compact_sk.endswith("nnn") or "nonono" in compact_sk:
            return "NONONO"
        if compact_sk.endswith("hit") or compact_sk.endswith("his"):
            return "HISTAMIN"
        if compact_sk.endswith("ng") or compact_sk.endswith("nog"):
            return "NO GLUTEN"
        if compact_sk.endswith("nm") or compact_sk.endswith("nom"):
            return "NO MILK"
        if compact_sk.endswith("nomo"):
            return "NO MILK"
        if compact_sk.endswith("ne") or compact_sk.startswith("ne"):
            return "NO EGG"
        if compact_sk.endswith("h") and re.search(r"(?:^|\s)H\s*$", nazov):
            return "HISTAMIN"

        key = _normalise_key(f"{skratka} {nazov}")

        if sk.endswith("V") and re.search(r"(?:^|\s)V\s*$", nazov, re.IGNORECASE):
            return "VEGGIE"

        for fragment, diet_name in sorted(
            _NAZOV_KEYWORD_MAP.items(), key=lambda item: len(item[0]), reverse=True
        ):
            if fragment in key:
                return diet_name

        return nazov.strip() or skratka.strip()

    @staticmethod
    def resolve_payer_portion_name(nazov: str, portion_code: str) -> str:
        """Map an Edupage payer group to our PortionType.name.

        Splits `porcia=1` into `Predškolák` / `ZŠ 1.stupeň` by group label — the
        two share a portion code but not a billing coefficient.
        """
        key = _normalise_key(nazov)
        if portion_code == _PREDSKOLAK_PORTION_CODE and any(
            fragment in key for fragment in _PREDSKOLAK_KEY_FRAGMENTS
        ):
            return PREDSKOLAK_PORTION_NAME
        return PORTION_CODE_MAP.get(portion_code, DEFAULT_PORTION_NAME)

    @staticmethod
    def resolve_payer_diet_name(nazov: str) -> str | None:
        """Map an Edupage payer group label to one of our Diet.name values."""
        key = _normalise_key(nazov)

        # SŠV is used by Edupage schools for the vegetarian secondary-school group.
        if "ssv" in key:
            return "VEGGIE"

        for fragment, diet_name in sorted(
            _NAZOV_KEYWORD_MAP.items(), key=lambda item: len(item[0]), reverse=True
        ):
            if fragment in key and diet_name in ALLOWED_DIET_NAMES:
                return diet_name

        return None

    @staticmethod
    def resolve_menu_variant(skratka: str, nazov: str) -> str | None:
        """Return a menu variant for non-diet Edupage entries."""
        sk = skratka.strip().upper()
        nazov_clean = nazov.strip()
        key = _normalise_key(nazov_clean)
        combined_key = _normalise_key(f"{skratka} {nazov_clean}")

        if _has_diet_signal(combined_key):
            return None

        if key in _CLASSIC_MENU_NAMES or "klasik" in key or "classic" in key:
            return "A"

        for value in (nazov_clean, sk):
            match = _MENU_NAME_RE.match(value)
            if match:
                return match.group(1).upper()

        match = _PREFIXED_MENU_NAME_RE.search(nazov_clean)
        if match:
            return match.group(1).upper()

        return None

    # ------ aggregation ------

    def _parse(
        self,
        html: str,
        target_date: date,
        config: PrevadzkaConfig | None = None,
        prevadzka_matches: dict[str, str] | None = None,
    ) -> ScrapeResult:
        prehlad_raw = self._extract_block(html, "prehlad")
        nazov_menu_raw = self._extract_block(html, "nazovMenu")
        nastavenia_raw = self._extract_block(html, "nastavenia")
        typy_platitelov_raw = self._extract_block(html, "typy_platitelov")

        warnings: list[str] = []
        unmapped: list[str] = []
        attention: list[str] = []
        letter_hook = config.letter_hook if config is not None else None
        payer_hook = config.payer_hook if config is not None else None

        if not prehlad_raw:
            warnings.append("prehlad block not found in HTML")
            return ScrapeResult(date=target_date, order_data={}, warnings=warnings)

        prehlad = prehlad_raw.get("prehlad", {})
        if isinstance(prehlad, list):
            prehlad = {}
        if not isinstance(prehlad, dict):
            warnings.append("prehlad block has unexpected format")
            return ScrapeResult(date=target_date, order_data={}, warnings=warnings)

        nazov_menu: dict = nazov_menu_raw or {}
        nastavenia: list = nastavenia_raw or []
        typy_platitelov: list = typy_platitelov_raw or []

        jid_map = self._build_jid_map(nastavenia, target_date)
        payer_map = self._build_payer_map(typy_platitelov, target_date)

        # prevádzka ("" = nerozdelené) -> meal -> porcia -> menu/diet counts
        counts: dict[str, dict[str, dict[str, dict[str, dict[str, int]]]]] = {}
        matches = prevadzka_matches or {}
        unmatched: list[str] = []
        # bucket (názov prevádzky) -> flagy, ktoré do neho reálne padli
        attention_buckets: dict[str, set[str]] = {}

        date_key = target_date.isoformat()
        day_data = prehlad.get(date_key, {})

        for jid, jid_data in day_data.items():
            meal_key = jid_map.get(jid)
            if not meal_key:
                # Fallback: single-jid schools are almost always lunch
                meal_key = "lunch"
                if len(jid_map) == 0:
                    warnings.append(
                        f"nastavenia missing – defaulting jid={jid} → lunch"
                    )

            for letter, letter_data in jid_data.items():
                if not isinstance(letter_data, dict):
                    continue

                nm_entry = nazov_menu.get(letter, {})
                skratka = nm_entry.get("skratka", letter)
                nazov = nm_entry.get("nazov", letter)

                rule = letter_hook(letter, skratka, nazov) if letter_hook else None
                portion_override = rule.portion if rule else None

                flag_label: str | None = None
                if rule is not None and (rule.menu or rule.diet):
                    menu_variant = rule.menu
                    diet_name = rule.diet
                    if rule.flag:
                        flag_label = f"{letter}:{skratka}{rule.flag}"
                        attention.append(flag_label)
                else:
                    menu_variant = self.resolve_menu_variant(skratka, nazov)
                    diet_name = None
                    if menu_variant is None:
                        diet_name = self.resolve_diet_name(skratka, nazov)
                        if diet_name not in ALLOWED_DIET_NAMES:
                            unmapped.append(f"{letter}:{diet_name}")
                            continue
                        if diet_name == letter and letter not in nazov_menu:
                            unmapped.append(letter)

                tp = letter_data.get("typ_platitela", {})
                if not isinstance(tp, dict):
                    continue

                for payer_id, payer_counts in tp.items():
                    if not isinstance(payer_counts, dict):
                        continue
                    try:
                        total = int(payer_counts.get("o", 0) or 0)
                    except (TypeError, ValueError):
                        total = 0
                    if total <= 0:
                        continue

                    payer_info = payer_map.get(str(payer_id), {})
                    payer_name = payer_info.get("name", "")
                    payer_rule = payer_hook(payer_name) if payer_hook else None
                    match_name = (
                        payer_rule.match_name
                        if payer_rule and payer_rule.match_name is not None
                        else payer_name
                    )
                    portion_name = (
                        portion_override
                        or (payer_rule.portion if payer_rule else None)
                        or payer_info.get("portion")
                        or DEFAULT_PORTION_NAME
                    )
                    payer_diet = (
                        (payer_rule.diet if payer_rule else None)
                        or payer_info.get("diet")
                        or None
                    )
                    effective_diet = diet_name or payer_diet
                    effective_menu = "A" if effective_diet else (menu_variant or "A")

                    if matches:
                        bucket = match_prevadzka(matches, match_name, nazov)
                        if bucket is None:
                            # Radšej nahlás neúplný scrape, než ticho zahodiť porcie.
                            unmatched.append(
                                f"{letter}:{skratka}/{payer_info.get('name', payer_id)}"
                            )
                            continue
                    else:
                        bucket = ""

                    if flag_label is not None:
                        attention_buckets.setdefault(bucket, set()).add(flag_label)

                    counts_by_meal = counts.setdefault(bucket, {})
                    meal_counts = counts_by_meal.setdefault(meal_key, {})
                    portion_counts = meal_counts.setdefault(
                        portion_name, {"menuCounts": {}, "diets": {}}
                    )
                    menu_counts = portion_counts["menuCounts"]
                    diet_counts = portion_counts["diets"]
                    menu_counts[effective_menu] = (
                        menu_counts.get(effective_menu, 0) + total
                    )
                    if effective_diet:
                        diet_counts[effective_diet] = (
                            diet_counts.get(effective_diet, 0) + total
                        )

        def _clean(counts_by_meal: dict) -> dict[str, Any]:
            return {
                meal_key: meal_counts
                for meal_key, meal_counts in counts_by_meal.items()
                if meal_counts
            }

        by_prevadzka = {
            bucket: cleaned
            for bucket, counts_by_meal in counts.items()
            if bucket and (cleaned := _clean(counts_by_meal))
        }

        if matches:
            # Zlúčený pohľad pre volajúcich, ktorí split neriešia (napr. preview).
            order_data = _merge_meal_counts(by_prevadzka.values())
        else:
            order_data = _clean(counts.get("", {}))

        if unmatched:
            warnings.append(
                f"EduPage riadky bez prevádzky (nezapočítané): {sorted(set(unmatched))}"
            )

        return ScrapeResult(
            date=target_date,
            order_data=order_data,
            order_data_by_prevadzka=by_prevadzka,
            unmatched_prevadzka=sorted(set(unmatched)),
            unmapped_letters=list(set(unmapped)),
            warnings=warnings,
            attention=sorted(set(attention)),
            attention_by_prevadzka={
                bucket: sorted(flags)
                for bucket, flags in attention_buckets.items()
                if bucket and flags
            },
        )


def _merge_meal_counts(order_datas) -> dict[str, Any]:
    """Sčítaj viac order_data (jedna na prevádzku) do jedného zlúčeného pohľadu."""
    merged: dict[str, Any] = {}
    for order_data in order_datas:
        for meal_key, portions in order_data.items():
            meal = merged.setdefault(meal_key, {})
            for portion, details in portions.items():
                target = meal.setdefault(portion, {"menuCounts": {}, "diets": {}})
                for group in ("menuCounts", "diets"):
                    for key, count in details.get(group, {}).items():
                        target[group][key] = target[group].get(key, 0) + count
    return merged


def nest_order_data_by_category(
    order_data: dict[str, Any], category_name: str
) -> dict[str, Any]:
    """Wrap flat Edupage meal data under the operation/category name."""
    category = category_name.strip() or "EduPage"
    nested: dict[str, Any] = {}

    for meal_key, meal_data in (order_data or {}).items():
        if not isinstance(meal_data, dict) or not meal_data:
            continue

        if "menuCounts" in meal_data or "diets" in meal_data:
            nested[meal_key] = {category: dict(meal_data)}
        else:
            # Already normalized by our internal categories/portion types.
            nested[meal_key] = meal_data

    return nested
