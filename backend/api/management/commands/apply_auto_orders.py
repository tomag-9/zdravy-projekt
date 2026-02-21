import datetime

from django.core.management.base import BaseCommand

from api.services import apply_auto_orders


class Command(BaseCommand):
    help = "Apply auto-orders for clients that have no order on the target date."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            help="Target date in YYYY-MM-DD format. Defaults to next workday.",
            default=None,
        )

    def handle(self, *args, **options):
        date_str = options.get("date")
        target_date = None
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid date: {date_str}. Use YYYY-MM-DD."))
                return

        result = apply_auto_orders(target_date)

        self.stdout.write(
            self.style.SUCCESS(
                f"Auto-orders applied for {result['date']}: "
                f"created={len(result['created'])}, skipped={result['skipped']}"
            )
        )
        if result["created"]:
            self.stdout.write("  Users: " + ", ".join(result["created"]))
