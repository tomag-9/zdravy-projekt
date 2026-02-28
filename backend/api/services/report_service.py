"""Report Service - Extract data preparation logic from views."""

import datetime
from typing import List

from ..models import DailyOrder
from ..utils import build_user_meal_row, merge_meal_totals


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
                        or list(ReportService.MEAL_KEYS)
                    ),
                }
            )
        return rows_data
