"""
Seed real Edupage school operations.

Safe to run multiple times (get_or_create). Does NOT run in production
without --allow-prod.

Usage:
    python manage.py real_initial_seed_prevadzky
    python manage.py real_initial_seed_prevadzky --allow-prod   # prod override
"""

from django.contrib.auth.models import User
from django.core import management
from django.core.management.base import BaseCommand

from api.default_visibility import (
    DEFAULT_VISIBLE_MEALS,
    ensure_all_visible_meals_for_prevadzky,
    ensure_all_visible_menus_for_prevadzky,
    ensure_default_visible_diets,
)
from api.models import Celok, Diet, EdupageConnection, UserProfile

EDUPAGE_VISIBLE_MEALS = DEFAULT_VISIBLE_MEALS
OPERATION_SPECIFIC_VISIBLE_DIETS = {
    "krasnanko": ["DIA"],
}

SCHOOLS = [
    # Full-access schools
    {
        "subdomain": "zsivanka",
        "company_name": "ZŠ Ivanka pri Dunaji",
        "mealsguest_url": "https://zsivanka.edupage.org/menu/mealsGuest?id=x3StT4Z",
    },
    {
        "subdomain": "edulienka",
        "company_name": "MŠ Edulienka",
        "mealsguest_url": "https://edulienka.edupage.org/menu/mealsGuest?id=nPA3xiH",
    },
    {
        "subdomain": "zdravebrusko",
        "company_name": "MŠ Zdravé Bruško",
        "mealsguest_url": "https://zdravebrusko.edupage.org/menu/mealsGuest?id=LFpbpn1",
    },
    {
        "subdomain": "dobrodruzstvo",
        "company_name": "MŠ Dobrodružstvo",
        "mealsguest_url": "https://dobrodruzstvo.edupage.org/menu/mealsGuest?id=Gxem3jq",
    },
    {
        "subdomain": "msfilipaneriho",
        "company_name": "MŠ Filipáneriho",
        "mealsguest_url": "https://msfilipaneriho.edupage.org/menu/mealsGuest?id=eTKTfkM",
    },
    {
        "subdomain": "jollyhomeschool",
        "company_name": "Jolly Homeschool",
        "mealsguest_url": "https://jollyhomeschool.edupage.org/menu/mealsGuest?id=Z9V267D",
    },
    {
        "subdomain": "szsfan",
        "company_name": "SZŠ FAN",
        "mealsguest_url": "https://szsfan.edupage.org/menu/mealsGuest?id=HUsKRmE",
    },
    {
        "subdomain": "fantastickaskolka",
        "company_name": "Fantastická Škôlka",
        "mealsguest_url": "https://fantastickaskolka.edupage.org/menu/mealsGuest?id=unzfld5",
    },
    {
        "subdomain": "mslibellus",
        "company_name": "MŠ Libellus",
        "mealsguest_url": "https://mslibellus.edupage.org/menu/mealsGuest?id=upDbWNQ",
    },
    # Link-only schools
    {
        "subdomain": "skolkapramienok",
        "company_name": "MŠ Prameň",
        "mealsguest_url": "https://skolkapramienok.edupage.org/menu/mealsGuest?id=1CSsRh1",
    },
    {
        "subdomain": "rozmanita",
        "company_name": "MŠ Rozmanitá",
        "mealsguest_url": "https://rozmanita.edupage.org/menu/mealsGuest?id=0zowNAf",
    },
    {
        "subdomain": "skolickams",
        "company_name": "Škôlka MS",
        "mealsguest_url": "https://skolickams.edupage.org/menu/mealsGuest?id=UNjs2TX",
    },
    {
        "subdomain": "msdobrehopastiera",
        "company_name": "MŠ Dobrého Pastiera",
        "mealsguest_url": "https://msdobrehopastiera.edupage.org/menu/mealsGuest?id=5gTWnNR",
    },
    {
        "subdomain": "msfelixkarloveska",
        "company_name": "MŠ Felix Karlovská",
        "mealsguest_url": "https://msfelixkarloveska.edupage.org/menu/mealsGuest?id=0aYvXiE",
    },
    {
        "subdomain": "krasnanko",
        "company_name": "MŠ Krásnanko",
        "mealsguest_url": "https://krasnanko.edupage.org/menu/mealsGuest?id=tg9Z1u7",
    },
]


class Command(BaseCommand):
    help = "Seed real Edupage school operations (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--allow-prod",
            action="store_true",
            help="Allow running in production (use with caution).",
        )

    def handle(self, *args, **options):
        from django.conf import settings

        is_prod = not getattr(settings, "DEBUG", True)
        if is_prod and not options["allow_prod"]:
            self.stderr.write(
                self.style.ERROR(
                    "Refused to run in production. Pass --allow-prod to override."
                )
            )
            return

        created_count = 0
        skipped_count = 0

        for school in SCHOOLS:
            email = f"{school['subdomain']}@edupage.local"
            user, user_created = User.objects.get_or_create(
                username=email,
                defaults={"email": email},
            )
            if user_created:
                user.set_unusable_password()
                user.save()

            profile, profile_created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "company_name": school["company_name"],
                },
            )
            if not profile_created:
                if not profile.company_name:
                    profile.company_name = school["company_name"]
                    profile.save(update_fields=["company_name"])

            connection, _ = EdupageConnection.objects.update_or_create(
                mealsguest_url=school["mealsguest_url"],
                defaults={
                    "name": school["company_name"],
                    "is_active": True,
                },
            )
            prevadzky = profile.dostupne_prevadzky()
            primary_celok = profile.primary_celok()
            if primary_celok and prevadzky.count() == 1:
                primary_celok.nazov = school["company_name"]
                primary_celok.save(update_fields=["nazov"])
                prevadzky.update(nazov=school["company_name"])
            Celok.objects.filter(prevadzky__in=prevadzky).update(
                zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
                billing_name=school["company_name"],
            )
            ensure_all_visible_menus_for_prevadzky(prevadzky)
            ensure_all_visible_meals_for_prevadzky(prevadzky)
            for prevadzka in prevadzky:
                if prevadzka.edupage_connection_id != connection.id:
                    prevadzka.edupage_connection = connection
                    prevadzka.save(update_fields=["edupage_connection"])
                ensure_default_visible_diets(prevadzka.visible_diets)

            extra_diet_names = OPERATION_SPECIFIC_VISIBLE_DIETS.get(
                school["subdomain"], []
            )
            for diet_name in extra_diet_names:
                diet, _ = Diet.objects.update_or_create(
                    name=diet_name,
                    defaults={
                        "description": "Diabetická strava.",
                        "is_active": True,
                    },
                )
                for prevadzka in profile.dostupne_prevadzky():
                    prevadzka.visible_diets.add(diet)

            if user_created or profile_created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  Created: {school['company_name']} ({email})")
                )
            else:
                skipped_count += 1
                self.stdout.write(f"  Skipped (exists): {school['company_name']}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created {created_count}, skipped {skipped_count} schools."
            )
        )
        management.call_command(
            "seed_zdrave_brusko", verbosity=options.get("verbosity", 1)
        )
