import datetime
from typing import Optional

from django.contrib.auth.models import User
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from ..exceptions import ClientOnlyError
from ..models import DailyOrder
from ..serializers import DailyOrderSerializer, PrevadzkaSerializer
from ..services import OrderService
from ..services.prevadzka_service import dostupne_prevadzky


@extend_schema_view(
    list=extend_schema(tags=["orders"]),
    retrieve=extend_schema(tags=["orders"]),
    create=extend_schema(tags=["orders"]),
    update=extend_schema(tags=["orders"]),
    partial_update=extend_schema(tags=["orders"]),
    destroy=extend_schema(tags=["orders"]),
    by_date=extend_schema(tags=["orders"]),
)
class DailyOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing daily orders.
    """

    serializer_class = DailyOrderSerializer
    # Authenticated users only
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[DailyOrder]:
        """
        Get filtered DailyOrder queryset for the current request user.

        Staff users may optionally filter by another user's ID via the
        "user_id" query parameter; otherwise, only the requesting user's
        orders are returned.

        Query Optimization: No select_related/prefetch_related is needed here
        because DailyOrderSerializer only accesses direct DailyOrder fields
        (id, date, status, data, is_auto, updated_at) and does not dereference
        any related objects like user or settings. As a result, the base
        queryset is already optimized and query count remains constant
        regardless of the number of orders returned.
        """
        queryset = DailyOrder.objects.all()
        user = self.request.user

        prevadzka_id = self.request.query_params.get("prevadzka")
        if user.is_staff:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                try:
                    user_id_int = int(user_id)
                except (TypeError, ValueError):
                    raise ValidationError({"user_id": "Must be an integer."})
                queryset = queryset.filter(user_id=user_id_int)
            elif prevadzka_id:
                # Admin detail prevádzky je identifikovaný prevádzkou, nie loginom.
                # Bez tohto by sa najprv filtrovalo na objednávky admin usera a
                # detail prevádzky bez loginu by vždy vyzeral prázdny.
                pass
            else:
                # If no user_id is provided, return only the staff user's own orders
                # to prevent returning ALL orders by default (which breaks by_date logic).
                queryset = queryset.filter(user=user)
        else:
            # Objednávka patrí prevádzke, `user` je iba audit toho, kto ju zadal.
            # Viac loginov pod jedným celkom má vidieť rovnakú objednávku prevádzky.
            queryset = queryset.filter(prevadzka__in=dostupne_prevadzky(user))

        if prevadzka_id:
            try:
                prevadzka_id_int = int(prevadzka_id)
            except (TypeError, ValueError):
                raise ValidationError({"prevadzka": "Must be an integer."})
            if (
                not user.is_staff
                and not dostupne_prevadzky(user).filter(pk=prevadzka_id_int).exists()
            ):
                raise ValidationError(
                    {"prevadzka": "Prevádzka nepatrí tomuto prihláseniu."}
                )
            queryset = queryset.filter(prevadzka_id=prevadzka_id_int)

        return queryset

    def perform_create(self, serializer: DailyOrderSerializer) -> None:
        """
        Attach the requesting user to the order.

        Staff users may create orders on behalf of a client by supplying a
        ``user_id`` query parameter.  The target user must exist and must not
        be a staff member.

        Raises:
            ClientOnlyError: When a staff member attempts to create an order
                without specifying a ``user_id``.
            ValidationError: When ``user_id`` refers to another staff account.
        """
        if self.request.user.is_staff:
            user_id = self.request.query_params.get("user_id")
            if not user_id:
                if "prevadzka" in serializer.validated_data:
                    serializer.save(user=self.request.user)
                    return
                raise ClientOnlyError()
            try:
                user_id_int = int(user_id)
            except (TypeError, ValueError):
                raise ValidationError({"user_id": "Must be an integer."})
            target_user = get_object_or_404(User, pk=user_id_int)
            if target_user.is_staff:
                raise ValidationError(
                    {"user_id": "Cannot create orders for staff users."}
                )
            serializer.save(user=target_user)
            return
        # The serializer.save() will call create() which enables update_or_create logic
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="by-date/(?P<date>[^/.]+)")
    def by_date(self, request: Request, date: Optional[str] = None) -> Response:
        """
        Return the order for a specific date, or ``{"data": {}}`` when none exists.

        Args:
            date: ISO-8601 date string (``YYYY-MM-DD``) captured from the URL.
        """
        try:
            order = self.get_queryset().get(date=date)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except DailyOrder.DoesNotExist:
            return Response(
                {"data": {}}, status=status.HTTP_200_OK
            )  # Return empty struct if not found
        except DailyOrder.MultipleObjectsReturned:
            return Response(
                {
                    "prevadzka": (
                        "Prihlásenie má viac objednávok pre tento deň. "
                        "Pošlite ?prevadzka=<id>."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(tags=["orders"])
class PlannedOrdersViewSet(viewsets.ViewSet):
    """
    Returns the 5 upcoming workdays with order status for the logged-in client.
    GET /api/orders/planned/
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request: Request) -> Response:
        """Get planned orders for the next 5 workdays via OrderService."""
        visible_meals = list(
            getattr(getattr(request.user, "settings", None), "visible_meals", []) or []
        )
        result = OrderService.get_planned_orders(request.user, visible_meals)
        return Response(result)

    @action(detail=False, methods=["get"], url_path="monthly-summary")
    def monthly_summary(self, request: Request) -> Response:
        """GET /api/orders/planned/monthly-summary/?year=YYYY&month=M."""
        today = timezone.localdate()
        try:
            year = int(request.query_params.get("year", today.year))
            month = int(request.query_params.get("month", today.month))
            if month < 1 or month > 12:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid year/month query params."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(OrderService.monthly_summary(request.user, year, month))


@extend_schema(tags=["admin"])
class AdminAutoOrderViewSet(viewsets.ViewSet):
    """
    Admin endpoint to manually trigger auto-order for a given date.
    POST /api/admin/trigger-auto-orders/  { "date": "YYYY-MM-DD" }  (date optional)
    """

    permission_classes = [permissions.IsAdminUser]

    def create(self, request: Request) -> Response:
        date_str = request.data.get("date")
        target_date: Optional[datetime.date] = None
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        from ..services import apply_auto_orders

        result = apply_auto_orders(target_date)
        return Response(result, status=status.HTTP_200_OK)


class PrevadzkaViewSet(viewsets.ReadOnlyModelViewSet):
    """Prevádzky, za ktoré prihlásený klient smie objednávať.

    Frontend podľa počtu rozhodne: jedna → objednáva rovno (ako doteraz),
    viac → najprv nechá vybrať prevádzku.
    """

    serializer_class = PrevadzkaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self) -> QuerySet:
        return (
            dostupne_prevadzky(self.request.user)
            .select_related("celok")
            .prefetch_related("visible_diets")
        )
