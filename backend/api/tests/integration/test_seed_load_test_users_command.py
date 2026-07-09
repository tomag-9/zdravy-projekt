import pytest
from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.core.management.base import CommandError

from api.models import ClientSettings, DailyOrder, UserProfile

pytestmark = pytest.mark.django_db

PROD_CONFIRMATION = {
    "allow_production": True,
    "confirm_production": "LOAD_TEST_PROD",
}


def test_seed_load_test_users_creates_clients():
    call_command(
        "seed_load_test_users",
        count=3,
        email_domain="loadtest.example",
        password="LoadTestPassword123!",
        verbosity=0,
        **PROD_CONFIRMATION,
    )

    users = list(
        User.objects.filter(email__endswith="@loadtest.example").order_by("id")
    )
    assert [user.email for user in users] == [
        "zp-loadtest-001@loadtest.example",
        "zp-loadtest-002@loadtest.example",
        "zp-loadtest-003@loadtest.example",
    ]
    assert all(user.check_password("LoadTestPassword123!") for user in users)
    assert all(not user.is_staff and user.is_active for user in users)
    assert Group.objects.get(name="Client").user_set.count() == 3
    assert ClientSettings.objects.filter(user__in=users).count() == 3
    assert UserProfile.objects.filter(user__in=users).count() == 3


def test_seed_load_test_users_cleanup_deletes_users_and_orders():
    call_command(
        "seed_load_test_users",
        count=1,
        email_domain="loadtest.example",
        password="LoadTestPassword123!",
        verbosity=0,
        **PROD_CONFIRMATION,
    )
    user = User.objects.get(email="zp-loadtest-001@loadtest.example")
    DailyOrder.objects.create(
        user=user,
        date="2099-01-05",
        data={"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 1}, "diets": {}}}},
    )

    call_command(
        "seed_load_test_users",
        "--cleanup",
        "--confirm-cleanup",
        "DELETE_LOAD_TEST_USERS",
        count=1,
        email_domain="loadtest.example",
        verbosity=0,
        **PROD_CONFIRMATION,
    )

    assert not User.objects.filter(email="zp-loadtest-001@loadtest.example").exists()
    assert DailyOrder.objects.count() == 0


def test_seed_load_test_users_cleanup_requires_confirmation():
    with pytest.raises(CommandError, match="confirm-cleanup"):
        call_command(
            "seed_load_test_users",
            "--cleanup",
            count=1,
            email_domain="loadtest.example",
            verbosity=0,
            **PROD_CONFIRMATION,
        )
