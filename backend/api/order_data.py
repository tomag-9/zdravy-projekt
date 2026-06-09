"""Canonical helpers for reading DailyOrder.data."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterator, Mapping

MEAL_KEYS = ("breakfast", "lunch", "olovrant")


def safe_count(value: Any) -> int:
    """Coerce stored order counts to int, treating bad legacy values as zero."""
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return 0


@dataclass(frozen=True)
class MealCategory:
    meal: str
    name: str
    menu_counts: Mapping[str, Any]
    diets: Mapping[str, Any]

    @property
    def menu_total(self) -> int:
        return sum(safe_count(count) for count in self.menu_counts.values())


class OrderData:
    """Parser/value object for order data.

    Legacy flat meals are normalized on read so historical data and older tests
    remain safe while all callers use one traversal API.
    """

    def __init__(self, data: Mapping[str, Any] | None):
        self.data = data if isinstance(data, Mapping) else {}

    def iter_categories(self, meal: str | None = None) -> Iterator[MealCategory]:
        meals = (meal,) if meal is not None else MEAL_KEYS
        for meal_key in meals:
            meal_data = self.data.get(meal_key, {}) or {}
            if not isinstance(meal_data, Mapping):
                continue

            if "menuCounts" in meal_data or "diets" in meal_data:
                yield self._category_from_details(meal_key, meal_key, meal_data)
                continue

            for category_name, details in meal_data.items():
                if not isinstance(category_name, str) or not isinstance(
                    details, Mapping
                ):
                    continue
                yield self._category_from_details(meal_key, category_name, details)

    @staticmethod
    def _category_from_details(
        meal: str, category_name: str, details: Mapping[Any, Any]
    ) -> MealCategory:
        menu_counts = details.get("menuCounts") or {}
        diets = details.get("diets") or {}
        return MealCategory(
            meal=meal,
            name=category_name,
            menu_counts=menu_counts if isinstance(menu_counts, Mapping) else {},
            diets=diets if isinstance(diets, Mapping) else {},
        )

    def is_empty(self) -> bool:
        return not self.has_content()

    def has_content(self, include_diets: bool = False) -> bool:
        for category in self.iter_categories():
            if any(safe_count(count) > 0 for count in category.menu_counts.values()):
                return True
            if include_diets and any(
                safe_count(count) > 0 for count in category.diets.values()
            ):
                return True
        return False

    def totals(self) -> tuple[int, Dict[str, int]]:
        meal_counts: Dict[str, int] = {meal: 0 for meal in MEAL_KEYS}
        total = 0
        for category in self.iter_categories():
            category_total = category.menu_total
            meal_counts[category.meal] += category_total
            total += category_total
        return total, meal_counts

    def menu_totals(self) -> Dict[str, int]:
        totals: Dict[str, int] = {}
        for category in self.iter_categories():
            for menu, count in category.menu_counts.items():
                count_int = safe_count(count)
                if count_int > 0:
                    totals[menu] = totals.get(menu, 0) + count_int
        return totals

    def meal_row(self, meal: str) -> Dict[str, Any]:
        categories = []
        meal_total = 0
        for category in self.iter_categories(meal):
            menus = {
                key: safe_count(value) for key, value in category.menu_counts.items()
            }
            diets = {
                key: safe_count(value)
                for key, value in category.diets.items()
                if safe_count(value) > 0
            }
            category_total = sum(menus.values())
            meal_total += category_total
            categories.append(
                {
                    "name": category.name,
                    "menus": menus,
                    "diets": diets,
                    "total": category_total,
                }
            )
        return {"categories": categories, "total": meal_total}

    @staticmethod
    def normalise_meal(meal: Any) -> Dict[str, Any]:
        if not isinstance(meal, Mapping) or not meal:
            return {}
        if "menuCounts" in meal or "diets" in meal:
            return {"default": dict(meal)}
        return dict(meal)
