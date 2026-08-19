"""Retencia záznamov o udalostiach (7 dní).

Audit slúži na dohľadanie „kto čo zmenil" v čerstvej prevádzke, nie na
archiváciu — bez stropu tabuľka rastie donekonečna.
"""

import datetime

import pytest
from django.utils import timezone

from api.models import EventLog
from api.tasks import EVENT_LOG_RETENTION_DAYS, purge_old_event_logs_task

pytestmark = pytest.mark.django_db


def _event(days_old: int) -> EventLog:
    event = EventLog.objects.create(
        event_type=EventLog.EventType.SETTINGS_CHANGE, summary=f"stará {days_old}"
    )
    # `created_at` je auto_now_add, takže sa prepisuje až po vytvorení.
    EventLog.objects.filter(pk=event.pk).update(
        created_at=timezone.now() - datetime.timedelta(days=days_old)
    )
    return event


def test_retention_is_a_week():
    assert EVENT_LOG_RETENTION_DAYS == 7


def test_old_events_are_deleted():
    old = _event(10)
    purge_old_event_logs_task.apply()
    assert not EventLog.objects.filter(pk=old.pk).exists()


def test_recent_events_survive():
    fresh = _event(2)
    purge_old_event_logs_task.apply()
    assert EventLog.objects.filter(pk=fresh.pk).exists()


def test_boundary_is_not_over_eager():
    """Deň pred hranicou musí prežiť — inak by sa mazalo skôr, než sľubujeme."""
    just_inside = _event(EVENT_LOG_RETENTION_DAYS - 1)
    purge_old_event_logs_task.apply()
    assert EventLog.objects.filter(pk=just_inside.pk).exists()


def test_result_reports_what_it_did():
    _event(30)
    result = purge_old_event_logs_task.apply().result
    assert result["deleted"] == 1
    assert result["retention_days"] == EVENT_LOG_RETENTION_DAYS


def test_custom_retention_can_be_passed():
    old = _event(3)
    purge_old_event_logs_task.apply(kwargs={"days": 1})
    assert not EventLog.objects.filter(pk=old.pk).exists()


def test_running_on_empty_table_is_harmless():
    assert purge_old_event_logs_task.apply().result["deleted"] == 0
