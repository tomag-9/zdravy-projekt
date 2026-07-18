from contextlib import contextmanager

from django.core import management
from django.core.management.base import BaseCommand
from django.db import connection

BOOTSTRAP_LOCK_ID = 761_420_337


@contextmanager
def deploy_bootstrap_lock():
    if connection.vendor != "postgresql":
        yield
        return

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_lock(%s)", [BOOTSTRAP_LOCK_ID])

    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s)", [BOOTSTRAP_LOCK_ID])


class Command(BaseCommand):
    help = "Run the idempotent deploy bootstrap steps under a database lock."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-migrate",
            action="store_true",
            help="Skip migrations. Intended for tests only.",
        )

    def handle(self, *args, **options):
        with deploy_bootstrap_lock():
            if not options["skip_migrate"]:
                management.call_command(
                    "migrate", verbosity=options.get("verbosity", 1)
                )

            management.call_command("init_roles", verbosity=options.get("verbosity", 1))
            management.call_command(
                "init_reference_data", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "ensure_global_settings", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "real_initial_seed_prevadzky",
                "--allow-prod",
                verbosity=options.get("verbosity", 1),
            )
            # Refinement seedy MUSIA bežať pri každom deployi, nie len raz. Základný
            # `real_initial_seed_prevadzky` vytvorí prevádzky nanovo, čím zhodí splity,
            # fakturačné koeficienty (Edulienka predškolák 1,25) aj rozdelenie Zdravého
            # Brúska na 5 subjektov. Bez týchto krokov sa konfigurácia po každom reseede
            # ticho stráca (žila len v jednorazových data-migráciách). Všetky sú
            # idempotentné a nepotrebujú externé súbory. Poradie je dôležité: splity
            # (Jolly 1/2/3, Škôlka MS) musia byť skôr než `seed_real_delivery_layout`,
            # ktorý existujúce prevádzky iba doplní o rozvoz (a nepresúva ich medzi
            # celkami — inak by narazil na unique(celok, nazov)).
            management.call_command(
                "seed_prevadzky_edupage", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "seed_zdrave_brusko", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "seed_real_delivery_layout",
                "--allow-prod",
                verbosity=options.get("verbosity", 1),
            )
            # Zlúčenie samostatných celkov jednej školy do jedného celku s N prevádzkami
            # (Bystrá, Dubáčik, …). Musí bežať PO delivery layoute, ktorý app-celky
            # vytvára; opravený `_upsert_prevadzka` ich potom už nerecykluje.
            management.call_command(
                "seed_merge_celky", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "sync_periodic_tasks", "--fix", verbosity=options.get("verbosity", 1)
            )
