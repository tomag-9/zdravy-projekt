"""
Idempotent reference data seeding — safe to run on every deploy in any environment.

Seeds system-level lookup data that must exist before the app is usable:
  - PortionType rows (Jasle, Škôlka, ZŠ 1.stupeň, ZŠ 2.stupeň, Dospelý (SŠ))

Uses update_or_create so it is safe to run repeatedly (no duplicates)
while keeping coefficients and sort order in sync.

Usage:
    python manage.py init_reference_data
"""

from django.core.management.base import BaseCommand

from api.models import PortionType

PORTION_TYPES = [
    {"name": "Jasle", "coefficient": "0.3000", "sort_order": 1},
    {"name": "Škôlka", "coefficient": "0.5000", "sort_order": 2},
    {"name": "ZŠ 1.stupeň", "coefficient": "0.6500", "sort_order": 3},
    {"name": "ZŠ 2.stupeň", "coefficient": "0.7500", "sort_order": 4},
    {"name": "Dospelý (SŠ)", "coefficient": "1.0000", "sort_order": 5},
]


class Command(BaseCommand):
    help = "Seed idempotent reference data (portion types). Safe for all environments."

    def handle(self, *args, **options):
        created_count = 0
        for pt_data in PORTION_TYPES:
            _, created = PortionType.objects.update_or_create(
                name=pt_data["name"],
                defaults={
                    "coefficient": pt_data["coefficient"],
                    "sort_order": pt_data["sort_order"],
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  PortionType created: {pt_data['name']}")

        if created_count:
            self.stdout.write(
                self.style.SUCCESS(
                    f"init_reference_data: created {created_count} new records."
                )
            )
        else:
            self.stdout.write(
                "init_reference_data: all reference data already present."
            )
