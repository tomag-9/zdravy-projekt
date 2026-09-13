from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from api.models import UserProfile


@pytest.mark.django_db
def test_cluster_summary_returns_the_selected_data_as_json():
    client = APIClient()
    client.force_authenticate(User.objects.create_user("admin", is_staff=True))
    dashboard_data = {
        "date": "2026-09-12",
        "col_groups": [],
        "rows": [],
        "vydaje_by_meal": {"lunch": []},
    }
    with patch(
        "api.views.meal_plan_views._cached_gramage_dashboard_data",
        return_value=dashboard_data,
    ):
        response = client.get(
            "/api/admin/meal-plans/cluster-summary/?date=2026-09-12&meal=breakfast&meal=olovrant"
        )

    assert response.status_code == 200
    assert response.json()["date"] == "2026-09-12"
    assert response.json()["meals"] == ["breakfast", "olovrant"]
    assert response.json()["spec"]["meals"] == ["breakfast", "olovrant"]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "url",
    [
        "/api/admin/meal-plans/cluster-summary/?date=2026-09-12",
        "/api/admin/meal-plans/cluster-summary-pdf/?date=2026-09-12",
    ],
)
def test_cluster_summary_endpoints_are_denied_to_anonymous_client_and_kitchen_users(
    url,
):
    client = APIClient()

    assert client.get(url).status_code in (401, 403)

    client.force_authenticate(User.objects.create_user("client"))
    assert client.get(url).status_code == 403

    kitchen = User.objects.create_user("kitchen")
    kitchen_profile = UserProfile(user=kitchen, role=UserProfile.Role.KUCHYNA)
    kitchen_profile._skip_default_facility = True
    kitchen_profile.save()
    client.force_authenticate(kitchen)
    assert client.get(url).status_code == 403


@pytest.mark.django_db
def test_cluster_summary_rejects_an_invalid_repeatable_meal():
    client = APIClient()
    client.force_authenticate(User.objects.create_user("admin", is_staff=True))

    response = client.get(
        "/api/admin/meal-plans/cluster-summary/?date=2026-09-12&meal=lunch&meal=dinner"
    )

    assert response.status_code == 400
    assert response.json()["error"] == "invalid meal"


@pytest.mark.django_db
def test_cluster_summary_pdf_uses_all_meals_by_default_and_returns_a_pdf():
    client = APIClient()
    client.force_authenticate(User.objects.create_user("admin", is_staff=True))
    with patch(
        "api.views.meal_plan_views.render_cluster_summary_pdf",
        return_value=b"%PDF-test",
    ) as render:
        response = client.get(
            "/api/admin/meal-plans/cluster-summary-pdf/?date=2026-09-12"
        )

    assert response.status_code == 200
    assert response.content == b"%PDF-test"
    assert render.call_args.args == ("2026-09-12",)
    assert render.call_args.kwargs["meals"] == ["breakfast", "lunch", "olovrant"]
    assert "sumare_vsetky_2026-09-12.pdf" in response["Content-Disposition"]
