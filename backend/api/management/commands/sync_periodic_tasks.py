"""
Management command: sync_periodic_tasks

Verify and recreate Celery Beat PeriodicTasks for daily report scheduling.

Usage:
    python manage.py sync_periodic_tasks           # verify/sync all tasks
    python manage.py sync_periodic_tasks --fix     # same as above (default behavior)
    python manage.py sync_periodic_tasks --verify  # only check, don't fix
    python manage.py sync_periodic_tasks --delete  # delete all report + push reminder tasks (use with caution)
"""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


def _format_crontab_time(crontab) -> str:
    hour = str(crontab.hour)
    minute = str(crontab.minute)
    if hour.isdigit():
        hour = hour.zfill(2)
    if minute.isdigit():
        minute = minute.zfill(2)
    return f"{hour}:{minute}"


class Command(BaseCommand):
    help = (
        "Verify and recreate Celery Beat PeriodicTasks for daily reports and push reminders. "
        "Use --verify to only check without making changes, --fix to recreate tasks (default), "
        "or --delete to remove ALL scheduled tasks (report + push reminders)."
    )

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group()
        group.add_argument(
            "--verify",
            action="store_true",
            help="Only verify tasks exist; don't make changes.",
        )
        group.add_argument(
            "--fix",
            action="store_true",
            help="Create/update tasks (default behavior).",
        )
        group.add_argument(
            "--delete",
            action="store_true",
            help="Delete all daily report tasks (use with caution).",
        )

    def _ensure_event_log_purge(self) -> None:
        """Denné mazanie starých udalostí (retencia 7 dní).

        Nezávisí od `GlobalSettings` ani od deadlinov, preto sa zakladá zvlášť
        a bezpodmienečne — inak by tabuľka udalostí rástla donekonečna.
        """
        import json

        from django.conf import settings as dj_settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask

        from api.signals import PERIODIC_TASK_NAME_EVENT_LOG_PURGE

        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=30,
            hour=3,
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone=dj_settings.TIME_ZONE,
        )
        PeriodicTask.objects.update_or_create(
            name=PERIODIC_TASK_NAME_EVENT_LOG_PURGE,
            defaults={
                "task": "api.tasks.purge_old_event_logs_task",
                "crontab": schedule,
                "args": json.dumps([]),
                "kwargs": json.dumps({}),
                "enabled": True,
                "description": "Zmaže záznamy udalostí staršie než 7 dní.",
            },
        )
        self.stdout.write(
            self.style.SUCCESS("Event log purge task synced (denne 03:30)")
        )

    def handle(self, *args, **options):
        from django_celery_beat.models import PeriodicTask

        from api.models import GlobalSettings
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        )

        self._ensure_event_log_purge()

        # Get GlobalSettings
        try:
            gs = GlobalSettings.objects.get(pk=1)
        except GlobalSettings.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    "GlobalSettings not found. Please create it first in the admin panel."
                )
            )
            return

        mode = (
            "verify" if options["verify"] else "delete" if options["delete"] else "fix"
        )

        self.stdout.write(
            self.style.HTTP_INFO(
                f"Mode: {mode.upper()} | Recipients: {gs.report_email_recipients or '(none)'}"
            )
        )

        if mode == "delete":
            # Delete all report tasks
            count, _ = PeriodicTask.objects.filter(
                name__in=[
                    PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                    PERIODIC_TASK_NAME_REPORT_ALL,
                ]
            ).delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {count} daily report PeriodicTask(s)")
            )
            # Delete push reminder tasks
            from api.signals import (
                EDUPAGE_SCRAPE_TASK_PREFIX,
                PUSH_REMINDER_TASK_PREFIX,
                WEEKLY_REMINDER_TASK_NAME,
            )

            push_count, _ = PeriodicTask.objects.filter(
                name__startswith=PUSH_REMINDER_TASK_PREFIX
            ).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Deleted {push_count} push reminder PeriodicTask(s)"
                )
            )
            weekly_count, _ = PeriodicTask.objects.filter(
                name=WEEKLY_REMINDER_TASK_NAME
            ).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Deleted {weekly_count} weekly reminder PeriodicTask(s)"
                )
            )
            scrape_count, _ = PeriodicTask.objects.filter(
                name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX
            ).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Deleted {scrape_count} edupage scrape PeriodicTask(s)"
                )
            )
            return

        if mode == "verify":
            # Only check
            self._verify_auto_order()
            self._verify_tasks(gs)
            self._verify_push_tasks(gs)
            self._verify_weekly_task()
            self._verify_edupage_scrape_tasks()
            return

        # Mode: fix
        self._sync_auto_order(gs)
        self._sync_tasks(gs)
        self._sync_push_tasks(gs)
        self._sync_weekly_task()
        self._sync_edupage_scrape_tasks(gs)

    def _verify_tasks(self, gs):
        from django_celery_beat.models import PeriodicTask

        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        )

        self.stdout.write("\n--- Current PeriodicTasks for Daily Reports ---")

        task_breakfast = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_BREAKFAST
        ).first()
        task_all = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_ALL
        ).first()

        reports_enabled = getattr(gs, "daily_report_enabled", True)
        if not reports_enabled:
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠ Daily reports are switched off "
                    "(GlobalSettings.daily_report_enabled = False)"
                )
            )
            self.stdout.write(
                "  → Tasks SHOULD NOT exist; recipients stay configured for later."
            )
        elif not gs.report_email_recipients:
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠ No recipients configured in GlobalSettings.report_email_recipients"
                )
            )
            self.stdout.write(
                "  → Tasks SHOULD NOT exist (email would be sent to nobody)"
            )
        elif getattr(gs, "edupage_auto_scrape_enabled", True):
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ {len(gs.report_email_recipients)} recipient(s) configured"
                )
            )
            self.stdout.write(
                "  → Reports are chained after the EduPage scrape (issue #474); "
                "standalone tasks SHOULD NOT exist."
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ {len(gs.report_email_recipients)} recipient(s) configured"
                )
            )

        standalone_expected = (
            reports_enabled
            and bool(gs.report_email_recipients)
            and not getattr(gs, "edupage_auto_scrape_enabled", True)
        )

        if task_breakfast:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Breakfast task: {task_breakfast.name} (enabled={task_breakfast.enabled})"
                )
            )
            if task_breakfast.crontab:
                self.stdout.write(
                    f"    Schedule: {_format_crontab_time(task_breakfast.crontab)} "
                    f"Mon–Fri (tz: {task_breakfast.crontab.timezone})"
                )
        elif standalone_expected:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ Breakfast task MISSING: {PERIODIC_TASK_NAME_REPORT_BREAKFAST}"
                )
            )

        if task_all:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Full report task: {task_all.name} (enabled={task_all.enabled})"
                )
            )
            if task_all.crontab:
                self.stdout.write(
                    f"    Schedule: {_format_crontab_time(task_all.crontab)} "
                    f"Mon–Fri (tz: {task_all.crontab.timezone})"
                )
        elif standalone_expected:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ Full report task MISSING: {PERIODIC_TASK_NAME_REPORT_ALL}"
                )
            )

        if standalone_expected:
            if task_breakfast and task_all:
                self.stdout.write(
                    self.style.SUCCESS(
                        "\n✓ All tasks properly configured and recipients set. "
                        "System is ready!"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        "\n❌ Tasks are missing but recipients are configured!"
                    )
                )
                self.stdout.write(
                    "   Run 'python manage.py sync_periodic_tasks --fix' to recreate them."
                )
        elif task_breakfast or task_all:
            self.stdout.write(
                self.style.ERROR(
                    "\n❌ Standalone report tasks exist but should not "
                    "(reports are off, have no recipients, or are chained "
                    "after the scrape)."
                )
            )
            self.stdout.write(
                "   Run 'python manage.py sync_periodic_tasks --fix' to remove them."
            )
        else:
            self.stdout.write("\n✓ System is in expected state.")

    def _sync_tasks(self, gs):
        from api.signals import _sync_daily_report_schedule

        self.stdout.write("\n--- Syncing PeriodicTasks ---")

        if not getattr(gs, "daily_report_enabled", True):
            self.stdout.write(
                self.style.WARNING(
                    "⚠ Daily reports are switched off. Removing any leftover tasks.\n"
                    "  Recipients stay configured; flip daily_report_enabled to re-enable."
                )
            )
        elif not gs.report_email_recipients:
            self.stdout.write(
                self.style.WARNING(
                    "⚠ No recipients configured. Removing any leftover tasks.\n"
                    "  Add recipients to GlobalSettings to enable automatic email sending."
                )
            )
        elif getattr(gs, "edupage_auto_scrape_enabled", True):
            self.stdout.write(
                "ℹ Reports are chained after the EduPage scrape (issue #474); "
                "removing any standalone tasks."
            )

        try:
            _sync_daily_report_schedule(gs)
            self.stdout.write(
                self.style.SUCCESS("✓ Daily report tasks synced successfully!")
            )
            self.stdout.write("\n--- Updated Tasks ---")
            self._verify_tasks(gs)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"✗ Failed to sync tasks: {exc}"))
            logger.exception("Failed to sync periodic tasks")

    def _verify_push_tasks(self, gs):
        from django_celery_beat.models import PeriodicTask

        from api.signals import PUSH_REMINDER_TASK_PREFIX

        self.stdout.write("\n--- Current PeriodicTasks for Push Reminders ---")
        tasks = list(
            PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX)
        )
        if not tasks:
            self.stdout.write(
                self.style.ERROR(
                    "✗ No push-reminder tasks found!\n"
                    "  Run 'python manage.py sync_periodic_tasks --fix' to create them."
                )
            )
        else:
            for task in tasks:
                schedule = (
                    f"{_format_crontab_time(task.crontab)} Mon–Fri"
                    f" (tz: {task.crontab.timezone})"
                    if task.crontab
                    else "no schedule"
                )
                status = (
                    self.style.SUCCESS("✓")
                    if task.enabled
                    else self.style.WARNING("⚠ disabled")
                )
                self.stdout.write(f"  {status} {task.name} → {schedule}")

    def _sync_push_tasks(self, gs):
        from api.signals import _sync_push_reminder_schedule

        self.stdout.write("\n--- Syncing Push Reminder Tasks ---")
        try:
            _sync_push_reminder_schedule(gs)
            self.stdout.write(self.style.SUCCESS("✓ Push reminder tasks synced!"))
            self._verify_push_tasks(gs)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"✗ Failed to sync push tasks: {exc}"))
            logger.exception("Failed to sync push reminder tasks")

    def _verify_auto_order(self):
        """Auto-objednávka sa dosiaľ zakladala len cez `post_save` signál na
        `GlobalSettings` — na produkcii, kde sa deadliny od nasadenia tejto
        funkcie neupravovali, tak nikdy nevznikla. Tento príkaz beží pri
        každom deployi (`deploy_bootstrap.py`), takže sem patrí rovnako ako
        ostatné naplánované úlohy nižšie.

        Jeden beh na skupinu jedál so zdieľanou uzávierkou (#548) — rovnako
        ako push pripomienky, preto sa aj overuje rovnako (podľa prefixu,
        nie podľa jedného pevného mena)."""
        from django_celery_beat.models import PeriodicTask

        from api.signals import AUTO_ORDER_TASK_PREFIX

        self.stdout.write("\n--- Auto-objednávka (podľa skupiny uzávierok) ---")
        tasks = list(
            PeriodicTask.objects.filter(name__startswith=AUTO_ORDER_TASK_PREFIX)
        )
        if not tasks:
            self.stdout.write(
                self.style.ERROR(
                    "✗ No auto-order tasks found!\n"
                    "  Run 'python manage.py sync_periodic_tasks --fix' to create them."
                )
            )
        else:
            for task in tasks:
                schedule = (
                    f"{_format_crontab_time(task.crontab)} (tz: {task.crontab.timezone})"
                    if task.crontab
                    else "no schedule"
                )
                status = (
                    self.style.SUCCESS("✓")
                    if task.enabled
                    else self.style.WARNING("⚠ disabled")
                )
                self.stdout.write(f"  {status} {task.name} → {schedule}")

    def _sync_auto_order(self, gs):
        from api.signals import _sync_auto_order_schedule

        self.stdout.write("\n--- Syncing Auto-Order Task ---")
        try:
            _sync_auto_order_schedule(gs)
            self.stdout.write(self.style.SUCCESS("✓ Auto-order task synced!"))
            self._verify_auto_order()
        except Exception as exc:
            self.stdout.write(
                self.style.ERROR(f"✗ Failed to sync auto-order task: {exc}")
            )
            logger.exception("Failed to sync auto-order task")

    def _verify_weekly_task(self):
        from django_celery_beat.models import PeriodicTask

        from api.signals import WEEKLY_REMINDER_TASK_NAME

        self.stdout.write("\n--- Weekly Order Reminder (Sunday) ---")
        task = PeriodicTask.objects.filter(name=WEEKLY_REMINDER_TASK_NAME).first()
        if task:
            schedule = (
                f"Sun {_format_crontab_time(task.crontab)} (tz: {task.crontab.timezone})"
                if task.crontab
                else "no schedule"
            )
            status = (
                self.style.SUCCESS("✓")
                if task.enabled
                else self.style.WARNING("⚠ disabled")
            )
            self.stdout.write(f"  {status} {task.name} → {schedule}")
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ Weekly reminder task MISSING: {WEEKLY_REMINDER_TASK_NAME}\n"
                    "  Run 'python manage.py sync_periodic_tasks --fix' to create it."
                )
            )

    def _verify_edupage_scrape_tasks(self):
        from django_celery_beat.models import PeriodicTask

        from api.models import GlobalSettings
        from api.signals import (
            DEDICATED_SCRAPE_TASK_PREFIX,
            EDUPAGE_PREVIEW_SCRAPE_TASK_NAME,
            EDUPAGE_SCRAPE_TASK_PREFIX,
        )

        self.stdout.write("\n--- Edupage Scrape Tasks ---")
        gs = GlobalSettings.objects.filter(pk=1).first()
        if gs and not getattr(gs, "edupage_auto_scrape_enabled", True):
            self.stdout.write(
                self.style.WARNING(
                    "⚠ Automatic Edupage scraping is disabled in GlobalSettings."
                )
            )
            return

        tasks = list(
            PeriodicTask.objects.filter(name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX)
        )
        if not tasks:
            self.stdout.write(
                self.style.ERROR(
                    "✗ No edupage-scrape tasks found!\n"
                    "  Run 'python manage.py sync_periodic_tasks --fix' to create them."
                )
            )
        else:
            for task in tasks:
                # Väčšina scrape úloh beží Po–Pi; dedikované pripojenia
                # (British School, #535) majú vlastný crontab Ne–Št (deň
                # pred pracovným dňom).
                if task.name.startswith(DEDICATED_SCRAPE_TASK_PREFIX):
                    days = "Ne–Št"
                elif task.name == EDUPAGE_PREVIEW_SCRAPE_TASK_NAME:
                    days = "denne"
                else:
                    days = "Po–Pi"
                schedule = (
                    f"{_format_crontab_time(task.crontab)} {days}"
                    f" (tz: {task.crontab.timezone})"
                    if task.crontab
                    else "no schedule"
                )
                status = (
                    self.style.SUCCESS("✓")
                    if task.enabled
                    else self.style.WARNING("⚠ disabled")
                )
                self.stdout.write(f"  {status} {task.name} → {schedule}")

    def _sync_edupage_scrape_tasks(self, gs):
        from api.signals import (
            _sync_dedicated_connection_scrape_schedules,
            _sync_edupage_preview_scrape_schedule,
            _sync_edupage_scrape_schedule,
        )

        self.stdout.write("\n--- Syncing Edupage Scrape Tasks ---")
        try:
            _sync_edupage_scrape_schedule(gs)
            # Musí ísť po `_sync_edupage_scrape_schedule` — tá skladá
            # `exclude_connection_ids` podľa toho, ktoré dedikované
            # pripojenia (British School, #535) už existujú.
            _sync_dedicated_connection_scrape_schedules(gs)
            # Musí ísť posledná: zdieľa `EDUPAGE_SCRAPE_TASK_PREFIX`, takže by
            # ju orphan cleanup v `_sync_edupage_scrape_schedule` zmazal,
            # keby bežala pred ňou (rovnaký vzor ako v `on_global_settings_saved`).
            _sync_edupage_preview_scrape_schedule(gs)
            self.stdout.write(self.style.SUCCESS("✓ Edupage scrape tasks synced!"))
            self._verify_edupage_scrape_tasks()
        except Exception as exc:
            self.stdout.write(
                self.style.ERROR(f"✗ Failed to sync edupage scrape tasks: {exc}")
            )
            logger.exception("Failed to sync edupage scrape tasks")

    def _sync_weekly_task(self):
        from api.signals import _sync_weekly_reminder_schedule

        self.stdout.write("\n--- Syncing Weekly Reminder Task ---")
        try:
            _sync_weekly_reminder_schedule()
            self.stdout.write(self.style.SUCCESS("✓ Weekly reminder task synced!"))
            self._verify_weekly_task()
        except Exception as exc:
            self.stdout.write(
                self.style.ERROR(f"✗ Failed to sync weekly reminder task: {exc}")
            )
            logger.exception("Failed to sync weekly reminder task")
