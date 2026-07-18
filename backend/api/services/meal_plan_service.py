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
from ..order_data import OrderData
from ..utils import order_row_label


def _normalize_portion_name(value: object) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "").casefold())
    ascii_value = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return " ".join(ascii_value.replace(".", " ").replace("-", " ").split())


# Do ktorého riadku prevádzka vykazuje porciu, ktorú účtuje koeficientom.
# Edulienka nemá pre predškolákov vlastný riadok — píše ich do MŠ riadku ako
# 1,25 porcie (`Klasik 8.25` = 7 MŠ + 1 predškolák). Uplatní sa len tam, kde je
# na prevádzke nastavený `billing_portion_coefficients` pre daný typ porcie.
_BILLING_MERGE_TARGET = {"Predškolák": "Škôlka"}


def _tidy_count(value: int | Decimal) -> int | Decimal:
    """Celé číslo vráti ako `int`, zlomok ako Decimal bez chvostových núl.

    `Decimal.normalize()` sama nestačí — z `Decimal("10.00")` spraví `1E+1`,
    čo je v exporte aj v JSON-e nezmysel. Preto sa celé hodnoty preklápajú na
    `int`, aby `4 × 1,25` bolo `5` a nie `5.0`.
    """
    if isinstance(value, int):
        return value
    if value == value.to_integral_value():
        return int(value)
    return value.normalize()


def _billed_count(count: int, billing_coeff: Decimal) -> int | Decimal:
    """Počet porcií do výkazu. Bez koeficientu ostáva `int` — nechceme, aby sa
    všetkým prevádzkam zmenil typ počtu z celého čísla na Decimal."""
    if billing_coeff == 1:
        return count
    return _tidy_count(Decimal(count) * billing_coeff)


def _merge_billed_sub_rows(sub_rows: list[dict]) -> list[dict]:
    """Zlúči riadky, ktoré po premenovaní portion_name spadli na rovnaký label.

    Gramy sú per riadok už správne (predškolák 250 g), takže sa len sčítajú —
    súčet ostáva identický, mení sa iba to, do ktorého riadku je rozpísaný.
    """
    merged: dict[tuple, dict] = {}
    order: list[tuple] = []
    for sub_row in sub_rows:
        key = (
            sub_row["type"],
            sub_row["meal"],
            sub_row.get("variant", ""),
            sub_row.get("diet_name", ""),
            sub_row["label"],
        )
        existing = merged.get(key)
        if existing is None:
            merged[key] = dict(sub_row)
            order.append(key)
            continue
        existing["count"] = _tidy_count(existing["count"] + sub_row["count"])
        existing["col_grams"] = _sum_col_grams(
            existing["col_grams"], sub_row["col_grams"]
        )
    return [merged[key] for key in order]


def _sum_col_grams(left: list, right: list) -> list:
    """Sčíta dve serializované gramážové mriežky (list skupín × komponentov)."""
    result = []
    for left_group, right_group in zip(left, right):
        if not left_group:
            result.append(right_group)
        elif not right_group:
            result.append(left_group)
        else:
            result.append(
                [
                    str((Decimal(a) + Decimal(b)).quantize(Decimal("0.01")))
                    for a, b in zip(left_group, right_group)
                ]
            )
    return result


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

        from ..models import DailyMealPlan, DailyOrder, DeliveryRoute, Diet, PortionType

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
        DEFAULT_DIET_COLORS = {
            "No Milk": "#F59E0B",
            "No Gluten": "#EF4444",
            "No Milk – No Gluten": "#EA580C",
            "No Milk - No Gluten": "#EA580C",
            "No No No": "#9333EA",
            "VEGGIE": "#16A34A",
            "Vege": "#16A34A",
            "Histamín": "#0EA5E9",
            "DIA": "#64748B",
        }
        diet_color_map = {
            diet.name: (diet.color or DEFAULT_DIET_COLORS.get(diet.name, "#FDE68A"))
            for diet in Diet.objects.filter(is_active=True)
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
                    label = (
                        f"Menu {item.menu_variant}"
                        if item.category == MealCategory.MAIN_COURSE
                        else f"{MEAL_LABELS[item.category]} Menu {item.menu_variant}"
                    )
                else:
                    key, label = (
                        item.category,
                        MEAL_LABELS.get(item.category, item.category),
                    )
                diet_name = item.diet.name if item.diet_id else None
                if diet_name:
                    key = f"{key}_diet_{item.diet_id}"
                    label = f"{label} - {diet_name}"
                components = parse_components(
                    t.name, t.components, t.weight_label, t.unit_exception
                )
                if (
                    item.category == MealCategory.BREAKFAST_SNACK
                    and len(components) > 1
                ):
                    exception_components = [
                        component
                        for component in components
                        if component.get("is_exception")
                    ]
                    total_base = sum(
                        Decimal(str(component.get("base_grams") or "0"))
                        for component in components
                        if not component.get("is_exception")
                    )
                    components = [
                        {
                            "label": "Raňajky-desiata spolu",
                            "base_grams": str(total_base),
                            "unit": "g",
                        },
                        *exception_components,
                    ]
                col_groups.append(
                    {
                        "key": key,
                        "label": label,
                        "meal": item.category,
                        "variant": item.menu_variant,
                        "diet_id": item.diet_id,
                        "diet_name": diet_name,
                        "diet_color": (
                            diet_color_map.get(diet_name, "") if diet_name else ""
                        ),
                        "template_name": t.name,
                        "components": components,
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

        def _col_gram_adjustment(correction: dict) -> list:
            result = _empty_group_totals()
            meal = correction.get("meal")
            variant = _normalize_variant(correction.get("variant", ""))
            diet_name = correction.get("diet_name")
            component_index = int(correction.get("component_index", 0))
            grams = Decimal(str(correction.get("grams", "0")))
            for group_index, cg in enumerate(col_groups):
                if (
                    cg["meal"] == meal
                    and _normalize_variant(cg["variant"]) == variant
                    and cg.get("diet_name") == diet_name
                    and 0 <= component_index < len(cg["components"])
                ):
                    result[group_index][component_index] += grams
                    break
            return [
                [str(value.quantize(Decimal("0.01"))) for value in group]
                for group in result
            ]

        # Running totals per col_group per component
        totals = _empty_group_totals()

        rows = []
        orders = (
            DailyOrder.objects.filter(date=date_str)
            .select_related(
                "user",
                "user__profile",
                "prevadzka__celok",
                "prevadzka__delivery_route__block",
            )
            .prefetch_related("prevadzka__celok__prevadzky")
            .order_by(
                "prevadzka__delivery_route__block__sort_order",
                "prevadzka__delivery_route__sort_order",
                "prevadzka__delivery_sort_order",
                "prevadzka__sort_order",
                "prevadzka__nazov",
                "user__email",
            )
        )

        for order in orders:
            client_label = order_row_label(order)
            prevadzka = getattr(order, "prevadzka", None)
            billing_coeffs = (
                {
                    name: prevadzka.billing_coefficient(name)
                    for name in (prevadzka.billing_portion_coefficients or {})
                }
                if prevadzka is not None
                else {}
            )
            sub_rows: list[dict] = []
            # Decimal len tam, kde prevádzka účtuje zlomkovú porciu
            # (Edulienka: predškolák 1,25); inde ostáva int.
            client_total_count: int | Decimal = 0
            client_standard_totals = _empty_group_totals()
            diet_summary_totals: dict[str, list[list[Decimal]]] = {}
            diet_summary_counts: dict[str, int | Decimal] = {}
            order_data = order.data if isinstance(order.data, dict) else {}

            for order_meal, meal_data in order_data.items():
                if order_meal == "__gram_corrections__":
                    continue
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
                    # Cez OrderData, nie priamym `meal_data.items()`: vo v2 tvare je
                    # prvá úroveň prevádzka, nie porcia, a priame čítanie by
                    # `menuCounts` nenašlo a ticho vyrobilo nulovú gramáž.
                    for category in OrderData({order_meal: meal_data}).iter_categories(
                        order_meal
                    ):
                        portion_name = _canonical_portion_name(category.name)
                        coeff = pt_by_name.get(portion_name, Decimal("1.0000"))
                        # Fakturačný koeficient je nezávislý od gramážového:
                        # gramy sa vždy rátajú z počtu hláv (predškolák = 250 g),
                        # koeficient ide len do vykázaného počtu porcií.
                        billing_coeff = billing_coeffs.get(portion_name, Decimal("1"))
                        # Prevádzka s koeficientom vykazuje porciu v cudzom riadku
                        # (Edulienka píše predškoláka do MŠ riadku ako 1,25), preto
                        # sa riadok premenuje a nižšie zlúči s cieľovým.
                        display_portion_name = (
                            _BILLING_MERGE_TARGET.get(portion_name, portion_name)
                            if billing_coeff != 1
                            else portion_name
                        )
                        menu_counts = category.menu_counts
                        diets = category.diets

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
                            # Gramy z počtu hláv, nie z fakturovaného počtu.
                            grams = _col_grams(
                                meal, variant, coeff, count, portion_name
                            )
                            _merge_group_totals(totals, grams)
                            _merge_group_totals(client_standard_totals, grams)
                            billed_count = _billed_count(count, billing_coeff)

                            if is_variant_meal and variant:
                                label = (
                                    f"{display_portion_name} - {MEAL_LABELS[meal]} "
                                    f"Menu {variant}"
                                )
                            else:
                                label = f"{display_portion_name} - {MEAL_LABELS[meal]}"

                            sub_rows.append(
                                {
                                    "type": "standard",
                                    "meal": meal,
                                    "variant": variant,
                                    "portion_name": display_portion_name,
                                    "label": label,
                                    "count": billed_count,
                                    "col_grams": grams,
                                }
                            )
                            if count_towards_summary:
                                client_total_count += billed_count

                        for diet_name, diet_count_raw in sorted(diets.items()):
                            diet_count = _safe_nonneg_int(diet_count_raw)
                            if diet_count <= 0:
                                continue
                            diet_grams = _col_grams_diet(
                                meal, diet_name, coeff, diet_count, portion_name
                            )
                            billed_diet_count = _billed_count(diet_count, billing_coeff)
                            sub_rows.append(
                                {
                                    "type": "diet",
                                    "meal": meal,
                                    "portion_name": display_portion_name,
                                    "diet_name": diet_name,
                                    "label": f"{display_portion_name} - {diet_name}",
                                    "diet_color": diet_color_map.get(
                                        diet_name, "#FDE68A"
                                    ),
                                    "count": billed_diet_count,
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
                                diet_summary_counts[diet_name] += billed_diet_count

            for correction in order_data.get("__gram_corrections__", []):
                if not isinstance(correction, dict):
                    continue
                grams = _col_gram_adjustment(correction)
                _merge_group_totals(totals, grams)
                _merge_group_totals(client_standard_totals, grams)
                sub_rows.append(
                    {
                        "type": "standard",
                        "meal": correction.get("meal", ""),
                        "variant": correction.get("variant", ""),
                        "portion_name": "Gramážna korekcia",
                        "label": correction.get("label", "Gramážna korekcia"),
                        "count": 0,
                        "col_grams": grams,
                    }
                )

            if billing_coeffs:
                sub_rows = _merge_billed_sub_rows(sub_rows)

            if sub_rows:
                admin_order_note = str(
                    getattr(prevadzka, "admin_order_note", "") or ""
                ).strip()
                delivery_route = (
                    getattr(prevadzka, "delivery_route", None)
                    if prevadzka is not None
                    else None
                )
                delivery_block = (
                    getattr(delivery_route, "block", None)
                    if delivery_route is not None
                    else None
                )
                delivery_note = (
                    str(getattr(prevadzka, "delivery_note", "") or "").strip()
                    if prevadzka is not None
                    else ""
                )
                display_client = (
                    str(getattr(prevadzka, "report_alias", "") or "").strip()
                    or (prevadzka.nazov if prevadzka is not None else "")
                    or client_label
                )
                diet_summary_rows = [
                    {
                        "name": name,
                        "count": _tidy_count(diet_summary_counts[name]),
                        "col_grams": _serialize_group_totals(diet_summary_totals[name]),
                    }
                    for name in sorted(diet_summary_counts)
                ]
                rows.append(
                    {
                        "client": display_client,
                        "client_id": order.user_id,
                        "row_key": (
                            f"prevadzka-{prevadzka.id}"
                            if prevadzka is not None
                            else f"user-{order.user_id}"
                        ),
                        "prevadzka_id": prevadzka.id if prevadzka is not None else None,
                        "delivery_block_id": (
                            delivery_block.id if delivery_block is not None else None
                        ),
                        "delivery_block_name": (
                            delivery_block.name if delivery_block is not None else ""
                        ),
                        "delivery_block_sort_order": (
                            delivery_block.sort_order
                            if delivery_block is not None
                            else 9999
                        ),
                        "delivery_route_id": (
                            delivery_route.id if delivery_route is not None else None
                        ),
                        "delivery_route_name": (
                            delivery_route.name if delivery_route is not None else ""
                        ),
                        "delivery_route_sort_order": (
                            delivery_route.sort_order
                            if delivery_route is not None
                            else 9999
                        ),
                        "delivery_sort_order": (
                            prevadzka.delivery_sort_order
                            if prevadzka is not None
                            else 9999
                        ),
                        "delivery_note": delivery_note,
                        "total_count": _tidy_count(
                            client_total_count + sum(diet_summary_counts.values())
                        ),
                        "standard_total_count": _tidy_count(client_total_count),
                        "standard_col_grams": _serialize_group_totals(
                            client_standard_totals
                        ),
                        "diet_summary_rows": diet_summary_rows,
                        "admin_order_note": admin_order_note,
                        "sub_rows": sub_rows,
                    }
                )

        rows.sort(
            key=lambda r: (
                r["delivery_block_sort_order"],
                r["delivery_route_sort_order"],
                r["delivery_sort_order"],
                str(r["client"]).casefold(),
            )
        )

        def _delivery_blocks_payload(rows_for_payload: list[dict]) -> tuple[list, list]:
            route_rows: dict[int, list[dict]] = {}
            unassigned_rows = []
            for row in rows_for_payload:
                route_id = row.get("delivery_route_id")
                if route_id is None:
                    unassigned_rows.append(row)
                    continue
                route_rows.setdefault(route_id, []).append(row)

            if not route_rows:
                return [], unassigned_rows

            routes = (
                DeliveryRoute.objects.filter(is_active=True, block__is_active=True)
                .select_related("block")
                .order_by("block__sort_order", "sort_order", "name")
            )
            blocks_by_id: dict[int, dict] = {}
            for route in routes:
                block = route.block
                block_payload = blocks_by_id.setdefault(
                    block.id,
                    {
                        "id": block.id,
                        "name": block.name,
                        "sort_order": block.sort_order,
                        "include_in_main_summary": block.include_in_main_summary,
                        "include_in_extra_summary": block.include_in_extra_summary,
                        "routes": [],
                    },
                )
                block_payload["routes"].append(
                    {
                        "id": route.id,
                        "name": route.name,
                        "driver": route.driver,
                        "departure_time": (
                            route.departure_time.isoformat()
                            if route.departure_time
                            else None
                        ),
                        "note": route.note,
                        "sort_order": route.sort_order,
                        "rows": route_rows.get(route.id, []),
                    }
                )

            blocks = sorted(
                blocks_by_id.values(),
                key=lambda item: (item["sort_order"], item["name"].casefold()),
            )
            return blocks, unassigned_rows

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

        delivery_blocks, unassigned_rows = _delivery_blocks_payload(rows)

        return {
            "date": date_str,
            "meal_plan_id": plan_id,
            "col_groups": col_groups,
            "rows": rows,
            "blocks": delivery_blocks,
            "unassigned_rows": unassigned_rows,
            "totals": totals_serialized,
            "count_summary": count_summary,
            "diet_colors": diet_color_map,
        }
