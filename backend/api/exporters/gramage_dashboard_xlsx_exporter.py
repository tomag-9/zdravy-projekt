"""XLSX exporter for the gramage dashboard (orders × templates × coefficients)."""

from __future__ import annotations

import io


class GramageDashboardXLSXExporter:
    def __init__(self, data: dict):
        self.data = data

    def generate(self) -> bytes:
        import openpyxl
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = self.data["date"]

        col_groups = self.data["col_groups"]
        rows = self.data["rows"]
        totals = self.data["totals"]

        # Fonts & fills
        title_font = Font(bold=True, size=13)
        hdr_font = Font(bold=True, color="FFFFFF")
        hdr_fill = PatternFill("solid", fgColor="1E40AF")
        meal_hdr_fill = PatternFill("solid", fgColor="DBEAFE")
        menu_a_fill = PatternFill("solid", fgColor="DC2626")
        menu_b_fill = PatternFill("solid", fgColor="2563EB")
        cat_font = Font(bold=True)
        cat_fill = PatternFill("solid", fgColor="F1F5F9")
        diet_fill = PatternFill("solid", fgColor="FEF9C3")
        total_font = Font(bold=True, color="FFFFFF")
        total_fill = PatternFill("solid", fgColor="1E40AF")
        center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        right_align = Alignment(horizontal="right")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        def menu_variant_fill(label):
            upper = str(label).upper()
            if "MENU A" in upper:
                return menu_a_fill
            if "MENU B" in upper:
                return menu_b_fill
            return None

        # ── Column layout ───────────────────────────────────────────────────
        # Columns: A=Prevádzka/Riadok, B=Počet, then components
        BASE_COLS = 2  # A, B
        col_start = []  # 1-based start column for each col_group
        cur = BASE_COLS + 1
        for cg in col_groups:
            col_start.append(cur)
            cur += len(cg["components"])
        total_cols = cur - 1

        # ── Title row ───────────────────────────────────────────────────────
        ws.cell(row=1, column=1, value=f"Gramáž jedál — {self.data['date']}")
        ws["A1"].font = title_font
        ws.merge_cells(
            start_row=1, start_column=1, end_row=1, end_column=max(total_cols, 2)
        )
        ws.append([])  # blank row 2

        # ── Header row 1: Prevádzka, Počet, meal group labels ────────────────
        HDR_ROW = 3
        ws.cell(row=HDR_ROW, column=1, value="Prevádzka / Riadok")
        ws.cell(row=HDR_ROW, column=2, value="Počet")
        ws.merge_cells(
            start_row=HDR_ROW, start_column=1, end_row=HDR_ROW + 1, end_column=1
        )
        ws.merge_cells(
            start_row=HDR_ROW, start_column=2, end_row=HDR_ROW + 1, end_column=2
        )

        for i, cg in enumerate(col_groups):
            c = col_start[i]
            ws.cell(row=HDR_ROW, column=c, value=cg["label"])
            if len(cg["components"]) > 1:
                ws.merge_cells(
                    start_row=HDR_ROW,
                    start_column=c,
                    end_row=HDR_ROW,
                    end_column=c + len(cg["components"]) - 1,
                )

        # ── Header row 2: component labels with base gramage ────────────────
        for i, cg in enumerate(col_groups):
            for j, comp in enumerate(cg["components"]):
                base_g = int(float(comp["base_grams"]))
                ws.cell(
                    row=HDR_ROW + 1,
                    column=col_start[i] + j,
                    value=f'{comp["label"]} ({base_g}g)',
                )

        # Style both header rows
        for r in (HDR_ROW, HDR_ROW + 1):
            for c in range(1, total_cols + 1):
                cell = ws.cell(row=r, column=c)
                cell.font = hdr_font
                cell.fill = hdr_fill
                cell.alignment = center

        for i, cg in enumerate(col_groups):
            for j, comp in enumerate(cg["components"]):
                fill = menu_variant_fill(comp["label"])
                if fill:
                    ws.cell(row=HDR_ROW + 1, column=col_start[i] + j).fill = fill

        # Meal group header cells get a lighter fill for the label row
        for i, cg in enumerate(col_groups):
            cell = ws.cell(row=HDR_ROW, column=col_start[i])
            cell.fill = meal_hdr_fill
            cell.font = Font(bold=True)

        DATA_ROW = HDR_ROW + 2

        def write_row(label, count, col_grams, font=None, fill=None, indent=0):
            nonlocal DATA_ROW
            ws.cell(row=DATA_ROW, column=1, value=("  " * indent) + label)
            ws.cell(row=DATA_ROW, column=2, value=count)
            ws.cell(row=DATA_ROW, column=2).alignment = right_align
            for i, grams in enumerate(col_grams):
                for j, g in enumerate(grams):
                    c = col_start[i] + j
                    try:
                        ws.cell(row=DATA_ROW, column=c, value=float(g))
                    except (ValueError, TypeError):
                        ws.cell(row=DATA_ROW, column=c, value=g)
            if font or fill:
                for c in range(1, total_cols + 1):
                    cell = ws.cell(row=DATA_ROW, column=c)
                    if font:
                        cell.font = font
                    if fill:
                        cell.fill = fill
            DATA_ROW += 1

        def write_summary_row(label, count, col_grams, fill):
            write_row(label, count, col_grams, font=cat_font, fill=fill)

        # ── Data rows ────────────────────────────────────────────────────────
        for row in rows:
            # Client header
            ws.cell(
                row=DATA_ROW,
                column=1,
                value=f"{row['client']}  (spolu porcii {row.get('total_count', 0)})",
            )
            ws.merge_cells(
                start_row=DATA_ROW,
                start_column=1,
                end_row=DATA_ROW,
                end_column=total_cols,
            )
            for c in range(1, total_cols + 1):
                cell = ws.cell(row=DATA_ROW, column=c)
                cell.font = cat_font
                cell.fill = cat_fill
            DATA_ROW += 1

            for sr in row["sub_rows"]:
                f = (
                    diet_fill
                    if sr["type"] == "diet"
                    else menu_variant_fill(sr["label"])
                )
                write_row(
                    sr["label"],
                    sr["count"],
                    sr["col_grams"],
                    fill=f,
                    indent=1 if sr["type"] == "diet" else 0,
                )

            write_summary_row(
                "Súčet bez diét",
                row.get("standard_total_count", 0),
                row.get("standard_col_grams", []),
                PatternFill("solid", fgColor="DCFCE7"),
            )
            for diet_row in row.get("diet_summary_rows", []):
                write_summary_row(
                    diet_row["name"],
                    diet_row["count"],
                    diet_row["col_grams"],
                    PatternFill("solid", fgColor="FEF3C7"),
                )

        # ── Totals row ───────────────────────────────────────────────────────
        totals_count = sum(
            sum(sr["count"] for sr in r["sub_rows"] if sr["type"] == "standard")
            for r in rows
        )
        total_col_grams = [[g for g in grp] for grp in totals]
        ws.cell(row=DATA_ROW, column=1, value="CELKOM")
        ws.cell(row=DATA_ROW, column=2, value=totals_count)
        for i, grams in enumerate(total_col_grams):
            for j, g in enumerate(grams):
                try:
                    ws.cell(row=DATA_ROW, column=col_start[i] + j, value=float(g))
                except (ValueError, TypeError):
                    ws.cell(row=DATA_ROW, column=col_start[i] + j, value=g)
        for c in range(1, total_cols + 1):
            cell = ws.cell(row=DATA_ROW, column=c)
            cell.font = total_font
            cell.fill = total_fill

        # ── Column widths ────────────────────────────────────────────────────
        ws.column_dimensions["A"].width = 28
        ws.column_dimensions["B"].width = 8
        for i, cg in enumerate(col_groups):
            for j in range(len(cg["components"])):
                col_letter = openpyxl.utils.get_column_letter(col_start[i] + j)
                ws.column_dimensions[col_letter].width = 11

        # ── Count summary ────────────────────────────────────────────────────
        count_summary = self.data.get("count_summary", [])
        if count_summary:
            DATA_ROW += 2  # blank separator
            ws.cell(row=DATA_ROW, column=1, value="Súhrn objednávok")
            ws.cell(row=DATA_ROW, column=1).font = Font(bold=True, size=12)
            DATA_ROW += 1

            for section in count_summary:
                if not section.get("standard") and not section.get("diets"):
                    continue
                ws.cell(row=DATA_ROW, column=1, value=section["label"])
                ws.merge_cells(
                    start_row=DATA_ROW,
                    start_column=1,
                    end_row=DATA_ROW,
                    end_column=2,
                )
                for c in range(1, 3):
                    cell = ws.cell(row=DATA_ROW, column=c)
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill("solid", fgColor="1E40AF")
                    cell.alignment = center
                DATA_ROW += 1
                for row in section.get("standard", []):
                    ws.cell(row=DATA_ROW, column=1, value=f"  {row['name']}")
                    ws.cell(row=DATA_ROW, column=2, value=row["count"])
                    ws.cell(row=DATA_ROW, column=2).alignment = right_align
                    DATA_ROW += 1
                for row in section.get("diets", []):
                    ws.cell(row=DATA_ROW, column=1, value=f"  {row['label']}")
                    ws.cell(row=DATA_ROW, column=2, value=row["count"])
                    ws.cell(row=DATA_ROW, column=2).alignment = right_align
                    for c in range(1, 3):
                        ws.cell(row=DATA_ROW, column=c).fill = PatternFill(
                            "solid", fgColor="FEF9C3"
                        )
                    DATA_ROW += 1

        for row in ws.iter_rows(
            min_row=HDR_ROW,
            max_row=ws.max_row,
            min_col=1,
            max_col=ws.max_column,
        ):
            for cell in row:
                cell.border = thin_border

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()
