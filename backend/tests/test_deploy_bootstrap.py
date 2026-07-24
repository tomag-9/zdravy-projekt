import pytest
from django.contrib.auth.models import User
from django.core import management
from django_celery_beat.models import PeriodicTask

from api.default_visibility import DEFAULT_VISIBLE_MENUS
from api.management.commands.real_initial_seed_prevadzky import (
    EDUPAGE_VISIBLE_MEALS,
    SCHOOLS,
)
from api.management.commands.seed_real_delivery_layout import DELIVERY_ROWS, ROUTES
from api.models import (
    Celok,
    ClientSettings,
    DeliveryBlock,
    DeliveryRoute,
    Diet,
    GlobalSettings,
    Prevadzka,
    UserProfile,
)
from api.reference_data import DEFAULT_DIET_NAMES
from api.signals import EDUPAGE_SCRAPE_TASK_PREFIX


@pytest.mark.django_db
def test_ensure_global_settings_creates_singleton_idempotently():
    assert not GlobalSettings.objects.filter(pk=1).exists()

    management.call_command("ensure_global_settings")
    management.call_command("ensure_global_settings")

    assert GlobalSettings.objects.filter(pk=1).count() == 1


@pytest.mark.django_db
def test_real_edupage_seed_creates_operations_and_links(settings):
    settings.DEBUG = False

    management.call_command("init_reference_data")
    management.call_command("real_initial_seed_prevadzky", "--allow-prod")
    management.call_command("real_initial_seed_prevadzky", "--allow-prod")

    assert User.objects.filter(username__endswith="@edupage.local").count() == len(
        SCHOOLS
    )

    for school in SCHOOLS:
        user = User.objects.get(username=f"{school['subdomain']}@edupage.local")
        profile = user.profile

        assert not user.has_usable_password()
        assert profile.company_name == school["company_name"]
        assert profile.billing_name == school["company_name"]
        assert profile.is_edupage is True
        assert profile.mealsguest_url == school["mealsguest_url"]
        if school["subdomain"] != "zdravebrusko":
            assert profile.celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
            assert profile.celok.mealsguest_url == school["mealsguest_url"]
        assert user.settings.visible_menus == DEFAULT_VISIBLE_MENUS
        assert user.settings.visible_meals == EDUPAGE_VISIBLE_MEALS

    dia = Diet.objects.get(name="DIA")
    krasnanko = User.objects.get(username="krasnanko@edupage.local")
    assert krasnanko.settings.visible_diets.filter(pk=dia.pk).exists()
    assert (
        krasnanko.profile.dostupne_prevadzky()
        .get()
        .visible_diets.filter(pk=dia.pk)
        .exists()
    )
    for school in SCHOOLS:
        prevadzky = User.objects.get(
            username=f"{school['subdomain']}@edupage.local"
        ).profile.dostupne_prevadzky()
        assert prevadzky.exists()
        for prevadzka in prevadzky:
            assert prevadzka.visible_menus == DEFAULT_VISIBLE_MENUS
            assert prevadzka.visible_meals == EDUPAGE_VISIBLE_MEALS
            enabled_diets = set(prevadzka.visible_diets.values_list("name", flat=True))
            assert set(DEFAULT_DIET_NAMES).issubset(enabled_diets)
            if school["subdomain"] != "krasnanko":
                assert "DIA" not in enabled_diets
            if school["subdomain"] == "zdravebrusko":
                assert prevadzka.celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
                assert prevadzka.celok.mealsguest_url == school["mealsguest_url"]
    assert (
        not ClientSettings.objects.exclude(user=krasnanko)
        .filter(visible_diets=dia)
        .exists()
    )


@pytest.mark.django_db
def test_real_delivery_layout_seed_is_idempotent_and_persistent(settings):
    settings.DEBUG = True
    Diet.objects.create(name="NO GLUTEN")
    old_zdrave_brusko_celok = Celok.objects.create(nazov="MŠ Zdravé Bruško")
    old_zdrave_brusko = Prevadzka.objects.create(
        celok=old_zdrave_brusko_celok,
        nazov="MŠ Zdravé Bruško",
    )
    ivanka_celok = Celok.objects.create(nazov="ZŠ Ivanka pri Dunaji")
    ivanka = Prevadzka.objects.create(celok=ivanka_celok, nazov="ZŠ Ivanka pri Dunaji")
    veterinarna_celok = Celok.objects.create(nazov="SŠ VETERINÁRNA")
    veterinarna = Prevadzka.objects.create(
        celok=veterinarna_celok,
        nazov="SŠ VETERINÁRNA",
        adresa="Pod brehmi 6, Bratislava",
    )
    fan_celok = Celok.objects.create(nazov="SZŠ FAN")
    fan = Prevadzka.objects.create(celok=fan_celok, nazov="SZŠ FAN")

    management.call_command("seed_real_delivery_layout")
    management.call_command("seed_real_delivery_layout")

    assert (
        DeliveryBlock.objects.filter(name__in=["Bežné trasy", "Trasa extra"]).count()
        == 2
    )
    assert DeliveryRoute.objects.count() == len(ROUTES)
    assert Prevadzka.objects.filter(is_active=True).count() == len(DELIVERY_ROWS)

    nova_tulipa = Prevadzka.objects.get(nazov="Nova Tulipa")
    assert nova_tulipa.delivery_route.name == "trasa 2 - 9:25 - Ivan/Heňo"
    assert nova_tulipa.delivery_sort_order == 1

    ivanka.refresh_from_db()
    assert ivanka.delivery_route.name == "1.Trasa - Pezinská - Heňo/Ivan"
    assert ivanka.delivery_sort_order == 5
    assert ivanka.report_alias == "Ivanka"

    veterinarna.refresh_from_db()
    assert (
        veterinarna.delivery_route.name == "TRASA EXTRA ZABALENÉ ZVLÁŠŤ - do 11:00 MAJO"
    )
    assert veterinarna.report_alias == "SŠ VETERINÁRNA Pod brehmi 6"

    fan.refresh_from_db()
    assert fan.delivery_route.name == "trasa 5 - RADKO - 10:00"
    assert fan.report_alias == "Fantastická škola"

    assert not Celok.objects.filter(pk=old_zdrave_brusko_celok.pk).exists()
    assert not Prevadzka.objects.filter(pk=old_zdrave_brusko.pk).exists()

    for nazov in ["Jolly 1", "Jolly 2", "Jolly 3", "Les", "Lúka"]:
        assert (
            Prevadzka.objects.get(nazov=nazov).celok.zdroj_objednavok
            == Celok.ZdrojObjednavok.EDUPAGE
        )

    no_gluten = Diet.objects.get(name="NO GLUTEN")
    assert no_gluten.color == "#2563EB"


@pytest.mark.django_db
def test_real_edupage_seed_fills_blank_billing_name(settings):
    settings.DEBUG = False
    school = SCHOOLS[0]
    user = User.objects.create_user(
        username=f"{school['subdomain']}@edupage.local",
        email=f"{school['subdomain']}@edupage.local",
    )
    UserProfile.objects.create(user=user)

    management.call_command("real_initial_seed_prevadzky", "--allow-prod")

    user.refresh_from_db()
    assert user.profile.company_name == school["company_name"]
    assert user.profile.billing_name == school["company_name"]
    assert user.profile.is_edupage is True
    assert user.profile.mealsguest_url == school["mealsguest_url"]
    assert user.profile.celok.nazov == school["company_name"]
    assert user.profile.celok.billing_name == school["company_name"]
    assert user.profile.celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
    assert user.profile.celok.mealsguest_url == school["mealsguest_url"]


@pytest.mark.django_db
def test_real_edupage_seed_updates_legacy_lunch_only_visible_meals(settings):
    settings.DEBUG = False
    school = SCHOOLS[0]
    user = User.objects.create_user(
        username=f"{school['subdomain']}@edupage.local",
        email=f"{school['subdomain']}@edupage.local",
    )
    UserProfile.objects.create(user=user)
    ClientSettings.objects.create(
        user=user, visible_menus=["A"], visible_meals=["lunch"]
    )
    prevadzka = user.profile.dostupne_prevadzky().get()
    prevadzka.visible_menus = ["A"]
    prevadzka.visible_meals = ["lunch"]
    prevadzka.save(update_fields=["visible_menus", "visible_meals"])

    management.call_command("real_initial_seed_prevadzky", "--allow-prod")

    user.refresh_from_db()
    prevadzka.refresh_from_db()
    assert user.settings.visible_menus == DEFAULT_VISIBLE_MENUS
    assert user.settings.visible_meals == EDUPAGE_VISIBLE_MEALS
    assert prevadzka.visible_menus == DEFAULT_VISIBLE_MENUS
    assert prevadzka.visible_meals == EDUPAGE_VISIBLE_MEALS


@pytest.mark.django_db
def test_deploy_bootstrap_creates_edupage_scrape_tasks(settings):
    settings.DEBUG = False

    management.call_command("deploy_bootstrap", "--skip-migrate")

    assert PeriodicTask.objects.filter(
        name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX,
        enabled=True,
        task="api.tasks.scrape_edupage_orders_task",
    ).exists()


@pytest.mark.django_db
def test_disabled_edupage_auto_scrape_removes_periodic_tasks(settings):
    settings.DEBUG = False

    gs = GlobalSettings.objects.create(pk=1, edupage_auto_scrape_enabled=True)
    assert PeriodicTask.objects.filter(
        name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX
    ).exists()

    gs.edupage_auto_scrape_enabled = False
    gs.save(update_fields=["edupage_auto_scrape_enabled"])

    assert not PeriodicTask.objects.filter(
        name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX
    ).exists()


@pytest.mark.django_db
def test_deploy_bootstrap_does_not_create_demo_logins_in_production(
    settings, monkeypatch
):
    settings.DEBUG = False
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "app.settings.prod")

    management.call_command("deploy_bootstrap", "--skip-migrate")

    assert not User.objects.filter(
        email__in=["admin@example.com", "prevadzka@example.com"]
    ).exists()
