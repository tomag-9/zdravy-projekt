"""Meal Plan Service - Business logic for the Jedálniček module."""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Any, List

from django.db import transaction

from ..models import DailyMealPlan, EnrolledCount, MealPlanItem, MealTemplate
from ..utils import user_operation_name


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
    def calculate_gramage(plan: DailyMealPlan) -> dict:
        """
        Core calculation: final_weight = base_weight_grams * coefficient * count

        Returns structured dict:
        {
          "date": "2026-03-13",
          "sections": {
            "breakfast": {
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
                  "item_total_grams": "4950.00"
                }
              ],
              "section_total_grams": "4950.00"
            },
            "lunch": {
              "A": { "items": [...], "section_total_grams": "..." },
              "B": { "items": [...], "section_total_grams": "..." },
            },
            "snack": { ... },
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
            "breakfast": {"items": [], "section_total_grams": Decimal("0")},
            "lunch": {},
            "snack": {"items": [], "section_total_grams": Decimal("0")},
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
                "base_weight_grams": str(base),
                "weight_label": template.weight_label,
                "breakdown": breakdown,
                "item_total_grams": str(item_total.quantize(Decimal("0.01"))),
            }

            grand_total += item_total

            if item.category == "lunch":
                variant = item.menu_variant or "A"
                if variant not in sections["lunch"]:
                    sections["lunch"][variant] = {
                        "items": [],
                        "section_total_grams": Decimal("0"),
                    }
                sections["lunch"][variant]["items"].append(item_dict)
                sections["lunch"][variant]["section_total_grams"] += item_total
            elif item.category == "breakfast":
                sections["breakfast"]["items"].append(item_dict)
                sections["breakfast"]["section_total_grams"] += item_total
            elif item.category == "snack":
                sections["snack"]["items"].append(item_dict)
                sections["snack"]["section_total_grams"] += item_total

        # Stringify Decimal totals in sections
        sections["breakfast"]["section_total_grams"] = str(
            sections["breakfast"]["section_total_grams"].quantize(Decimal("0.01"))
        )
        sections["snack"]["section_total_grams"] = str(
            sections["snack"]["section_total_grams"].quantize(Decimal("0.01"))
        )
        for v in sections["lunch"].values():
            v["section_total_grams"] = str(
                v["section_total_grams"].quantize(Decimal("0.01"))
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

        MEAL_ORDER = ["breakfast", "lunch", "snack"]
        VARIANT_ORDER = ["A", "B", "C", "V"]
        ORDER_MEAL_TO_PLAN_MEAL = {
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
            plan = DailyMealPlan.objects.prefetch_related("items__template").get(
                date=date_str
            )
            plan_id = plan.id
        except DailyMealPlan.DoesNotExist:
            plan = None
            plan_id = None

        def parse_components(name: str, weight_label: str) -> list:
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
            return [
                {"label": lbl, "base_grams": str(w)} for lbl, w in zip(labels, weights)
            ]

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
                ),
            )
            for item in items:
                t = item.template
                if item.category == "breakfast":
                    key, label = "breakfast", "Raňajky"
                elif item.category == "lunch":
                    key = f"lunch_{item.menu_variant}"
                    label = f"Obed Menu {item.menu_variant}"
                else:
                    key, label = "snack", "Olovrant"
                col_groups.append(
                    {
                        "key": key,
                        "label": label,
                        "meal": item.category,
                        "variant": item.menu_variant,
                        "template_name": t.name,
                        "components": parse_components(t.name, t.weight_label),
                    }
                )

        # ── Portion types by name ────────────────────────────────────────────────
        pt_by_name = {
            pt.name: pt.coefficient for pt in PortionType.objects.filter(is_active=True)
        }

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

        def _col_grams(meal: str, variant: str, coeff: Decimal, count: int) -> list:
            result = []
            normalized_variant = _normalize_variant(variant)
            for cg in col_groups:
                if (
                    cg["meal"] == meal
                    and _normalize_variant(cg["variant"]) == normalized_variant
                ):
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
            """Map diet portions to the standard template column used for that meal."""
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
                meal = ORDER_MEAL_TO_PLAN_MEAL.get(order_meal)
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

                    adjusted_variant_counts = []
                    for variant, count in variant_counts:
                        adjusted_count = count
                        if meal == "lunch" and variant == "A":
                            adjusted_count -= total_diet_count
                        adjusted_variant_counts.append(
                            (variant, max(adjusted_count, 0))
                        )

                    for variant, count in adjusted_variant_counts:
                        if count <= 0:
                            continue
                        grams = _col_grams(meal, variant, coeff, count)
                        _merge_group_totals(totals, grams)
                        _merge_group_totals(client_standard_totals, grams)

                        if meal == "lunch":
                            label = (
                                f"{portion_name} - {MEAL_LABELS[meal]} Menu {variant}"
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
            "meal_plan_id": plan_id,
            "col_groups": col_groups,
            "rows": rows,
            "totals": totals_serialized,
            "count_summary": count_summary,
        }
