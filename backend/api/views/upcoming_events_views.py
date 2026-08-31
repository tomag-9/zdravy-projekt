"""„Nadchádzajúce" — prehľad naplánovaných cronov (#527/#528 follow-up).

Čisto na čítanie: admin aj superadmin vidia, kedy najbližšie pobeží ktorá
naplánovaná úloha a čo presne urobí. Pri úlohách, ktoré posielajú push
notifikáciu, appka navyše predpočíta presný text správy (title + body) tou
istou logikou, akú pri odoslaní použije `api.tasks` — cez
`api.services.push_reminder_service`, aby text v prehľade nikdy nezišiel z
toho, čo sa naozaj pošle.
"""

from __future__ import annotations

import json
import logging

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response

from .. import sections
from ..permissions import IsAdminOrAbove, SectionAccess

logger = logging.getLogger(__name__)

PUSH_DEADLINE_TASK = "api.tasks.send_push_deadline_reminder_task"
WEEKLY_REMINDER_TASK = "api.tasks.send_weekly_order_reminder_task"


def _push_deadline_preview(task, next_run):
    """Payload `send_push_deadline_reminder_task` pošle pri `next_run`."""
    from ..services import _next_workday
    from ..services.push_reminder_service import REMINDER_TITLE, build_reminder_body

    try:
        args = json.loads(task.args or "[]")
        meal_types = args[0] if args else []
    except (ValueError, IndexError, TypeError):
        return None
    if not meal_types or next_run is None:
        return None

    try:
        from ..models import GlobalSettings

        gs = GlobalSettings.objects.get(pk=1)
        is_day_before = getattr(gs, f"deadline_{meal_types[0]}_is_day_before", False)
    except Exception:
        is_day_before = False

    reference_date = timezone.localtime(next_run).date()
    target_date = _next_workday(reference_date) if is_day_before else reference_date
    return {
        "title": REMINDER_TITLE,
        "body": build_reminder_body(sorted(meal_types), target_date),
    }


def _weekly_reminder_preview(task, next_run):
    """Payload `send_weekly_order_reminder_task` pošle pri `next_run`."""
    from ..services.push_reminder_service import (
        REMINDER_TITLE,
        build_weekly_reminder_body,
    )

    if next_run is None:
        return None
    reference_date = timezone.localtime(next_run).date()
    return {
        "title": REMINDER_TITLE,
        "body": build_weekly_reminder_body(reference_date),
    }


_PUSH_PREVIEW_BUILDERS = {
    PUSH_DEADLINE_TASK: _push_deadline_preview,
    WEEKLY_REMINDER_TASK: _weekly_reminder_preview,
}


def _next_run(periodic_task):
    """Najbližší beh naplánovanej úlohy, alebo None ak sa nedá spočítať."""
    schedule = periodic_task.schedule
    if schedule is None:
        return None
    now = timezone.now()
    try:
        return now + schedule.remaining_estimate(now)
    except Exception:
        logger.warning(
            "upcoming-events: remaining_estimate zlyhal pre %s", periodic_task.name
        )
        return None


class AdminUpcomingEventsViewSet(viewsets.ViewSet):
    """GET /api/admin/upcoming-events/ — zoradený zoznam naplánovaných cronov."""

    permission_classes = [IsAdminOrAbove, SectionAccess]
    section = sections.NADCHADZAJUCE

    def list(self, request):
        try:
            from django_celery_beat.models import PeriodicTask
        except ImportError:
            return Response({"results": []})

        tasks = PeriodicTask.objects.filter(enabled=True).select_related(
            "crontab", "interval", "solar"
        )

        results = []
        for task in tasks:
            next_run = _next_run(task)
            entry = {
                "name": task.name,
                "task": task.task,
                "description": task.description or "",
                "next_run": next_run,
            }
            preview_builder = _PUSH_PREVIEW_BUILDERS.get(task.task)
            if preview_builder is not None:
                entry["push_preview"] = preview_builder(task, next_run)
            results.append(entry)

        # Bez next_run (napr. nespočítateľný rozvrh) na koniec, nech tabuľka
        # zostane čitateľná zoradená podľa toho, čo príde skôr.
        results.sort(
            key=lambda e: (e["next_run"] is None, e["next_run"] or timezone.now())
        )
        return Response({"results": results})
