"""PDF Report Exporter - Generate PDF reports from order data."""

from __future__ import annotations

import io
import logging
import os

from ..order_data import OrderData, safe_count
from ..utils import order_row_label

logger = logging.getLogger(__name__)


class PDFFontManager:
    """Manages font registration for PDF generation."""

    _fonts_registered = False
    _font_regular = "Helvetica"
    _font_bold = "Helvetica-Bold"

    @classmethod
    def get_fonts(cls):
        """Get font names, registering DejaVuSans if available."""
        cls._register_pdf_fonts()
        return cls._font_regular, cls._font_bold

    @classmethod
    def _register_pdf_fonts(cls):
        """Register DejaVu Sans TTFont for Unicode support."""
        if cls._fonts_registered:
            return
        try:
            # Lazy-import reportlab to avoid startup overhead
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            regular = bold = None
            candidates = [
                (
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                ),
                (
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
                ),
                (
                    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
                ),
                ("/Library/Fonts/DejaVuSans.ttf", "/Library/Fonts/DejaVuSans-Bold.ttf"),
            ]
            for reg_path, bold_path in candidates:
                if os.path.isfile(reg_path) and os.path.isfile(bold_path):
                    regular, bold = reg_path, bold_path
                    break
            else:
                cls._fonts_registered = True
                return

            pdfmetrics.registerFont(TTFont("DejaVuSans", regular))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold))
            pdfmetrics.registerFontFamily(
                "DejaVuSans",
                normal="DejaVuSans",
                bold="DejaVuSans-Bold",
            )
            cls._font_regular = "DejaVuSans"
            cls._font_bold = "DejaVuSans-Bold"
            logger.debug("Registered DejaVuSans TTFont for PDF generation.")
        except Exception:
            logger.warning(
                "Could not register DejaVuSans TTFont; falling back to Helvetica.",
                exc_info=True,
            )
        finally:
            cls._fonts_registered = True


class PDFReportExporter:
    """Generate PDF reports from order data."""

    # Category order for consistent display
    CAT_ORDER = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]

    # Meal configuration
    MEAL_LABELS = {
        "breakfast": "Raňajky",
        "lunch": "Obed",
        "olovrant": "Olovrant",
    }

    MEAL_COLORS = {
        "breakfast": "#fff7ed",
        "lunch": "#eff6ff",
        "olovrant": "#f0fdf4",
    }

    MEAL_HEADER_COLORS = {
        "breakfast": "#f97316",
        "lunch": "#3b82f6",
        "olovrant": "#22c55e",
    }

    def __init__(self, orders: list, target_date: str):
        """
        Initialize exporter.

        Args:
            orders: List of order objects with user and data
            target_date: ISO format date string for the report
        """
        self.orders = orders
        self.target_date = target_date
        self.font_regular, self.font_bold = PDFFontManager.get_fonts()

    def generate(self) -> bytes:
        """
        Generate PDF report.

        Returns:
            PDF file content as bytes
        """
        # Lazy-import reportlab to avoid startup overhead
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm

        styles = self._setup_styles()
        story = self._build_story(styles, cm)
        buf = self._render_pdf(story, styles, A4, cm)
        return buf.getvalue()

    def _setup_styles(self) -> dict:
        """Create paragraph styles for report."""
        from reportlab.lib import colors as reportlab_colors
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

        styles = getSampleStyleSheet()
        return {
            "title": ParagraphStyle(
                "title",
                parent=styles["Heading1"],
                fontSize=13,
                spaceAfter=4,
                fontName=self.font_bold,
                textColor=reportlab_colors.HexColor("#1e3a5f"),
            ),
            "user": ParagraphStyle(
                "user",
                parent=styles["Heading2"],
                fontSize=11,
                spaceBefore=10,
                spaceAfter=2,
                fontName=self.font_bold,
                textColor=reportlab_colors.HexColor("#111827"),
            ),
            "meal": ParagraphStyle(
                "meal",
                parent=styles["Normal"],
                fontSize=9,
                spaceBefore=4,
                spaceAfter=2,
                textColor=reportlab_colors.HexColor("#374151"),
                fontName=self.font_bold,
            ),
            "empty": ParagraphStyle(
                "empty",
                parent=styles["Normal"],
                fontSize=8,
                fontName=self.font_regular,
                textColor=reportlab_colors.grey,
            ),
        }

    def _build_story(self, styles: dict, cm) -> list:
        """Build PDF story elements."""
        from reportlab.lib import colors as reportlab_colors
        from reportlab.platypus import HRFlowable, Paragraph, Spacer

        story = []
        page_w = 18 * cm
        col_widths = [4.5 * cm, 8 * cm, 5.5 * cm]

        # Title
        story.append(
            Paragraph(f"Denný prehľad objednávok — {self.target_date}", styles["title"])
        )
        story.append(
            HRFlowable(
                width=page_w, thickness=1, color=reportlab_colors.HexColor("#2563eb")
            )
        )
        story.append(Spacer(1, 0.3 * cm))

        # Per-user data
        for order in self.orders:
            user = order.user
            data = order.data if isinstance(order.data, dict) else {}
            _settings = getattr(user, "settings", None)
            visible_meals = getattr(_settings, "visible_meals", None) or [
                "breakfast",
                "lunch",
                "olovrant",
            ]

            display_name = order_row_label(order)
            story.append(Paragraph(display_name, styles["user"]))

            any_meal = False
            for mk in ["breakfast", "lunch", "olovrant"]:
                if mk not in visible_meals:
                    continue
                tbl = self._build_meal_table(
                    data, mk, col_widths, self.font_regular, self.font_bold
                )
                if tbl is None:
                    continue
                story.append(Paragraph(self.MEAL_LABELS[mk], styles["meal"]))
                story.append(tbl)
                story.append(Spacer(1, 0.15 * cm))
                any_meal = True

            if not any_meal:
                story.append(Paragraph("Žiadne objednávky", styles["empty"]))

            story.append(
                HRFlowable(
                    width=page_w,
                    thickness=0.4,
                    color=reportlab_colors.HexColor("#e5e7eb"),
                    spaceAfter=4,
                )
            )

        return story

    def _build_meal_table(
        self, meal_data, meal_key, col_widths, font_regular, font_bold
    ):
        """Build table for one meal's data."""
        from reportlab.lib import colors as reportlab_colors
        from reportlab.platypus import Table, TableStyle

        categories = {
            category.name: category
            for category in OrderData(meal_data).iter_categories(meal_key)
        }
        if not categories:
            return None

        ordered = [c for c in self.CAT_ORDER if c in categories]
        ordered += [c for c in categories if c not in ordered]

        rows = [["Kategória", "Menu", "Špeciálne diéty"]]
        for cat_name in ordered:
            category = categories[cat_name]
            menus_str = ", ".join(
                f"{k}×{v}"
                for k, v in sorted(category.menu_counts.items())
                if safe_count(v) > 0
            )
            diets_str = ", ".join(
                (f"{k}×{v}" if safe_count(v) > 1 else k)
                for k, v in sorted(category.diets.items())
                if safe_count(v) > 0
            )
            if menus_str or diets_str:
                rows.append([cat_name, menus_str or "–", diets_str or ""])

        if len(rows) == 1:
            return None

        # Convert hex strings to HexColor objects
        bg = reportlab_colors.HexColor(self.MEAL_COLORS[meal_key])
        hdr_bg = reportlab_colors.HexColor(self.MEAL_HEADER_COLORS[meal_key])
        t = Table(rows, colWidths=col_widths)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), hdr_bg),
                    ("TEXTCOLOR", (0, 0), (-1, 0), reportlab_colors.white),
                    ("FONTNAME", (0, 0), (-1, -1), font_regular),
                    ("FONTNAME", (0, 0), (-1, 0), font_bold),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [bg, reportlab_colors.white]),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.3,
                        reportlab_colors.HexColor("#d1d5db"),
                    ),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        return t

    def _render_pdf(self, story: list, styles: dict, A4, cm) -> io.BytesIO:
        """Render story to PDF."""
        from reportlab.platypus import SimpleDocTemplate

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            title=f"Denný prehľad {self.target_date}",
        )
        doc.build(story)
        buf.seek(0)
        return buf
