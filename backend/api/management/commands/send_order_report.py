"""
Management command: send_order_report

Generates the daily order report as a PDF — tá istá tabuľka prehľadu gramáže,
akú admin vidí na obrazovke — and emails it to the configured recipients
stored in GlobalSettings.report_email_recipients.

Usage:
    python manage.py send_order_report           # yesterday (--days 1)
    python manage.py send_order_report --days 0  # today
    python manage.py send_order_report --date YYYY-MM-DD
"""

import datetime
import logging

from django.core.management.base import BaseCommand

from api.email_utils import send_daily_report_email
from api.exporters.daily_report_pdf import build_report_pdf_bytes
from api.models import GlobalSettings

logger = logging.getLogger(__name__)

_MEAL_KEYS = ["breakfast", "lunch", "olovrant"]


class Command(BaseCommand):
    help = "Generate the daily PDF order report and email it to configured recipients."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=1,
            help="Days ago to report on (default: 1 = yesterday). Ignored when --date is set.",
        )
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Explicit target date in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--meals",
            type=str,
            default="breakfast,lunch,olovrant",
            help="Comma-separated list of meals to include (breakfast, lunch, olovrant). Default: all.",
        )
        parser.add_argument(
            "--data-may-be-stale",
            action="store_true",
            help=(
                "Mark the email as built from possibly incomplete data — set by "
                "the chaining scrape when its retries ran out (issue #474)."
            ),
        )

    def handle(self, *args, **options):
        # ── Resolve target date ───────────────────────────────────────────────
        if options.get("date"):
            try:
                target_date = datetime.date.fromisoformat(options["date"])
            except ValueError:
                self.stderr.write(
                    self.style.ERROR(
                        f"Invalid date: {options['date']}. Use YYYY-MM-DD."
                    )
                )
                return
        else:
            target_date = datetime.date.today() - datetime.timedelta(
                days=options["days"]
            )

        # ── Get recipients ────────────────────────────────────────────────────
        global_settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        recipients: list = global_settings.report_email_recipients or []

        if not recipients:
            self.stdout.write(
                self.style.WARNING(
                    "No report email recipients configured in system settings. Skipping."
                )
            )
            return

        # ── Parse and validate meals parameter ───────────────────────────────
        meals_str = options.get("meals", "breakfast,lunch,olovrant")
        requested_meals = [m.strip() for m in meals_str.split(",") if m.strip()]

        # Validate and normalize meals
        invalid_meals = sorted({m for m in requested_meals if m not in _MEAL_KEYS})
        if invalid_meals:
            logger.warning(
                "Unknown meal keys: %s (valid: %s)",
                ", ".join(invalid_meals),
                ", ".join(_MEAL_KEYS),
            )

        meals = [m for m in requested_meals if m in _MEAL_KEYS]
        if not meals:
            self.stderr.write(
                self.style.ERROR(
                    f"No valid meals specified. Valid keys: {', '.join(_MEAL_KEYS)}"
                )
            )
            return

        # ── Generate report ───────────────────────────────────────────────────
        # Celý deň = celá tabuľka bez filtra sekcií; inak len stĺpce daných jedál.
        section_meals = None if set(meals) == set(_MEAL_KEYS) else meals
        try:
            report_bytes = build_report_pdf_bytes(target_date, meals=section_meals)
        except Exception:
            logger.exception("Failed to generate PDF report for %s", target_date)
            self.stderr.write(
                self.style.ERROR(f"Failed to generate report for {target_date}.")
            )
            raise

        if report_bytes is None:
            # Prázdny jedálniček alebo deň bez daných jedál — mail s prázdnou
            # tabuľkou by kuchyni nič nepovedal, tak sa neposiela.
            self.stdout.write(
                self.style.WARNING(
                    f"No menu columns for {target_date} ({', '.join(meals)}). "
                    "Nothing to report — skipping the email."
                )
            )
            return

        filename = f"prehlad_{target_date.isoformat()}.pdf"

        # ── Send email ────────────────────────────────────────────────────────
        try:
            send_daily_report_email(
                recipients=recipients,
                report_date=target_date.isoformat(),
                attachment_bytes=report_bytes,
                attachment_filename=filename,
                meals=meals,
                data_may_be_stale=options.get("data_may_be_stale", False),
            )
        except Exception:
            self.stderr.write(self.style.ERROR("Failed to send daily report email."))
            raise

        self.stdout.write(
            self.style.SUCCESS(
                f"Report for {target_date} sent to: {', '.join(recipients)}"
            )
        )
