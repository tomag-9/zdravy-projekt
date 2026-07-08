"""Meal Plan Service - Business logic for the Jedálniček module."""

from __future__ import annotations

import datetime
import unicodedata
from decimal import Decimal
from typing import Any, List

from django.db import transaction

from ..models import (
    DailyMealPlan,
    EnrolledCount,
    MealCategory,
    MealPlanItem,
    MealTemplate,
)
from ..utils import user_operation_name


def _normalize_portion_name(value: object) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "").casefold())
    ascii_value = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return " ".join(ascii_value.replace(".", " ").replace("-", " ").split())


class MealPlanService:
    """Service for meal plan creation and gramage calculations."""

    @staticmethod
    def create_or_replace_plan(
        date: datetime.date,
        items_data: list | None,
        enrolled_data: list | None,
        notes: str,
        user,
    ) -> DailyMealPlan:
        """
        Atomic upsert for a DailyMealPlan.
        Deletes and recreates MealPlanItem and EnrolledCount children so
        the frontend can always POST the full state.
        """
        with transaction.atomic():
            plan, _ = DailyMealPlan.objects.get_or_create(
                date=date,
                defaults={"notes": notes, "created_by": user},
            )
            plan.notes = notes
            plan.save(update_fields=["notes", "updated_at"])

            if items_data is not None:
                MealPlanItem.objects.filter(meal_plan=plan).delete()
                for item in items_data:
                    template = MealTemplate.objects.get(pk=item["template_id"])
                    MealPlanItem.objects.create(
                        meal_plan=plan,
                        template=template,
                        category=template.category,
                        menu_variant=item.get("menu_variant", template.menu_variant),
                        diet=template.diet,
                    )

            if enrolled_data is not None:
                EnrolledCount.objects.filter(meal_plan=plan).delete()
                for ec in enrolled_data:
                    EnrolledCount.objects.create(
                        meal_plan=plan,
                        portion_type_id=ec["portion_type_id"],
                        count=ec["count"],
                    )

        return plan

    @staticmethod
    def _unit_exception_breakdown(
        template: MealTemplate, enrolled_lookup: dict
    ) -> list:
        """
        For templates with a fixed piece-count exception (e.g. vajce, gulička),
        return one breakdown line per portion type using the exact count from
        the catalog instead of base_weight_grams × coefficient.
        """
        exc = template.unit_exception
        if not exc:
            return []
        counts_by_pt = exc.get("counts_by_portion_type", {})
        unit = exc.get("unit", "ks")
        label = exc.get("component_label", "")
        lines = []
        for pt_id, (count, pt) in enrolled_lookup.items():
            per_person = Decimal(str(counts_by_pt.get(pt.name, "0")))
            total_units = per_person * count
            lines.append(
                {
                    "portion_type_id": pt_id,
                    "portion_type": pt.name,
                    "component_label": label,
                    "unit": unit,
                    "count": count,
                    "per_person_units": str(per_person),
                    "total_units": str(total_units),
                }
            )
        return lines

    @staticmethod
    def calculate_gramage(plan: DailyMealPlan) -> dict:
        """
        Core calculation: final_weight = base_weight_grams * coefficient * count

        Templates with a `unit_exception` (fixed piece-count per portion type,
        e.g. vajce/gulička) get their gram total computed as usual, plus a
        separate `unit_breakdown` list of fixed-count lines (not multiplied by
        the coefficient).

        Returns structured dict:
        {
          "date": "2026-03-13",
          "sections": {
            "breakfast_snack": {
              "items": [
                {
                  "template_id": 1,
                  "template_name": "...",
                  "base_weight_grams": "260.00",
                  "weight_label": "...",
                  "breakdown": [
                    {"portion_type_id": 1, "portion_type": "Škôlka",
                     "coefficient": "0.5000", "count": 12, "total_grams": "1560.00"},
                    ...
                  ],
                  "unit_breakdown": [...],
                  "item_total_grams": "4950.00"
                }
              ],
              "section_total_grams": "4950.00"
            },
            "soup": { "items": [...], "section_total_grams": "..." },
            "main_course": { "items": [...], "section_total_grams": "..." },
            "afternoon_snack": { "items": [...], "section_total_grams": "..." },
          },
          "grand_total_grams": "12450.00",
          "enrolled_summary": [
            {"portion_type_id": 1, "portion_type": "Škôlka",
             "coefficient": "0.5000", "count": 12},
            ...
          ]
        }
        """
        # Pre-load enrolled counts as a lookup {portion_type_id: (count, portion_type)}
        enrolled_lookup: dict[int, tuple] = {}
        enrolled_summary = []
        for ec in (
            plan.enrolled_counts.select_related("portion_type")
            .order_by(
                "portion_type__sort_order", "portion_type__name", "portion_type_id"
            )
            .all()
        ):
            enrolled_lookup[ec.portion_type_id] = (ec.count, ec.portion_type)
            enrolled_summary.append(
                {
                    "portion_type_id": ec.portion_type_id,
                    "portion_type": ec.portion_type.name,
                    "coefficient": str(ec.portion_type.coefficient),
                    "count": ec.count,
                }
            )

        sections: dict = {
            category: {"items": [], "section_total_grams": Decimal("0")}
            for category in MealCategory.values
        }

        grand_total = Decimal("0")

        for item in plan.items.select_related("template").all():
            template = item.template
            base = template.base_weight_grams

            breakdown = []
            item_total = Decimal("0")
            for pt_id, (count, pt) in enrolled_lookup.items():
                total = base * pt.coefficient * count
                item_total += total
                breakdown.append(
                    {
                        "portion_type_id": pt_id,
                        "portion_type": pt.name,
                        "coefficient": str(pt.coefficient),
                        "count": count,
                        "total_grams": str(total.quantize(Decimal("0.01"))),
                    }
                )

            item_dict = {
                "template_id": template.id,
                "template_name": template.name,
                "menu_variant": item.menu_variant,
                "base_weight_grams": str(base),
                "weight_label": template.weight_label,
                "breakdown": breakdown,
                "unit_breakdown": MealPlanService._unit_exception_breakdown(
                    template, enrolled_lookup
                ),
                "item_total_grams": str(item_total.quantize(Decimal("0.01"))),
            }

            grand_total += item_total

            if item.category in sections:
                sections[item.category]["items"].append(item_dict)
                sections[item.category]["section_total_grams"] += item_total

        for section in sections.values():
            section["section_total_grams"] = str(
                section["section_total_grams"].quantize(Decimal("0.01"))
            )

        return {
            "plan_id": plan.id,
            "date": plan.date.isoformat(),
            "notes": plan.notes,
            "sections": sections,
            "grand_total_grams": str(grand_total.quantize(Decimal("0.01"))),
            "enrolled_summary": enrolled_summary,
        }

    @staticmethod
    def calculate_range_gramage(
        from_date: datetime.date, to_date: datetime.date
    ) -> List[dict]:
        """
        Calls calculate_gramage() for each plan in the date range.
        Returns list of daily dicts, suitable for multi-day XLSX export.
        """
        plans = DailyMealPlan.objects.filter(
            date__gte=from_date, date__lte=to_date
        ).prefetch_related("items__template", "enrolled_counts__portion_type")
        return [MealPlanService.calculate_gramage(p) for p in plans]

    @staticmethod
    def gramage_dashboard(date_str: str) -> dict:
        """
        Aggregate orders × meal plan templates × portion type coefficients.
        Rows are grouped by client; each client contains standard menu rows and
        optional diet sub-rows.
        Returns structured data for the gramage dashboard table.
        """
        import re as _re

        from ..models import DailyMealPlan, DailyOrder, PortionType

        MEAL_ORDER = ["breakfast_snack", "soup", "main_course", "afternoon_snack"]
        VARIANT_ORDER = ["A", "B", "C", "V"]
        # An order's "lunch" selection covers both the soup and the main course
        # (they're ordered together); other order meals map 1:1.
        ORDER_MEAL_TO_PLAN_MEALS = {
            "breakfast": ["breakfast_snack"],
            "lunch": ["soup", "main_course"],
            "snack": ["afternoon_snack"],
            "olovrant": ["afternoon_snack"],
        }
        # Single source of truth for category labels: MealCategory.choices.
        MEAL_LABELS = dict(MealCategory.choices)

        def _normalize_variant(value: object) -> str:
            variant = str(value or "").strip()
            if variant.lower().startswith("menu "):
                variant = variant[5:].strip()
            return variant

        def _safe_nonneg_int(value: Any) -> int:
            try:
                result = int(value)
            except (TypeError, ValueError):
                return 0
            return result if result >= 0 else 0

        # ── Meal plan & column definitions ──────────────────────────────────────
        try:
            plan = DailyMealPlan.objects.prefetch_related(
                "items__template", "items__diet"
            ).get(date=date_str)
            plan_id = plan.id
        except DailyMealPlan.DoesNotExist:
            plan = None
            plan_id = None

        def parse_components(
            name: str, components: list, weight_label: str, unit_exception: dict | None
        ) -> list:
            numeric_components = [
                {
                    "label": c.get("label", ""),
                    "base_grams": str(c["grams"]),
                    "unit": c.get("unit", "g"),
                }
                for c in components
                if c.get("grams") not in (None, "")
                and c.get("unit", "g") in ("g", "ml")
            ]
            if not numeric_components:
                # Fallback for templates without structured components (legacy data)
                ws = _re.findall(
                    r"(\d+(?:[.,]\d+)?)\s*g(?![a-z])", weight_label, _re.IGNORECASE
                )
                weights = [Decimal(w.replace(",", ".")) for w in ws]
                name_parts = [p.strip() for p in name.split(" + ")]
                labels = (
                    name_parts
                    if len(name_parts) == len(weights)
                    else [f"Zložka {i + 1}" for i in range(len(weights))]
                )
                numeric_components = [
                    {"label": lbl, "base_grams": str(w), "unit": "g"}
                    for lbl, w in zip(labels, weights)
                ]
            if unit_exception:
                numeric_components.append(
                    {
                        "label": unit_exception.get("component_label", ""),
                        "base_grams": None,
                        "unit": unit_exception.get("unit", "ks"),
                        "is_exception": True,
                        "counts_by_portion_type": unit_exception.get(
                            "counts_by_portion_type", {}
                        ),
                    }
                )
            return numeric_components

        col_groups: list[dict] = []
        if plan:
            items = sorted(
                plan.items.all(),
                key=lambda i: (
                    MEAL_ORDER.index(i.category) if i.category in MEAL_ORDER else 99,
                    (
                        VARIANT_ORDER.index(i.menu_variant)
                        if i.menu_variant in VARIANT_ORDER
                        else 99
                    ),
                    1 if i.diet_id else 0,
                    i.diet_id or 0,
                ),
            )
            for item in items:
                t = item.template
                if item.menu_variant:
                    key = f"{item.category}_{item.menu_variant}"
                    label = f"{MEAL_LABELS[item.category]} Menu {item.menu_variant}"
                else:
                    key, label = item.category, MEAL_LABELS.get(
                        item.category, item.category
                    )
                diet_name = item.diet.name if item.diet_id else None
                if diet_name:
                    key = f"{key}_diet_{item.diet_id}"
                    label = f"{label} - {diet_name}"
                col_groups.append(
                    {
                        "key": key,
                        "label": label,
                        "meal": item.category,
                        "variant": item.menu_variant,
                        "diet_id": item.diet_id,
                        "diet_name": diet_name,
                        "template_name": t.name,
                        "components": parse_components(
                            t.name, t.components, t.weight_label, t.unit_exception
                        ),
                    }
                )

        # A meal only splits order counts by menu variant (A/B/C) when its plan
        # selection actually has variant-specific columns (e.g. legacy data with
        # multiple main_course templates for the same day). The new catalog-based
        # admin editor always saves a single, variant-less selection per category,
        # so those meals pool all order variants into one column — same as soup,
        # breakfast_snack, and afternoon_snack always have.
        variant_meals = {cg["meal"] for cg in col_groups if cg["variant"]}

        # ── Portion types by name ────────────────────────────────────────────────
        active_portion_types = list(PortionType.objects.filter(is_active=True))
        pt_by_name = {pt.name: pt.coefficient for pt in active_portion_types}
        normalized_pt_lookup = {
            _normalize_portion_name(pt.name): pt.name for pt in active_portion_types
        }
        normalized_pt_names = sorted(
            normalized_pt_lookup.keys(), key=lambda name: len(name), reverse=True
        )

        def _canonical_portion_name(portion_name: str) -> str:
            normalized = _normalize_portion_name(portion_name)
            exact = normalized_pt_lookup.get(normalized)
            if exact:
                return exact
            for normalized_pt_name in normalized_pt_names:
                if normalized_pt_name and normalized_pt_name in normalized:
                    return normalized_pt_lookup[normalized_pt_name]
            if "ms" in normalized.split() or "materska" in normalized:
                return normalized_pt_lookup.get("skolka", portion_name)
            return portion_name

        # ── Gramage helpers ───────────────────────────────────────────────────────
        def _empty_group_totals() -> list[list[Decimal]]:
            return [[Decimal("0")] * len(cg["components"]) for cg in col_groups]

        def _merge_group_totals(target: list[list[Decimal]], source: list) -> None:
            for group_index, cg in enumerate(col_groups):
                group_values = source[group_index] if group_index < len(source) else []
                for component_index in range(len(cg["components"])):
                    if component_index >= len(group_values):
                        continue
                    value = group_values[component_index]
                    if value in (None, ""):
                        continue
                    target[group_index][component_index] += Decimal(str(value))

        def _serialize_group_totals(values: list[list[Decimal]]) -> list[list[str]]:
            return [
                [str(v.quantize(Decimal("0.01"))) for v in group] for group in values
            ]

        def _component_value(
            component: dict, coeff: Decimal, count: int, portion_name: str
        ) -> Decimal:
            if component.get("is_exception"):
                canonical_portion_name = _canonical_portion_name(portion_name)
                per_person = Decimal(
                    str(
                        component["counts_by_portion_type"].get(
                            canonical_portion_name, "0"
                        )
                    )
                )
                return (per_person * count).quantize(Decimal("0.01"))
            return (Decimal(component["base_grams"]) * coeff * count).quantize(
                Decimal("0.01")
            )

        def _col_grams(
            meal: str, variant: str, coeff: Decimal, count: int, portion_name: str
        ) -> list:
            result = []
            normalized_variant = _normalize_variant(variant)
            for cg in col_groups:
                if (
                    cg["meal"] == meal
                    and _normalize_variant(cg["variant"]) == normalized_variant
                    and not cg.get("diet_name")
                ):
                    result.append(
                        [
                            str(_component_value(c, coeff, count, portion_name))
                            for c in cg["components"]
                        ]
                    )
                else:
                    result.append([])
            return result

        def _col_grams_diet(
            meal: str,
            diet_name: str,
            coeff: Decimal,
            count: int,
            portion_name: str,
        ) -> list:
            """Map diet portions to an explicit diet template, or fall back to A/default."""
            meal_groups = [cg for cg in col_groups if cg["meal"] == meal]
            if not meal_groups:
                return [[] for _ in col_groups]
            explicit_diet_groups = [
                cg for cg in meal_groups if cg.get("diet_name") == diet_name
            ]
            if explicit_diet_groups:
                if meal in variant_meals:
                    for cg in explicit_diet_groups:
                        if _normalize_variant(cg["variant"]) == "A":
                            return _col_grams_for_group(cg, coeff, count, portion_name)
                for cg in explicit_diet_groups:
                    if not cg["variant"]:
                        return _col_grams_for_group(cg, coeff, count, portion_name)
                return _col_grams_for_group(
                    explicit_diet_groups[0], coeff, count, portion_name
                )

            standard_meal_groups = [cg for cg in meal_groups if not cg.get("diet_name")]
            if meal in variant_meals:
                for cg in standard_meal_groups:
                    if _normalize_variant(cg["variant"]) == "A":
                        return _col_grams(
                            meal, cg["variant"], coeff, count, portion_name
                        )
            if len(standard_meal_groups) == 1:
                return _col_grams(
                    meal,
                    standard_meal_groups[0]["variant"],
                    coeff,
                    count,
                    portion_name,
                )
            return [[] for _ in col_groups]

        def _col_grams_for_group(
            target_group: dict, coeff: Decimal, count: int, portion_name: str
        ) -> list:
            result = []
            for cg in col_groups:
                if cg is target_group:
                    result.append(
                        [
                            str(_component_value(c, coeff, count, portion_name))
                            for c in cg["components"]
                        ]
                    )
                else:
                    result.append([])
            return result

        # Running totals per col_group per component
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
                meals = ORDER_MEAL_TO_PLAN_MEALS.get(order_meal, [])
                # Only consider meals that actually have a selection for this day.
                meals = [
                    m
                    for m in meals
                    if m in MEAL_ORDER and any(cg["meal"] == m for cg in col_groups)
                ]
                if not meals or not isinstance(meal_data, dict):
                    continue

                # An order's "lunch" selection can fan out to multiple plan
                # meals (soup + main_course), both prepared from the same
                # headcount. Gram totals must be computed once per meal (each
                # is a different dish), but the client/diet headcount summary
                # must only be counted once per order meal — otherwise a
                # 2-dish lunch doubles the reported "people ordered" count.
                for meal_index, meal in enumerate(meals):
                    count_towards_summary = meal_index == 0
                    is_variant_meal = meal in variant_meals
                    for portion_name, portion_data in meal_data.items():
                        if not isinstance(portion_data, dict):
                            continue

                        coeff = pt_by_name.get(
                            _canonical_portion_name(portion_name), Decimal("1.0000")
                        )
                        raw_menu_counts = portion_data.get("menuCounts", {})
                        menu_counts = (
                            raw_menu_counts if isinstance(raw_menu_counts, dict) else {}
                        )
                        raw_diets = portion_data.get("diets", {})
                        diets = raw_diets if isinstance(raw_diets, dict) else {}

                        total_diet_count = sum(
                            _safe_nonneg_int(raw_count) for raw_count in diets.values()
                        )

                        if is_variant_meal:
                            variant_counts = sorted(
                                (
                                    (_normalize_variant(v), _safe_nonneg_int(cnt))
                                    for v, cnt in menu_counts.items()
                                ),
                                key=lambda kv: (
                                    VARIANT_ORDER.index(kv[0])
                                    if kv[0] in VARIANT_ORDER
                                    else 99
                                ),
                            )
                        else:
                            total = (
                                sum(_safe_nonneg_int(c) for c in menu_counts.values())
                                - total_diet_count
                            )
                            variant_counts = [("", total)]

                        # Diet counts are a subset breakdown of an already-counted
                        # variant, not an addition - they must be subtracted from
                        # the variant(s) or students get counted twice (once in
                        # the base variant total, once in the diet sub-row). The
                        # "base" variant isn't tagged in the raw diets data, so
                        # walk variants in order and subtract the diet count from
                        # each until it's exhausted - this used to be hardcoded to
                        # subtract fully from "A" only, which either silently
                        # stopped subtracting (double-counting diet students)
                        # whenever a school's klasik column was labeled B/C, or
                        # (if only subtracted from the first nonzero variant)
                        # under-subtracted whenever that variant's own count was
                        # smaller than the diet count, leaving the remainder
                        # double-counted in the next variant.
                        adjusted_variant_counts = []
                        remaining_diet_count = (
                            total_diet_count if is_variant_meal else 0
                        )
                        for variant, count in variant_counts:
                            adjusted_count = count
                            if remaining_diet_count > 0:
                                subtract = min(remaining_diet_count, adjusted_count)
                                adjusted_count -= subtract
                                remaining_diet_count -= subtract
                            adjusted_variant_counts.append(
                                (variant, max(adjusted_count, 0))
                            )

                        for variant, count in adjusted_variant_counts:
                            if count <= 0:
                                continue
                            grams = _col_grams(
                                meal, variant, coeff, count, portion_name
                            )
                            _merge_group_totals(totals, grams)
                            _merge_group_totals(client_standard_totals, grams)

                            if is_variant_meal and variant:
                                label = (
                                    f"{portion_name} - {MEAL_LABELS[meal]} "
                                    f"Menu {variant}"
                                )
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
                            if count_towards_summary:
                                client_total_count += count

                        for diet_name, diet_count_raw in sorted(diets.items()):
                            diet_count = _safe_nonneg_int(diet_count_raw)
                            if diet_count <= 0:
                                continue
                            diet_grams = _col_grams_diet(
                                meal, diet_name, coeff, diet_count, portion_name
                            )
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
                            _merge_group_totals(
                                diet_summary_totals[diet_name], diet_grams
                            )
                            if count_towards_summary:
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

        # ── Count summary ─────────────────────────────────────────────────────
        # Aggregate order counts across all clients: standard by (meal, variant,
        # portion_name) and diets by (meal, portion_name, diet_name).
        _std_agg: dict = {}  # (meal, variant) → {portion_name: count}
        _diet_agg: dict = {}  # meal → {(portion_name, diet_name): count}

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
        _added_default_diet_meals: set = set()
        _added_mvs: set = set()
        _explicit_diets_by_meal: dict[str, set[str]] = {}
        for _cg in col_groups:
            if _cg.get("diet_name"):
                _explicit_diets_by_meal.setdefault(_cg["meal"], set()).add(
                    _cg["diet_name"]
                )
        for _cg in col_groups:
            _summary_key = (_cg["meal"], _cg["variant"], _cg.get("diet_name"))
            if _summary_key in _added_mvs:
                continue
            _added_mvs.add(_summary_key)
            _std_entries = []
            if not _cg.get("diet_name"):
                _std_key = (_cg["meal"], _cg["variant"])
                _std_entries = sorted(
                    _std_agg.get(_std_key, {}).items(), key=lambda x: -x[1]
                )
            _diets_entries: list = []
            explicit_diet_name = _cg.get("diet_name")
            if explicit_diet_name:
                _diets_entries = sorted(
                    [
                        (key, count)
                        for key, count in _diet_agg.get(_cg["meal"], {}).items()
                        if key[1] == explicit_diet_name
                    ],
                    key=lambda x: -x[1],
                )
            elif _cg["meal"] not in _added_default_diet_meals:
                _added_default_diet_meals.add(_cg["meal"])
                explicit_diets = _explicit_diets_by_meal.get(_cg["meal"], set())
                _diets_entries = sorted(
                    [
                        (key, count)
                        for key, count in _diet_agg.get(_cg["meal"], {}).items()
                        if key[1] not in explicit_diets
                    ],
                    key=lambda x: -x[1],
                )
            count_summary.append(
                {
                    "meal": _cg["meal"],
                    "variant": _cg["variant"],
                    "diet_name": explicit_diet_name,
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
            "meal_plan_id": plan_id,
            "col_groups": col_groups,
            "rows": rows,
            "totals": totals_serialized,
            "count_summary": count_summary,
        }
