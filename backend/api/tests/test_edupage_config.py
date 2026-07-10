"""Testy per-prevádzka configu EduPage scrapingu (api.edupage)."""

import json
import unittest
from datetime import date

from api.edupage import (
    LetterRule,
    OlovrantMode,
    PrevadzkaConfig,
    apply_config,
    config_pre_url,
    subdomena_z_url,
)
from api.edupage.overrides.krasnanko import krasnanko_letter_hook
from api.edupage_scraper import EdupageScraper, ScrapeResult, match_prevadzka

TARGET = date(2026, 6, 17)


def _make_html(prehlad, nazov_menu, nastavenia, typy_platitelov=None):
    def _js(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

    js_call = (
        f"strava_numeri({{"
        f"odkedy:'{TARGET.isoformat()}',"
        f"dokedy:'{TARGET.isoformat()}',"
        f"prehlad:{_js(prehlad)},"
        f'prehladNG:{{"prehlad":{{}}}},'
        f"typy_platitelov:{_js(typy_platitelov or [])},"
        f"nazovMenu:{_js(nazov_menu)},"
        f"nastavenia:{_js(nastavenia)},"
        f"odhlasovania2:[]"
        f"}});"
    )
    return f"<script>{js_call}</script>"


def _result(order_data) -> ScrapeResult:
    return ScrapeResult(date=TARGET, order_data=order_data)


def _cfg(mode, **kw) -> PrevadzkaConfig:
    return PrevadzkaConfig(subdomena="test", ucty=("Test",), olovrant_mode=mode, **kw)


LUNCH_DATA = {"Škôlka": {"menuCounts": {"A": 10}, "diets": {"NO MILK": 2}}}


class TestSubdomenaZUrl(unittest.TestCase):
    def test_extracts_subdomain(self):
        url = "https://krasnanko.edupage.org/menu/mealsGuest?id=x"
        self.assertEqual(subdomena_z_url(url), "krasnanko")

    def test_non_edupage_host_returns_none(self):
        self.assertIsNone(subdomena_z_url("https://example.com/menu"))

    def test_bare_edupage_domain_returns_none(self):
        self.assertIsNone(subdomena_z_url("https://edupage.org/menu"))


class TestConfigPreUrl(unittest.TestCase):
    def test_known_school(self):
        cfg = config_pre_url("https://skolkapramienok.edupage.org/menu/mealsGuest?id=x")
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg.olovrant_mode, OlovrantMode.ODVODIT_Z_OBEDU)

    def test_unknown_school_returns_none_not_raises(self):
        """Nová škola bez riadku v tabuľke sa musí odscrapovať generickým spôsobom."""
        self.assertIsNone(config_pre_url("https://novaskolka.edupage.org/menu?id=x"))

    def test_krasnanko_has_letter_hook(self):
        cfg = config_pre_url("https://krasnanko.edupage.org/menu/mealsGuest?id=x")
        self.assertIsNotNone(cfg.letter_hook)

    def test_fantasticka_ms_and_zs_are_separate(self):
        ms = config_pre_url("https://fantastickaskolka.edupage.org/menu?id=x")
        zs = config_pre_url("https://szsfan.edupage.org/menu?id=x")
        self.assertNotEqual(ms.ucty, zs.ucty)


class TestApplyConfigOlovrant(unittest.TestCase):
    def test_odvodit_z_obedu_copies_lunch(self):
        res = _result({"lunch": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.ODVODIT_Z_OBEDU))
        self.assertEqual(res.order_data["olovrant"], LUNCH_DATA)

    def test_odvodit_z_obedu_deep_copies(self):
        """Mutácia olovrantu nesmie tichým aliasom zmeniť obed."""
        res = _result({"lunch": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.ODVODIT_Z_OBEDU))
        res.order_data["olovrant"]["Škôlka"]["menuCounts"]["A"] = 999
        self.assertEqual(res.order_data["lunch"]["Škôlka"]["menuCounts"]["A"], 10)

    def test_odvodit_z_obedu_empty_day_stays_empty(self):
        """Zatvorená škola = prázdny deň, nie chyba — nedopočítavame nič."""
        res = _result({})
        apply_config(res, _cfg(OlovrantMode.ODVODIT_Z_OBEDU))
        self.assertNotIn("olovrant", res.order_data)
        self.assertEqual(res.warnings, [])

    def test_odvodit_z_obedu_warns_if_edupage_suddenly_has_olovrant(self):
        res = _result({"lunch": LUNCH_DATA, "olovrant": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.ODVODIT_Z_OBEDU))
        self.assertTrue(any("over config" in n for n in res.config_notes))
        self.assertEqual(res.warnings, [])

    def test_mimo_appky_drops_and_warns(self):
        res = _result({"lunch": LUNCH_DATA, "olovrant": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.MIMO_APPKY))
        self.assertNotIn("olovrant", res.order_data)
        self.assertTrue(res.config_notes)
        self.assertEqual(res.warnings, [])

    def test_mimo_appky_silent_when_absent(self):
        res = _result({"lunch": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.MIMO_APPKY))
        self.assertEqual(res.config_notes, [])

    def test_edupage_warns_when_olovrant_missing_but_lunch_present(self):
        res = _result({"lunch": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.EDUPAGE))
        self.assertTrue(res.config_notes)
        self.assertEqual(res.warnings, [])

    def test_edupage_silent_when_olovrant_present(self):
        res = _result({"lunch": LUNCH_DATA, "olovrant": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.EDUPAGE))
        self.assertEqual(res.config_notes, [])

    def test_neznamy_does_not_guess(self):
        """Ivanka: kým nemáme dáta, radšej warning než tichý odhad."""
        res = _result({"lunch": LUNCH_DATA})
        apply_config(res, _cfg(OlovrantMode.NEZNAMY))
        self.assertNotIn("olovrant", res.order_data)
        self.assertTrue(res.config_notes)
        self.assertEqual(
            res.warnings, [], "config drift nesmie vyzerať ako zlyhanie scrapu"
        )


class TestKrasnankoLetterHook(unittest.TestCase):
    def _rule(self, skratka) -> LetterRule:
        return krasnanko_letter_hook("X", skratka, "")

    def test_klasik_is_child_portion(self):
        self.assertEqual(self._rule("K").portion, "Škôlka")
        self.assertEqual(self._rule("K").menu, "A")

    def test_kd_klasik_domov_is_child_portion(self):
        """`K-D` sa volá „Klasik domov", ale je to detská porcia."""
        self.assertEqual(self._rule("K-D").portion, "Škôlka")
        self.assertEqual(self._rule("K-D").menu, "A")

    def test_kz_employee_adult_is_adult_portion(self):
        self.assertEqual(self._rule("KZ").portion, "Dospelý (SŠ)")

    def test_nmz_employee_adult_keeps_diet(self):
        rule = self._rule("NMZ")
        self.assertEqual(rule.portion, "Dospelý (SŠ)")
        self.assertEqual(rule.diet, "NO MILK")

    def test_kzd_child_portion_with_attention_flag(self):
        rule = self._rule("KZD")
        self.assertEqual(rule.portion, "Škôlka")
        self.assertEqual(rule.flag, "!")

    def test_nmzd_child_portion_diet_and_flag(self):
        rule = self._rule("NMZD")
        self.assertEqual(rule.portion, "Škôlka")
        self.assertEqual(rule.diet, "NO MILK")
        self.assertEqual(rule.flag, "!")

    def test_dia(self):
        self.assertEqual(self._rule("DIA").diet, "DIA")

    def test_unknown_skratka_falls_through_to_engine(self):
        self.assertIsNone(self._rule("QQQ"))


class TestLetterHookInParse(unittest.TestCase):
    """Hook musí prebiť `porcia` kód payera — to je dôvod, prečo existuje."""

    NASTAVENIA = [
        {
            "nazov": "vydaj_normal",
            "hodnota": json.dumps({"2": {"vydaj_od": "11:00", "vydaj_do": "13:00"}}),
        }
    ]
    # Payer tvrdí porcia=0 (Škôlka), hoci skratka KZ znamená dospelého.
    TYPY = [{"hodnota": json.dumps({"18": {"nazov": "Klasik Z", "porcia": "0"}})}]
    NAZOV_MENU = {"E": {"skratka": "KZ", "nazov": "Klasik dospelý Z"}}
    PREHLAD = {
        "prehlad": {
            TARGET.isoformat(): {"2": {"E": {"typ_platitela": {"18": {"o": 4}}}}}
        }
    }

    def _parse(self, config):
        html = _make_html(self.PREHLAD, self.NAZOV_MENU, self.NASTAVENIA, self.TYPY)
        return EdupageScraper()._parse(html, TARGET, config=config)

    def test_without_hook_payer_porcia_wins(self):
        res = self._parse(config=None)
        self.assertIn("Škôlka", res.order_data["lunch"])

    def test_hook_portion_overrides_payer_porcia(self):
        cfg = _cfg(OlovrantMode.EDUPAGE, letter_hook=krasnanko_letter_hook)
        res = self._parse(config=cfg)
        lunch = res.order_data["lunch"]
        self.assertIn("Dospelý (SŠ)", lunch)
        self.assertNotIn("Škôlka", lunch)
        self.assertEqual(lunch["Dospelý (SŠ)"]["menuCounts"]["A"], 4)

    def test_flag_surfaces_in_attention(self):
        nazov_menu = {"G": {"skratka": "KZD", "nazov": "Klasik detská Z"}}
        prehlad = {
            "prehlad": {
                TARGET.isoformat(): {"2": {"G": {"typ_platitela": {"18": {"o": 3}}}}}
            }
        }
        html = _make_html(prehlad, nazov_menu, self.NASTAVENIA, self.TYPY)
        cfg = _cfg(OlovrantMode.EDUPAGE, letter_hook=krasnanko_letter_hook)
        res = EdupageScraper()._parse(html, TARGET, config=cfg)
        self.assertEqual(res.attention, ["G:KZD!"])
        self.assertEqual(res.order_data["lunch"]["Škôlka"]["menuCounts"]["A"], 3)


class TestMatchPrevadzka(unittest.TestCase):
    MATCHES = {"J1": "Jolly 1", "J2": "Jolly 2", "Palisády": "Palisády"}

    def test_matches_payer_label_prefix(self):
        self.assertEqual(
            match_prevadzka(self.MATCHES, "J1 1.st. klasik", "klasik A"), "Jolly 1"
        )

    def test_matches_menu_nazov(self):
        self.assertEqual(
            match_prevadzka(self.MATCHES, "Klasik - MŠ", "Palisády nM"), "Palisády"
        )

    def test_diacritics_and_spaces_ignored(self):
        self.assertEqual(match_prevadzka({"B - Les": "Les"}, "B-Les sd", ""), "Les")

    def test_no_match_returns_none(self):
        self.assertIsNone(match_prevadzka(self.MATCHES, "J9 klasik", "menu A"))

    def test_longer_prefix_wins(self):
        matches = {"J1": "Jolly 1", "J1 2.st": "Jolly 1 druhy stupen"}
        self.assertEqual(
            match_prevadzka(matches, "J1 2.st klasik", ""), "Jolly 1 druhy stupen"
        )


class TestParseSplit(unittest.TestCase):
    """Split podľa edupage_match: objem sa rozdelí, nič sa nestratí ticho."""

    NASTAVENIA = [
        {
            "nazov": "vydaj_normal",
            "hodnota": json.dumps({"2": {"vydaj_od": "11:00", "vydaj_do": "13:00"}}),
        }
    ]
    TYPY = [
        {
            "hodnota": json.dumps(
                {
                    "1": {"nazov": "J1 1.st. klasik", "porcia": "1"},
                    "2": {"nazov": "J2 1.st. klasik", "porcia": "1"},
                    "9": {"nazov": "J9 neznama", "porcia": "1"},
                }
            )
        }
    ]
    NAZOV_MENU = {"A": {"skratka": "A", "nazov": "klasik A"}}

    def _parse(self, payers, matches):
        prehlad = {
            "prehlad": {
                TARGET.isoformat(): {
                    "2": {"A": {"typ_platitela": {k: {"o": v} for k, v in payers}}}
                }
            }
        }
        html = _make_html(prehlad, self.NAZOV_MENU, self.NASTAVENIA, self.TYPY)
        return EdupageScraper()._parse(html, TARGET, prevadzka_matches=matches)

    def test_counts_split_between_prevadzky(self):
        res = self._parse([("1", 5), ("2", 3)], {"J1": "Jolly 1", "J2": "Jolly 2"})
        by = res.order_data_by_prevadzka
        self.assertEqual(by["Jolly 1"]["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 5)
        self.assertEqual(by["Jolly 2"]["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 3)

    def test_merged_order_data_is_the_sum(self):
        res = self._parse([("1", 5), ("2", 3)], {"J1": "Jolly 1", "J2": "Jolly 2"})
        self.assertEqual(res.order_data["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 8)

    def test_unmatched_row_is_reported_not_silently_dropped(self):
        res = self._parse([("1", 5), ("9", 4)], {"J1": "Jolly 1"})
        self.assertEqual(res.order_data["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 5)
        self.assertTrue(res.unmatched_prevadzka)
        self.assertTrue(res.warnings, "nezaradený riadok musí byť scrape failure")

    def test_no_matches_means_no_split(self):
        res = self._parse([("1", 5)], None)
        self.assertEqual(res.order_data_by_prevadzka, {})
        self.assertEqual(res.order_data["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 5)


class TestMatchPrevadzkaPrefixOnly(unittest.TestCase):
    """Regresia #4: match je prefix, nie substring."""

    def test_substring_in_middle_does_not_match(self):
        # "Les" sa vyskytuje v strede, nie ako prefix → nesmie matchnúť.
        self.assertIsNone(
            match_prevadzka({"Les": "Školička Les"}, "Bez Lesných plodov", "")
        )

    def test_prefix_matches(self):
        self.assertEqual(
            match_prevadzka({"Les": "Školička Les"}, "Les učiteľ", ""), "Školička Les"
        )
