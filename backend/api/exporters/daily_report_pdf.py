"""Denný report ako PDF — tá istá tabuľka, akú admin vidí v prehľade gramáže.

Report do mailu nesmie byť „skoro to isté" ako obrazovka: berie rovnaký payload
z `MealPlanService.gramage_dashboard()`, rovnaký `build_table_spec()` aj rovnaké
CSS ako `gramage-dashboard-pdf` endpoint. Jediné, čo pridáva, je preklad
objednávkových jedál (`breakfast`/`lunch`/`olovrant`) na stĺpcové sekcie tabuľky.
"""

from __future__ import annotations

import datetime
import logging

logger = logging.getLogger(__name__)

# Objednávkové jedlá → kategórie stĺpcov v jedálničku. Obed pokrýva polievku aj
# hlavné jedlo, olovrant je „afternoon_snack" (v pláne aj pod menom `snack`).
_MEAL_TO_PLAN_CATEGORIES: dict[str, tuple[str, ...]] = {
    "breakfast": ("breakfast_snack",),
    "lunch": ("soup", "main_course"),
    "olovrant": ("afternoon_snack",),
}

MEAL_LABELS = {"breakfast": "Raňajky", "lunch": "Obed", "olovrant": "Olovrant"}


def sections_for_meals(col_groups: list[dict], meals: list[str] | None) -> list[str]:
    """Kľúče stĺpcových skupín, ktoré patria do reportu za *meals*.

    Kľúč skupiny nie je názov jedla (`main_course_A`, `breakfast_snack_diet_3`
    …), preto sa filtruje cez pole ``meal``. Prázdny výsledok znamená, že v ten
    deň pre dané jedlá nie je ani jeden stĺpec — volajúci to musí ošetriť, lebo
    `build_table_spec()` prázdny výber zámerne vracia späť na celú tabuľku.
    """
    if not meals:
        return []
    wanted: set[str] = set()
    for meal in meals:
        wanted.update(_MEAL_TO_PLAN_CATEGORIES.get(meal, ()))
    return [
        str(group.get("key") or "")
        for group in col_groups
        if str(group.get("meal") or "") in wanted
    ]


def build_report_pdf_bytes(
    target_date: datetime.date, meals: list[str] | None = None
) -> bytes | None:
    """PDF prehľadu pre *target_date*, zúžený na *meals*.

    Vracia ``None``, keď pre dané jedlá v ten deň nie je čo tlačiť (chýbajúci
    jedálniček alebo report za raňajky v deň bez raňajok). Poslať namiesto toho
    celú tabuľku by bolo horšie ako neposlať nič — mail s predmetom „Raňajky"
    by obsahoval obedy.
    """
    from weasyprint import HTML

    from ..services.meal_plan_service import MealPlanService
    from .gramage_table_html import render_document
    from .gramage_table_spec import build_table_spec

    data = MealPlanService.gramage_dashboard(target_date.isoformat())
    col_groups = data.get("col_groups") or []
    if not col_groups:
        logger.warning(
            "Denný report %s: jedálniček nemá žiadne stĺpce, PDF sa negeneruje.",
            target_date.isoformat(),
        )
        return None

    sections = sections_for_meals(col_groups, meals) if meals else None
    if meals and not sections:
        logger.warning(
            "Denný report %s: pre jedlá %s nie je v jedálničku ani jeden stĺpec.",
            target_date.isoformat(),
            ", ".join(meals),
        )
        return None

    spec = build_table_spec(data, sections=sections)
    title = "Denný prehľad objednávok"
    if meals:
        title += " — " + ", ".join(MEAL_LABELS.get(m, m) for m in meals)
    return HTML(string=render_document(spec, title=title)).write_pdf()
