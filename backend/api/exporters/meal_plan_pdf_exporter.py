"""PDF Exporter for the Jedálniček (Meal Plan) module."""

from __future__ import annotations

import io

from .pdf_exporter import PDFFontManager


class MealPlanPDFExporter:
    """
    Generate a PDF gramage report from a single
    MealPlanService.calculate_gramage() dict.
    """

    def __init__(self, gramage: dict):
        self.gramage = gramage

    def generate(self) -> bytes:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        font_regular, font_bold = PDFFontManager.get_fonts()
        styles = getSampleStyleSheet()
        style_title = styles["Title"]
        style_title.fontName = font_bold

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A4),
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm,
        )

        gramage = self.gramage
        enrolled = gramage["enrolled_summary"]
        sections = gramage["sections"]
        portion_names = [e["portion_type"] for e in enrolled]

        elements = []

        # Title
        elements.append(Paragraph(f"Jedálniček — {gramage['date']}", style_title))
        elements.append(Spacer(1, 0.4 * cm))

        # Enrolled summary table
        enrolled_data = [
            [
                Paragraph("Typ porcie", self._bold_para_style(font_bold)),
                Paragraph("Koeficient", self._bold_para_style(font_bold)),
                Paragraph("Počet osôb", self._bold_para_style(font_bold)),
            ]
        ]
        for e in enrolled:
            pct = int(float(e["coefficient"]) * 100)
            enrolled_data.append([e["portion_type"], f"{pct}%", str(e["count"])])

        enrolled_table = Table(enrolled_data, colWidths=[5 * cm, 3 * cm, 3 * cm])
        enrolled_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), font_bold),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ]
            )
        )
        elements.append(enrolled_table)
        elements.append(Spacer(1, 0.6 * cm))

        # Meal sections
        header = (
            ["Šablóna", "Základ (g)"]
            + [f"{name}" for name in portion_names]
            + ["Celkom (g)"]
        )

        def make_section_table(label, items_list, section_total):
            if not items_list:
                return

            table_data = [
                [Paragraph(label, self._bold_para_style(font_bold))]
                + [""] * (len(header) - 1)
            ]
            table_data.append(
                [Paragraph(h, self._bold_para_style(font_bold)) for h in header]
            )

            for item in items_list:
                counts_by_pt = {
                    b["portion_type"]: b["total_grams"] for b in item["breakdown"]
                }
                row = (
                    [item["template_name"], item["base_weight_grams"]]
                    + [counts_by_pt.get(n, "0.00") for n in portion_names]
                    + [item["item_total_grams"]]
                )
                table_data.append(row)

            total_row = ["SPOLU", ""] + [""] * len(portion_names) + [section_total]
            table_data.append(total_row)

            col_widths = (
                [5 * cm, 2.5 * cm] + [2.5 * cm] * len(portion_names) + [2.5 * cm]
            )

            t = Table(table_data, colWidths=col_widths)
            t.setStyle(
                TableStyle(
                    [
                        # Section label row (row 0)
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
                        ("FONTNAME", (0, 0), (-1, 0), font_bold),
                        ("SPAN", (0, 0), (-1, 0)),
                        # Header row (row 1)
                        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#2563EB")),
                        ("TEXTCOLOR", (0, 1), (-1, 1), colors.white),
                        ("FONTNAME", (0, 1), (-1, 1), font_bold),
                        # Total row
                        ("FONTNAME", (0, -1), (-1, -1), font_bold),
                        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
                        # Grid
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ]
                )
            )
            elements.append(t)
            elements.append(Spacer(1, 0.4 * cm))

        SECTION_LABELS = {
            "breakfast_snack": "Raňajky-desiata",
            "soup": "Polievka",
            "main_course": "Hlavný chod",
            "afternoon_snack": "Olovrant",
        }
        for category, label in SECTION_LABELS.items():
            section = sections.get(category, {})
            make_section_table(
                label,
                section.get("items", []),
                section.get("section_total_grams", "0.00"),
            )

        # Grand total
        elements.append(Spacer(1, 0.3 * cm))
        gt_data = [
            [
                Paragraph(
                    "CELKOVÁ GRAMÁŽ (g)", self._bold_para_style(font_bold, size=12)
                ),
                Paragraph(
                    gramage["grand_total_grams"],
                    self._bold_para_style(font_bold, size=12),
                ),
            ]
        ]
        gt_table = Table(gt_data, colWidths=[8 * cm, 4 * cm])
        gt_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1E40AF")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.white),
                    ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ]
            )
        )
        elements.append(gt_table)

        doc.build(elements)
        return buf.getvalue()

    @staticmethod
    def _bold_para_style(font_name: str, size: int = 9):
        from reportlab.lib.styles import ParagraphStyle

        return ParagraphStyle(
            name="bold",
            fontName=font_name,
            fontSize=size,
            leading=size + 2,
        )
