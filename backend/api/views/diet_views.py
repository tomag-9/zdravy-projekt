from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..cache_service import (
    DIET_LIST_TIMEOUT,
    clear_diet_list_cache,
    get_cached,
    get_diet_list_cache_key,
    set_cached,
)
from ..models import Diet
from ..permissions import IsAdminOrAbove
from ..serializers_user import DietSerializer
from ..services.meal_plan_service import resolve_diet_menu_variants
from ..utils import parse_date_param
from .audit_mixins import AuditedModelViewSetMixin


@extend_schema_view(
    list=extend_schema(tags=["diets"]),
    retrieve=extend_schema(tags=["diets"]),
    create=extend_schema(tags=["diets"]),
    update=extend_schema(tags=["diets"]),
    partial_update=extend_schema(tags=["diets"]),
    destroy=extend_schema(tags=["diets"]),
    reorder=extend_schema(tags=["diets"]),
    menu_variant_map=extend_schema(tags=["diets"]),
)
class DietViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for the Diet model (CRUD).

    List action is cached for 24 hours since diet data is static.
    Cache is automatically invalidated when Diet instances are created/updated/deleted
    via signal handlers.
    """

    queryset = Diet.objects.prefetch_related("base_diets").all()
    serializer_class = DietSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Diets are reference data consumed as one complete set by the management
    # and facility-assignment screens. Paginating this endpoint made diets after
    # the first 20 invisible and could hide an already assigned diet.
    pagination_class = None

    def get_permissions(self):
        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
            "reorder",
        ]:
            return [IsAdminOrAbove()]
        return super().get_permissions()

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        diets = request.data.get("diets", [])
        if not isinstance(diets, list):
            return Response(
                {"error": "diets must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_ids = [
            diet_payload.get("id")
            for diet_payload in diets
            if diet_payload.get("id") is not None
        ]
        with transaction.atomic():
            existing_diets = {
                diet.pk: diet for diet in Diet.objects.filter(pk__in=requested_ids)
            }
            to_update = []
            for diet_index, diet_payload in enumerate(diets, start=1):
                diet = existing_diets.get(diet_payload.get("id"))
                if diet is None:
                    continue
                diet.sort_order = diet_payload.get("sort_order", diet_index)
                to_update.append(diet)
            if to_update:
                # bulk_update, like QuerySet.update(), skips save signals — the
                # explicit cache invalidation below is still required.
                Diet.objects.bulk_update(to_update, ["sort_order"])

        # QuerySet.update() intentionally avoids save signals, so invalidate the
        # cached catalogue explicitly after the transaction commits.
        clear_diet_list_cache()
        return self.list(request)

    @action(detail=False, methods=["get"], url_path="menu-variant-map")
    def menu_variant_map(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target_date = parse_date_param(date_str)
        return Response(resolve_diet_menu_variants(target_date))

    def list(self, request, *args, **kwargs):
        """
        Return cached Diet list (24h TTL).

        Cache is automatically invalidated when Diet instances are
        created/updated/deleted via signal handlers (clear_diet_list_cache).

        The complete list is cached under one key because this endpoint is
        intentionally not paginated.
        """
        cache_key = get_diet_list_cache_key()

        # Try to get cached serialized data
        cached_data = get_cached(cache_key)
        if cached_data is not None:
            from rest_framework.response import Response

            return Response(cached_data)

        # Generate response via parent list() method
        response = super().list(request, *args, **kwargs)

        # Cache the complete serialized list.
        if response.status_code == 200:
            set_cached(cache_key, response.data, timeout=DIET_LIST_TIMEOUT)

        return response
