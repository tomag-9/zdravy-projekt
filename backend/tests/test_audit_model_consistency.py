from io import StringIO

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError

from api.models import Celok, Prevadzka, ProfilePrevadzkaAccess, UserProfile


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
def test_audit_finds_access_and_connection_issues_without_changing_data():
    user = User.objects.create_user(
        username="legacy@example.com",
        email="legacy@example.com",
    )
    profile = UserProfile.objects.create(user=user, company_name="School")
    celok = profile.primary_celok()
    prevadzka = profile.dostupne_prevadzky().get()
    ProfilePrevadzkaAccess.objects.create(
        profile=profile,
        prevadzka=prevadzka,
    )
    edupage_celok = Celok.objects.create(
        nazov="EduPage without URL",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
    )
    Prevadzka.objects.create(celok=edupage_celok, nazov="EduPage prevádzka")
    output = StringIO()

    call_command("audit_model_consistency", stdout=output)

    result = output.getvalue()
    assert "profiles_with_mixed_access_scope: 1" in result
    assert "edupage_prevadzky_without_connection: 1" in result
    assert celok is not None
    with pytest.raises(CommandError):
        call_command("audit_model_consistency", "--fail-on-issues")
