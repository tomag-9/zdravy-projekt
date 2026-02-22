import datetime
import io

from django.contrib.auth.models import User
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DailyOrder, Diet
from .serializers import DailyOrderSerializer
from .serializers_user import AdminUserSerializer, DietSerializer, UserProfileSerializer
from .services import _is_order_empty, _last_non_empty_order


class DailyOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DailyOrderSerializer
    # Authenticated users only
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = DailyOrder.objects.all()
        user = self.request.user

        if user.is_staff:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            else:
                # If no user_id is provided, return only the staff user's own orders
                # to prevent returning ALL orders by default (which breaks by_date logic).
                queryset = queryset.filter(user=user)
        else:
            queryset = queryset.filter(user=user)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Administrators cannot place orders.")
        # The serializer.save() will call create() which enables update_or_create logic
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="by-date/(?P<date>[^/.]+)")
    def by_date(self, request, date=None):
        try:
            order = self.get_queryset().get(date=date)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except DailyOrder.DoesNotExist:
            return Response(
                {"data": {}}, status=status.HTTP_200_OK
            )  # Return empty struct if not found


class UserProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for user profile management.
    """

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get", "patch"], url_path="profile")
    def profile(self, request):
        """Get or update current user's profile"""
        if request.method == "GET":
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)

        elif request.method == "PATCH":
            serializer = UserProfileSerializer(
                request.user, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DietViewSet(viewsets.ModelViewSet):
    queryset = Diet.objects.all()
    serializer_class = DietSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]
        return super().get_permissions()


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing users and their settings.
    """

    queryset = User.objects.all().order_by("username")
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminSummaryViewSet(viewsets.ViewSet):
    """
    Admin ViewSet for Dashboard Summaries.
    """

    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=["get"], url_path="daily-stats")
    def daily_stats(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = DailyOrder.objects.filter(date=date_str)

        # Structure:
        # meals: {
        #   "breakfast": { "CategoryName": { "menus": {"A": 10}, "diets": {"Gluten": 1}, "total": 10 } }
        # }
        stats = {
            "total_orders": 0,
            "status_breakdown": {"submitted": 0},
            "meals": {"breakfast": {}, "lunch": {}, "olovrant": {}},
        }

        for order in orders:
            stats["total_orders"] += 1
            # Status is now always submitted or ignored
            stats["status_breakdown"]["submitted"] += 1

            data = order.data or {}

            # Helper to aggregate a specific meal type (breakfast/lunch/olovrant)
            self._aggregate_meal(stats, data, "breakfast")
            self._aggregate_meal(stats, data, "lunch")
            self._aggregate_meal(stats, data, "olovrant")

        return Response(stats)

    def _aggregate_meal(self, stats, data, meal_key):
        if meal_key not in data or not data[meal_key]:
            return

        meal_data = data[meal_key]
        # iterate over categories in this meal
        # e.g. meal_data = { "Dospelý (SŠ)": { "menuCounts": {"A":1}, "diets": {} } }

        for category, details in meal_data.items():
            if not details:
                continue

            # Ensure category dict exists in stats
            if category not in stats["meals"][meal_key]:
                stats["meals"][meal_key][category] = {
                    "menus": {},
                    "diets": {},
                    "total": 0,
                }

            cat_stats = stats["meals"][meal_key][category]

            # Aggregate Menus
            menu_counts = details.get("menuCounts", {})
            for menu_type, count in menu_counts.items():
                count = int(count or 0)
                if count > 0:
                    cat_stats["menus"][menu_type] = (
                        cat_stats["menus"].get(menu_type, 0) + count
                    )
                    cat_stats["total"] += count

            # Aggregate Diets
            diets = details.get("diets", {})
            for diet_name, count in diets.items():
                count = int(count or 0)
                if count > 0:
                    cat_stats["diets"][diet_name] = (
                        cat_stats["diets"].get(diet_name, 0) + count
                    )

    # ------------------------------------------------------------------
    # Helpers shared by daily_report and daily_report_xlsx
    # ------------------------------------------------------------------

    @staticmethod
    def _build_user_meal_row(order_data: dict, meal_key: str) -> dict:
        """Return {categories: [{name, menus, diets, total}], total: int}."""
        meal = order_data.get(meal_key) or {}
        categories = []
        meal_total = 0
        for cat_name, details in meal.items():
            if not isinstance(details, dict):
                continue
            menu_counts = {k: int(v or 0) for k, v in (details.get("menuCounts") or {}).items()}
            diets = {k: int(v or 0) for k, v in (details.get("diets") or {}).items() if int(v or 0) > 0}
            cat_total = sum(menu_counts.values())
            meal_total += cat_total
            categories.append({"name": cat_name, "menus": menu_counts, "diets": diets, "total": cat_total})
        return {"categories": categories, "total": meal_total}

    @staticmethod
    def _merge_meal_totals(totals: dict, meal_row: dict) -> None:
        """Accumulate meal_row counts into totals dict (in-place)."""
        totals["total"] = totals.get("total", 0) + meal_row["total"]
        for cat in meal_row["categories"]:
            for menu, cnt in cat["menus"].items():
                totals.setdefault("menus", {})[menu] = totals["menus"].get(menu, 0) + cnt
            for diet, cnt in cat["diets"].items():
                totals.setdefault("diets", {})[diet] = totals["diets"].get(diet, 0) + cnt

    @action(detail=False, methods=["get"], url_path="daily-report")
    def daily_report(self, request):
        """
        Per-user order report for a given date.
        GET /api/admin/summary/daily-report/?date=YYYY-MM-DD
        """
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST)

        orders = (
            DailyOrder.objects
            .filter(date=date_str)
            .select_related("user")
            .order_by("user__username")
        )

        totals = {
            "breakfast": {"menus": {}, "diets": {}, "total": 0},
            "lunch": {"menus": {}, "diets": {}, "total": 0},
            "olovrant": {"menus": {}, "diets": {}, "total": 0},
            "grand": 0,
        }
        rows = []
        for order in orders:
            user = order.user
            data = order.data or {}
            bf = self._build_user_meal_row(data, "breakfast")
            lu = self._build_user_meal_row(data, "lunch")
            ol = self._build_user_meal_row(data, "olovrant")
            row_total = bf["total"] + lu["total"] + ol["total"]
            rows.append(
                {
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "username": user.username,
                    "email": user.email,
                    "breakfast": bf,
                    "lunch": lu,
                    "olovrant": ol,
                    "total": row_total,
                }
            )
            self._merge_meal_totals(totals["breakfast"], bf)
            self._merge_meal_totals(totals["lunch"], lu)
            self._merge_meal_totals(totals["olovrant"], ol)
            totals["grand"] += row_total

        return Response({"date": date_str, "rows": rows, "totals": totals})

    @action(detail=False, methods=["get"], url_path="daily-report-xlsx")
    def daily_report_xlsx(self, request):
        """
        Download per-user order report as XLSX.
        GET /api/admin/summary/daily-report-xlsx/?date=YYYY-MM-DD
        """
        import openpyxl
        from openpyxl.styles import Alignment, Font, PatternFill
        from openpyxl.utils import get_column_letter

        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST)

        orders = (
            DailyOrder.objects
            .filter(date=date_str)
            .select_related("user")
            .order_by("user__username")
        )

        # First pass: collect all menu keys and diet names per meal to build columns
        meal_keys = ["breakfast", "lunch", "olovrant"]
        all_menus = {m: set() for m in meal_keys}
        all_diets = {m: set() for m in meal_keys}
        rows_data = []

        for order in orders:
            data = order.data or {}
            user = order.user
            row = {"user": user, "data": data}
            rows_data.append(row)
            for mk in meal_keys:
                meal = data.get(mk) or {}
                for cat_name, details in meal.items():
                    if not isinstance(details, dict):
                        continue
                    for menu_key, cnt in (details.get("menuCounts") or {}).items():
                        if int(cnt or 0) > 0:
                            all_menus[mk].add(menu_key)
                    for diet_name, cnt in (details.get("diets") or {}).items():
                        if int(cnt or 0) > 0:
                            all_diets[mk].add(diet_name)

        # Sort for stable column order
        sorted_menus = {m: sorted(all_menus[m]) for m in meal_keys}
        sorted_diets = {m: sorted(all_diets[m]) for m in meal_keys}

        meal_labels = {"breakfast": "Raňajky", "lunch": "Obed", "olovrant": "Olovrant"}

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Prehlad {date_str}"

        # Styles
        header_fill_main = PatternFill("solid", fgColor="2563EB")
        header_fill_meal = {
            "breakfast": PatternFill("solid", fgColor="F97316"),
            "lunch": PatternFill("solid", fgColor="3B82F6"),
            "olovrant": PatternFill("solid", fgColor="22C55E"),
        }
        header_font = Font(bold=True, color="FFFFFF")
        bold_font = Font(bold=True)
        center = Alignment(horizontal="center", vertical="center")
        wrap = Alignment(wrap_text=True, vertical="top")

        # Title row
        ws.append([f"Denný prehľad objednávok — {date_str}"])
        ws["A1"].font = Font(bold=True, size=14)
        ws.append([])  # empty row

        # Build header columns: Klient, Email, then per meal: menus..., diets..., Spolu; then Celkovo
        header_row_1 = ["Klient", "Email"]
        header_row_2 = ["", ""]
        col_meta = []  # (meal_key_or_None, sub_type, key)

        # fixed columns
        col_meta.append(("fixed", "name", None))
        col_meta.append(("fixed", "email", None))

        for mk in meal_keys:
            menus = sorted_menus[mk]
            diets = sorted_diets[mk]
            span = len(menus) + len(diets) + 1  # +1 for Spolu
            header_row_1 += [meal_labels[mk]] + [""] * (span - 1)
            for menu_key in menus:
                header_row_2.append(f"Menu {menu_key}")
                col_meta.append((mk, "menu", menu_key))
            for diet_name in diets:
                header_row_2.append(diet_name)
                col_meta.append((mk, "diet", diet_name))
            header_row_2.append("Spolu")
            col_meta.append((mk, "total", None))

        header_row_1.append("Celkovo")
        header_row_2.append("")
        col_meta.append(("fixed", "grand_total", None))

        ws.append(header_row_1)
        ws.append(header_row_2)

        # Style header rows
        header1_row_num = 3
        header2_row_num = 4

        # Merge meal group cells on row 3
        current_col = 3  # 1-indexed, first two are Klient, Email
        for mk in meal_keys:
            menus = sorted_menus[mk]
            diets = sorted_diets[mk]
            span = len(menus) + len(diets) + 1
            if span > 1:
                ws.merge_cells(
                    start_row=header1_row_num, start_column=current_col,
                    end_row=header1_row_num, end_column=current_col + span - 1
                )
            cell = ws.cell(row=header1_row_num, column=current_col)
            cell.fill = header_fill_meal[mk]
            cell.font = header_font
            cell.alignment = center
            current_col += span

        # Style cols A, B on row 3 (Klient, Email)
        for c in [1, 2]:
            cell = ws.cell(row=header1_row_num, column=c)
            cell.fill = header_fill_main
            cell.font = header_font
            cell.alignment = center

        # Celkovo column on row 3
        celk_col = len(col_meta)
        cell = ws.cell(row=header1_row_num, column=celk_col)
        cell.fill = header_fill_main
        cell.font = header_font
        cell.alignment = center

        # Style row 4 (sub-headers)
        col_fill = {}
        c = 3
        for mk in meal_keys:
            menus = sorted_menus[mk]
            diets = sorted_diets[mk]
            for _ in menus + diets:
                col_fill[c] = header_fill_meal[mk]
                c += 1
            col_fill[c] = header_fill_meal[mk]
            c += 1

        for c_idx in range(1, len(col_meta) + 1):
            cell = ws.cell(row=header2_row_num, column=c_idx)
            if c_idx <= 2:
                cell.fill = header_fill_main
                cell.font = header_font
            elif c_idx in col_fill:
                cell.fill = col_fill[c_idx]
                cell.font = header_font
            else:
                cell.fill = header_fill_main
                cell.font = header_font
            cell.alignment = center

        # Merge Klient/Email across rows 3-4
        ws.merge_cells(start_row=3, start_column=1, end_row=4, end_column=1)
        ws.merge_cells(start_row=3, start_column=2, end_row=4, end_column=2)
        ws.merge_cells(start_row=3, start_column=celk_col, end_row=4, end_column=celk_col)

        # Data rows
        total_row_vals = {mk: {"menus": {m: 0 for m in sorted_menus[mk]}, "diets": {d: 0 for d in sorted_diets[mk]}, "total": 0} for mk in meal_keys}
        grand_total = 0

        for row_info in rows_data:
            user = row_info["user"]
            data = row_info["data"]
            display_name = f"{user.first_name} {user.last_name}".strip() or user.username
            row_vals = [display_name, user.email]

            row_grand = 0
            for mk in meal_keys:
                meal = data.get(mk) or {}
                menu_counts = {m: 0 for m in sorted_menus[mk]}
                diet_counts = {d: 0 for d in sorted_diets[mk]}
                meal_total = 0
                for cat_name, details in meal.items():
                    if not isinstance(details, dict):
                        continue
                    for menu_key, cnt in (details.get("menuCounts") or {}).items():
                        c = int(cnt or 0)
                        if menu_key in menu_counts:
                            menu_counts[menu_key] += c
                        meal_total += c
                    for diet_name, cnt in (details.get("diets") or {}).items():
                        c = int(cnt or 0)
                        if diet_name in diet_counts:
                            diet_counts[diet_name] += c

                for m in sorted_menus[mk]:
                    row_vals.append(menu_counts[m] or "")
                    total_row_vals[mk]["menus"][m] = total_row_vals[mk]["menus"].get(m, 0) + menu_counts[m]
                for d in sorted_diets[mk]:
                    row_vals.append(diet_counts[d] or "")
                    total_row_vals[mk]["diets"][d] = total_row_vals[mk]["diets"].get(d, 0) + diet_counts[d]
                row_vals.append(meal_total or "")
                total_row_vals[mk]["total"] += meal_total
                row_grand += meal_total

            row_vals.append(row_grand or "")
            grand_total += row_grand
            ws.append(row_vals)

        # Totals row
        total_row = ["SPOLU", ""]
        for mk in meal_keys:
            for m in sorted_menus[mk]:
                total_row.append(total_row_vals[mk]["menus"].get(m, 0) or "")
            for d in sorted_diets[mk]:
                total_row.append(total_row_vals[mk]["diets"].get(d, 0) or "")
            total_row.append(total_row_vals[mk]["total"] or "")
        total_row.append(grand_total or "")
        ws.append(total_row)

        # Bold totals row
        totals_row_num = ws.max_row
        for c_idx in range(1, len(col_meta) + 1):
            cell = ws.cell(row=totals_row_num, column=c_idx)
            cell.font = bold_font

        # Column widths
        ws.column_dimensions["A"].width = 28
        ws.column_dimensions["B"].width = 28
        for c_idx in range(3, len(col_meta) + 1):
            ws.column_dimensions[get_column_letter(c_idx)].width = 10
        ws.column_dimensions[get_column_letter(len(col_meta))].width = 10

        # Freeze panes below headers
        ws.freeze_panes = "A5"

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"prehlad_{date_str}.xlsx"
        response = HttpResponse(
            output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _next_workdays(start: datetime.date, count: int = 5) -> list[datetime.date]:
    """Return the next `count` Mon-Fri dates starting from (and including) start."""
    days = []
    d = start
    while len(days) < count:
        if d.weekday() < 5:  # Mon-Fri
            days.append(d)
        d += datetime.timedelta(days=1)
    return days


def _order_total(data: dict) -> tuple[int, dict]:
    """
    Return (total_portions, {meal: count}) for the order data dict.

    Supports both storage shapes:
    - Flat:            {"lunch": {"menuCounts": {"A": 5}}}
    - Category-nested: {"lunch": {"Dospelý": {"menuCounts": {"A": 5}}}}
    """
    meal_count = {"breakfast": 0, "lunch": 0, "olovrant": 0}
    total = 0
    for meal_key in ("breakfast", "lunch", "olovrant"):
        meal = data.get(meal_key, {}) or {}
        if "menuCounts" in meal:
            # Flat shape
            for count in (meal.get("menuCounts") or {}).values():
                c = int(count or 0)
                meal_count[meal_key] += c
                total += c
        else:
            # Category-nested shape
            for _cat, details in meal.items():
                if not isinstance(details, dict):
                    continue
                for count in (details.get("menuCounts") or {}).values():
                    c = int(count or 0)
                    meal_count[meal_key] += c
                    total += c
    return total, meal_count


# ---------------------------------------------------------------------------
# Planned orders endpoint
# ---------------------------------------------------------------------------


class PlannedOrdersViewSet(viewsets.ViewSet):
    """
    Returns the 5 upcoming workdays with order status for the logged-in client.
    GET /api/orders/planned/
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        today = timezone.localdate()
        workdays = _next_workdays(today, 5)

        existing = {
            o.date: o
            for o in DailyOrder.objects.filter(user=request.user, date__in=workdays)
        }

        # Single historical query — avoids N+1 when multiple days have no order.
        # The planned-week cascade (existing dict) is checked first in-memory;
        # this serves as the fallback for every unset day.
        historical_template = _last_non_empty_order(request.user, workdays[0])

        def _template_for_day(day):
            """
            Find the most recent non-empty order before `day`.
            Checks orders already placed in the planned week first (cascade
            forward), then falls back to the pre-fetched historical template.
            No additional DB queries are made here.
            """
            for prev_day in reversed([d for d in workdays if d < day]):
                prev = existing.get(prev_day)
                if prev and not _is_order_empty(prev.data or {}):
                    return prev
            return historical_template

        result = []
        for day in workdays:
            order = existing.get(day)
            if order:
                total, meal_count = _order_total(order.data or {})
                result.append(
                    {
                        "date": str(day),
                        "exists": True,
                        "is_auto": order.is_auto,
                        "is_empty": total == 0,
                        "totalPortions": total,
                        "mealCount": meal_count,
                        "predictedTotal": 0,
                        "predictedMealCount": {
                            "breakfast": 0,
                            "lunch": 0,
                            "olovrant": 0,
                        },
                    }
                )
            else:
                tmpl = _template_for_day(day)
                if tmpl:
                    predicted_total, predicted_meal_count = _order_total(
                        tmpl.data or {}
                    )
                else:
                    predicted_total = 0
                    predicted_meal_count = {"breakfast": 0, "lunch": 0, "olovrant": 0}
                result.append(
                    {
                        "date": str(day),
                        "exists": False,
                        "is_auto": None,
                        "is_empty": None,
                        "totalPortions": 0,
                        "mealCount": {"breakfast": 0, "lunch": 0, "olovrant": 0},
                        "predictedTotal": predicted_total,
                        "predictedMealCount": predicted_meal_count,
                    }
                )

        return Response(result)


# ---------------------------------------------------------------------------
# Admin: manual trigger
# ---------------------------------------------------------------------------


class AdminAutoOrderViewSet(viewsets.ViewSet):
    """
    Admin endpoint to manually trigger auto-order for a given date.
    POST /api/admin/trigger-auto-orders/  { "date": "YYYY-MM-DD" }  (date optional)
    """

    permission_classes = [permissions.IsAdminUser]

    def create(self, request):
        date_str = request.data.get("date")
        target_date = None
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        from .services import apply_auto_orders

        result = apply_auto_orders(target_date)
        return Response(result, status=status.HTTP_200_OK)


class GlobalSettingsViewSet(viewsets.ViewSet):
    """
    Manage system-wide settings.
    Singleton-like behavior: always returns the first instance.
    """

    def get_permissions(self):
        # Allow authenticated users to list (read) settings
        if self.action == "list":
            return [permissions.IsAuthenticated()]
        # Require admin for creation/updates
        return [permissions.IsAdminUser()]

    def list(self, request):
        from .models import GlobalSettings
        from .serializers import GlobalSettingsSerializer

        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def create(self, request):
        """
        Using create/post to update settings for simplicity or
        standard REST conventions.
        """
        from .models import GlobalSettings
        from .serializers import GlobalSettingsSerializer

        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
