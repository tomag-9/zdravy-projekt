"""
Management command: sync_periodic_tasks

Verify and recreate Celery Beat PeriodicTasks for daily report scheduling.

Usage:
    python manage.py sync_periodic_tasks           # verify/sync all tasks
    python manage.py sync_periodic_tasks --fix     # same as above (default behavior)
    python manage.py sync_periodic_tasks --verify  # only check, don't fix
    python manage.py sync_periodic_tasks --delete  # delete all report tasks (use with caution)
"""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Verify and recreate Celery Beat PeriodicTasks for daily reports. "
        "Use --verify to only check without making changes, --fix to recreate tasks (default), "
        "or --delete to remove report tasks."
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

    def handle(self, *args, **options):
        from django_celery_beat.models import PeriodicTask

        from api.models import GlobalSettings
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        )

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
            from api.signals import PUSH_REMINDER_TASK_PREFIX

            push_count, _ = PeriodicTask.objects.filter(
                name__startswith=PUSH_REMINDER_TASK_PREFIX
            ).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Deleted {push_count} push reminder PeriodicTask(s)"
                )
            )
            return

        if mode == "verify":
            # Only check
            self._verify_tasks(gs)
            self._verify_push_tasks(gs)
            return

        # Mode: fix
        self._sync_tasks(gs)
        self._sync_push_tasks(gs)

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

        if not gs.report_email_recipients:
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠ No recipients configured in GlobalSettings.report_email_recipients"
                )
            )
            self.stdout.write(
                "  → Tasks SHOULD NOT exist (email would be sent to nobody)"
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ {len(gs.report_email_recipients)} recipient(s) configured"
                )
            )

        if task_breakfast:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Breakfast task: {task_breakfast.name} (enabled={task_breakfast.enabled})"
                )
            )
            if task_breakfast.crontab:
                hour = str(task_breakfast.crontab.hour)
                minute = str(task_breakfast.crontab.minute)
                self.stdout.write(
                    f"    Schedule: {hour}:{minute} "
                    f"Mon–Fri (tz: {task_breakfast.crontab.timezone})"
                )
        else:
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
                    f"    Schedule: {task_all.crontab.hour:02d}:{task_all.crontab.minute:02d} "
                    f"Mon–Fri (tz: {task_all.crontab.timezone})"
                )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ Full report task MISSING: {PERIODIC_TASK_NAME_REPORT_ALL}"
                )
            )

        if gs.report_email_recipients and (not task_breakfast or not task_all):
            self.stdout.write(
                self.style.ERROR(
                    "\n❌ Tasks are missing but recipients are configured!"
                )
            )
            self.stdout.write(
                "   Run 'python manage.py sync_periodic_tasks --fix' to recreate them."
            )
        elif not gs.report_email_recipients and (task_breakfast or task_all):
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠ Tasks exist but no recipients configured. "
                    "They will not send emails (email backend safeguard)."
                )
            )
        elif gs.report_email_recipients and task_breakfast and task_all:
            self.stdout.write(
                self.style.SUCCESS(
                    "\n✓ All tasks properly configured and recipients set. System is ready!"
                )
            )
        else:
            self.stdout.write(
                "\n✓ System is in expected state (no recipients, no tasks)."
            )

    def _sync_tasks(self, gs):
        from api.signals import _sync_daily_report_schedule

        self.stdout.write("\n--- Syncing PeriodicTasks ---")

        if not gs.report_email_recipients:
            self.stdout.write(
                self.style.WARNING(
                    "⚠ No recipients configured. Skipping task creation.\n"
                    "  Add recipients to GlobalSettings to enable automatic email sending."
                )
            )
            return

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
                    f"{task.crontab.hour}:{task.crontab.minute} Mon–Fri"
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
