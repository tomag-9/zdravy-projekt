from io import StringIO

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError

from api.models import Celok, ClientSettings, UserProfile


@pytest.mark.django_db
def test_audit_reports_clean_model_state():
    user = User.objects.create_user(
        username="clean@example.com",
        email="clean@example.com",
    )
    UserProfile.objects.create(user=user, company_name="Clean school")
    output = StringIO()

    call_command("audit_model_consistency", "--fail-on-issues", stdout=output)

    assert "TOTAL issues: 0" in output.getvalue()


@pytest.mark.django_db
def test_audit_finds_legacy_mismatches_without_changing_data():
    user = User.objects.create_user(
        username="legacy@example.com",
        email="legacy@example.com",
    )
    profile = UserProfile.objects.create(
        user=user,
        company_name="Legacy school",
        billing_name="Canonical billing",
    )
    profile.refresh_from_db()
    UserProfile.objects.filter(pk=profile.pk).update(
        billing_name="Different legacy billing"
    )
    ClientSettings.objects.create(user=user, visible_menus=["A"])
    Celok.objects.create(
        nazov="EduPage without URL",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
    )
    output = StringIO()

    call_command("audit_model_consistency", stdout=output)

    result = output.getvalue()
    assert "profile_celok_metadata_mismatches: 1" in result
    assert "client_settings_prevadzka_mismatches: 1" in result
    assert "edupage_celky_without_url: 1" in result
    with pytest.raises(CommandError):
        call_command("audit_model_consistency", "--fail-on-issues")
