import pytest
from django.contrib.auth.models import User
from django.core import management
from django_celery_beat.models import PeriodicTask

from api.management.commands.real_initial_seed_prevadzky import SCHOOLS
from api.models import GlobalSettings, UserProfile
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
        assert user.settings.visible_meals == ["lunch"]


@pytest.mark.django_db
def test_real_edupage_seed_fills_blank_billing_name(settings):
    settings.DEBUG = False
    school = SCHOOLS[0]
    user = User.objects.create_user(
        username=f"{school['subdomain']}@edupage.local",
        email=f"{school['subdomain']}@edupage.local",
    )
    UserProfile.objects.create(user=user, company_name=school["company_name"])

    management.call_command("real_initial_seed_prevadzky", "--allow-prod")

    user.refresh_from_db()
    assert user.profile.billing_name == school["company_name"]
    assert user.profile.is_edupage is True
    assert user.profile.mealsguest_url == school["mealsguest_url"]


@pytest.mark.django_db
def test_deploy_bootstrap_creates_edupage_scrape_tasks(settings):
    settings.DEBUG = False

    management.call_command("ensure_global_settings")
    management.call_command("real_initial_seed_prevadzky", "--allow-prod")
    management.call_command("sync_periodic_tasks", "--fix")

    assert PeriodicTask.objects.filter(
        name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX,
        enabled=True,
        task="api.tasks.scrape_edupage_orders_task",
    ).exists()
