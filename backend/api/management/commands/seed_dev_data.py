"""
Development-only management command to seed the database with realistic sample
data: users, diets, client settings, orders, meal plan templates and plans.

Usage:
    python manage.py seed_dev_data
    python manage.py seed_dev_data --flush --confirm-flush FLUSH
                                               # wipe existing seed data first
    python manage.py seed_dev_data --days 10  # seed N past weekdays
                                               # (orders + meal plans)
    python manage.py seed_dev_data --allow-staging --days 10
                                               # allow run with staging settings
"""

import datetime
import os
import random

from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.core.management.base import BaseCommand

from api.models import (
    ClientSettings,
    DailyMealPlan,
    DailyOrder,
    Diet,
    EnrolledCount,
    GlobalSettings,
    MealPlanItem,
    MealTemplate,
    PortionType,
    PushSubscription,
    UserProfile,
)

# ── Meal plan seed data ────────────────────────────────────────────────────────

MEAL_TEMPLATES = [
    {
        "category": "breakfast",
        "name": "Chlieb + maslo + kakao",
        "weight_label": "50g + 10g + 200g",
        "menu_variant": "",
    },
    {
        "category": "lunch",
        "name": "Kurací vývar s rezancami",
        "weight_label": "250g + 50g",
        "menu_variant": "A",
    },
    {
        "category": "lunch",
        "name": "Kuracie prsia + ryža + šalát",
        "weight_label": "120g + 80g + 50g",
        "menu_variant": "A",
    },
    {
        "category": "lunch",
        "name": "Zeleninová polievka + chlieb",
        "weight_label": "250g + 50g",
        "menu_variant": "B",
    },
    {
        "category": "lunch",
        "name": "Šošovicový prívarok + knedľa",
        "weight_label": "200g + 100g",
        "menu_variant": "V",
    },
    {
        "category": "snack",
        "name": "Jogurt + ovocie",
        "weight_label": "150g + 50g",
        "menu_variant": "",
    },
]

ORDER_CATEGORIES = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]
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
        "username": "zs-novomestska",
        "company_name": "ZŠ Novomestská",
        "billing_name": "Základná škola Novomestská, s.r.o.",
        "email": "zs.novomestska@dev.local",
        "categories": ["Jasle", "Škôlka"],
        "menus": ["A", "B"],
        "meals": ["breakfast", "lunch"],
        "diets": [],
    },
    {
        "username": "ms-slniecko",
        "company_name": "MŠ Slniečko",
        "billing_name": "Materská škola Slniečko, príspevková org.",
        "email": "ms.slniecko@dev.local",
        "categories": ["ZŠ 1.stupeň", "ZŠ 2.stupeň"],
        "menus": ["A", "B", "V"],
        "meals": ["lunch"],
        "diets": ["Bez lepku"],
    },
    {
        "username": "zs-priekopska",
        "company_name": "ZŠ Priekopská",
        "billing_name": "ZŠ s MŠ Priekopská 1, Martin",
        "email": "zs.priekopska@dev.local",
        "categories": ["Jasle"],
        "menus": ["A"],
        "meals": ["breakfast", "lunch", "olovrant"],
        "diets": ["Bez laktózy", "Diabetické"],
    },
    {
        "username": "ss-obchodna",
        "company_name": "SOŠ Obchodná",
        "billing_name": "Stredná odborná škola obchodná, Žilina",
        "email": "ss.obchodna@dev.local",
        "categories": ["Dospelý (SŠ)"],
        "menus": ["A", "B"],
        "meals": ["breakfast", "lunch", "olovrant"],
        "diets": [],
    },
    {
        "username": "zs-zahradna",
        "company_name": "ZŠ Záhradná",
        "billing_name": "Základná škola Záhradná 4, Banská Bystrica",
        "email": "zs.zahradna@dev.local",
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
            "--allow-staging",
            action="store_true",
            help="Allow running with app.settings.staging (DEBUG=False).",
        )
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing seed users and their orders before seeding",
        )
        parser.add_argument(
            "--confirm-flush",
            type=str,
            default="",
            help="Safety confirmation for --flush. Must be exactly: FLUSH",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=5,
            help="Number of past weekdays to generate orders for (default: 5)",
        )

    def handle(self, *args, **options):
        from django.conf import settings as django_settings

        settings_module = os.environ.get("DJANGO_SETTINGS_MODULE") or getattr(
            django_settings, "SETTINGS_MODULE", ""
        )
        is_staging = ".staging" in settings_module

        if not django_settings.DEBUG:
            if not (is_staging and options["allow_staging"]):
                self.stderr.write(
                    self.style.ERROR(
                        "seed_dev_data is blocked for DEBUG=False environments. "
                        "For staging use --allow-staging."
                    )
                )
                return

        flush = options["flush"]
        days = options["days"]

        if days <= 0:
            self.stderr.write(self.style.ERROR("--days must be a positive integer."))
            return

        if flush and options["confirm_flush"] != "FLUSH":
            self.stderr.write(
                self.style.ERROR(
                    "Refusing to run --flush without confirmation. "
                    "Re-run with: --confirm-flush FLUSH"
                )
            )
            return

        if flush:
            seed_emails = {u["email"] for u in SEED_USERS}
            deleted_users = User.objects.filter(email__in=seed_emails).count()
            User.objects.filter(email__in=seed_emails).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Flushed {deleted_users} seed users and their data."
                )
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
                defaults={"email": seed["email"]},
            )
            if user_created:
                user.set_unusable_password()
                user.save()
                user.groups.add(client_group)
                created_users += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Prevádzka vytvorená: {seed['company_name']} "
                        f"<{seed['email']}>"
                    )
                )
            else:
                self.stdout.write(f"  Prevádzka existuje: {seed['username']}")

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.company_name = seed["company_name"]
            profile.billing_name = seed["billing_name"]
            profile.save(update_fields=["company_name", "billing_name"])

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
        # 6. Fake push subscription for the demo prevádzka user
        #    Points to the dev push echo endpoint so admin push sends
        #    can be verified without a real browser subscription.
        # ----------------------------------------------------------------
        try:
            prevadzka_user = User.objects.get(email__iexact="prevadzka@example.com")
            _, sub_created = PushSubscription.objects.get_or_create(
                user=prevadzka_user,
                endpoint="http://localhost:8000/api/dev/push-echo/",
                defaults={
                    # Deterministic fake browser EC key pair (dev only)
                    "p256dh": "BIfyrik-Uerib1Imel4NlNsejC6YRAW3fR1ZAvwBSMVuGb8njTzEdt0ZRVgG2EQeNz1JE-_Bjx8o5_HJbKz43Rw",
                    "auth": "C21KX39xC-yjZkvpPZCriw",
                },
            )
            if sub_created:
                self.stdout.write(
                    self.style.SUCCESS(
                        "  Dev push subscription seeded for 'prevadzka@example.com' → /api/dev/push-echo/"
                    )
                )
            else:
                self.stdout.write(
                    "  Dev push subscription for 'prevadzka@example.com' already exists"
                )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(
                    "  'prevadzka@example.com' user not found – skipping push subscription seed. "
                    "Run init_roles first."
                )
            )

        # ----------------------------------------------------------------
        # 7. Reference data (portion types) + meal plan templates/plans
        # ----------------------------------------------------------------
        call_command("init_reference_data", verbosity=options.get("verbosity", 1))
        mp_templates, mp_plans = self._seed_meal_plan_data(days, flush)

        # ----------------------------------------------------------------
        # Summary
        # ----------------------------------------------------------------
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Seed complete ==="))
        self.stdout.write(f"  Prevádzky vytvorené: {created_users}")
        self.stdout.write(f"  Diets ensured:       {len(diet_objects)}")
        self.stdout.write(f"  Orders created:      {created_orders}")
        self.stdout.write(f"  Orders skipped:      {skipped_orders}")
        self.stdout.write(f"  Templates ensured:   {mp_templates}")
        self.stdout.write(f"  Meal plans created:  {mp_plans}")
        self.stdout.write(
            self.style.WARNING(
                "\n  Seed prevádzky nemajú nastavené heslo (set_unusable_password).\n"
                "  Prihlásenie cez admin panel alebo password reset.\n"
                "  DO NOT USE IN PRODUCTION."
            )
        )

    # ------------------------------------------------------------------
    # Meal plan seeding (templates + daily plans)
    # ------------------------------------------------------------------

    def _seed_meal_plan_data(self, days: int, flush: bool) -> tuple[int, int]:
        from api.serializers_menu import parse_composition_grams

        if flush:
            DailyMealPlan.objects.all().delete()
            MealTemplate.objects.all().delete()

        # ── Seed templates ────────────────────────────────────────────
        for tpl_data in MEAL_TEMPLATES:
            MealTemplate.objects.get_or_create(
                name=tpl_data["name"],
                category=tpl_data["category"],
                defaults={
                    "weight_label": tpl_data["weight_label"],
                    "base_weight_grams": parse_composition_grams(
                        tpl_data["weight_label"]
                    ),
                    "menu_variant": tpl_data["menu_variant"],
                },
            )

        # Build lookup by (category, menu_variant) → first matching template
        tpl_by_slot: dict[tuple, MealTemplate] = {}
        for tpl in MealTemplate.objects.filter(
            name__in=[t["name"] for t in MEAL_TEMPLATES]
        ):
            key = (tpl.category, tpl.menu_variant)
            tpl_by_slot.setdefault(key, tpl)

        portion_types = {pt.name: pt for pt in PortionType.objects.all()}
        enrolled_config = [
            ("Jasle", 5),
            ("Škôlka", 15),
            ("ZŠ 1.stupeň", 10),
            ("ZŠ 2.stupeň", 8),
            ("Dospelý (SŠ)", 3),
        ]

        # Slot definitions: (category, menu_variant)
        slots = [
            ("breakfast", ""),
            ("lunch", "A"),
            ("lunch", "B"),
            ("lunch", "V"),
            ("snack", ""),
        ]

        plans_created = 0
        for day in _past_weekdays(days):
            plan, created = DailyMealPlan.objects.get_or_create(
                date=day,
                defaults={"notes": "Demo jedálniček"},
            )
            if not created:
                continue

            for cat, variant in slots:
                tpl = tpl_by_slot.get((cat, variant))
                if tpl:
                    MealPlanItem.objects.get_or_create(
                        meal_plan=plan,
                        category=cat,
                        menu_variant=variant,
                        defaults={"template": tpl},
                    )

            for pt_name, count in enrolled_config:
                if pt_name in portion_types:
                    EnrolledCount.objects.get_or_create(
                        meal_plan=plan,
                        portion_type=portion_types[pt_name],
                        defaults={"count": count},
                    )

            plans_created += 1

        return len(MEAL_TEMPLATES), plans_created
