"""Report Service - Extract data preparation logic from views."""

import datetime
from typing import Dict, List, Optional

from ..models import DailyOrder


def safe_int(v) -> int:
    """Coerce a stored count value to int, returning 0 on any error."""
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


def build_user_meal_row(order_data: dict, meal_key: str) -> dict:
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

    categories = []
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


def merge_meal_totals(totals: dict, meal_row: dict) -> None:
    """
    Accumulate meal_row counts into totals dict (in-place).

    Args:
        totals: Totals accumulator dictionary
        meal_row: Meal row data from build_user_meal_row()
    """
    totals["total"] = totals.get("total", 0) + meal_row["total"]
    for cat in meal_row["categories"]:
        if cat["name"] not in totals:
            totals[cat["name"]] = {"menus": {}, "diets": {}, "total": 0}
        for menu_key, count in cat["menus"].items():
            totals[cat["name"]]["menus"][menu_key] = (
                totals[cat["name"]]["menus"].get(menu_key, 0) + count
            )
        for diet_name, count in cat["diets"].items():
            totals[cat["name"]]["diets"][diet_name] = (
                totals[cat["name"]]["diets"].get(diet_name, 0) + count
            )
        totals[cat["name"]]["total"] += cat["total"]


class ReportService:
    """Service for report data preparation and aggregation."""

    MEAL_KEYS = ["breakfast", "lunch", "olovrant"]
    MEAL_LABELS = {
        "breakfast": "Raňajky",
        "lunch": "Obed",
        "olovrant": "Olovrant",
    }

    @staticmethod
    def generate_daily_report(target_date: datetime.date) -> dict:
        """
        Generate structured daily report data for a given date.

        Args:
            target_date: Date to generate report for

        Returns:
            Dictionary with date, rows (per-user data), and totals
        """
        orders = (
            DailyOrder.objects.filter(date=target_date)
            .select_related("user", "user__settings")
            .order_by("user__email")
        )

        totals = {
            "breakfast": {"menus": {}, "diets": {}, "total": 0},
            "lunch": {"menus": {}, "diets": {}, "total": 0},
            "olovrant": {"menus": {}, "diets": {}, "total": 0},
            "grand": 0,
        }
        rows = []

        for order in orders:
            user = order.user
            data = order.data if isinstance(order.data, dict) else {}
            bf = build_user_meal_row(data, "breakfast")
            lu = build_user_meal_row(data, "lunch")
            ol = build_user_meal_row(data, "olovrant")
            row_total = bf["total"] + lu["total"] + ol["total"]

            _settings = getattr(user, "settings", None)
            visible_meals = getattr(_settings, "visible_meals", None) or [
                "breakfast",
                "lunch",
                "olovrant",
            ]

            rows.append(
                {
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.email,
                    "email": user.email,
                    "breakfast": bf,
                    "lunch": lu,
                    "olovrant": ol,
                    "visible_meals": visible_meals,
                    "total": row_total,
                }
            )
            merge_meal_totals(totals["breakfast"], bf)
            merge_meal_totals(totals["lunch"], lu)
            merge_meal_totals(totals["olovrant"], ol)
            totals["grand"] += row_total

        return {
            "date": target_date.isoformat(),
            "rows": rows,
            "totals": totals,
        }

    @staticmethod
    def get_orders_for_export(target_date: datetime.date) -> List[dict]:
        """
        Get order data and user info for export formats.

        Returns:
            List of dicts with user, data, visible_meals for each order
        """
        orders = (
            DailyOrder.objects.filter(date=target_date)
            .select_related("user", "user__settings")
            .order_by("user__email")
        )

        rows_data = []
        for order in orders:
            data = order.data if isinstance(order.data, dict) else {}
            rows_data.append(
                {
                    "user": order.user,
                    "data": data,
                    "visible_meals": (
                        getattr(
                            getattr(order.user, "settings", None), "visible_meals", None
                        )
                        or ReportService.MEAL_KEYS
                    ),
                }
            )
        return rows_data
