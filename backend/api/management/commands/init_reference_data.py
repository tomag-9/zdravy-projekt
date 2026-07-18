"""
Idempotent reference data seeding — safe to run on every deploy in any environment.

Seeds system-level lookup data that must exist before the app is usable:
  - PortionType rows (Jasle, Škôlka, ZŠ 1.stupeň, ZŠ 2.stupeň, Dospelý (SŠ))
  - MealTemplate catalog rows (seed_meal_weight_catalog)

Uses update_or_create so it is safe to run repeatedly (no duplicates)
while keeping coefficients and sort order in sync.

Usage:
    python manage.py init_reference_data
"""

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import BaseCommand

from api.default_visibility import (
    ensure_all_visible_meals_for_client_settings,
    ensure_all_visible_meals_for_prevadzky,
    ensure_default_visible_diets_for_empty_prevadzky,
)
from api.models import ClientSettings, Diet, PortionType
from api.reference_data import ALL_DIETS, DEFAULT_DIET_NAMES

PORTION_TYPES = [
    {"name": "Jasle", "coefficient": "0.7500", "sort_order": 1},
    {"name": "Škôlka", "coefficient": "1.0000", "sort_order": 2},
    # Gramážovo zhodný so `ZŠ 1.stupeň` (predškolák je vekom škôlkar, ale je
    # kŕmený na 250 g) — oddelený je kvôli fakturácii, kde ho niektoré
    # prevádzky účtujú ako 1,25 porcie. Viď Prevadzka.billing_portion_coefficients.
    {"name": "Predškolák", "coefficient": "1.2500", "sort_order": 3},
    {"name": "ZŠ 1.stupeň", "coefficient": "1.2500", "sort_order": 4},
    {"name": "ZŠ 2.stupeň", "coefficient": "1.5000", "sort_order": 5},
    {"name": "Dospelý (SŠ)", "coefficient": "2.0000", "sort_order": 6},
]


class Command(BaseCommand):
    help = "Seed idempotent reference data (portion types). Safe for all environments."

    def handle(self, *args, **options):
        call_command("seed_meal_weight_catalog", verbosity=options.get("verbosity", 1))

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

        diet_created_count = 0
        for name, description in ALL_DIETS:
            _, created = Diet.objects.update_or_create(
                name=name,
                defaults={"description": description, "is_active": True},
            )
            if created:
                diet_created_count += 1
                self.stdout.write(f"  Diet created: {name}")

        default_diets = list(
            Diet.objects.filter(name__in=DEFAULT_DIET_NAMES, is_active=True)
        )
        settings_updated_count = 0
        settings_created_count = 0
        prevadzky_updated_count = 0
        settings_meals_updated_count = 0
        prevadzky_meals_updated_count = 0
        if default_diets:
            existing_settings_user_ids = ClientSettings.objects.values_list(
                "user_id",
                flat=True,
            )
            missing_settings_users = User.objects.filter(
                is_staff=False,
            ).exclude(id__in=existing_settings_user_ids)
            for user in missing_settings_users:
                ClientSettings.objects.create(user=user)
                settings_created_count += 1

            empty_settings = ClientSettings.objects.filter(
                visible_diets__isnull=True
            ).distinct()
            for settings in empty_settings:
                settings.visible_diets.set(default_diets)
                settings_updated_count += 1
            prevadzky_updated_count = ensure_default_visible_diets_for_empty_prevadzky()
            settings_meals_updated_count = (
                ensure_all_visible_meals_for_client_settings()
            )
            prevadzky_meals_updated_count = ensure_all_visible_meals_for_prevadzky()

        if (
            created_count
            or diet_created_count
            or settings_created_count
            or settings_updated_count
            or prevadzky_updated_count
            or settings_meals_updated_count
            or prevadzky_meals_updated_count
        ):
            self.stdout.write(
                self.style.SUCCESS(
                    "init_reference_data: created "
                    f"{created_count} portion types and {diet_created_count} diets; "
                    f"created settings for {settings_created_count} clients; "
                    f"default diets enabled for {settings_updated_count} clients "
                    f"and {prevadzky_updated_count} prevadzky; "
                    f"all meals enabled for {settings_meals_updated_count} clients "
                    f"and {prevadzky_meals_updated_count} prevadzky."
                )
            )
        else:
            self.stdout.write(
                "init_reference_data: all reference data already present."
            )
