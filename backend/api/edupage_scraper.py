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
from dataclasses import dataclass, field
from datetime import date
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import requests

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Known mappings: Edupage abbreviation → our Diet.name
# ------------------------------------------------------------------

_SKRATKA_MAP: dict[str, str] = {
    "NM": "NO MILK",
    "NG": "NO GLUTEN",
    "NMNG": "NO MILK/NO GLUTEN",
    "NE": "NO EGG",
    "NS": "NO SOJA",
    "HIS": "HISTAMIN",
    "HISTAMIN": "HISTAMIN",
    "NNN": "NONONO",
    "NF": "NO FISH",
    "V": "VEGGIE",
    "VEG": "VEGGIE",
    "VEGETAR": "VEGGIE",
}

# Keyword fragments in nazov → our Diet.name (checked after stripping spaces/slashes)
_NAZOV_KEYWORD_MAP: dict[str, str] = {
    "nomilk": "NO MILK",
    "nogluten": "NO GLUTEN",
    "nomilknogluten": "NO MILK/NO GLUTEN",
    "noglutennomilk": "NO MILK/NO GLUTEN",
    "noegg": "NO EGG",
    "nosoy": "NO SOJA",
    "nosoja": "NO SOJA",
    "histamin": "HISTAMIN",
    "nonono": "NONONO",
    "nofish": "NO FISH",
    "vegetar": "VEGGIE",
    "veggie": "VEGGIE",
    "nozeler": "NO ZELER",
    "noparadajka": "NO PARADAJKA",
    "noparadajky": "NO PARADAJKA",
    "noorech": "NO ORECH",
    "nozemiak": "NO ZEMIAK",
}

# Meal category by service-hour range (vydaj_od hour)
_MEAL_BY_HOUR: list[tuple[int, str]] = [
    (10, "breakfast"),  # vydaj_od < 10:00
    (15, "lunch"),  # vydaj_od 10:00–14:59
]
_DEFAULT_MEAL = "olovrant"  # vydaj_od ≥ 15:00


# ------------------------------------------------------------------
# Public result type
# ------------------------------------------------------------------


@dataclass
class ScrapeResult:
    """Parsed order counts ready to be stored as DailyOrder.data."""

    date: date
    order_data: dict[str, Any]  # DailyOrder.data format
    unmapped_letters: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# ------------------------------------------------------------------
# Core scraper
# ------------------------------------------------------------------


class EdupageScraper:
    TIMEOUT = 15

    def scrape(self, mealsguest_url: str, target_date: date) -> ScrapeResult:
        url = self._inject_date(mealsguest_url, target_date)
        html = self._fetch(url)
        return self._parse(html, target_date)

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
    def _build_jid_map(nastavenia: list[dict]) -> dict[str, str]:
        """Return {jid_str: meal_key} using vydaj_od times from nastavenia."""
        jid_map: dict[str, str] = {}
        for row in nastavenia:
            if row.get("setting") != "vydaj_normal":
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
                for jid, times in day_data.items():
                    if jid in jid_map:
                        continue
                    vydaj_od = times.get("vydaj_od", "12:00")
                    hour = int(vydaj_od.split(":")[0])
                    meal = _DEFAULT_MEAL
                    for threshold, label in _MEAL_BY_HOUR:
                        if hour < threshold:
                            meal = label
                            break
                    jid_map[jid] = meal
        return jid_map

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

        # Normalise: remove spaces, slashes, lowercase
        key = re.sub(r"[\s/\-]+", "", nazov).lower()
        for fragment, diet_name in _NAZOV_KEYWORD_MAP.items():
            if fragment in key:
                return diet_name

        return nazov.strip() or skratka.strip()

    # ------ aggregation ------

    def _parse(self, html: str, target_date: date) -> ScrapeResult:
        prehlad_raw = self._extract_block(html, "prehlad")
        nazov_menu_raw = self._extract_block(html, "nazovMenu")
        nastavenia_raw = self._extract_block(html, "nastavenia")

        warnings: list[str] = []
        unmapped: list[str] = []

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

        jid_map = self._build_jid_map(nastavenia)

        # Accumulate: {meal_key: {diet_name: count}}
        counts: dict[str, dict[str, int]] = {}

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

            meal_counts = counts.setdefault(meal_key, {})

            for letter, letter_data in jid_data.items():
                if not isinstance(letter_data, dict):
                    continue

                # Resolve diet name for this letter
                nm_entry = nazov_menu.get(letter, {})
                skratka = nm_entry.get("skratka", letter)
                nazov = nm_entry.get("nazov", letter)
                diet_name = self.resolve_diet_name(skratka, nazov)

                if diet_name == letter and letter not in nazov_menu:
                    unmapped.append(letter)

                # Sum ordered portions across all typ_platitela
                tp = letter_data.get("typ_platitela", {})
                total = sum(
                    v.get("o", 0) if isinstance(v, dict) else 0 for v in tp.values()
                )
                if total > 0:
                    meal_counts[diet_name] = meal_counts.get(diet_name, 0) + total

        # Build DailyOrder.data:
        # menuCounts["A"] = total portions (so order_data.totals() works correctly)
        # diets = breakdown by diet name
        order_data: dict[str, Any] = {}
        for meal_key, diet_counts in counts.items():
            if not diet_counts:
                continue
            total = sum(diet_counts.values())
            order_data[meal_key] = {
                "menuCounts": {"A": total},
                "diets": diet_counts,
            }

        return ScrapeResult(
            date=target_date,
            order_data=order_data,
            unmapped_letters=list(set(unmapped)),
            warnings=warnings,
        )
