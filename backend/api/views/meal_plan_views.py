"""Portion type views (kept here for backwards-compatible import path)."""

from __future__ import annotations

from rest_framework import permissions, viewsets

from ..models import PortionType
from ..serializers_menu import PortionTypeSerializer


class PortionTypeViewSet(viewsets.ModelViewSet):
    """Admin CRUD for portion types."""

    serializer_class = PortionTypeSerializer

    def get_permissions(self):
        if self.action == "list":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        queryset = PortionType.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset
