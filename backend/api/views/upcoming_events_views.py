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
from datetime import timedelta

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
        from ..cached_settings_service import get_global_settings

        gs = get_global_settings()
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


def _next_run_for_schedule(schedule, log_label):
    """Najbližší beh daného rozvrhu, alebo None ak sa nedá spočítať.

    Berie priamo `schedule` (celery `crontab`), nie `PeriodicTask` — vďaka
    tomu vie počítať aj pre syntetické uzávierky nižšie, ktoré v DB žiadny
    riadok nemajú (sú odvodené priamo z `GlobalSettings`, nie z vlastného cronu).
    """
    if schedule is None:
        return None
    now = timezone.now()
    try:
        # crontab.remaining_estimate() počíta hodinu/deň voči poľam crontabu,
        # ktoré sú v jeho vlastnej (lokálnej) tz — ale `maybe_make_aware`
        # vo vnútri je no-op pre už-aware datetime, takže aware `now` (UTC,
        # vďaka USE_TZ=True) sa porovnáva bez konverzie a výsledok je posunutý
        # o UTC↔lokálny offset. Rovnaký krok robí aj TzAwareCrontab.is_due()
        # (django_celery_beat), ktorý naozaj spúšťa Celery Beat — tu ho treba
        # zopakovať ručne, lebo remaining_estimate() sám o sebe to nerobí.
        schedule_tz = getattr(schedule, "tz", None)
        reference = now.astimezone(schedule_tz) if schedule_tz else now
        next_run = now + schedule.remaining_estimate(reference)
        # `remaining_estimate()` cieli pár mikrosekúnd PRED nastupujúcu minútu
        # (aby Celery Beat stihol spustiť presne na hranici) — bez tejto
        # korekcie admin v tabuľke videl čas o minútu skôr, než kedy úloha
        # naozaj pobeží (viď regresný test na `next_run`).
        return (next_run + timedelta(seconds=1)).replace(microsecond=0)
    except Exception:
        logger.warning("upcoming-events: remaining_estimate zlyhal pre %s", log_label)
        return None


def _next_run(periodic_task):
    """Najbližší beh naplánovanej úlohy, alebo None ak sa nedá spočítať."""
    return _next_run_for_schedule(periodic_task.schedule, periodic_task.name)


def _deadline_lock_entries():
    """Syntetické riadky uzávierky objednávok — kedy appka prestane prijímať
    zmeny pre raňajky/obed/olovrant (#548).

    Toto NIE JE cron: appka uzávierku vynucuje priebežne pri každej požiadavke
    porovnaním s `GlobalSettings.deadline_*`, žiadna úloha ju "nespustí". Admin
    v "Nadchádzajúcich" ale dovtedy videl len push pripomienku PRED uzávierkou
    (`send_push_deadline_reminder_task`), nie moment uzávierky samotnej — preto
    sa tu z tých istých polí dopočíta rovnako, ako to pre pripomienku aj
    auto-objednávku robí `api.signals` (rovnaké zoskupenie podľa zhodného času
    a `is_day_before`, rovnaká maska dní).
    """
    from django.conf import settings

    try:
        from django_celery_beat.models import CrontabSchedule
    except ImportError:
        return []

    from ..cached_settings_service import get_global_settings
    from ..services.push_reminder_service import build_meal_str
    from ..signals import _day_of_week

    try:
        gs = get_global_settings()
    except Exception:
        return []

    groups: dict[tuple, list[str]] = {}
    for meal_type in ("breakfast", "lunch", "olovrant"):
        deadline = getattr(gs, f"deadline_{meal_type}", None)
        if deadline is None:
            continue
        is_day_before = bool(getattr(gs, f"deadline_{meal_type}_is_day_before", False))
        groups.setdefault((deadline, is_day_before), []).append(meal_type)

    entries = []
    for (deadline, is_day_before), meal_types in groups.items():
        meal_types = sorted(meal_types)
        # Neuložený riadok — táto uzávierka nemá vlastnú DB úlohu, počíta sa
        # len na zobrazenie, nemá zmysel ju ukladať.
        schedule = CrontabSchedule(
            minute=deadline.minute,
            hour=deadline.hour,
            day_of_week=_day_of_week(is_day_before),
            day_of_month="*",
            month_of_year="*",
            timezone=settings.TIME_ZONE,
        )
        name = "order-lock-" + "-".join(meal_types)
        entries.append(
            {
                "name": name,
                "task": "order-lock",
                "description": (
                    f"Uzávierka objednávok: {build_meal_str(meal_types)}. "
                    "Appka odteraz odmietne zmeny objednávky na tento deň."
                ),
                "next_run": _next_run_for_schedule(schedule.schedule, name),
            }
        )
    return entries


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

        results.extend(_deadline_lock_entries())

        # Bez next_run (napr. nespočítateľný rozvrh) na koniec, nech tabuľka
        # zostane čitateľná zoradená podľa toho, čo príde skôr.
        results.sort(
            key=lambda e: (e["next_run"] is None, e["next_run"] or timezone.now())
        )
        return Response({"results": results})
