"""Shared XLSX report helper functions."""

from typing import Any

from .order_data import OrderData, safe_count
from .utils import user_operation_name


def xlsx_collect_columns(rows_data, meal_keys):
    """Gather every (category, menu, diet) combination per meal."""
    CAT_ORDER = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]
    raw: dict[str, dict[str, dict[str, set[Any]]]] = {m: {} for m in meal_keys}

    for row in rows_data:
        for category in OrderData(row["data"]).iter_categories():
            if category.meal not in raw:
                continue
            for key, cnt in category.menu_counts.items():
                if safe_count(cnt) > 0:
                    raw[category.meal].setdefault(
                        category.name, {"menus": set(), "diets": set()}
                    )
                    raw[category.meal][category.name]["menus"].add(key)
            for key, cnt in category.diets.items():
                if safe_count(cnt) > 0:
                    raw[category.meal].setdefault(
                        category.name, {"menus": set(), "diets": set()}
                    )
                    raw[category.meal][category.name]["diets"].add(key)

    sorted_cats = {}
    for mk in meal_keys:
        sorted_cat_keys = sorted(
            raw[mk].keys(),
            key=lambda c: (CAT_ORDER.index(c) if c in CAT_ORDER else 99, c),
        )
        sorted_cats[mk] = {
            cat: {
                "menus": sorted(raw[mk][cat]["menus"]),
                "diets": sorted(raw[mk][cat]["diets"]),
            }
            for cat in sorted_cat_keys
        }
    return sorted_cats


def xlsx_build_column_meta(sorted_cats, meal_keys, meal_labels):
    """Build 3 header rows and column metadata list."""
    col_meta = [("fixed", None, "name", None)]
    header_row_1 = ["Prevádzka"]
    header_row_2 = [""]
    header_row_3 = [""]

    for mk in meal_keys:
        cats = sorted_cats[mk]
        inner_cols = sum(len(v["menus"]) + len(v["diets"]) for v in cats.values())
        meal_span = inner_cols + 1
        header_row_1 += [meal_labels[mk]] + [""] * (meal_span - 1)

        for cat_name, cat_data in cats.items():
            cat_span = len(cat_data["menus"]) + len(cat_data["diets"])
            header_row_2 += [cat_name] + [""] * max(cat_span - 1, 0)
            for menu_key in cat_data["menus"]:
                header_row_3.append(f"Menu {menu_key}")
                col_meta.append((mk, cat_name, "menu", menu_key))
            for diet_name in cat_data["diets"]:
                header_row_3.append(diet_name)
                col_meta.append((mk, cat_name, "diet", diet_name))

        header_row_2.append("Spolu")
        header_row_3.append("")
        col_meta.append((mk, None, "total", None))

    header_row_1.append("Celkovo")
    header_row_2.append("")
    header_row_3.append("")
    col_meta.append(("fixed", None, "grand_total", None))
    return col_meta, header_row_1, header_row_2, header_row_3


def xlsx_style_headers(
    ws,
    col_meta,
    sorted_cats,
    meal_keys,
    header_fill_main,
    header_fill_meal,
    header_font,
    center,
):
    """Apply fills, fonts, merges to header rows."""
    total_cols = len(col_meta)
    current_col = 2
    for mk in meal_keys:
        cats = sorted_cats[mk]
        inner_cols = sum(len(v["menus"]) + len(v["diets"]) for v in cats.values())
        meal_span = inner_cols + 1
        if meal_span > 1:
            ws.merge_cells(
                start_row=3,
                start_column=current_col,
                end_row=3,
                end_column=current_col + meal_span - 1,
            )
        cell = ws.cell(row=3, column=current_col)
        cell.fill = header_fill_meal[mk]
        cell.font = header_font
        cell.alignment = center
        current_col += meal_span

    for c in [1, total_cols]:
        cell = ws.cell(row=3, column=c)
        cell.fill = header_fill_main
        cell.font = header_font
        cell.alignment = center

    row45_fill = {}
    current_col = 2
    for mk in meal_keys:
        for cat_name, cat_data in sorted_cats[mk].items():
            cat_span = len(cat_data["menus"]) + len(cat_data["diets"])
            if cat_span > 0:
                if cat_span > 1:
                    ws.merge_cells(
                        start_row=4,
                        start_column=current_col,
                        end_row=4,
                        end_column=current_col + cat_span - 1,
                    )
                for c in range(current_col, current_col + cat_span):
                    row45_fill[c] = header_fill_meal[mk]
                cell = ws.cell(row=4, column=current_col)
                cell.fill = header_fill_meal[mk]
                cell.font = header_font
                cell.alignment = center
                current_col += cat_span
        row45_fill[current_col] = header_fill_meal[mk]
        cell = ws.cell(row=4, column=current_col)
        cell.fill = header_fill_meal[mk]
        cell.font = header_font
        cell.alignment = center
        current_col += 1

    for c in [1, total_cols]:
        cell = ws.cell(row=4, column=c)
        cell.fill = header_fill_main
        cell.font = header_font
        cell.alignment = center

    for c_idx in range(1, total_cols + 1):
        cell = ws.cell(row=5, column=c_idx)
        cell.fill = row45_fill.get(c_idx, header_fill_main)
        cell.font = header_font
        cell.alignment = center

    ws.merge_cells(start_row=3, start_column=1, end_row=5, end_column=1)
    ws.merge_cells(
        start_row=3, start_column=total_cols, end_row=5, end_column=total_cols
    )


def xlsx_write_data(ws, rows_data, meal_keys, sorted_cats, bold_font):
    """Append per-user data rows and SPOLU totals row."""
    totals = {
        mk: {
            cat: {
                "menus": {m: 0 for m in cat_data["menus"]},
                "diets": {d: 0 for d in cat_data["diets"]},
            }
            for cat, cat_data in cats.items()
        }
        for mk, cats in sorted_cats.items()
    }
    meal_totals = {mk: 0 for mk in meal_keys}
    grand_total = 0

    for row_info in rows_data:
        user = row_info["user"]
        data = row_info["data"]
        visible_meals = row_info.get("visible_meals") or meal_keys
        display_name = user_operation_name(user)
        row_vals: list[Any] = [display_name]
        row_grand = 0
        for mk in meal_keys:
            meal_col_count = (
                sum(
                    len(cat_data["menus"]) + len(cat_data["diets"])
                    for cat_data in sorted_cats[mk].values()
                )
                + 1
            )
            if mk not in visible_meals:
                row_vals.extend([""] * meal_col_count)
                continue
            categories = {
                category.name: category
                for category in OrderData(data).iter_categories(mk)
            }
            meal_total = 0
            for cat_name, cat_data in sorted_cats[mk].items():
                category = categories.get(cat_name)
                for menu_key in cat_data["menus"]:
                    cnt = safe_count(
                        category.menu_counts.get(menu_key, 0) if category else 0
                    )
                    row_vals.append(cnt or "")
                    totals[mk][cat_name]["menus"][menu_key] += cnt
                    meal_total += cnt
                for diet_name in cat_data["diets"]:
                    cnt = safe_count(
                        category.diets.get(diet_name, 0) if category else 0
                    )
                    row_vals.append(cnt or "")
                    totals[mk][cat_name]["diets"][diet_name] += cnt
            row_vals.append(meal_total or "")
            meal_totals[mk] += meal_total
            row_grand += meal_total
        row_vals.append(row_grand or "")
        grand_total += row_grand
        ws.append(row_vals)

    total_row: list[Any] = ["SPOLU"]
    for mk in meal_keys:
        for cat_name, cat_data in sorted_cats[mk].items():
            for menu_key in cat_data["menus"]:
                total_row.append(totals[mk][cat_name]["menus"].get(menu_key, 0) or "")
            for diet_name in cat_data["diets"]:
                total_row.append(totals[mk][cat_name]["diets"].get(diet_name, 0) or "")
        total_row.append(meal_totals[mk] or "")
    total_row.append(grand_total or "")
    ws.append(total_row)

    totals_row_num = ws.max_row
    for c_idx in range(1, ws.max_column + 1):
        ws.cell(row=totals_row_num, column=c_idx).font = bold_font
