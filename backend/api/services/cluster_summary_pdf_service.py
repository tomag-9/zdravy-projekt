"""On-demand PDF for the independent lunch-cluster summaries."""

from __future__ import annotations

from ..exporters.cluster_summary_spec import build_cluster_summary_spec
from ..exporters.gramage_table_html import render_document
from .gramage_pdf_service import get_cached_gramage_dashboard_data


def render_cluster_summary_pdf(date_str: str, *, meals: list[str]) -> bytes:
    from weasyprint import HTML

    spec = build_cluster_summary_spec(
        get_cached_gramage_dashboard_data(date_str), meals
    )
    return HTML(string=render_document(spec, title="Sumáre objednávok")).write_pdf()
