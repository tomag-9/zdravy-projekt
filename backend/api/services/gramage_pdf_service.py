"""Gramage dashboard: cached data + PDF rendering, zdieľané medzi obrazovkou
(`gramage-dashboard`), exportom na požiadanie (`gramage-dashboard-pdf`) a
automatickým snapshotom pri uzavretí dňa (#528, viď `closed_day_views`)."""

from __future__ import annotations

from ..cache_service import (
    GRAMAGE_DASHBOARD_TIMEOUT,
    get_cached,
    get_gramage_dashboard_cache_key,
    set_cached,
)
from ..exporters.gramage_table_html import render_document
from ..exporters.gramage_table_spec import build_table_spec
from .meal_plan_service import MealPlanService


def get_cached_gramage_dashboard_data(date_str: str) -> dict:
    """`MealPlanService.gramage_dashboard()` result, cached per date (5 min TTL).

    The aggregation (orders × plan items × diety × portion types) is pure
    Python work over the day's data and identical for the screen and the PDF
    export, so both share this cache. No write-side invalidation — same
    tradeoff as `daily-stats`: the underlying orders change too often to
    track per-write, so a short TTL bounds the staleness instead. Callers
    still apply their own `section`/`vydaj` filtering (build_table_spec) on
    top of the cached, unfiltered data.
    """
    cache_key = get_gramage_dashboard_cache_key(date_str)
    cached_data = get_cached(cache_key)
    if cached_data is not None:
        return cached_data

    data = MealPlanService.gramage_dashboard(date_str)
    set_cached(cache_key, data, timeout=GRAMAGE_DASHBOARD_TIMEOUT)
    return data


def render_gramage_dashboard_pdf(
    date_str: str,
    *,
    sections: list[str] | None = None,
    vydaje: list[str] | None = None,
) -> bytes:
    """Zloží PDF gramáže pre daný deň.

    Tá istá tabuľka ako na obrazovke: rovnaký spec, rovnaké CSS, len namiesto
    Reactu ju do HTML zloží `gramage_table_html` a WeasyPrint z toho spraví
    papier.
    """
    from weasyprint import HTML  # ťažký import, len keď treba

    data = get_cached_gramage_dashboard_data(date_str)
    # #510 — PDF nemá „zbalený" stav, sub-riadky sú vždy vidno, takže
    # medzisúčty za klienta by len duplikovali čísla o riadok vyššie.
    spec = build_table_spec(
        data, sections=sections, vydaje=vydaje, include_summary_rows=False
    )
    return HTML(string=render_document(spec)).write_pdf()
