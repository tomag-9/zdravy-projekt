"""Root-level pytest fixtures shared by both testpaths (`tests`, `api/tests`)."""

import pytest


@pytest.fixture(autouse=True)
def _no_real_gramage_dashboard_refresh_dispatch(monkeypatch):
    """Neposielaj `refresh_gramage_dashboard_cache_task` do skutočného Celery brokera.

    `on_daily_order_changed_refresh_gramage_cache` (api/signals.py) po každom
    uložení/zmazaní `DailyOrder` volá `schedule_gramage_dashboard_refresh`,
    ktorá task zaradí cez `apply_async`. V tomto dev prostredí bežia testy
    (`docker compose exec backend pytest`) v tom istom kontajnerovom sete ako
    živý `celery` worker zdieľajúci ten istý Redis — bez tohto by worker
    queued tasky reálne spracoval mimo pytest procesu (a jeho DB transakcie,
    ktorá sa na konci testu rollbackne), čím by prepisoval zdieľanú cache v
    nepredvídateľnom momente a robil testy flaky (pozorované na
    `test_closed_days.py` pri behu spolu s `test_caching.py`).

    Testy, ktoré toto plánovanie/task samé overujú
    (`TestGramageDashboardAsyncRefresh` v `test_caching.py`), si `apply_async`
    patchujú alebo volajú funkciu task-u priamo — tento fixture im nijako
    neprekáža, len ho v pozadí nahrádza no-opom pre všetky ostatné testy.
    """
    monkeypatch.setattr(
        "api.tasks.refresh_gramage_dashboard_cache_task.apply_async",
        lambda *args, **kwargs: None,
    )
