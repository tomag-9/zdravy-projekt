"""PDF Report Generation."""

import datetime
import io
import logging
import os

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from ..models import DailyOrder
from .report_helpers import safe_int

logger = logging.getLogger(__name__)


# PDF font configuration
_PDF_FONT_REGULAR = "Helvetica"
_PDF_FONT_BOLD = "Helvetica-Bold"
_pdf_fonts_registered = False


def _register_pdf_fonts():
    """Register DejaVu Sans TTFont for Unicode support."""
    global _PDF_FONT_REGULAR, _PDF_FONT_BOLD, _pdf_fonts_registered
    if _pdf_fonts_registered:
        return
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        regular = bold = None
        candidates = [
            (
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ),
            ("/Library/Fonts/DejaVuSans.ttf", "/Library/Fonts/DejaVuSans-Bold.ttf"),
        ]
        for reg_path, bold_path in candidates:
            if os.path.isfile(reg_path) and os.path.isfile(bold_path):
                regular, bold = reg_path, bold_path
                break
        else:
            _pdf_fonts_registered = True
            return

        pdfmetrics.registerFont(TTFont("DejaVuSans", regular))
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold))
        pdfmetrics.registerFontFamily(
            "DejaVuSans",
            normal="DejaVuSans",
            bold="DejaVuSans-Bold",
        )
        _PDF_FONT_REGULAR = "DejaVuSans"
        _PDF_FONT_BOLD = "DejaVuSans-Bold"
        logger.debug("Registered DejaVuSans TTFont for PDF generation.")
    except Exception:
        logger.warning(
            "Could not register DejaVuSans TTFont; falling back to Helvetica.",
            exc_info=True,
        )
    finally:
        _pdf_fonts_registered = True


def generate_pdf_report(request):
    """Generate PDF report for daily orders."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    date_str = request.query_params.get("date")
    if not date_str:
        return Response(
            {"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        target_date = datetime.date.fromisoformat(date_str)
    except (TypeError, ValueError):
        return Response(
            {"error": "invalid date format, expected YYYY-MM-DD"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    safe_date = target_date.isoformat()

    orders = (
        DailyOrder.objects.filter(date=target_date)
        .select_related("user", "user__settings")
        .order_by("user__email")
    )

    CAT_ORDER = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]
    MEAL_LABELS = {
        "breakfast": "Raňajky",
        "lunch": "Obed",
        "olovrant": "Olovrant",
    }
    MEAL_COLORS = {
        "breakfast": colors.HexColor("#fff7ed"),
        "lunch": colors.HexColor("#eff6ff"),
        "olovrant": colors.HexColor("#f0fdf4"),
    }
    MEAL_HEADER_COLORS = {
        "breakfast": colors.HexColor("#f97316"),
        "lunch": colors.HexColor("#3b82f6"),
        "olovrant": colors.HexColor("#22c55e"),
    }

    _register_pdf_fonts()
    _font = _PDF_FONT_REGULAR
    _font_bold = _PDF_FONT_BOLD

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "title",
        parent=styles["Heading1"],
        fontSize=13,
        spaceAfter=4,
        fontName=_font_bold,
        textColor=colors.HexColor("#1e3a5f"),
    )
    user_style = ParagraphStyle(
        "user",
        parent=styles["Heading2"],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=2,
        fontName=_font_bold,
        textColor=colors.HexColor("#111827"),
    )
    meal_style = ParagraphStyle(
        "meal",
        parent=styles["Normal"],
        fontSize=9,
        spaceBefore=4,
        spaceAfter=2,
        textColor=colors.HexColor("#374151"),
        fontName=_font_bold,
    )

    PAGE_W = 18 * cm
    COL_WIDTHS = [4.5 * cm, 8 * cm, 5.5 * cm]

    def _build_meal_table(meal_data, meal_key):
        """Build table for one meal's data."""
        meal = meal_data.get(meal_key)
        if not isinstance(meal, dict) or not meal:
            return None
        is_flat = "menuCounts" in meal
        if is_flat:
            cat_entries = [(meal_key, meal)]
        else:
            cat_entries = [(k, v) for k, v in meal.items() if isinstance(v, dict)]
        cat_dict = dict(cat_entries)
        ordered = [c for c in CAT_ORDER if c in cat_dict]
        ordered += [c for c in cat_dict if c not in ordered]

        rows = [["Kategória", "Menu", "Špeciálne diéty"]]
        for cat_name in ordered:
            details = cat_dict[cat_name]
            menus_str = ", ".join(
                f"{k}×{v}"
                for k, v in sorted((details.get("menuCounts") or {}).items())
                if safe_int(v) > 0
            )
            diets_str = ", ".join(
                (f"{k}×{v}" if safe_int(v) > 1 else k)
                for k, v in sorted((details.get("diets") or {}).items())
                if safe_int(v) > 0
            )
            if menus_str or diets_str:
                rows.append([cat_name, menus_str or "–", diets_str or ""])

        if len(rows) == 1:
            return None

        bg = MEAL_COLORS[meal_key]
        hdr_bg = MEAL_HEADER_COLORS[meal_key]
        t = Table(rows, colWidths=COL_WIDTHS)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), hdr_bg),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, -1), _font),
                    ("FONTNAME", (0, 0), (-1, 0), _font_bold),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [bg, colors.white]),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#d1d5db")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        return t

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        title=f"Denný prehľad {safe_date}",
    )

    story = []
    story.append(Paragraph(f"Denný prehľad objednávok — {safe_date}", title_style))
    story.append(
        HRFlowable(width=PAGE_W, thickness=1, color=colors.HexColor("#2563eb"))
    )
    story.append(Spacer(1, 0.3 * cm))

    for order in orders:
        user = order.user
        data = order.data or {}
        _settings = getattr(user, "settings", None)
        visible_meals = getattr(_settings, "visible_meals", None) or [
            "breakfast",
            "lunch",
            "olovrant",
        ]

        display_name = f"{user.first_name} {user.last_name}".strip() or user.email
        story.append(Paragraph(display_name, user_style))

        any_meal = False
        for mk in ["breakfast", "lunch", "olovrant"]:
            if mk not in visible_meals:
                continue
            tbl = _build_meal_table(data, mk)
            if tbl is None:
                continue
            story.append(Paragraph(MEAL_LABELS[mk], meal_style))
            story.append(tbl)
            story.append(Spacer(1, 0.15 * cm))
            any_meal = True

        if not any_meal:
            story.append(
                Paragraph(
                    "Žiadne objednávky",
                    ParagraphStyle(
                        "empty",
                        parent=styles["Normal"],
                        fontSize=8,
                        fontName=_font,
                        textColor=colors.grey,
                    ),
                )
            )
        story.append(
            HRFlowable(
                width=PAGE_W,
                thickness=0.4,
                color=colors.HexColor("#e5e7eb"),
                spaceAfter=4,
            )
        )

    doc.build(story)
    buf.seek(0)

    filename = f"prehlad_{safe_date}.pdf"
    response = FileResponse(buf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
