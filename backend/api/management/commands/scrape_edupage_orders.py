import datetime

from django.core.management.base import BaseCommand, CommandError

from api.tasks import scrape_edupage_orders_task


class Command(BaseCommand):
    help = "Synchronously scrape configured EduPage mealsGuest URLs into DailyOrder."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            dest="date_str",
            help="Target date in YYYY-MM-DD format. Defaults to task logic for today.",
        )
        parser.add_argument(
            "--meal",
            action="append",
            choices=["breakfast", "lunch", "olovrant"],
            dest="meal_types",
            help="Limit scrape to a meal. Can be passed multiple times.",
        )

    def handle(self, *args, **options):
        date_str = options.get("date_str")
        meal_types = options.get("meal_types")

        if date_str:
            try:
                datetime.date.fromisoformat(date_str)
            except ValueError as exc:
                raise CommandError("--date must be YYYY-MM-DD") from exc

        result = scrape_edupage_orders_task.run(
            date_str=date_str,
            meal_types=meal_types,
        )

        if result and result.get("error"):
            raise CommandError(result["error"])

        self.stdout.write(
            self.style.SUCCESS(
                "EduPage scrape complete: "
                f"scraped={result.get('scraped', 0)} "
                f"skipped={result.get('skipped', 0)} "
                f"errors={result.get('errors', 0)} "
                f"dates={result.get('dates', [])}"
            )
        )
