"""
Gramage dashboard service — computes gramage per client from DailyOrder data
and JedalnicekEntry weights.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from ..utils import user_operation_name


def gramage_dashboard(date_str: str) -> dict:
    """
    Aggregate orders × jedalnicek entry weights × portion type coefficients.
    Rows are grouped by client; each client contains standard menu rows and
    optional diet sub-rows.
    Returns structured data for the gramage dashboard table.
    """
    from ..models import DailyOrder, JedalnicekEntry, PortionType  # noqa: PLC0415

    MEAL_ORDER = ["breakfast", "lunch", "snack"]
    VARIANT_ORDER = ["A", "B", "C", "V"]
    ORDER_MEAL_TO_CAT = {
        "breakfast": "breakfast",
        "lunch": "lunch",
        "snack": "snack",
        "olovrant": "snack",
    }
    MEAL_LABELS = {
        "breakfast": "Raňajky",
        "lunch": "Obed",
        "snack": "Olovrant",
    }

    def _normalize_variant(value: object) -> str:
        v = str(value or "").strip()
        if v.lower().startswith("menu "):
            v = v[5:].strip()
        return v

    def _safe_nonneg_int(value: Any) -> int:
        try:
            result = int(value)
        except (TypeError, ValueError):
            return 0
        return result if result >= 0 else 0

    # ── Build col_groups from standard JedalnicekEntry (diet=NULL) ────────────
    standard_entries = list(
        JedalnicekEntry.objects.filter(date=date_str, diet__isnull=True)
        .order_by("category", "menu_variant", "id")
        .values("id", "category", "menu_variant", "name", "weight_grams")
    )

    # Group by (category, menu_variant)
    seen_groups: list[tuple[str, str]] = []
    groups_map: dict[tuple[str, str], list[dict]] = {}
    for e in standard_entries:
        key = (e["category"], e["menu_variant"] or "")
        if key not in groups_map:
            groups_map[key] = []
            seen_groups.append(key)
        groups_map[key].append(e)

    col_groups: list[dict] = []
    for cat, mv in seen_groups:
        entries_in_group = groups_map[(cat, mv)]
        components = [
            {"label": e["name"], "base_grams": str(e["weight_grams"])}
            for e in entries_in_group
            if e["weight_grams"] is not None
        ]
        if not components:
            continue

        if cat == "breakfast":
            col_key, label = "breakfast", MEAL_LABELS["breakfast"]
        elif cat == "lunch":
            col_key = f"lunch_{mv}" if mv else "lunch_A"
            label = f"Obed Menu {mv}" if mv else "Obed"
        else:
            col_key, label = "snack", MEAL_LABELS["snack"]

        col_groups.append(
            {
                "key": col_key,
                "label": label,
                "meal": cat,
                "variant": mv,
                "template_name": " + ".join(e["name"] for e in entries_in_group),
                "components": components,
            }
        )

    # Sort col_groups by meal order, then variant order
    def _cg_sort_key(cg: dict) -> tuple:
        mi = MEAL_ORDER.index(cg["meal"]) if cg["meal"] in MEAL_ORDER else 99
        vi = (
            VARIANT_ORDER.index(cg["variant"]) if cg["variant"] in VARIANT_ORDER else 99
        )
        return (mi, vi)

    col_groups.sort(key=_cg_sort_key)

    # ── Portion types ─────────────────────────────────────────────────────────
    pt_by_name = {
        pt.name: pt.coefficient for pt in PortionType.objects.filter(is_active=True)
    }

    # ── Gramage helpers ───────────────────────────────────────────────────────
    def _empty_group_totals() -> list[list[Decimal]]:
        return [[Decimal("0")] * len(cg["components"]) for cg in col_groups]

    def _merge_group_totals(target: list[list[Decimal]], source: list) -> None:
        for gi, cg in enumerate(col_groups):
            group_vals = source[gi] if gi < len(source) else []
            for ci in range(len(cg["components"])):
                if ci >= len(group_vals):
                    continue
                v = group_vals[ci]
                if v in (None, ""):
                    continue
                target[gi][ci] += Decimal(str(v))

    def _serialize_group_totals(
        values: list[list[Decimal]],
    ) -> list[list[str]]:
        return [[str(v.quantize(Decimal("0.01"))) for v in group] for group in values]

    def _col_grams(meal: str, variant: str, coeff: Decimal, count: int) -> list:
        result = []
        norm_variant = _normalize_variant(variant)
        for cg in col_groups:
            if cg["meal"] == meal and _normalize_variant(cg["variant"]) == norm_variant:
                result.append(
                    [
                        str(
                            (Decimal(c["base_grams"]) * coeff * count).quantize(
                                Decimal("0.01")
                            )
                        )
                        for c in cg["components"]
                    ]
                )
            else:
                result.append([])
        return result

    def _col_grams_diet(meal: str, coeff: Decimal, count: int) -> list:
        meal_groups = [cg for cg in col_groups if cg["meal"] == meal]
        if not meal_groups:
            return [[] for _ in col_groups]
        if meal == "lunch":
            for cg in meal_groups:
                if _normalize_variant(cg["variant"]) == "A":
                    return _col_grams(meal, cg["variant"], coeff, count)
        if len(meal_groups) == 1:
            return _col_grams(meal, meal_groups[0]["variant"], coeff, count)
        return [[] for _ in col_groups]

    totals = _empty_group_totals()
    rows = []
    orders = (
        DailyOrder.objects.filter(date=date_str)
        .select_related("user", "user__profile", "user__settings")
        .order_by("user__email")
    )

    for order in orders:
        client_label = user_operation_name(order.user)
        sub_rows: list[dict] = []
        client_total_count = 0
        client_standard_totals = _empty_group_totals()
        diet_summary_totals: dict[str, list[list[Decimal]]] = {}
        diet_summary_counts: dict[str, int] = {}
        order_data = order.data if isinstance(order.data, dict) else {}

        for order_meal, meal_data in order_data.items():
            meal = ORDER_MEAL_TO_CAT.get(order_meal)
            if meal not in MEAL_ORDER or not isinstance(meal_data, dict):
                continue

            for portion_name, portion_data in meal_data.items():
                if not isinstance(portion_data, dict):
                    continue

                coeff = pt_by_name.get(portion_name, Decimal("1.0000"))
                raw_menu_counts = portion_data.get("menuCounts", {})
                menu_counts = (
                    raw_menu_counts if isinstance(raw_menu_counts, dict) else {}
                )
                raw_diets = portion_data.get("diets", {})
                diets = raw_diets if isinstance(raw_diets, dict) else {}

                total_diet_count = sum(
                    _safe_nonneg_int(raw_count) for raw_count in diets.values()
                )

                if meal == "lunch":
                    variant_counts = sorted(
                        (
                            (_normalize_variant(v), _safe_nonneg_int(cnt))
                            for v, cnt in menu_counts.items()
                        ),
                        key=lambda kv: (
                            VARIANT_ORDER.index(kv[0]) if kv[0] in VARIANT_ORDER else 99
                        ),
                    )
                else:
                    total = (
                        sum(_safe_nonneg_int(c) for c in menu_counts.values())
                        - total_diet_count
                    )
                    variant_counts = [("", total)]

                adjusted_variant_counts = []
                for variant, count in variant_counts:
                    adjusted_count = count
                    if meal == "lunch" and variant == "A":
                        adjusted_count -= total_diet_count
                    adjusted_variant_counts.append((variant, max(adjusted_count, 0)))

                for variant, count in adjusted_variant_counts:
                    if count <= 0:
                        continue
                    grams = _col_grams(meal, variant, coeff, count)
                    _merge_group_totals(totals, grams)
                    _merge_group_totals(client_standard_totals, grams)

                    if meal == "lunch":
                        label = f"{portion_name} - {MEAL_LABELS[meal]} Menu {variant}"
                    else:
                        label = f"{portion_name} - {MEAL_LABELS[meal]}"

                    sub_rows.append(
                        {
                            "type": "standard",
                            "meal": meal,
                            "variant": variant,
                            "portion_name": portion_name,
                            "label": label,
                            "count": count,
                            "col_grams": grams,
                        }
                    )
                    client_total_count += count

                for diet_name, diet_count_raw in sorted(diets.items()):
                    diet_count = _safe_nonneg_int(diet_count_raw)
                    if diet_count <= 0:
                        continue
                    diet_grams = _col_grams_diet(meal, coeff, diet_count)
                    sub_rows.append(
                        {
                            "type": "diet",
                            "meal": meal,
                            "portion_name": portion_name,
                            "diet_name": diet_name,
                            "label": f"{portion_name} - {diet_name}",
                            "count": diet_count,
                            "col_grams": diet_grams,
                        }
                    )
                    if diet_name not in diet_summary_totals:
                        diet_summary_totals[diet_name] = _empty_group_totals()
                        diet_summary_counts[diet_name] = 0
                    _merge_group_totals(diet_summary_totals[diet_name], diet_grams)
                    diet_summary_counts[diet_name] += diet_count

        if sub_rows:
            settings = getattr(order.user, "settings", None)
            admin_order_note = str(
                getattr(settings, "admin_order_note", "") or ""
            ).strip()
            diet_summary_rows = [
                {
                    "name": name,
                    "count": diet_summary_counts[name],
                    "col_grams": _serialize_group_totals(diet_summary_totals[name]),
                }
                for name in sorted(diet_summary_counts)
            ]
            rows.append(
                {
                    "client": client_label,
                    "client_id": order.user_id,
                    "total_count": client_total_count
                    + sum(diet_summary_counts.values()),
                    "standard_total_count": client_total_count,
                    "standard_col_grams": _serialize_group_totals(
                        client_standard_totals
                    ),
                    "diet_summary_rows": diet_summary_rows,
                    "admin_order_note": admin_order_note,
                    "sub_rows": sub_rows,
                }
            )

    rows.sort(key=lambda r: str(r["client"]).lower())
    totals_serialized = _serialize_group_totals(totals)

    # ── Count summary ─────────────────────────────────────────────────────────
    _std_agg: dict = {}
    _diet_agg: dict = {}
    for _r in rows:
        for _sr in _r["sub_rows"]:
            _pname = _sr.get("portion_name", "")
            if not _pname:
                continue
            if _sr["type"] == "standard":
                _mv = (_sr["meal"], _sr.get("variant", ""))
                if _mv not in _std_agg:
                    _std_agg[_mv] = {}
                _std_agg[_mv][_pname] = _std_agg[_mv].get(_pname, 0) + _sr["count"]
            else:
                _dname = _sr.get("diet_name", "")
                if not _dname:
                    continue
                _m = _sr["meal"]
                if _m not in _diet_agg:
                    _diet_agg[_m] = {}
                _k = (_pname, _dname)
                _diet_agg[_m][_k] = _diet_agg[_m].get(_k, 0) + _sr["count"]

    count_summary: list[dict] = []
    _added_meals: set = set()
    _added_mvs: set = set()
    for _cg in col_groups:
        _mv = (_cg["meal"], _cg["variant"])
        if _mv in _added_mvs:
            continue
        _added_mvs.add(_mv)
        _std_entries = sorted(_std_agg.get(_mv, {}).items(), key=lambda x: -x[1])
        _diets_entries: list = []
        if _cg["meal"] not in _added_meals:
            _added_meals.add(_cg["meal"])
            _diets_entries = sorted(
                _diet_agg.get(_cg["meal"], {}).items(), key=lambda x: -x[1]
            )
        count_summary.append(
            {
                "meal": _cg["meal"],
                "variant": _cg["variant"],
                "label": _cg["label"],
                "standard": [{"name": n, "count": c} for n, c in _std_entries],
                "diets": [
                    {"label": f"{pn} - {dn}", "count": c}
                    for (pn, dn), c in _diets_entries
                ],
            }
        )

    return {
        "date": date_str,
        "col_groups": col_groups,
        "rows": rows,
        "totals": totals_serialized,
        "count_summary": count_summary,
    }
