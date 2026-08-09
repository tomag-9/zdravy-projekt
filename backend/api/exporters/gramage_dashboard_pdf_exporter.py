"""PDF exporter for the gramage dashboard (orders × templates × coefficients).

Mirrors the AdminDashboard "Gramáž jedál" screen: same meal-hue header
colours, same diet colours, same delivery-block/route grouping and portion
summaries — see gramage_dashboard_export.py for the shared presentation
logic this and the XLSX exporter both build on.
"""

from __future__ import annotations

import io

from .gramage_dashboard_export import (
    BRAND,
    MEAL_PALETTE,
    blend_with_white,
    component_subtitle,
    diet_color,
    flat_client_rows,
    group_label,
    meal_hue,
    portion_summary,
)
from .report_helpers import PDFFontManager


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

        self.rendered_rows: list[dict] = []

        font_r, font_b = PDFFontManager.get_fonts()
        brand_green = colors.HexColor(f"#{BRAND['green_800']}")
        brand_green_dark = colors.HexColor(f"#{BRAND['green_900']}")
        brand_cream = colors.HexColor(f"#{BRAND['cream_soft']}")
        brand_line = colors.HexColor(f"#{BRAND['line']}")
        standard_fill = colors.HexColor(
            f"#{blend_with_white(BRAND['green_500'], 0.16)}"
        )

        def para(text, bold=False, size=8, color=None):
            style = ParagraphStyle(
                "s",
                fontName=font_b if bold else font_r,
                fontSize=size,
                leading=size + 2,
                textColor=color or colors.HexColor("#111827"),
            )
            return Paragraph(str(text), style)

        col_groups = self.data["col_groups"]
        totals = self.data["totals"]
        all_rows = flat_client_rows(self.data)

        # ── Per-column-group meal hue (mirrors AdminDashboard.tsx mealHue) ──
        group_colors = []
        for cg in col_groups:
            dark_hex, mid_hex, light_hex = MEAL_PALETTE[
                meal_hue(cg["meal"], cg.get("variant"))
            ]
            group_colors.append(
                (
                    colors.HexColor(f"#{dark_hex}"),
                    colors.HexColor(f"#{mid_hex}"),
                    colors.HexColor(f"#{light_hex}"),
                )
            )

        # ── Build column header structure ─────────────────────────────────
        # Row 0: Prevádzka/Riadok | Počet | meal-group labels (merged)
        # Row 1: (same) | (same) | component labels
        hdr0 = [
            para("Prevádzka / Riadok", bold=True, color=colors.white),
            para("Počet", bold=True, color=colors.white),
        ]
        hdr1 = ["", ""]
        for cg, (dark, mid, _light) in zip(col_groups, group_colors):
            hdr0.append(para(group_label(cg), bold=True, color=colors.white))
            hdr0.extend([""] * (len(cg["components"]) - 1))
            for comp in cg["components"]:
                subtitle = component_subtitle(comp)
                hdr1.append(
                    para(f"{comp['label']} ({subtitle})", bold=True, color=colors.white)
                )

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
            ("BACKGROUND", (0, 0), (1, 1), brand_green_dark),
            ("TEXTCOLOR", (0, 0), (-1, 1), colors.white),
            ("FONTNAME", (0, 0), (-1, 1), font_b),
            ("GRID", (0, 0), (-1, -1), 0.3, brand_line),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            *span_commands,
        ]
        # Each meal-group header gets its own hue (dark for the label row,
        # mid tone for the component subtitle row) instead of one flat blue.
        col_offset = 2
        for cg, (dark, mid, _light) in zip(col_groups, group_colors):
            n = len(cg["components"])
            style_cmds.append(
                ("BACKGROUND", (col_offset, 0), (col_offset + n - 1, 0), dark)
            )
            style_cmds.append(
                ("BACKGROUND", (col_offset, 1), (col_offset + n - 1, 1), mid)
            )
            col_offset += n

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

        def add_band_row(label, background, text_color=colors.white):
            self.rendered_rows.append(
                {"label": label, "count": None, "col_grams": None}
            )
            row_index = len(table_data)
            table_data.append(
                [para(label, bold=True, color=text_color)] + [""] * (total_cols - 1)
            )
            style_cmds.extend(
                [
                    ("BACKGROUND", (0, row_index), (-1, row_index), background),
                    ("SPAN", (0, row_index), (-1, row_index)),
                    ("FONTNAME", (0, row_index), (-1, row_index), font_b),
                ]
            )

        def add_summary_row(label, count, col_grams, background, text_color=None):
            self.rendered_rows.append(
                {"label": label, "count": count, "col_grams": col_grams}
            )
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

        def add_portion_summary(
            title,
            summary_rows,
            background=brand_green,
            text_color=colors.white,
        ):
            add_band_row(title, background, text_color)
            for item in summary_rows:
                add_summary_row(
                    item["label"],
                    item["count"],
                    item["col_grams"],
                    standard_fill,
                )

        def add_client_row(row, zebra: bool):
            r_idx = len(table_data)
            client_label = (
                f"{row['client']}  (spolu porcii {row.get('total_count', 0)})"
            )
            cat_row = [para(client_label, bold=True)] + [""] * (total_cols - 1)
            table_data.append(cat_row)
            row_bg = brand_cream if zebra else colors.white
            style_cmds.extend(
                [
                    ("BACKGROUND", (0, r_idx), (-1, r_idx), row_bg),
                    ("SPAN", (0, r_idx), (-1, r_idx)),
                    ("FONTNAME", (0, r_idx), (-1, r_idx), font_b),
                ]
            )

            for sr in row["sub_rows"]:
                is_diet = sr["type"] in {"diet", "zvlast"}
                cells = make_cells(sr["label"], sr["count"], sr["col_grams"], is_diet)
                sr_idx = len(table_data)
                table_data.append(cells)
                if is_diet:
                    fill_hex = blend_with_white(diet_color(self.data, sr))
                    style_cmds.append(
                        (
                            "BACKGROUND",
                            (0, sr_idx),
                            (-1, sr_idx),
                            colors.HexColor(f"#{fill_hex}"),
                        )
                    )

            add_summary_row(
                "Súčet bez diét",
                row.get("standard_total_count", 0),
                row.get("standard_col_grams", []),
                standard_fill,
            )
            for diet_row in row.get("diet_summary_rows", []):
                fill_hex = blend_with_white(diet_color(self.data, diet_row), 0.22)
                add_summary_row(
                    diet_row["name"],
                    diet_row["count"],
                    diet_row["col_grams"],
                    colors.HexColor(f"#{fill_hex}"),
                )

            if row.get("admin_order_note"):
                note_label = f"Poznámka k objednávke: {row['admin_order_note']}"
                self.rendered_rows.append(
                    {"label": note_label, "count": None, "col_grams": None}
                )
                note_idx = len(table_data)
                table_data.append([para(note_label)] + [""] * (total_cols - 1))
                style_cmds.extend(
                    [
                        (
                            "BACKGROUND",
                            (0, note_idx),
                            (-1, note_idx),
                            colors.HexColor("#EAF0E0"),
                        ),
                        ("SPAN", (0, note_idx), (-1, note_idx)),
                    ]
                )

            if row.get("delivery_note"):
                note_label = f"Poznámka: {row['delivery_note']}"
                self.rendered_rows.append(
                    {"label": note_label, "count": None, "col_grams": None}
                )
                note_idx = len(table_data)
                table_data.append([para(note_label)] + [""] * (total_cols - 1))
                style_cmds.extend(
                    [
                        (
                            "BACKGROUND",
                            (0, note_idx),
                            (-1, note_idx),
                            colors.HexColor("#EEF2E3"),
                        ),
                        ("SPAN", (0, note_idx), (-1, note_idx)),
                    ]
                )

        blocks = self.data.get("blocks") or []
        unassigned_rows = self.data.get("unassigned_rows") or []
        if blocks:
            for block_index, block in enumerate(blocks):
                add_band_row(block["name"], brand_green_dark)
                for route in block.get("routes", []):
                    suffix = []
                    if route.get("departure_time"):
                        suffix.append(route["departure_time"][:5])
                    if route.get("driver"):
                        suffix.append(route["driver"])
                    route_label = route["name"]
                    if suffix:
                        route_label = f"{route_label} - {' / '.join(suffix)}"
                    add_band_row(route_label, brand_green, colors.white)
                    for zebra, row in enumerate(route.get("rows", [])):
                        add_client_row(row, zebra % 2 == 1)
                block_rows = [
                    row
                    for route in block.get("routes", [])
                    for row in route.get("rows", [])
                ]
                add_portion_summary(
                    f"Súhrn porcií {block_index + 1}",
                    portion_summary(self.data, block_rows),
                )
            if unassigned_rows:
                add_band_row(
                    "Nepriradené prevádzky",
                    colors.HexColor("#C64545"),
                )
                for zebra, row in enumerate(unassigned_rows):
                    add_client_row(row, zebra % 2 == 1)
        else:
            for zebra, row in enumerate(all_rows):
                add_client_row(row, zebra % 2 == 1)

        add_portion_summary(
            "Porcie celkom",
            portion_summary(self.data),
            background=brand_green_dark,
        )

        # Totals row
        t_idx = len(table_data)
        t_cells = [para("CELKOM", bold=True, color=colors.white), ""]
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
            ("BACKGROUND", (0, t_idx), (-1, t_idx), brand_green_dark),
            ("TEXTCOLOR", (0, t_idx), (-1, t_idx), colors.white),
            ("FONTNAME", (0, t_idx), (-1, t_idx), font_b),
        ]

        # ── Column widths ────────────────────────────────────────────────
        label_w, count_w = 5.5 * cm, 1.5 * cm
        comp_w = 1.8 * cm
        n_components = sum(len(cg["components"]) for cg in col_groups)
        col_widths = [label_w, count_w] + [comp_w] * n_components

        # Landscape A3 leaves a lot of unused width when there are only a
        # handful of components — stretch the columns to fill the page
        # instead of leaving the right side blank (capped so a day with
        # very few columns doesn't get comically wide cells).
        usable_width = landscape(A3)[0] - 2.4 * cm
        used_width = sum(col_widths)
        if used_width < usable_width:
            scale = min(usable_width / used_width, 1.6)
            col_widths = [w * scale for w in col_widths]

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
                    ParagraphStyle(
                        "sh",
                        fontName=font_b,
                        fontSize=12,
                        leading=15,
                        textColor=brand_green_dark,
                    ),
                )
            )
            summary_elements.append(Spacer(1, 0.3 * cm))

            sum_rows = [
                [
                    para("Jedlo / Porcia", bold=True, color=colors.white),
                    para("Počet", bold=True, color=colors.white),
                ]
            ]
            sum_style = [
                ("BACKGROUND", (0, 0), (-1, 0), brand_green_dark),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), font_b),
                ("GRID", (0, 0), (-1, -1), 0.3, brand_line),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
            for section in count_summary:
                has_content = section.get("standard") or section.get("diets")
                if not has_content:
                    continue
                dark_hex, _mid, light_hex = MEAL_PALETTE[
                    meal_hue(section.get("meal", ""), section.get("variant"))
                ]
                sec_idx = len(sum_rows)
                sum_rows.append(
                    [para(section["label"], bold=True, size=9, color=colors.white), ""]
                )
                sum_style += [
                    (
                        "BACKGROUND",
                        (0, sec_idx),
                        (-1, sec_idx),
                        colors.HexColor(f"#{dark_hex}"),
                    ),
                    ("FONTNAME", (0, sec_idx), (-1, sec_idx), font_b),
                    ("SPAN", (0, sec_idx), (-1, sec_idx)),
                ]
                for row in section.get("standard", []):
                    row_idx = len(sum_rows)
                    sum_rows.append(
                        [para(f"  {row['name']}"), para(f"{row['count']}×")]
                    )
                    sum_style.append(
                        (
                            "BACKGROUND",
                            (0, row_idx),
                            (-1, row_idx),
                            colors.HexColor(f"#{light_hex}"),
                        )
                    )
                for row in section.get("diets", []):
                    diet_idx = len(sum_rows)
                    sum_rows.append(
                        [para(f"  {row['label']}"), para(f"{row['count']}×")]
                    )
                    diet_fill_hex = blend_with_white(
                        diet_color(self.data, {"name": row["label"]}), 0.22
                    )
                    sum_style.append(
                        (
                            "BACKGROUND",
                            (0, diet_idx),
                            (-1, diet_idx),
                            colors.HexColor(f"#{diet_fill_hex}"),
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
            title=f"Gramáž jedál {self.data['date']}",
        )
        doc.build(
            [
                Paragraph(
                    f"Gramáž jedál — {self.data['date']}",
                    ParagraphStyle(
                        "title",
                        fontName=font_b,
                        fontSize=14,
                        leading=18,
                        textColor=brand_green_dark,
                    ),
                ),
                Spacer(1, 0.4 * cm),
                t,
                *summary_elements,
            ]
        )
        return buf.getvalue()
