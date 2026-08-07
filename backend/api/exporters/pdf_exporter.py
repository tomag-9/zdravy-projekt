"""PDF Report Exporter - Generate PDF reports from order data."""

from __future__ import annotations

import io
import logging
import os
from collections import defaultdict
from xml.sax.saxutils import escape

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

    def __init__(
        self, orders: list, target_date: str, diet_colors: dict[str, str] | None = None
    ):
        """
        Initialize exporter.

        Args:
            orders: List of order objects with user and data
            target_date: ISO format date string for the report
        """
        self.orders = list(orders)
        self.target_date = target_date
        self.diet_colors = (
            diet_colors if diet_colors is not None else self._load_diet_colors()
        )
        self.font_regular, self.font_bold = PDFFontManager.get_fonts()

    def _load_diet_colors(self) -> dict[str, str]:
        """Resolve colors only for diets that occur in this report."""
        from ..models import Diet

        diet_names = {
            diet_name
            for order in self.orders
            for category in OrderData(
                order.data if isinstance(order.data, dict) else {}
            ).iter_categories()
            for diet_name, count in category.diets.items()
            if safe_count(count) > 0
        }
        return dict(
            Diet.objects.filter(name__in=diet_names).values_list("name", "color")
        )

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
            data = order.data if isinstance(order.data, dict) else {}
            visible_meals = getattr(order.prevadzka, "visible_meals", None) or [
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
        menu_totals = defaultdict(int)
        diet_totals = defaultdict(int)
        for cat_name in ordered:
            category = categories[cat_name]
            menus_str = ", ".join(
                self._pdf_item_label(category, "menus", k, safe_count(v))
                for k, v in sorted(category.menu_counts.items())
                if safe_count(v) > 0
            )
            diet_items = [
                (
                    k,
                    self._pdf_item_label(
                        category, "diets", k, safe_count(v), diet=True
                    ),
                )
                for k, v in sorted(category.diets.items())
                if safe_count(v) > 0
            ]
            if menus_str or diet_items:
                rows.append(
                    [
                        cat_name,
                        menus_str or "–",
                        self._diet_cell(diet_items, col_widths[2], font_regular),
                    ]
                )
                for key, value in category.menu_counts.items():
                    menu_totals[key] += max(safe_count(value), 0)
                for key, value in category.diets.items():
                    diet_totals[key] += max(safe_count(value), 0)

        if len(rows) == 1:
            return None

        meal_total = sum(menu_totals.values())
        menu_totals_str = ", ".join(
            f"{key}×{count}" for key, count in sorted(menu_totals.items()) if count
        )
        diet_total_items = [
            (key, f"{key}×{count}")
            for key, count in sorted(diet_totals.items())
            if count
        ]
        rows.append(
            [
                "SPOLU",
                f"{menu_totals_str} (celkovo: {meal_total})",
                self._diet_cell(diet_total_items, col_widths[2], font_bold),
            ]
        )

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
                    ("FONTNAME", (0, -1), (-1, -1), font_bold),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [bg, reportlab_colors.white]),
                    (
                        "BACKGROUND",
                        (0, -1),
                        (-1, -1),
                        reportlab_colors.HexColor("#e2e8f0"),
                    ),
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

    @staticmethod
    def _pack_count(category, kind: str, key: str) -> int:
        values = category.pack_separately.get(kind, {})
        return safe_count(values.get(key, 0)) if isinstance(values, dict) else 0

    def _pdf_item_label(
        self, category, kind: str, key: str, count: int, diet: bool = False
    ) -> str:
        label = key if diet and count == 1 else f"{key}×{count}"
        separate_count = self._pack_count(category, kind, key)
        if separate_count:
            label += f" (zvlášť: {separate_count})"
        return label

    def _diet_cell(self, items, width, font_name):
        """Build individually colored diet labels inside one outer table cell."""
        from reportlab.lib import colors as reportlab_colors
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.platypus import Paragraph, Table, TableStyle

        if not items:
            return ""
        rows = []
        style_commands = []
        paragraph_style = ParagraphStyle(
            "diet-cell", fontName=font_name, fontSize=8, leading=10
        )
        for row_idx, (diet_name, label) in enumerate(items):
            color = self._pdf_color(self.diet_colors.get(diet_name)) or "#FDE68A"
            rows.append([Paragraph(escape(label), paragraph_style)])
            style_commands.extend(
                [
                    (
                        "BACKGROUND",
                        (0, row_idx),
                        (0, row_idx),
                        reportlab_colors.HexColor(color),
                    ),
                    (
                        "TEXTCOLOR",
                        (0, row_idx),
                        (0, row_idx),
                        self._contrast_color(color, reportlab_colors),
                    ),
                ]
            )
        table = Table(rows, colWidths=[max(width - 10, 1)])
        table.setStyle(
            TableStyle(
                style_commands
                + [
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ]
            )
        )
        return table

    @staticmethod
    def _pdf_color(value: object) -> str | None:
        color = str(value or "").strip()
        candidate = color.lstrip("#")
        if len(candidate) == 6 and all(
            char in "0123456789abcdefABCDEF" for char in candidate
        ):
            return f"#{candidate.upper()}"
        return None

    @staticmethod
    def _contrast_color(hex_color: str, reportlab_colors):
        value = hex_color.lstrip("#")
        red, green, blue = (int(value[index : index + 2], 16) for index in (0, 2, 4))
        luminance = (299 * red + 587 * green + 114 * blue) / 1000
        return reportlab_colors.black if luminance >= 140 else reportlab_colors.white

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
