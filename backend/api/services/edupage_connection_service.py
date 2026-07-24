"""Canonical EduPage connection lookup and temporary legacy write sync."""

from __future__ import annotations

from django.contrib.auth.models import User
from django.db.models import Prefetch

from api.models import Celok, EdupageConnection, Prevadzka

SYSTEM_SCRAPE_EMAIL = "edupage-scrape@system.local"


def system_scrape_user() -> User:
    user, _ = User.objects.get_or_create(
        username=SYSTEM_SCRAPE_EMAIL,
        defaults={
            "email": SYSTEM_SCRAPE_EMAIL,
            "is_active": False,
            "is_staff": False,
        },
    )
    return user


def sync_connection_for_celok(celok: Celok) -> EdupageConnection | None:
    """Mirror the current Celok fields during the expand/contract migration."""
    configured = bool(
        celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE and celok.mealsguest_url
    )
    if not configured:
        celok.prevadzky.update(edupage_connection=None)
        return None

    connection, created = EdupageConnection.objects.get_or_create(
        mealsguest_url=celok.mealsguest_url,
        defaults={
            "name": celok.nazov,
            "api_identifier": celok.edupage_api_identifier,
        },
    )
    if not created and not connection.api_identifier and celok.edupage_api_identifier:
        connection.api_identifier = celok.edupage_api_identifier
        connection.save(update_fields=["api_identifier", "updated_at"])
    celok.prevadzky.exclude(edupage_connection=connection).update(
        edupage_connection=connection
    )
    return connection


def sync_connection_for_prevadzka(prevadzka: Prevadzka) -> None:
    connection = sync_connection_for_celok(prevadzka.celok)
    connection_id = connection.pk if connection is not None else None
    if prevadzka.edupage_connection_id != connection_id:
        Prevadzka.objects.filter(pk=prevadzka.pk).update(
            edupage_connection_id=connection_id
        )
        prevadzka.edupage_connection_id = connection_id


def _operation_user(prevadzky: list[Prevadzka]) -> User:
    for prevadzka in prevadzky:
        profile = prevadzka.profily.select_related("user").order_by("pk").first()
        if profile is not None:
            return profile.user
    for prevadzka in prevadzky:
        profile = (
            prevadzka.celok.profily.filter(prevadzky__isnull=True)
            .select_related("user")
            .order_by("pk")
            .first()
        )
        if profile is not None:
            return profile.user
    return system_scrape_user()


def edupage_operations(
    connection_id: int | str | None = None,
    *,
    include_user: bool = True,
) -> list[dict]:
    prevadzky = (
        Prevadzka.objects.filter(is_active=True)
        .select_related("celok")
        .prefetch_related("profily__user", "celok__profily__user")
        .order_by("celok_id", "sort_order", "nazov")
    )
    connections = EdupageConnection.objects.filter(is_active=True).prefetch_related(
        Prefetch("prevadzky", queryset=prevadzky)
    )
    if connection_id is not None:
        connections = connections.filter(pk=connection_id)

    result = []
    for connection in connections:
        connection_prevadzky = list(connection.prevadzky.all())
        result.append(
            {
                "connection_id": connection.pk,
                "name": connection.name,
                "url": connection.mealsguest_url,
                "user": (
                    _operation_user(connection_prevadzky) if include_user else None
                ),
                "prevadzky": connection_prevadzky,
                "connection": connection,
            }
        )
    return result
