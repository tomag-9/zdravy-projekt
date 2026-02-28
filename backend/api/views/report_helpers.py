"""Shared helpers for report export modules."""


def safe_int(v) -> int:
    """Coerce a stored count value to int, returning 0 on any error."""
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


def build_user_meal_row(order_data: dict, meal_key: str) -> dict:
    """Return {categories: [...], total: int} for a meal."""
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
    """Accumulate meal_row counts into totals dict (in-place)."""
    totals["total"] = totals.get("total", 0) + meal_row["total"]
    for cat in meal_row["categories"]:
        for menu, cnt in cat["menus"].items():
            totals.setdefault("menus", {})[menu] = totals["menus"].get(menu, 0) + cnt
        for diet, cnt in cat["diets"].items():
            totals.setdefault("diets", {})[diet] = totals["diets"].get(diet, 0) + cnt
