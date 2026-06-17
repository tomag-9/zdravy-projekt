"""Unit tests for EdupageScraper. No network calls — all HTTP is mocked."""

import json
import unittest
from datetime import date
from unittest.mock import MagicMock, patch

from api.edupage_scraper import EdupageScraper


def _make_html(
    prehlad: dict,
    nazov_menu: dict,
    nastavenia: list,
    target_date: str = "2026-06-17",
) -> str:
    """Build a minimal fake mealsGuest HTML page with embedded JS data.

    Kept on a single line inside the script so the _extract_block regex
    (which uses non-greedy .+? with a lookahead for ',\\s*key :') behaves
    the same way it does on real Edupage pages (which are also one-liners).
    """

    def _js(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

    # Single-line JS call — matches the real Edupage page structure.
    js_call = (
        f"strava_numeri({{"
        f"odkedy:'{target_date}',"
        f"dokedy:'{target_date}',"
        f"prehlad:{_js(prehlad)},"
        f'prehladNG:{{"prehlad":{{}}}},'
        f"typy_platitelov:[],"
        f"nazovMenu:{_js(nazov_menu)},"
        f"nastavenia:{_js(nastavenia)},"
        f"odhlasovania2:[]"
        f"}});"
    )
    return f"<script>{js_call}</script>"


class TestResolveDietName(unittest.TestCase):
    def _r(self, sk, naz):
        return EdupageScraper.resolve_diet_name(sk, naz)

    def test_known_skratka_nm(self):
        self.assertEqual(self._r("NM", "NoMilk"), "NO MILK")

    def test_known_skratka_ng(self):
        self.assertEqual(self._r("NG", "NoGluten"), "NO GLUTEN")

    def test_known_skratka_nmng(self):
        self.assertEqual(self._r("NMNG", "NoMilk/NoGluten"), "NO MILK/NO GLUTEN")

    def test_known_skratka_his(self):
        self.assertEqual(self._r("HIS", "Histamin"), "HISTAMIN")

    def test_known_skratka_nnn(self):
        self.assertEqual(self._r("NNN", "NoNoNo"), "NONONO")

    def test_known_skratka_ne(self):
        self.assertEqual(self._r("NE", "NoEgg"), "NO EGG")

    def test_known_skratka_ns(self):
        self.assertEqual(self._r("NS", "NoSoy"), "NO SOJA")

    def test_known_skratka_nf(self):
        self.assertEqual(self._r("NF", "NoFish"), "NO FISH")

    def test_known_skratka_case_insensitive(self):
        # skratka lookup normalises to upper
        self.assertEqual(self._r("nm", "whatever"), "NO MILK")

    def test_keyword_fallback_nomilk_in_nazov(self):
        # Unknown skratka, but nazov contains "NoMilk"
        self.assertEqual(self._r("XYZ", "NoMilk"), "NO MILK")

    def test_keyword_fallback_histamin_in_nazov(self):
        self.assertEqual(self._r("ZZ", "Histaminová strava"), "HISTAMIN")

    def test_keyword_fallback_nogluten_in_nazov(self):
        self.assertEqual(self._r("?", "NoGluten jedlo"), "NO GLUTEN")

    def test_unknown_fallback_returns_nazov(self):
        self.assertEqual(self._r("ABC", "menu A"), "menu A")

    def test_unknown_fallback_empty_nazov_returns_skratka(self):
        self.assertEqual(self._r("XZ", ""), "XZ")


class TestBuildJidMap(unittest.TestCase):
    def _build(self, vydaj_od, jid="2"):
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {"1": {jid: {"vydaj_od": vydaj_od, "vydaj_do": "14:00"}}}
                ),
            }
        ]
        return EdupageScraper._build_jid_map(nastavenia)

    def test_lunch(self):
        self.assertEqual(self._build("11:00")["2"], "lunch")

    def test_breakfast(self):
        self.assertEqual(self._build("07:30")["2"], "breakfast")

    def test_olovrant(self):
        self.assertEqual(self._build("15:00")["2"], "olovrant")

    def test_boundary_exactly_10(self):
        # 10:00 → lunch (10 is not < 10, so falls to next range < 15)
        self.assertEqual(self._build("10:00")["2"], "lunch")

    def test_empty_nastavenia_returns_empty(self):
        self.assertEqual(EdupageScraper._build_jid_map([]), {})

    def test_wrong_setting_ignored(self):
        nastavenia = [{"setting": "something_else", "hodnota": "{}"}]
        self.assertEqual(EdupageScraper._build_jid_map(nastavenia), {})


class TestInjectDate(unittest.TestCase):
    def test_adds_date_when_missing(self):
        url = "https://zsivanka.edupage.org/menu/mealsGuest?id=x3StT4Z"
        result = EdupageScraper._inject_date(url, date(2026, 6, 17))
        self.assertIn("date=2026-06-17", result)
        self.assertIn("id=x3StT4Z", result)

    def test_replaces_existing_date(self):
        url = "https://school.edupage.org/menu/mealsGuest?id=ABC&date=2026-05-01"
        result = EdupageScraper._inject_date(url, date(2026, 6, 17))
        self.assertIn("date=2026-06-17", result)
        self.assertNotIn("2026-05-01", result)

    def test_preserves_id_param(self):
        url = "https://school.edupage.org/menu/mealsGuest?id=TOKEN123"
        result = EdupageScraper._inject_date(url, date(2026, 1, 1))
        self.assertIn("id=TOKEN123", result)


class TestParse(unittest.TestCase):
    TARGET_DATE = date(2026, 6, 17)
    DATE_STR = "2026-06-17"

    def _scrape_html(self, html: str):
        scraper = EdupageScraper()
        return scraper._parse(html, self.TARGET_DATE)

    def test_parse_full_html_lunch(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "2": {
                        "A": {
                            "typ_platitela": {"6": {"o": 2}, "7": {"o": 1}},
                            "porcia": {},
                            "v_skupina": {},
                        },
                        "B": {
                            "typ_platitela": {"4": {"o": 5}},
                            "porcia": {},
                            "v_skupina": {},
                        },
                    }
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        nazov_menu = {
            "A": {"nazov": "NoMilk", "skratka": "NM"},
            "B": {"nazov": "NoGluten", "skratka": "NG"},
        }
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {"1": {"2": {"vydaj_od": "11:00", "vydaj_do": "14:00"}}}
                ),
            }
        ]
        html = _make_html(prehlad, nazov_menu, nastavenia, self.DATE_STR)
        result = self._scrape_html(html)

        self.assertIn("lunch", result.order_data)
        self.assertEqual(result.order_data["lunch"]["menuCounts"]["A"], 8)  # 2+1+5
        self.assertEqual(result.order_data["lunch"]["diets"]["NO MILK"], 3)
        self.assertEqual(result.order_data["lunch"]["diets"]["NO GLUTEN"], 5)
        self.assertEqual(result.warnings, [])
        self.assertEqual(result.unmapped_letters, [])

    def test_parse_breakfast_and_lunch(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "1": {
                        "A": {
                            "typ_platitela": {"1": {"o": 20}},
                            "porcia": {},
                            "v_skupina": {},
                        }
                    },
                    "2": {
                        "A": {
                            "typ_platitela": {"1": {"o": 50}},
                            "porcia": {},
                            "v_skupina": {},
                        }
                    },
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        nazov_menu = {"A": {"nazov": "menu A", "skratka": "A"}}
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {
                        "1": {
                            "1": {"vydaj_od": "07:30", "vydaj_do": "09:00"},
                            "2": {"vydaj_od": "11:30", "vydaj_do": "14:00"},
                        }
                    }
                ),
            }
        ]
        html = _make_html(prehlad, nazov_menu, nastavenia, self.DATE_STR)
        result = self._scrape_html(html)

        self.assertIn("breakfast", result.order_data)
        self.assertIn("lunch", result.order_data)
        self.assertEqual(result.order_data["breakfast"]["menuCounts"]["A"], 20)
        self.assertEqual(result.order_data["lunch"]["menuCounts"]["A"], 50)

    def test_parse_empty_prehlad_for_date(self):
        prehlad = {"prehlad": {}, "mamUnknown": False, "unknownTypyIDS": []}
        html = _make_html(prehlad, {}, [], self.DATE_STR)
        result = self._scrape_html(html)

        self.assertEqual(result.order_data, {})

    def test_parse_missing_prehlad_block(self):
        html = "<html><body>nothing here</body></html>"
        result = self._scrape_html(html)

        self.assertEqual(result.order_data, {})
        self.assertTrue(len(result.warnings) > 0)
        self.assertIn("prehlad", result.warnings[0])

    def test_parse_zero_orders_excluded(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "2": {
                        "A": {
                            "typ_platitela": {"1": {"o": 0}},
                            "porcia": {},
                            "v_skupina": {},
                        },
                    }
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        nazov_menu = {"A": {"nazov": "NoMilk", "skratka": "NM"}}
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {"1": {"2": {"vydaj_od": "11:00", "vydaj_do": "14:00"}}}
                ),
            }
        ]
        html = _make_html(prehlad, nazov_menu, nastavenia, self.DATE_STR)
        result = self._scrape_html(html)

        # Zero-count entries should not appear in order_data
        self.assertEqual(result.order_data, {})

    def test_unknown_menu_letter_stored_as_is(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "2": {
                        "Z": {
                            "typ_platitela": {"1": {"o": 3}},
                            "porcia": {},
                            "v_skupina": {},
                        },
                    }
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        # nazovMenu doesn't contain Z
        html = _make_html(prehlad, {}, [], self.DATE_STR)
        result = self._scrape_html(html)

        # Should still store with letter as key and mark as unmapped
        diets = result.order_data.get("lunch", {}).get("diets", {})
        self.assertEqual(diets.get("Z"), 3)
        self.assertIn("Z", result.unmapped_letters)


class TestFetchError(unittest.TestCase):
    def test_fetch_error_propagates(self):
        import requests as req_module

        scraper = EdupageScraper()
        with patch.object(
            scraper, "_fetch", side_effect=req_module.ConnectionError("timeout")
        ):
            with self.assertRaises(req_module.ConnectionError):
                scraper.scrape(
                    "https://school.edupage.org/menu/mealsGuest?id=X", date(2026, 6, 17)
                )

    def test_fetch_http_error_propagates(self):
        import requests as req_module

        scraper = EdupageScraper()
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = req_module.HTTPError("403")
        mock_resp.text = ""

        with patch("requests.get", return_value=mock_resp):
            with self.assertRaises(req_module.HTTPError):
                scraper.scrape(
                    "https://school.edupage.org/menu/mealsGuest?id=X", date(2026, 6, 17)
                )


if __name__ == "__main__":
    unittest.main()
