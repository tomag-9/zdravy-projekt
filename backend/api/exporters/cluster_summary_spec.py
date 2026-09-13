"""Print-only cluster summaries, deliberately separate from the dashboard table.

The dashboard has independent routes per meal.  Packing summaries instead use
the lunch delivery cluster as their stable physical grouping, so breakfast and
afternoon snack stay next to the lunch delivery they belong to.
"""

from __future__ import annotations

from decimal import Decimal

from ..models import Vydaj
from .gramage_dashboard_export import meal_hue, portion_summary
from .gramage_table_spec import (
    _build_header,
    _cluster_ms_totals,
    _cluster_summary_rows,
    _merge_meal_items,
    _render_ms_rows,
    _totals_from_summary,
    _totals_row,
    format_count,
)

MEALS = ("breakfast", "lunch", "olovrant")
_PLAN_MEALS = {
    "breakfast": {"breakfast_snack"},
    "lunch": {"soup", "main_course"},
    "olovrant": {"afternoon_snack"},
}
_BRITISH_LABELS = {
    "breakfast": {"Raňajky", "Snack (balíček)"},
    "lunch": {"Obed"},
    "olovrant": {"Olovrant"},
}


def _filtered_row(
    row: dict, allowed: set[str], allowed_group_indexes: set[int]
) -> dict:
    """Copy one raw dashboard row while retaining only selected plan meals."""
    copied = dict(row)
    copied["sub_rows"] = [
        sub_row
        for sub_row in row.get("sub_rows") or []
        if sub_row.get("meal") in allowed
    ]
    # `_diet_name_rows` reads this denormalized summary, so filter it as well.
    diets = []
    for diet in row.get("diet_summary_rows") or []:
        meal_counts = {
            meal: count
            for meal, count in (diet.get("meal_counts") or {}).items()
            if meal in allowed
        }
        if not meal_counts:
            continue
        item = dict(diet)
        item["meal_counts"] = meal_counts
        item["count"] = sum(
            (Decimal(str(value or 0)) for value in meal_counts.values()), Decimal("0")
        )
        # Keep the original indexes: the shared table helpers receive tuples
        # of (original_index, group).  Blank unselected columns so a diet
        # summary cannot contribute gramage from a meal omitted by this print.
        item["col_grams"] = [
            grams if index in allowed_group_indexes else []
            for index, grams in enumerate(diet.get("col_grams") or [])
        ]
        diets.append(item)
    copied["diet_summary_rows"] = diets
    return copied


def _summary_only_items(items: list[dict], meals: list[str]) -> list[dict]:
    wanted = set().union(*(_BRITISH_LABELS[meal] for meal in meals))
    return [dict(item) for item in items if item.get("label") in wanted]


def build_cluster_summary_spec(data: dict, meals: list[str]) -> dict:
    """Return a table spec with one full summary per lunch delivery cluster.

    This intentionally consumes ``data['rows']`` rather than any of the
    per-meal display trees.  A row is therefore never moved to its breakfast or
    snack route: selected meals are always assigned by ``delivery_by_meal``'s
    lunch route.  No lunch route remains visible as "Nepriradené k obedu".
    """
    allowed = set().union(*(_PLAN_MEALS[meal] for meal in meals))
    all_groups = data.get("col_groups") or []
    keep = [
        index for index, group in enumerate(all_groups) if group.get("meal") in allowed
    ]
    allowed_group_indexes = set(keep)
    groups = [(index, all_groups[index]) for index in keep]
    hues = [meal_hue(group.get("meal"), group.get("variant")) for _, group in groups]
    total_columns = 1 + sum(len(group.get("components") or []) for _, group in groups)

    labels = dict(Vydaj.choices)
    for cluster in (data.get("vydaje_by_meal") or {}).get("lunch") or []:
        labels[str(cluster.get("key") or "")] = cluster.get("name") or ""

    grouped: dict[str, list[dict]] = {}
    unassigned: list[dict] = []
    for raw_row in data.get("rows") or []:
        row = _filtered_row(raw_row, allowed, allowed_group_indexes)
        if not row["sub_rows"]:
            continue
        lunch = (row.get("delivery_by_meal") or {}).get("lunch") or {}
        if lunch.get("delivery_route_id") is None:
            unassigned.append(row)
        else:
            grouped.setdefault(str(lunch.get("vydaj") or Vydaj.A), []).append(row)

    for rows in grouped.values():
        rows.sort(key=lambda row: str(row.get("client") or "").casefold())
    unassigned.sort(key=lambda row: str(row.get("client") or "").casefold())

    # Summary-only (British) clusters are duplicated in old per-meal payloads;
    # lunch is the canonical source and is deliberately read exactly once.
    british: dict[str, list[dict]] = {}
    for cluster in (data.get("vydaje_by_meal") or {}).get("lunch") or []:
        if not cluster.get("summary_only"):
            continue
        items = _summary_only_items(cluster.get("british_summary") or [], meals)
        if items:
            key = str(cluster.get("key") or Vydaj.A)
            british[key] = _merge_meal_items(british.get(key, []), items)

    rows: list[dict] = []
    all_regular_rows: list[dict] = []
    all_extra_items: list[dict] = []
    cluster_names: list[str] = []
    keys = [value for value, _ in Vydaj.choices]
    keys.extend(key for key in grouped if key not in keys)
    keys.extend(key for key in british if key not in keys)
    for key in keys:
        regular = grouped.get(key, [])
        extra = british.get(key, [])
        if not regular and not extra:
            continue
        name = labels.get(key) or key
        cluster_names.append(name)
        rows.extend(
            _cluster_summary_rows(
                [name],
                regular,
                data,
                groups,
                hues,
                total_columns,
                extra_items=extra or None,
            )
        )
        all_regular_rows.extend(regular)
        all_extra_items = _merge_meal_items(all_extra_items, extra)

    if unassigned:
        rows.append(
            {
                "kind": "block-band",
                "css": "band block-band page-break",
                "cells": [{"text": "Nepriradené k obedu", "colspan": total_columns}],
            }
        )
        rows.extend(
            _cluster_summary_rows(
                ["Nepriradené k obedu"], unassigned, data, groups, hues, total_columns
            )
        )
        all_regular_rows.extend(unassigned)
        cluster_names.append("Nepriradené k obedu")

    totals_summary = portion_summary(data, all_regular_rows)
    footer_totals = _totals_from_summary(totals_summary)
    footer_counts = [item.get("count") or 0 for item in totals_summary]
    footer = _cluster_summary_rows(
        cluster_names,
        all_regular_rows,
        data,
        groups,
        hues,
        total_columns,
        extra_items=all_extra_items or None,
    )
    footer.append(_totals_row(footer_totals, footer_counts, keep, groups, hues))
    # This marker must reflect the same full aggregation as the final summary:
    # normal gramage rows plus the summary-only (British) additions.  The
    # latter have no ``sub_rows``, so looking at ``all_extra_items`` alone
    # silently omitted every ordinary lunch cluster.
    total_items = _cluster_ms_totals(all_regular_rows, groups)
    total_items = _merge_meal_items(total_items, all_extra_items)
    total_lunch = next(
        (item.get("total") for item in total_items if item.get("label") == "Obed"),
        None,
    )
    # The shared summary renderer has already displayed the complete final
    # breakdown; retain the established footer marker even when no lunch exists.
    footer.append(
        {
            "kind": "total-ms-porcie",
            "css": "total-ms-porcie",
            "cells": [
                {
                    "label": "SUM TOTAL OBED MŠ",
                    "text": "—" if total_lunch is None else format_count(total_lunch),
                    "colspan": total_columns,
                }
            ],
        }
    )
    return {
        "date": data.get("date"),
        "meal_type": "lunch",
        "meals": meals,
        "total_columns": total_columns,
        "header": _build_header(groups, hues),
        "rows": rows,
        "footer": footer,
    }
