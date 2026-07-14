"""Unit testy pre helpery `reconcile_real` (count parsing + alias resolution)."""

import json
import unittest
from decimal import Decimal
from pathlib import Path
from tempfile import NamedTemporaryFile

from openpyxl import Workbook

from api.management.commands.reconcile_real import (
    _combine_count_buckets,
    _count_or_none,
    _expand_block_rows,
    _load_alias_map,
    _real_counts_by_facility,
    _real_gram_values_by_name,
    _real_header_columns,
    _rekey_by_alias,
)


class TestCountOrNone(unittest.TestCase):
    """Počty vo `vyúčtovaní` bývajú uložené aj ako TEXT ('1') — musíme ich zrátať."""

    def test_int(self):
        self.assertEqual(_count_or_none(12), Decimal("12"))

    def test_float(self):
        self.assertEqual(_count_or_none(14.5), Decimal("14.5"))

    def test_numeric_string(self):
        # regresia: '1' ako text sa predtým ticho zahodil → podpočítaná prevádzka
        self.assertEqual(_count_or_none("1"), Decimal("1"))

    def test_numeric_string_with_comma(self):
        self.assertEqual(_count_or_none("2,5"), Decimal("2.5"))

    def test_blank_is_none(self):
        self.assertIsNone(_count_or_none(None))
        self.assertIsNone(_count_or_none(""))
        self.assertIsNone(_count_or_none("   "))

    def test_section_header_text_is_none(self):
        self.assertIsNone(_count_or_none("OBED"))

    def test_bool_is_not_a_count(self):
        self.assertIsNone(_count_or_none(True))


class TestLoadAliasMap(unittest.TestCase):
    def _write(self, obj) -> str:
        f = NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump(obj, f)
        f.close()
        return f.name

    def test_none_path(self):
        self.assertEqual(_load_alias_map(None), {})

    def test_string_value_becomes_single_element_list(self):
        path = self._write({"MŠ Zdravé Bruško": "Deutsche schule"})
        self.assertEqual(
            _load_alias_map(path), {"ms zdrave brusko": ["deutsche schule"]}
        )
        Path(path).unlink()

    def test_list_value_preserved_and_normalized(self):
        path = self._write({"MŠ Rozmanitá": ["Rozmanita Škôlka", "Rozmanita Škola"]})
        self.assertEqual(
            _load_alias_map(path),
            {"ms rozmanita": ["rozmanita skolka", "rozmanita skola"]},
        )
        Path(path).unlink()

    def test_comment_key_skipped(self):
        path = self._write({"_comment": "x", "A": "b"})
        self.assertEqual(_load_alias_map(path), {"a": ["b"]})
        Path(path).unlink()

    def test_bad_value_raises(self):
        from django.core.management.base import CommandError

        path = self._write({"A": 5})
        with self.assertRaises(CommandError):
            _load_alias_map(path)
        Path(path).unlink()


class TestRekeyByAlias(unittest.TestCase):
    """Real strana sa re-keyuje na app-normalizovaný kľúč, multi-row sa sčíta."""

    def test_single_alias_rekeys(self):
        real = {"deutsche schule": {"lunch": Decimal("72")}}
        alias = {"ms zdrave brusko": ["deutsche schule"]}
        out = _rekey_by_alias(real, alias, _combine_count_buckets)
        self.assertEqual(out, {"ms zdrave brusko": {"lunch": Decimal("72")}})
        self.assertNotIn("deutsche schule", out)

    def test_list_alias_sums_rows(self):
        real = {
            "rozmanita skolka": {"lunch": Decimal("26"), "snack": Decimal("26")},
            "rozmanita skola": {"lunch": Decimal("4")},
        }
        alias = {"ms rozmanita": ["rozmanita skolka", "rozmanita skola"]}
        out = _rekey_by_alias(real, alias, _combine_count_buckets)
        self.assertEqual(
            out, {"ms rozmanita": {"lunch": Decimal("30"), "snack": Decimal("26")}}
        )
        self.assertNotIn("rozmanita skola", out)

    def test_non_aliased_untouched(self):
        real = {"felix": {"lunch": Decimal("11")}}
        out = _rekey_by_alias(real, {}, _combine_count_buckets)
        self.assertEqual(out, {"felix": {"lunch": Decimal("11")}})

    def test_missing_real_row_produces_no_key(self):
        # alias odkazuje na riadok, ktorý v ten deň neexistuje → žiadny prázdny bucket
        real = {"felix": {"lunch": Decimal("11")}}
        alias = {"ms rozmanita": ["rozmanita skolka"]}
        out = _rekey_by_alias(real, alias, _combine_count_buckets)
        self.assertNotIn("ms rozmanita", out)

    def test_combine_gram_row_lists(self):
        real = {"rozmanita skolka": [10], "rozmanita skola": [20, 21]}
        alias = {"ms rozmanita": ["rozmanita skolka", "rozmanita skola"]}
        out = _rekey_by_alias(
            real, alias, lambda pieces: [r for rows in pieces for r in rows]
        )
        self.assertEqual(out["ms rozmanita"], [10, 20, 21])


def _fake_harok1():
    """A miniature Hárok1: header dishes + two facilities, one split with an
    empty-gram sub-header, plus a diet whose count is stored as TEXT."""
    wb = Workbook()
    ws = wb.active
    # row 1: header dishes (col A = date, B+ = dish names; note blank spacer col D)
    ws.append(["2026-07-13", "Polievka", "Hlavná", None, "Vajce", "Pečivo", "Nátierka"])
    # Facility 1: Les (klasik + one diet whose count is TEXT '1')
    ws.append(["Školička les", 2400, 2220, 0, 6, 12, 300])  # row 2 header
    ws.append(["Adresa 1", None, None, None, None, None, None])  # row 3 address
    ws.append([12, None, None, None, None, None, None])  # row 4 count
    ws.append(["No milk", 200, 185, 0, 0.5, None, None])  # row 5 diet
    ws.append(["1", None, None, None, None, None, None])  # row 6 TEXT count
    # Facility 2: split — header with EMPTY grams, then a diet
    ws.append(["Rozmanita Škola", None, None, None, None, None, None])  # row 7 header
    ws.append(["Adresa 2", None, None, None, None, None, None])  # row 8 address
    ws.append(["dospelá", 400, 370, 0, 1, None, None])  # row 9 diet
    ws.append([1, None, None, None, None, None, None])  # row 10 count
    return ws


class TestHarok1BlockParsing(unittest.TestCase):
    def setUp(self):
        self.ws = _fake_harok1()

    def test_header_columns_by_name_skips_blank(self):
        cols = _real_header_columns(self.ws)
        self.assertEqual(cols["polievka"], 2)
        self.assertEqual(cols["vajce"], 5)  # blank spacer col 4 skipped
        self.assertEqual(cols["natierka"], 7)

    def test_block_includes_text_count_diet(self):
        # Les block must include the No-milk diet even though its count is TEXT '1'
        rows = _expand_block_rows(self.ws, [2])
        self.assertEqual(rows, [2, 5])

    def test_block_stops_at_next_facility(self):
        # must NOT bleed into Rozmanita Škola (row 7)
        rows = _expand_block_rows(self.ws, [2])
        self.assertNotIn(9, rows)

    def test_empty_gram_header_block_sums_diets(self):
        # Rozmanita Škola header has empty grams but its diet row must be summed
        rows = _expand_block_rows(self.ws, [7])
        self.assertEqual(rows, [7, 9])

    def test_gram_values_by_name_sum_block(self):
        cols = _real_header_columns(self.ws)
        names = ["Polievka", "Hlavná", "Vajce", "Nátierka", "Pečivo"]
        rows = _expand_block_rows(self.ws, [2])  # klasik + No milk
        vals = _real_gram_values_by_name(self.ws, rows, names, cols)
        # Polievka 2400+200, Hlavná 2220+185, Vajce 6+0.5, Nátierka 300+0, Pečivo 12+0
        self.assertEqual(
            vals,
            [
                Decimal("2600"),
                Decimal("2405"),
                Decimal("6.5"),
                Decimal("300"),
                Decimal("12"),
            ],
        )

    def test_gram_values_none_for_missing_dish(self):
        cols = _real_header_columns(self.ws)
        vals = _real_gram_values_by_name(self.ws, [2], ["Neexistuje"], cols)
        self.assertEqual(vals, [None])

    def test_duplicate_dish_name_not_double_counted(self):
        # dva app komponenty s rovnakým názvom jedla → real stĺpec sa číta len raz
        cols = _real_header_columns(self.ws)
        vals = _real_gram_values_by_name(self.ws, [2], ["Polievka", "Polievka"], cols)
        self.assertEqual(vals, [Decimal("2400"), None])


class TestRealCountsMealTypeReset(unittest.TestCase):
    """meal_type sa nesmie preniesť z predošlej prevádzky bez vlastnej sekcie."""

    def _sheet(self, rows):
        wb = Workbook()
        ws = wb.active
        ws.title = "vyúčtovanie"
        ws.append(["Zariadenie", "Druh", "Cena", "Počet", "Spolu"])  # header row 1
        for r in rows:
            ws.append(r)
        return _FakeWB(ws)

    def test_facility_without_section_does_not_inherit_prev_meal_type(self):
        # Fac A ends on OLOVRANT (snack); Fac B has NO section header before its
        # count row → that count must NOT be bucketed as snack.
        rows = [
            ["Fac A", "OBED", None, None, None],
            [None, "Klasik", 5, 10, 50],
            ["Fac A", "OLOVRANT", None, None, None],
            [None, "Klasik", 1, 8, 8],
            ["Fac B", None, None, 7, None],  # name only, stray count, no section
        ]
        wb = self._sheet(rows)
        result = _real_counts_by_facility(wb)
        self.assertEqual(
            result["fac a"], {"lunch": Decimal("10"), "snack": Decimal("8")}
        )
        # Fac B's stray count is dropped (no meal_type), not attributed to snack.
        self.assertNotIn("fac b", result)


class _FakeWB:
    """Minimal workbook shim exposing one sheet under the 'vyúčtovanie' name."""

    def __init__(self, sheet):
        self._sheet = sheet
        self.sheetnames = ["vyúčtovanie"]

    def __getitem__(self, name):
        return self._sheet


if __name__ == "__main__":
    unittest.main()
