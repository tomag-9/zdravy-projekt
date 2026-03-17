import datetime
from typing import Optional

from django.contrib.auth.models import User
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from ..exceptions import ClientOnlyError
from ..models import DailyOrder
from ..serializers import DailyOrderSerializer
from ..services import OrderService


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

        if user.is_staff:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                try:
                    user_id_int = int(user_id)
                except (TypeError, ValueError):
                    raise ValidationError({"user_id": "Must be an integer."})
                queryset = queryset.filter(user_id=user_id_int)
            else:
                # If no user_id is provided, return only the staff user's own orders
                # to prevent returning ALL orders by default (which breaks by_date logic).
                queryset = queryset.filter(user=user)
        else:
            queryset = queryset.filter(user=user)

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
