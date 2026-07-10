"""Testy OrderData — jediné čítacie hrdlo pre DailyOrder.data.

Musí zvládnuť tri tvary naraz: flat (legacy), v1 (porcia) a v2 (prevádzka → porcia).
"""

import unittest

from api.order_data import OrderData, safe_count

LEAF = {"menuCounts": {"A": 3}, "diets": {"NO MILK": 1}}
LEAF2 = {"menuCounts": {"A": 5}, "diets": {}}


class TestSafeCount(unittest.TestCase):
    def test_int(self):
        self.assertEqual(safe_count(4), 4)

    def test_none_is_zero(self):
        self.assertEqual(safe_count(None), 0)

    def test_numeric_string(self):
        self.assertEqual(safe_count("7"), 7)

    def test_float_string(self):
        self.assertEqual(safe_count("2.9"), 2)

    def test_garbage_is_zero(self):
        self.assertEqual(safe_count("abc"), 0)


class TestFlatShape(unittest.TestCase):
    """{meal: {menuCounts, diets}} — historické záznamy."""

    def setUp(self):
        self.cats = list(OrderData({"lunch": LEAF}).iter_categories())

    def test_single_category(self):
        self.assertEqual(len(self.cats), 1)

    def test_name_falls_back_to_meal(self):
        self.assertEqual(self.cats[0].name, "lunch")

    def test_no_prevadzka(self):
        self.assertIsNone(self.cats[0].prevadzka)

    def test_menu_total(self):
        self.assertEqual(self.cats[0].menu_total, 3)


class TestV1Shape(unittest.TestCase):
    """{meal: {porcia: {...}}} — dnešný tvar."""

    def setUp(self):
        data = {"lunch": {"Škôlka": LEAF, "Dospelý (SŠ)": LEAF2}}
        self.cats = list(OrderData(data).iter_categories())

    def test_two_categories(self):
        self.assertEqual(len(self.cats), 2)

    def test_name_is_portion(self):
        self.assertEqual({c.name for c in self.cats}, {"Škôlka", "Dospelý (SŠ)"})

    def test_prevadzka_is_none(self):
        self.assertTrue(all(c.prevadzka is None for c in self.cats))


class TestV2Shape(unittest.TestCase):
    """{meal: {prevádzka: {porcia: {...}}}} — nový tvar."""

    def setUp(self):
        data = {
            "lunch": {
                "Jolly 1": {"ZŠ 1.stupeň": LEAF},
                "Jolly 2": {"ZŠ 1.stupeň": LEAF2, "Dospelý (SŠ)": LEAF},
            }
        }
        self.cats = list(OrderData(data).iter_categories())

    def test_flattens_to_one_category_per_portion(self):
        self.assertEqual(len(self.cats), 3)

    def test_name_stays_portion_so_gramage_still_matches(self):
        """Kritické: gramáž mapuje `name` na PortionType — nesmie to byť prevádzka."""
        self.assertEqual(
            sorted({c.name for c in self.cats}), ["Dospelý (SŠ)", "ZŠ 1.stupeň"]
        )

    def test_prevadzka_is_carried(self):
        self.assertEqual({c.prevadzka for c in self.cats}, {"Jolly 1", "Jolly 2"})

    def test_counts_not_merged_across_prevadzky(self):
        j1 = [c for c in self.cats if c.prevadzka == "Jolly 1"]
        j2 = [c for c in self.cats if c.prevadzka == "Jolly 2"]
        self.assertEqual(sum(c.menu_total for c in j1), 3)
        self.assertEqual(sum(c.menu_total for c in j2), 8)

    def test_meal_filter(self):
        self.assertEqual(len(list(OrderData({}).iter_categories("lunch"))), 0)


class TestMixedAndMalformed(unittest.TestCase):
    def test_v1_and_v2_can_coexist_across_meals(self):
        data = {
            "lunch": {"Rozmanitá": {"Škôlka": LEAF}},  # v2
            "breakfast": {"Škôlka": LEAF2},  # v1
        }
        cats = list(OrderData(data).iter_categories())
        lunch = next(c for c in cats if c.meal == "lunch")
        breakfast = next(c for c in cats if c.meal == "breakfast")
        self.assertEqual(lunch.prevadzka, "Rozmanitá")
        self.assertIsNone(breakfast.prevadzka)

    def test_non_mapping_data_is_ignored(self):
        self.assertEqual(list(OrderData(None).iter_categories()), [])
        self.assertEqual(list(OrderData({"lunch": "nonsense"}).iter_categories()), [])

    def test_non_leaf_garbage_under_prevadzka_is_skipped(self):
        data = {"lunch": {"Jolly 1": {"ZŠ 1.stupeň": LEAF, "junk": "nonsense"}}}
        cats = list(OrderData(data).iter_categories())
        self.assertEqual(len(cats), 1)
        self.assertEqual(cats[0].name, "ZŠ 1.stupeň")

    def test_empty_dict_under_meal_yields_nothing(self):
        self.assertEqual(list(OrderData({"lunch": {}}).iter_categories()), [])


class TestHasContent(unittest.TestCase):
    def test_v2_with_counts_has_content(self):
        data = {"lunch": {"Jolly 1": {"Škôlka": LEAF}}}
        self.assertTrue(OrderData(data).has_content())

    def test_v2_all_zero_is_empty(self):
        data = {"lunch": {"Jolly 1": {"Škôlka": {"menuCounts": {"A": 0}}}}}
        self.assertTrue(OrderData(data).is_empty())
