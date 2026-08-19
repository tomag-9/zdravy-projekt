"""API pre voľno prevádzky (#490).

Admin má plné CRUD, klient len číta voľná svojich prevádzok — potrebuje ich,
aby vedel zašednúť dni v kalendári objednávok (#489).
"""

import datetime

from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

from ..models import PrevadzkaClosure
from ..serializers import PrevadzkaClosureSerializer
from ..services.prevadzka_service import dostupne_prevadzky
from .audit_mixins import AuditedModelViewSetMixin

# Ako `HolidayListViewSet`: klient nepotrebuje archív, len to, čo ešte môže
# ovplyvniť objednávku, plus krátky pohľad dozadu na práve prebiehajúce voľno.
CLIENT_PAST_WINDOW = datetime.timedelta(days=30)


class AdminPrevadzkaClosureViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    """Admin CRUD nad voľnom prevádzky.

    GET/POST/PATCH/DELETE /api/admin/prevadzka-closures/[<id>/]
    Filter: ?prevadzka=<id> (detail prevádzky si ťahá len svoje).
    """

    serializer_class = PrevadzkaClosureSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        qs = PrevadzkaClosure.objects.select_related("prevadzka")
        prevadzka_id = self.request.query_params.get("prevadzka")
        if prevadzka_id:
            try:
                qs = qs.filter(prevadzka_id=int(prevadzka_id))
            except ValueError:
                raise ValidationError({"prevadzka": ["Musí byť číslo."]})
        return qs


class PrevadzkaClosureListViewSet(viewsets.ReadOnlyModelViewSet):
    """Voľná prevádzok, ku ktorým má prihlásený klient prístup.

    GET /api/prevadzka-closures/
    """

    serializer_class = PrevadzkaClosureSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        cutoff = timezone.localdate() - CLIENT_PAST_WINDOW
        return (
            PrevadzkaClosure.objects.filter(
                prevadzka__in=dostupne_prevadzky(self.request.user),
                date_to__gte=cutoff,
            )
            .select_related("prevadzka")
            .order_by("date_from")
        )
