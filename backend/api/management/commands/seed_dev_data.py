"""
Development-only management command to seed the database with realistic sample
data: users, diets, client settings, and orders across the last 5 weekdays.

Usage:
    python manage.py seed_dev_data
    python manage.py seed_dev_data --flush   # wipe existing seed data first
    python manage.py seed_dev_data --days 10 # seed N past weekdays
"""

import datetime
import random

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from api.models import ClientSettings, DailyOrder, Diet, GlobalSettings


CATEGORIES = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]
MENUS = ["A", "B", "V"]  # V = vegetariánske menu
DIETS = [
    "Bez lepku",
    "Bez laktózy",
    "Vegetariánske",
    "Vegánske",
    "Diabetické",
]
MEALS = ["breakfast", "lunch", "olovrant"]

SEED_USERS = [
    {
        "username": "jana.novakova",
        "first_name": "Jana",
        "last_name": "Nováková",
        "email": "jana.novakova@dev.local",
        "categories": ["Jasle", "Škôlka"],
        "menus": ["A", "B"],
        "meals": ["breakfast", "lunch"],
        "diets": [],
    },
    {
        "username": "peter.kral",
        "first_name": "Peter",
        "last_name": "Kráľ",
        "email": "peter.kral@dev.local",
        "categories": ["ZŠ 1.stupeň", "ZŠ 2.stupeň"],
        "menus": ["A", "B", "V"],
        "meals": ["lunch"],
        "diets": ["Bez lepku"],
    },
    {
        "username": "maria.horakova",
        "first_name": "Mária",
        "last_name": "Horáková",
        "email": "maria.horakova@dev.local",
        "categories": ["Jasle"],
        "menus": ["A"],
        "meals": ["breakfast", "lunch", "olovrant"],
        "diets": ["Bez laktózy", "Diabetické"],
    },
    {
        "username": "lukas.fiser",
        "first_name": "Lukáš",
        "last_name": "Fišer",
        "email": "lukas.fiser@dev.local",
        "categories": ["Dospelý (SŠ)"],
        "menus": ["A", "B"],
        "meals": ["breakfast", "lunch", "olovrant"],
        "diets": [],
    },
    {
        "username": "eva.blahova",
        "first_name": "Eva",
        "last_name": "Bláhová",
        "email": "eva.blahova@dev.local",
        "categories": ["Škôlka", "ZŠ 1.stupeň"],
        "menus": ["A", "V"],
        "meals": ["lunch", "olovrant"],
        "diets": ["Vegetariánske"],
    },
]


def _past_weekdays(n: int) -> list[datetime.date]:
    """Return the last n weekdays (Mon–Fri) up to and including today."""
    days = []
    d = datetime.date.today()
    while len(days) < n:
        if d.weekday() < 5:
            days.append(d)
        d -= datetime.timedelta(days=1)
    return days


def _build_order_data(seed_user: dict, chance_per_meal: float = 0.85) -> dict:
    """Generate a realistic order data dict for a single day."""
    data: dict = {}
    for meal in seed_user["meals"]:
        if random.random() > chance_per_meal:
            continue  # skip this meal occasionally

        meal_data: dict = {}
        for cat in seed_user["categories"]:
            # Each category may or may not be ordered
            if len(seed_user["categories"]) > 1 and random.random() < 0.25:
                continue

            menu_counts: dict = {}
            for menu in seed_user["menus"]:
                count = random.choices([0, 1, 2, 3], weights=[40, 40, 15, 5])[0]
                if count:
                    menu_counts[menu] = count

            if not menu_counts:
                continue  # nothing ordered for this category

            diets: dict = {}
            for diet in seed_user["diets"]:
                if random.random() < 0.6:
                    total_portions = sum(menu_counts.values())
                    if total_portions:
                        diets[diet] = random.randint(1, max(1, total_portions))

            meal_data[cat] = {"menuCounts": menu_counts, "diets": diets}

        if meal_data:
            data[meal] = meal_data

    return data


class Command(BaseCommand):
    help = "Seed the database with development/demo data (NOT for production)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing seed users and their orders before seeding",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=5,
            help="Number of past weekdays to generate orders for (default: 5)",
        )

    def handle(self, *args, **options):
        from django.conf import settings as django_settings

        if not django_settings.DEBUG:
            self.stderr.write(
                self.style.ERROR(
                    "seed_dev_data must only run with DEBUG=True. "
                    "Refusing to run in production."
                )
            )
            return

        flush = options["flush"]
        days = options["days"]

        if flush:
            seed_emails = {u["email"] for u in SEED_USERS}
            deleted_users = User.objects.filter(email__in=seed_emails).count()
            User.objects.filter(email__in=seed_emails).delete()
            self.stdout.write(
                self.style.WARNING(f"Flushed {deleted_users} seed users and their data.")
            )

        # ----------------------------------------------------------------
        # 1. GlobalSettings
        # ----------------------------------------------------------------
        gs, created = GlobalSettings.objects.get_or_create(pk=1)
        if created:
            self.stdout.write(self.style.SUCCESS("Created GlobalSettings"))

        # ----------------------------------------------------------------
        # 2. Diets
        # ----------------------------------------------------------------
        diet_objects: dict[str, Diet] = {}
        for diet_name in DIETS:
            diet, created = Diet.objects.get_or_create(
                name=diet_name, defaults={"is_active": True}
            )
            diet_objects[diet_name] = diet
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Diet created: {diet_name}"))

        # ----------------------------------------------------------------
        # 3. Client group
        # ----------------------------------------------------------------
        client_group, _ = Group.objects.get_or_create(name="Client")

        # ----------------------------------------------------------------
        # 4. Users + ClientSettings
        # ----------------------------------------------------------------
        past_days = _past_weekdays(days)
        created_users = 0
        created_orders = 0
        skipped_orders = 0

        for seed in SEED_USERS:
            user, user_created = User.objects.get_or_create(
                username=seed["username"],
                defaults={
                    "email": seed["email"],
                    "first_name": seed["first_name"],
                    "last_name": seed["last_name"],
                },
            )
            if user_created:
                user.set_password("devpass123")
                user.save()
                user.groups.add(client_group)
                created_users += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  User created: {seed['first_name']} {seed['last_name']} "
                        f"<{seed['email']}> / devpass123"
                    )
                )
            else:
                self.stdout.write(f"  User exists: {seed['username']}")

            # ClientSettings
            cs, _ = ClientSettings.objects.get_or_create(user=user)
            cs.visible_menus = seed["menus"]
            cs.visible_meals = seed["meals"]
            cs.visible_diets.set(
                [diet_objects[d] for d in seed["diets"] if d in diet_objects]
            )
            cs.save()

            # ----------------------------------------------------------------
            # 5. Orders
            # ----------------------------------------------------------------
            random.seed(seed["username"])  # deterministic per user
            for day in past_days:
                order_data = _build_order_data(seed)
                if not order_data:
                    skipped_orders += 1
                    continue

                _, order_created = DailyOrder.objects.get_or_create(
                    user=user,
                    date=day,
                    defaults={"data": order_data, "status": "submitted"},
                )
                if order_created:
                    created_orders += 1
                else:
                    skipped_orders += 1

        # ----------------------------------------------------------------
        # Summary
        # ----------------------------------------------------------------
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Seed complete ==="))
        self.stdout.write(f"  Users created:   {created_users}")
        self.stdout.write(f"  Diets ensured:   {len(diet_objects)}")
        self.stdout.write(f"  Orders created:  {created_orders}")
        self.stdout.write(f"  Orders skipped (already existed or empty): {skipped_orders}")
        self.stdout.write(
            self.style.WARNING(
                "\n  All seed users have password: devpass123\n"
                "  DO NOT USE IN PRODUCTION."
            )
        )
