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
from api.edupage.overrides.skolickams import skolickams_payer_hook
from api.edupage_scraper import (
    EdupageScraper,
    ScrapeResult,
    build_prevadzka_matches,
    match_prevadzka,
    prevadzky_without_match,
)

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

    def test_skolickams_has_payer_hook(self):
        cfg = config_pre_url("https://skolickams.edupage.org/menu/mealsGuest?id=x")
        self.assertIsNotNone(cfg.payer_hook)

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

    def test_kzd_is_plain_klasik_child_portion_no_flag(self):
        # KZD = Klasik detská porcia, berieme ju tak; žiadny attention flag (user 7/13).
        rule = self._rule("KZD")
        self.assertEqual(rule.portion, "Škôlka")
        self.assertEqual(rule.menu, "A")
        self.assertIsNone(rule.flag)

    def test_nmzd_child_portion_diet_no_flag(self):
        rule = self._rule("NMZD")
        self.assertEqual(rule.portion, "Škôlka")
        self.assertEqual(rule.diet, "NO MILK")
        self.assertIsNone(rule.flag)

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
        # `LetterRule.flag` je všeobecný mechanizmus; testujeme ho syntetickým hookom
        # (žiadne reálne Krásňanko pravidlo dnes flag nenesie).
        def flag_hook(letter, skratka, nazov):
            return LetterRule(portion="Škôlka", menu="A", flag="!")

        nazov_menu = {"G": {"skratka": "XY", "nazov": "Čokoľvek"}}
        prehlad = {
            "prehlad": {
                TARGET.isoformat(): {"2": {"G": {"typ_platitela": {"18": {"o": 3}}}}}
            }
        }
        html = _make_html(prehlad, nazov_menu, self.NASTAVENIA, self.TYPY)
        cfg = _cfg(OlovrantMode.EDUPAGE, letter_hook=flag_hook)
        res = EdupageScraper()._parse(html, TARGET, config=cfg)
        self.assertEqual(res.attention, ["G:XY!"])
        self.assertEqual(res.order_data["lunch"]["Škôlka"]["menuCounts"]["A"], 3)


class TestSkolickamsPayerHook(unittest.TestCase):
    """Prefix B/BM = dodávateľ (Bruško/BruškoMilk), nie výdajňa — strip + BM→NO MILK."""

    def test_b_prefix_stripped_no_diet(self):
        rule = skolickams_payer_hook("B - Les")
        self.assertEqual(rule.match_name, "Les")
        self.assertIsNone(rule.diet)

    def test_bm_prefix_is_no_milk(self):
        rule = skolickams_payer_hook("BM - Lúka sd")
        self.assertEqual(rule.match_name, "Lúka sd")
        self.assertEqual(rule.diet, "NO MILK")

    def test_en_dash_and_spacing_tolerated(self):
        rule = skolickams_payer_hook("B–Les")
        self.assertEqual(rule.match_name, "Les")

    def test_case_insensitive_supplier_token(self):
        rule = skolickams_payer_hook("bm - Les")
        self.assertEqual(rule.diet, "NO MILK")

    def test_host_is_routed_to_luka(self):
        rule = skolickams_payer_hook("Hosť")
        self.assertEqual(rule.match_name, "Lúka")
        self.assertIsNone(rule.diet)

    def test_host_matched_ascii_folded(self):
        # diakritika/veľkosť nesmie rozhodnúť: "HOSŤ" / "host" tiež → Lúka
        for variant in ("HOSŤ", "host", " Hosť "):
            self.assertEqual(skolickams_payer_hook(variant).match_name, "Lúka")

    def test_label_without_supplier_prefix_falls_through(self):
        self.assertIsNone(skolickams_payer_hook("učiteľ Lúka"))

    def test_bare_b_word_not_treated_as_prefix(self):
        # bez oddeľovača "-" to nie je dodávateľský prefix
        self.assertIsNone(skolickams_payer_hook("Bratislava"))


class TestPayerHookInParse(unittest.TestCase):
    """payer_hook strip prefixu umožní match na čistý `Les`/`Lúka` a odvodí NO MILK."""

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
                    "1": {"nazov": "B - Les", "porcia": "0"},
                    "2": {"nazov": "BM - Lúka sd", "porcia": "0"},
                }
            )
        }
    ]
    NAZOV_MENU = {"A": {"skratka": "A", "nazov": "klasik A"}}

    def _parse(self, matches, config):
        prehlad = {
            "prehlad": {
                TARGET.isoformat(): {
                    "2": {"A": {"typ_platitela": {"1": {"o": 6}, "2": {"o": 4}}}}
                }
            }
        }
        html = _make_html(prehlad, self.NAZOV_MENU, self.NASTAVENIA, self.TYPY)
        return EdupageScraper()._parse(
            html, TARGET, config=config, prevadzka_matches=matches
        )

    def test_supplier_prefix_stripped_lets_clean_match_win(self):
        cfg = _cfg(OlovrantMode.EDUPAGE, payer_hook=skolickams_payer_hook)
        res = self._parse({"Les": ["Les"], "Lúka": ["Lúka"]}, cfg)
        by = res.order_data_by_prevadzka
        self.assertEqual(by["Les"]["lunch"]["Škôlka"]["menuCounts"]["A"], 6)
        self.assertEqual(by["Lúka"]["lunch"]["Škôlka"]["menuCounts"]["A"], 4)

    def test_bm_becomes_no_milk_diet(self):
        cfg = _cfg(OlovrantMode.EDUPAGE, payer_hook=skolickams_payer_hook)
        res = self._parse({"Les": ["Les"], "Lúka": ["Lúka"]}, cfg)
        luka = res.order_data_by_prevadzka["Lúka"]["lunch"]["Škôlka"]
        self.assertEqual(luka["diets"]["NO MILK"], 4)
        les = res.order_data_by_prevadzka["Les"]["lunch"]["Škôlka"]
        self.assertNotIn("NO MILK", les["diets"])

    def test_without_hook_supplier_prefix_breaks_clean_match(self):
        # bez hooku `B - Les` prefixovo nesadne na čisté `Les` → unmatched
        res = self._parse({"Les": ["Les"], "Lúka": ["Lúka"]}, config=None)
        self.assertTrue(res.unmatched_prevadzka)


class TestMatchPrevadzka(unittest.TestCase):
    MATCHES = {"J1": ["Jolly 1"], "J2": ["Jolly 2"], "Palisády": ["Palisády"]}

    def test_matches_payer_label_prefix(self):
        self.assertEqual(
            match_prevadzka(self.MATCHES, "J1 1.st. klasik", "klasik A"), ["Jolly 1"]
        )

    def test_matches_menu_nazov(self):
        self.assertEqual(
            match_prevadzka(self.MATCHES, "Klasik - MŠ", "Palisády nM"), ["Palisády"]
        )

    def test_diacritics_and_spaces_ignored(self):
        self.assertEqual(match_prevadzka({"B - Les": ["Les"]}, "B-Les sd", ""), ["Les"])

    def test_no_match_returns_empty(self):
        self.assertEqual(match_prevadzka(self.MATCHES, "J9 klasik", "menu A"), [])

    def test_longer_prefix_wins(self):
        matches = {"J1": ["Jolly 1"], "J1 2.st": ["Jolly 1 druhy stupen"]}
        self.assertEqual(
            match_prevadzka(matches, "J1 2.st klasik", ""), ["Jolly 1 druhy stupen"]
        )

    def test_matches_menu_skratka(self):
        """Skratka nesie celok v prefixe (`dsbA` = Deutsche schule + Klasik).

        Pri Zdravom Brúsku je to jediný rozlišovač: payer label je pre všetky školy
        `MŠ ...` a názov menu je `Klasik`.
        """
        matches = {"dsb": ["Deutsche schule"], "sšv": ["SŠ VETERINÁRNA"]}
        self.assertEqual(
            match_prevadzka(matches, "MŠ Klasik", "Klasik", "dsbA"), ["Deutsche schule"]
        )
        self.assertEqual(
            match_prevadzka(matches, "MŠ Klasik", "Klasik", "sšvA"), ["SŠ VETERINÁRNA"]
        )

    def test_skratka_beats_conflicting_payer(self):
        """Payer label si so skratkou vie protirečiť — vyhrať musí skratka.

        `MŠ Mal. NoMilk` so skratkou `dsbNMNE` je porcia Deutsche schule; keby vyhral
        payer, fakturovala by sa Malokarpatskému.
        """
        matches = {"dsb": ["Deutsche schule"], "mšMal": ["MŠ Malokarpatké námestie 6"]}
        self.assertEqual(
            match_prevadzka(matches, "MŠ Mal. NoMilk", "NoMilk/NoEgg", "dsbNMNE"),
            ["Deutsche schule"],
        )

    def test_shared_skratka_hits_both_prevadzky(self):
        """`mšMal,Hey` je jedna skratka pre dve škôlky — počet padne naplno obom."""
        matches = {
            "mšMal": ["MŠ Malokarpatké námestie 6"],
            "mšHey": ["MŠ Heyrovského 4"],
            "mšMal,Hey": ["MŠ Heyrovského 4", "MŠ Malokarpatké námestie 6"],
        }
        self.assertEqual(
            match_prevadzka(matches, "MŠ Diéta", "Diéta Lamač", "mšMal,Hey"),
            ["MŠ Heyrovského 4", "MŠ Malokarpatké námestie 6"],
        )


class _FakePrevadzka:
    """Len to, čo `build_prevadzka_matches` potrebuje — bez DB."""

    def __init__(self, nazov, edupage_match):
        self.nazov = nazov
        self.edupage_match = edupage_match

    def edupage_prefixes(self):
        return [p.strip() for p in self.edupage_match.split(";") if p.strip()]


class TestBuildPrevadzkaMatches(unittest.TestCase):
    """Dobrodružstvo: škola nemá spoločný prefix → `edupage_match` s bodkočiarkami."""

    DOBRODRUZSTVO = [
        _FakePrevadzka("MŠ Dobrodružstvo", "MŠ"),
        _FakePrevadzka("ZŠ Dobrodružstvo", "1.st; 2.st; Dospelý"),
    ]

    def test_each_prefix_maps_to_its_prevadzka(self):
        self.assertEqual(
            build_prevadzka_matches(self.DOBRODRUZSTVO),
            {
                "MŠ": ["MŠ Dobrodružstvo"],
                "1.st": ["ZŠ Dobrodružstvo"],
                "2.st": ["ZŠ Dobrodružstvo"],
                "Dospelý": ["ZŠ Dobrodružstvo"],
            },
        )

    def test_live_payer_groups_all_land(self):
        """Všetkých 14 skupín z živého EduPage (17.7.2026) musí sadnúť.

        Nezaradený riadok = neúplný scrape → celý celok sa zahodí.
        """
        matches = build_prevadzka_matches(self.DOBRODRUZSTVO)
        skolka = ["MŠ klasik", "MŠ Vege", "MŠ His", "MŠ No paradaj."]
        skola = [
            "1.st.",
            "1.st. ŠD",
            "2.st.",
            "Dospelý",
            "2. st. ŠD",
            "2. st. bezlep",
            "1.st. ŠD vege",
            "1. st. ŠD bezlak",
            "2.st ŠD bezlak",
            "1.st His ŠD",
        ]
        for nazov in skolka:
            self.assertEqual(
                match_prevadzka(matches, nazov, ""), ["MŠ Dobrodružstvo"], nazov
            )
        for nazov in skola:
            self.assertEqual(
                match_prevadzka(matches, nazov, ""), ["ZŠ Dobrodružstvo"], nazov
            )

    def test_single_prefix_still_works(self):
        self.assertEqual(
            build_prevadzka_matches([_FakePrevadzka("Jolly 1", "J1")]),
            {"J1": ["Jolly 1"]},
        )

    def test_prevadzka_without_match_is_reported(self):
        prevadzky = [_FakePrevadzka("Lúka", "Lúka"), _FakePrevadzka("Hosť", "  ")]
        self.assertEqual(prevadzky_without_match(prevadzky), ["Hosť"])

    def test_all_matched_reports_nothing(self):
        self.assertEqual(prevadzky_without_match(self.DOBRODRUZSTVO), [])


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
        res = self._parse([("1", 5), ("2", 3)], {"J1": ["Jolly 1"], "J2": ["Jolly 2"]})
        by = res.order_data_by_prevadzka
        self.assertEqual(by["Jolly 1"]["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 5)
        self.assertEqual(by["Jolly 2"]["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 3)

    def test_merged_order_data_is_the_sum(self):
        res = self._parse([("1", 5), ("2", 3)], {"J1": ["Jolly 1"], "J2": ["Jolly 2"]})
        self.assertEqual(res.order_data["lunch"]["ZŠ 1.stupeň"]["menuCounts"]["A"], 8)

    def test_unmatched_row_is_reported_not_silently_dropped(self):
        res = self._parse([("1", 5), ("9", 4)], {"J1": ["Jolly 1"]})
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
        self.assertEqual(
            match_prevadzka({"Les": ["Školička Les"]}, "Bez Lesných plodov", ""), []
        )

    def test_prefix_matches(self):
        self.assertEqual(
            match_prevadzka({"Les": ["Školička Les"]}, "Les učiteľ", ""),
            ["Školička Les"],
        )
