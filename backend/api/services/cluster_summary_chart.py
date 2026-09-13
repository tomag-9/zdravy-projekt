"""Range aggregation for the admin order-summary chart."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

_PLAN_MEALS = {
    "breakfast": {"breakfast_snack"},
    "lunch": {"soup", "main_course"},
    "olovrant": {"afternoon_snack"},
}


def aggregate_day(data, meals, clusters, menus, scope, metric):
    """Sum raw rows by their *lunch* cluster for one date."""
    allowed = set().union(*(_PLAN_MEALS[meal] for meal in meals))
    totals: defaultdict[str, Decimal] = defaultdict(Decimal)
    for row in data.get("rows") or []:
        lunch = (row.get("delivery_by_meal") or {}).get("lunch") or {}
        if lunch.get("delivery_route_id") is None:
            continue
        cluster = str(lunch.get("vydaj") or "A")
        if clusters and cluster not in clusters:
            continue
        for sub_row in row.get("sub_rows") or []:
            if sub_row.get("meal") not in allowed:
                continue
            if (
                menus
                and sub_row.get("meal") == "main_course"
                and str(sub_row.get("variant") or "A") not in menus
            ):
                continue
            is_diet = sub_row.get("type") == "diet" or bool(sub_row.get("diet_name"))
            if scope == "diets" and not is_diet:
                continue
            if scope == "standard" and is_diet:
                continue
            value = (
                sub_row.get("_ms_recalc") if metric == "ms" else sub_row.get("count")
            )
            totals[cluster] += Decimal(str(value or 0))
    return dict(totals)
