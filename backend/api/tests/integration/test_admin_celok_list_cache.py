"""Perf follow-up to issue #504: `/admin/celky/` response caching.

Covers the cache-hit path and signal-driven invalidation added in
`api/cache_service.py` / `api/signals.py` — see `AdminCelokViewSet.list()`.
"""

import pytest

from api.cache_service import get_admin_celok_list_cache_key, get_cached
from api.models import Celok, Prevadzka


@pytest.mark.django_db
def test_admin_celok_list_is_cached_after_first_request(admin_client):
    celok = Celok.objects.create(nazov="Cachovaný celok")

    assert get_cached(get_admin_celok_list_cache_key()) is None

    response = admin_client.get("/api/admin/celky/")

    assert response.status_code == 200
    cached = get_cached(get_admin_celok_list_cache_key())
    assert cached is not None
    assert any(entry["id"] == celok.pk for entry in cached)


@pytest.mark.django_db
def test_admin_celok_list_search_bypasses_cache(admin_client):
    Celok.objects.create(nazov="Bez hľadania")

    response = admin_client.get("/api/admin/celky/", {"search": "Bez"})

    assert response.status_code == 200
    assert get_cached(get_admin_celok_list_cache_key()) is None


@pytest.mark.django_db
def test_creating_celok_invalidates_cache(admin_client):
    admin_client.get("/api/admin/celky/")
    assert get_cached(get_admin_celok_list_cache_key()) is not None

    Celok.objects.create(nazov="Nový celok po cachi")

    assert get_cached(get_admin_celok_list_cache_key()) is None


@pytest.mark.django_db
def test_adding_prevadzka_invalidates_cache_and_response_reflects_it(admin_client):
    celok = Celok.objects.create(nazov="Celok s prevádzkou neskôr")
    admin_client.get("/api/admin/celky/")
    assert get_cached(get_admin_celok_list_cache_key()) is not None

    Prevadzka.objects.create(celok=celok, nazov="Nová prevádzka")

    response = admin_client.get("/api/admin/celky/")
    body = response.json()
    entry = next(e for e in body if e["id"] == celok.pk)
    assert entry["prevadzky_count"] == 1
