"""Report Service - Extract data preparation logic from views."""

import datetime
from typing import List

from ..models import DailyOrder
from ..order_data import MEAL_KEYS as ORDER_MEAL_KEYS
from ..order_data import OrderData, safe_count
from ..utils import build_user_meal_row, merge_meal_totals, order_row_label


class ReportService:
    """Service for report data preparation and aggregation."""

    MEAL_KEYS = list(ORDER_MEAL_KEYS)
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
            .select_related(
                "user", "user__profile", "user__settings", "prevadzka__celok"
            )
            .prefetch_related("prevadzka__celok__prevadzky")
            .order_by("user__email")
        )

        totals = {
            "breakfast": {"total": 0},
            "lunch": {"total": 0},
            "olovrant": {"total": 0},
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
                    "name": order_row_label(order),
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
            .select_related(
                "user", "user__profile", "user__settings", "prevadzka__celok"
            )
            .prefetch_related("prevadzka__celok__prevadzky")
            .order_by("user__email")
        )

        rows_data = []
        for order in orders:
            data = order.data if isinstance(order.data, dict) else {}
            rows_data.append(
                {
                    "user": order.user,
                    # Prevádzka, nie login: celok s viacerými prevádzkami musí byť
                    # v exporte rozpadnutý na samostatné riadky.
                    "name": order_row_label(order),
                    "data": data,
                    "visible_meals": (
                        getattr(
                            getattr(order.user, "settings", None), "visible_meals", None
                        )
                        or list(ReportService.MEAL_KEYS)
                    ),
                }
            )
        return rows_data

    # ------------------------------------------------------------------ #
    # Daily stats aggregation
    # ------------------------------------------------------------------ #

    @staticmethod
    def aggregate_daily_stats(target_date: datetime.date) -> dict:
        """
        Aggregate per-meal statistics for all orders on *target_date*.

        Returns a dict compatible with the /api/summary/daily-stats/ endpoint:
        {
            "total_orders": int,
            "status_breakdown": {"submitted": int},
            "meals": {
                "breakfast": {category: {"menus": {}, "diets": {}, "total": int}},
                "lunch": {...},
                "olovrant": {...},
            },
        }
        """
        orders = DailyOrder.objects.filter(date=target_date)

        stats: dict = {
            "total_orders": 0,
            "status_breakdown": {"submitted": 0},
            "meals": {"breakfast": {}, "lunch": {}, "olovrant": {}},
        }

        for order in orders:
            stats["total_orders"] += 1
            stats["status_breakdown"]["submitted"] += 1
            data = order.data if isinstance(order.data, dict) else {}
            ReportService._aggregate_meal(stats, data, "breakfast")
            ReportService._aggregate_meal(stats, data, "lunch")
            ReportService._aggregate_meal(stats, data, "olovrant")

        return stats

    @staticmethod
    def _aggregate_meal(stats: dict, data: dict, meal_key: str) -> None:
        """
        Merge meal counts from *data[meal_key]* into *stats*.

        Handles both nested-by-category and flat meal storage shapes.
        """
        for category in OrderData(data).iter_categories(meal_key):
            if category.name not in stats["meals"][meal_key]:
                stats["meals"][meal_key][category.name] = {
                    "menus": {},
                    "diets": {},
                    "total": 0,
                }

            cat_stats = stats["meals"][meal_key][category.name]

            for menu_type, count in category.menu_counts.items():
                count = safe_count(count)
                if count > 0:
                    cat_stats["menus"][menu_type] = (
                        cat_stats["menus"].get(menu_type, 0) + count
                    )
                    cat_stats["total"] += count

            for diet_name, count in category.diets.items():
                count = safe_count(count)
                if count > 0:
                    cat_stats["diets"][diet_name] = (
                        cat_stats["diets"].get(diet_name, 0) + count
                    )
