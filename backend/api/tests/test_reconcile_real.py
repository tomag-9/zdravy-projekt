"""Unit testy pre helpery `reconcile_real` (count parsing + alias resolution)."""

import json
import unittest
from decimal import Decimal
from pathlib import Path
from tempfile import NamedTemporaryFile

from api.management.commands.reconcile_real import (
    _combine_count_buckets,
    _count_or_none,
    _load_alias_map,
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


if __name__ == "__main__":
    unittest.main()
