"""Shared utility functions for report processing."""

import datetime
from typing import Any, Dict, List

from rest_framework.exceptions import ValidationError as DRFValidationError


def parse_date_param(date_str: str, param: str = "date") -> datetime.date:
    """Parse a YYYY-MM-DD query param string; raises DRF 400 ValidationError on failure."""
    try:
        return datetime.date.fromisoformat(date_str)
    except ValueError:
        raise DRFValidationError({param: "Invalid date format, use YYYY-MM-DD"})


def safe_int(v: Any) -> int:
    """Coerce a stored count value to int, returning 0 on any error."""
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


def build_user_meal_row(order_data: Dict[str, Any], meal_key: str) -> Dict[str, Any]:
    """
    Return {categories: [...], total: int} for a meal.

    Args:
        order_data: Order data dictionary from DailyOrder.data
        meal_key: Meal type (breakfast, lunch, olovrant)

    Returns:
        Dictionary with categories and total count
    """
    meal = order_data.get(meal_key) or {}
    if not isinstance(meal, dict):
        return {"categories": [], "total": 0}

    categories: List[Dict[str, Any]] = []
    meal_total = 0
    iter_categories = (
        [(meal_key, meal)]
        if "menuCounts" in meal
        else [(k, v) for k, v in meal.items() if isinstance(v, dict)]
    )
    for cat_name, details in iter_categories:
        if not isinstance(details, dict):
            continue
        menu_counts = {
            k: safe_int(v) for k, v in (details.get("menuCounts") or {}).items()
        }
        diets = {
            k: safe_int(v)
            for k, v in (details.get("diets") or {}).items()
            if safe_int(v) > 0
        }
        cat_total = sum(menu_counts.values())
        meal_total += cat_total
        categories.append(
            {
                "name": cat_name,
                "menus": menu_counts,
                "diets": diets,
                "total": cat_total,
            }
        )
    return {"categories": categories, "total": meal_total}


def merge_meal_totals(totals: Dict[str, Any], meal_row: Dict[str, Any]) -> None:
    """
    Accumulate meal_row counts into totals dict (in-place).

    Args:
        totals: Totals accumulator dictionary
        meal_row: Meal row data from build_user_meal_row()
    """
    totals["total"] = totals.get("total", 0) + meal_row["total"]
    if "menus" not in totals:
        totals["menus"] = {}
    if "diets" not in totals:
        totals["diets"] = {}

    for cat in meal_row["categories"]:
        for menu, cnt in cat["menus"].items():
            totals["menus"][menu] = totals["menus"].get(menu, 0) + cnt
        for diet, cnt in cat["diets"].items():
            totals["diets"][diet] = totals["diets"].get(diet, 0) + cnt
