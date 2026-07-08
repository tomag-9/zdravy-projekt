import pytest
from django.contrib.auth.models import User
from django.core import management
from django_celery_beat.models import PeriodicTask

from api.management.commands.real_initial_seed_prevadzky import (
    EDUPAGE_VISIBLE_MEALS,
    SCHOOLS,
)
from api.models import ClientSettings, Diet, GlobalSettings, UserProfile
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
        assert user.settings.visible_meals == EDUPAGE_VISIBLE_MEALS

    dia = Diet.objects.get(name="DIA")
    krasnanko = User.objects.get(username="krasnanko@edupage.local")
    assert krasnanko.settings.visible_diets.filter(pk=dia.pk).exists()
    assert (
        not ClientSettings.objects.exclude(user=krasnanko)
        .filter(visible_diets=dia)
        .exists()
    )


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


@pytest.mark.django_db
def test_real_edupage_seed_updates_legacy_lunch_only_visible_meals(settings):
    settings.DEBUG = False
    school = SCHOOLS[0]
    user = User.objects.create_user(
        username=f"{school['subdomain']}@edupage.local",
        email=f"{school['subdomain']}@edupage.local",
    )
    UserProfile.objects.create(user=user)
    ClientSettings.objects.create(user=user, visible_meals=["lunch"])

    management.call_command("real_initial_seed_prevadzky", "--allow-prod")

    user.refresh_from_db()
    assert user.settings.visible_meals == EDUPAGE_VISIBLE_MEALS


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
