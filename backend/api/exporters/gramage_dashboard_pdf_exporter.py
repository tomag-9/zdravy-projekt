"""PDF exporter for the gramage dashboard (orders × templates × coefficients)."""

from __future__ import annotations

import io

from .pdf_exporter import PDFFontManager


class GramageDashboardPDFExporter:
    def __init__(self, data: dict):
        self.data = data

    def generate(self) -> bytes:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A3, landscape
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        font_r, font_b = PDFFontManager.get_fonts()

        def para(text, bold=False, size=8):
            return Paragraph(
                str(text),
                ParagraphStyle(
                    "s",
                    fontName=font_b if bold else font_r,
                    fontSize=size,
                    leading=size + 2,
                ),
            )

        col_groups = self.data["col_groups"]
        rows = self.data["rows"]
        totals = self.data["totals"]

        # ── Build column header structure ─────────────────────────────────
        # Row 0: Prevádzka/Riadok | Počet | meal-group labels (merged)
        # Row 1: (same) | (same) | component labels
        hdr0 = [para("Prevádzka / Riadok", bold=True), para("Počet", bold=True)]
        hdr1 = ["", ""]
        for cg in col_groups:
            hdr0.append(para(cg["label"], bold=True))
            hdr0.extend([""] * (len(cg["components"]) - 1))
            for comp in cg["components"]:
                base_g = int(float(comp["base_grams"]))
                hdr1.append(para(f'{comp["label"]} ({base_g}g)', bold=True))

        table_data = [hdr0, hdr1]

        # Span commands for meal group headers
        span_commands = [
            ("SPAN", (0, 0), (0, 1)),
            ("SPAN", (1, 0), (1, 1)),
        ]
        col_offset = 2
        for cg in col_groups:
            n = len(cg["components"])
            if n > 1:
                span_commands.append(("SPAN", (col_offset, 0), (col_offset + n - 1, 0)))
            col_offset += n

        # Styling commands (row-based, will grow)
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#1E40AF")),
            ("TEXTCOLOR", (0, 0), (-1, 1), colors.white),
            ("FONTNAME", (0, 0), (-1, 1), font_b),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CBD5E1")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            *span_commands,
        ]

        # ── Data rows ────────────────────────────────────────────────────
        total_cols = 2 + sum(len(cg["components"]) for cg in col_groups)

        def make_cells(label, count, col_grams, is_diet=False):
            cells = [
                para("  " + label if is_diet else label),
                str(count) if count else "",
            ]
            # Keep alignment strictly by col_groups index to avoid shifted values.
            for group_idx, cg in enumerate(col_groups):
                grams = col_grams[group_idx] if group_idx < len(col_grams) else []
                for comp_idx in range(len(cg["components"])):
                    if comp_idx < len(grams):
                        value = grams[comp_idx]
                        try:
                            cells.append(str(int(float(value))))
                        except (ValueError, TypeError):
                            cells.append(str(value))
                    else:
                        cells.append("")
            # pad to total_cols
            while len(cells) < total_cols:
                cells.append("")
            return cells[:total_cols]

        def add_summary_row(label, count, col_grams, background, text_color=None):
            row_index = len(table_data)
            table_data.append(make_cells(label, count, col_grams))
            style_cmds.append(
                ("BACKGROUND", (0, row_index), (-1, row_index), background)
            )
            style_cmds.append(("FONTNAME", (0, row_index), (-1, row_index), font_b))
            if text_color:
                style_cmds.append(
                    ("TEXTCOLOR", (0, row_index), (-1, row_index), text_color)
                )

        for row in rows:
            r_idx = len(table_data)
            client_label = (
                f"{row['client']}  (spolu porcii {row.get('total_count', 0)})"
            )
            cat_row = [para(client_label, bold=True)] + [""] * (total_cols - 1)
            table_data.append(cat_row)
            style_cmds += [
                ("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#F1F5F9")),
                ("SPAN", (0, r_idx), (-1, r_idx)),
                ("FONTNAME", (0, r_idx), (-1, r_idx), font_b),
            ]

            for sr in row["sub_rows"]:
                is_diet = sr["type"] == "diet"
                cells = make_cells(sr["label"], sr["count"], sr["col_grams"], is_diet)
                sr_idx = len(table_data)
                table_data.append(cells)
                if is_diet:
                    style_cmds.append(
                        (
                            "BACKGROUND",
                            (0, sr_idx),
                            (-1, sr_idx),
                            colors.HexColor("#FEF9C3"),
                        )
                    )

            add_summary_row(
                "Súčet bez diét",
                row.get("standard_total_count", 0),
                row.get("standard_col_grams", []),
                colors.HexColor("#DCFCE7"),
            )
            for diet_row in row.get("diet_summary_rows", []):
                add_summary_row(
                    diet_row["name"],
                    diet_row["count"],
                    diet_row["col_grams"],
                    colors.HexColor("#FEF3C7"),
                )

        # Totals row
        t_idx = len(table_data)
        t_cells = [para("CELKOM", bold=True), ""]
        for grams in totals:
            for g in grams:
                try:
                    t_cells.append(str(int(float(g))))
                except (ValueError, TypeError):
                    t_cells.append(str(g))
        while len(t_cells) < total_cols:
            t_cells.append("")
        table_data.append(t_cells[:total_cols])
        style_cmds += [
            ("BACKGROUND", (0, t_idx), (-1, t_idx), colors.HexColor("#1E40AF")),
            ("TEXTCOLOR", (0, t_idx), (-1, t_idx), colors.white),
            ("FONTNAME", (0, t_idx), (-1, t_idx), font_b),
        ]

        # ── Column widths ────────────────────────────────────────────────
        comp_w = 1.8 * cm
        col_widths = [5.5 * cm, 1.5 * cm]
        for cg in col_groups:
            col_widths.extend([comp_w] * len(cg["components"]))

        t = Table(table_data, colWidths=col_widths, repeatRows=2)
        t.setStyle(TableStyle(style_cmds))

        # ── Count summary table ──────────────────────────────────────────
        count_summary = self.data.get("count_summary", [])
        summary_elements = []
        if count_summary:
            summary_elements.append(Spacer(1, 0.6 * cm))
            summary_elements.append(
                Paragraph(
                    "Súhrn objednávok",
                    ParagraphStyle("sh", fontName=font_b, fontSize=12, leading=15),
                )
            )
            summary_elements.append(Spacer(1, 0.3 * cm))

            sum_rows = [[para("Jedlo / Porcia", bold=True), para("Počet", bold=True)]]
            sum_style = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E40AF")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), font_b),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CBD5E1")),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
            for section in count_summary:
                has_content = section.get("standard") or section.get("diets")
                if not has_content:
                    continue
                sec_idx = len(sum_rows)
                sum_rows.append([para(section["label"], bold=True, size=9), ""])
                sum_style += [
                    (
                        "BACKGROUND",
                        (0, sec_idx),
                        (-1, sec_idx),
                        colors.HexColor("#DBEAFE"),
                    ),
                    ("FONTNAME", (0, sec_idx), (-1, sec_idx), font_b),
                    ("SPAN", (0, sec_idx), (-1, sec_idx)),
                ]
                for row in section.get("standard", []):
                    sum_rows.append(
                        [para(f"  {row['name']}"), para(f"{row['count']}×")]
                    )
                for row in section.get("diets", []):
                    diet_idx = len(sum_rows)
                    sum_rows.append(
                        [para(f"  {row['label']}"), para(f"{row['count']}×")]
                    )
                    sum_style.append(
                        (
                            "BACKGROUND",
                            (0, diet_idx),
                            (-1, diet_idx),
                            colors.HexColor("#FEF9C3"),
                        )
                    )

            if len(sum_rows) > 1:
                sum_t = Table(sum_rows, colWidths=[8 * cm, 2 * cm])
                sum_t.setStyle(TableStyle(sum_style))
                summary_elements.append(sum_t)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A3),
            leftMargin=1.2 * cm,
            rightMargin=1.2 * cm,
            topMargin=1.2 * cm,
            bottomMargin=1.2 * cm,
        )
        doc.build(
            [
                Paragraph(
                    f"Gramáž jedál — {self.data['date']}",
                    ParagraphStyle("title", fontName=font_b, fontSize=14, leading=18),
                ),
                Spacer(1, 0.4 * cm),
                t,
                *summary_elements,
            ]
        )
        return buf.getvalue()
