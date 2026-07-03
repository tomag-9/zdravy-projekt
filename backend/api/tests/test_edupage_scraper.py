"""Unit tests for EdupageScraper. No network calls — all HTTP is mocked."""

import json
import unittest
from datetime import date
from unittest.mock import MagicMock, patch

from api.edupage_scraper import EdupageScraper, nest_order_data_by_category


def _make_html(
    prehlad: dict,
    nazov_menu: dict,
    nastavenia: list,
    typy_platitelov: list | None = None,
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
        f"typy_platitelov:{_js(typy_platitelov or [])},"
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

    def test_real_edupage_prefixed_no_milk_aliases(self):
        cases = [
            ("BM", "Bruško bezMliečne"),
            ("PnM", "Palisády nM"),
            ("SnM", "Stupava nM"),
            ("mšHey. NM", "MŠHeyNoMilk"),
        ]
        for skratka, nazov in cases:
            with self.subTest(skratka=skratka, nazov=nazov):
                self.assertEqual(self._r(skratka, nazov), "NO MILK")

    def test_real_edupage_prefixed_no_gluten_aliases(self):
        cases = [
            ("BG", "Bruško bezGluténové"),
            ("PnG", "Palisády nG"),
            ("SnG", "Stupava nG"),
            ("Dosp NoG", "Dosp ob NoG"),
            ("mšMal. NG", "MŠMalNoGluten"),
        ]
        for skratka, nazov in cases:
            with self.subTest(skratka=skratka, nazov=nazov):
                self.assertEqual(self._r(skratka, nazov), "NO GLUTEN")

    def test_real_edupage_combined_aliases(self):
        cases = [
            ("BMBG", "bezMliečne+bezGluténové"),
            ("PnMG", "Palisády nMG"),
            ("SnMG", "Stupava nMG"),
            ("nGnM", "noGnoM"),
        ]
        for skratka, nazov in cases:
            with self.subTest(skratka=skratka, nazov=nazov):
                self.assertEqual(self._r(skratka, nazov), "NO MILK/NO GLUTEN")

    def test_real_edupage_other_existing_diet_aliases(self):
        cases = [
            ("BH", "bezHistamínu", "HISTAMIN"),
            ("HIT", "Palisády HIT", "HISTAMIN"),
            ("SH", "Stupava H", "HISTAMIN"),
            ("DIA", "Dia", "DIA"),
            ("NEŠpeciál", "NoEggŠpeciál", "NO EGG"),
            ("NoMO", "NoM bezO", "NO MILK"),
            ("PnGH", "Palisády NGH", "NO GLUTEN"),
            ("No orech", "No orech", "NO ORECH"),
            ("No zemiak", "No zemiak", "NO ZEMIAK"),
            ("NS", "NoSoy", "NO SOJA"),
        ]
        for skratka, nazov, expected in cases:
            with self.subTest(skratka=skratka, nazov=nazov):
                self.assertEqual(self._r(skratka, nazov), expected)

    def test_menu_v_stays_veggie_diet_until_variant_exists(self):
        self.assertEqual(self._r("PV", "Palisády V"), "VEGGIE")
        self.assertEqual(self._r("SV", "Stupava V"), "VEGGIE")


class TestResolveMenuVariant(unittest.TestCase):
    def _r(self, sk, naz):
        return EdupageScraper.resolve_menu_variant(sk, naz)

    def test_klasik_is_menu_a(self):
        self.assertEqual(self._r("A", "Klasik"), "A")

    def test_menu_a_is_menu_a(self):
        self.assertEqual(self._r("A", "Menu A"), "A")

    def test_plain_variant_letter_is_menu(self):
        self.assertEqual(self._r("B", "B"), "B")

    def test_diet_name_is_not_menu_variant(self):
        self.assertIsNone(self._r("NM", "NoMilk"))

    def test_letter_b_with_diet_name_is_not_menu_variant(self):
        self.assertIsNone(self._r("B", "NoGluten"))

    def test_prefixed_menu_names_are_menu_variants(self):
        self.assertEqual(self._r("PA", "Palisády A"), "A")
        self.assertEqual(self._r("PB", "Palisády B"), "B")
        self.assertEqual(self._r("PC", "Menu C"), "C")


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

    def _typy(self, items):
        return [
            {
                "setting": "typy_platitelov",
                "hodnota": {
                    str(payer_id): {
                        "nazov": name,
                        "porcia": portion_code,
                        "typ_platitela": payer_id,
                    }
                    for payer_id, name, portion_code in items
                },
            }
        ]

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
        typy_platitelov = self._typy(
            [
                (4, "1.stupeň NoGluten", 1),
                (6, "MŠ NoMilk", 0),
                (7, "Dospelý NoMilk", 3),
            ]
        )
        html = _make_html(
            prehlad, nazov_menu, nastavenia, typy_platitelov, self.DATE_STR
        )
        result = self._scrape_html(html)

        self.assertIn("lunch", result.order_data)
        self.assertEqual(
            result.order_data["lunch"]["Škôlka"],
            {"menuCounts": {"A": 2}, "diets": {"NO MILK": 2}},
        )
        self.assertEqual(
            result.order_data["lunch"]["Dospelý (SŠ)"],
            {"menuCounts": {"A": 1}, "diets": {"NO MILK": 1}},
        )
        self.assertEqual(
            result.order_data["lunch"]["ZŠ 1.stupeň"],
            {"menuCounts": {"A": 5}, "diets": {"NO GLUTEN": 5}},
        )
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
        html = _make_html(
            prehlad,
            nazov_menu,
            nastavenia,
            self._typy([(1, "MŠ Klasik", 0)]),
            self.DATE_STR,
        )
        result = self._scrape_html(html)

        self.assertIn("breakfast", result.order_data)
        self.assertIn("lunch", result.order_data)
        self.assertEqual(
            result.order_data["breakfast"]["Škôlka"]["menuCounts"]["A"], 20
        )
        self.assertEqual(result.order_data["lunch"]["Škôlka"]["menuCounts"]["A"], 50)

    def test_parse_breakfast_lunch_and_olovrant(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "1": {"A": {"typ_platitela": {"1": {"o": 7}}}},
                    "2": {"A": {"typ_platitela": {"1": {"o": 11}}}},
                    "3": {"A": {"typ_platitela": {"1": {"o": 5}}}},
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        nazov_menu = {"A": {"nazov": "Klasik", "skratka": "A"}}
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {
                        "1": {
                            "1": {"vydaj_od": "08:00", "vydaj_do": "09:00"},
                            "2": {"vydaj_od": "12:00", "vydaj_do": "14:00"},
                            "3": {"vydaj_od": "15:30", "vydaj_do": "16:00"},
                        }
                    }
                ),
            }
        ]
        html = _make_html(
            prehlad,
            nazov_menu,
            nastavenia,
            self._typy([(1, "MŠ Klasik", 0)]),
            self.DATE_STR,
        )
        result = self._scrape_html(html)

        self.assertEqual(result.order_data["breakfast"]["Škôlka"]["menuCounts"]["A"], 7)
        self.assertEqual(result.order_data["lunch"]["Škôlka"]["menuCounts"]["A"], 11)
        self.assertEqual(result.order_data["olovrant"]["Škôlka"]["menuCounts"]["A"], 5)
        self.assertEqual(result.order_data["breakfast"]["Škôlka"]["diets"], {})
        self.assertEqual(result.order_data["lunch"]["Škôlka"]["diets"], {})
        self.assertEqual(result.order_data["olovrant"]["Škôlka"]["diets"], {})

    def test_parse_menu_a_as_plain_menu_without_diet(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "2": {"A": {"typ_platitela": {"1": {"o": 13}}}},
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        nazov_menu = {"A": {"nazov": "Menu A", "skratka": "A"}}
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {"1": {"2": {"vydaj_od": "12:00", "vydaj_do": "14:00"}}}
                ),
            }
        ]
        html = _make_html(
            prehlad,
            nazov_menu,
            nastavenia,
            self._typy([(1, "ZŠ Klasik", 1)]),
            self.DATE_STR,
        )
        result = self._scrape_html(html)

        self.assertEqual(
            result.order_data["lunch"],
            {"ZŠ 1.stupeň": {"menuCounts": {"A": 13}, "diets": {}}},
        )

    def test_parse_payer_group_can_supply_clean_diet_and_portion(self):
        prehlad = {
            "prehlad": {
                self.DATE_STR: {
                    "2": {"A": {"typ_platitela": {"12": {"o": 4}}}},
                }
            },
            "mamUnknown": False,
            "unknownTypyIDS": [],
        }
        nazov_menu = {"A": {"nazov": "Klasik", "skratka": "sšvA"}}
        nastavenia = [
            {
                "setting": "vydaj_normal",
                "hodnota": json.dumps(
                    {"1": {"2": {"vydaj_od": "12:00", "vydaj_do": "14:00"}}}
                ),
            }
        ]
        html = _make_html(
            prehlad,
            nazov_menu,
            nastavenia,
            self._typy([(12, "SŠV žiak", 4)]),
            self.DATE_STR,
        )
        result = self._scrape_html(html)

        self.assertEqual(
            result.order_data["lunch"],
            {"Dospelý (SŠ)": {"menuCounts": {"A": 4}, "diets": {"VEGGIE": 4}}},
        )

    def test_nest_order_data_by_category_wraps_flat_meals(self):
        nested = nest_order_data_by_category(
            {
                "breakfast": {"menuCounts": {"A": 7}, "diets": {}},
                "lunch": {"menuCounts": {"A": 11}, "diets": {}},
            },
            "Edupage school",
        )

        self.assertEqual(
            nested,
            {
                "breakfast": {
                    "Edupage school": {
                        "menuCounts": {"A": 7},
                        "diets": {},
                    }
                },
                "lunch": {"Edupage school": {"menuCounts": {"A": 11}, "diets": {}}},
            },
        )

    def test_parse_empty_prehlad_for_date(self):
        prehlad = {"prehlad": {}, "mamUnknown": False, "unknownTypyIDS": []}
        html = _make_html(prehlad, {}, [], target_date=self.DATE_STR)
        result = self._scrape_html(html)

        self.assertEqual(result.order_data, {})

    def test_parse_empty_prehlad_list_is_not_error(self):
        prehlad = {"prehlad": [], "mamUnknown": False, "unknownTypyIDS": []}
        html = _make_html(prehlad, {}, [], target_date=self.DATE_STR)
        result = self._scrape_html(html)

        self.assertEqual(result.order_data, {})
        self.assertEqual(result.warnings, [])

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
        html = _make_html(
            prehlad,
            nazov_menu,
            nastavenia,
            self._typy([(1, "MŠ NoMilk", 0)]),
            self.DATE_STR,
        )
        result = self._scrape_html(html)

        # Zero-count entries should not appear in order_data
        self.assertEqual(result.order_data, {})

    def test_unknown_menu_letter_is_rejected_from_clean_output(self):
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
        html = _make_html(
            prehlad,
            {},
            [],
            self._typy([(1, "MŠ Klasik", 0)]),
            self.DATE_STR,
        )
        result = self._scrape_html(html)

        self.assertEqual(result.order_data, {})
        self.assertIn("Z:Z", result.unmapped_letters)


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
