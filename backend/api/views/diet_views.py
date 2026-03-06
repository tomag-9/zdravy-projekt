from rest_framework import permissions, viewsets

from ..cache_service import (
    DIET_LIST_TIMEOUT,
    get_cached,
    get_diet_list_cache_key,
    set_cached,
)
from ..models import Diet
from ..serializers_user import DietSerializer


class DietViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the Diet model (CRUD).

    List action is cached for 24 hours since diet data is static.
    Cache is automatically invalidated when Diet instances are created/updated/deleted
    via signal handlers.
    """

    queryset = Diet.objects.all()
    serializer_class = DietSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        """
        Return cached Diet list (24h TTL).

        Cache is automatically invalidated when Diet instances are
        created/updated/deleted via signal handlers (clear_diet_list_cache).

        Note: Caching is per-page via pagination aware keys. This avoids returning
        stale pages when filtering/sorting query params change.
        """
        # Build cache key including pagination params to handle different pages
        page_num = request.query_params.get("page", "1")
        cache_key = f"{get_diet_list_cache_key()}:page={page_num}"

        # Try to get cached serialized data
        cached_data = get_cached(cache_key)
        if cached_data is not None:
            from rest_framework.response import Response

            return Response(cached_data)

        # Generate response via parent list() method
        response = super().list(request, *args, **kwargs)

        # Cache the serialized data (response.data is already paginated dict)
        if response.status_code == 200:
            set_cached(cache_key, response.data, timeout=DIET_LIST_TIMEOUT)

        return response
