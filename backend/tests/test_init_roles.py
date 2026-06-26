import pytest
from django.contrib.auth.models import Group, User
from django.core import management


@pytest.mark.django_db
def test_init_roles_skips_default_users_in_production(monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "app.settings.prod")

    management.call_command("init_roles")

    assert Group.objects.filter(name__in=["Client", "Admin", "Staff"]).count() == 3
    assert not User.objects.filter(username__in=["admin", "prevadzka"]).exists()


@pytest.mark.django_db
def test_init_roles_creates_default_users_in_staging(monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "app.settings.staging")

    management.call_command("init_roles")

    admin_user = User.objects.get(username="admin")
    operation_user = User.objects.get(username="prevadzka")

    assert Group.objects.filter(name__in=["Client", "Admin", "Staff"]).count() == 3
    assert admin_user.email == "admin"
    assert admin_user.is_superuser is True
    assert admin_user.check_password("admin")
    assert operation_user.email == "prevadzka"
    assert operation_user.check_password("prevadzka")


@pytest.mark.django_db
def test_init_roles_creates_default_users_outside_production(monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "app.settings.dev")

    management.call_command("init_roles")

    assert User.objects.filter(username="admin", is_superuser=True).exists()
    assert User.objects.filter(username="prevadzka").exists()
