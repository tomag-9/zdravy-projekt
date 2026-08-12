"""Admin API katalógu šablón — duplicitný názov sa nesmie dať vytvoriť.

Duplicita v `MealTemplate.name` položí seed katalógu a s ním celý
`deploy_bootstrap`, preto ju odmietame už na vstupe.
"""

import pytest

from api.models import MealCategory, MealTemplate

URL = "/api/admin/meal-templates/"


@pytest.fixture
def template(db):
    return MealTemplate.objects.create(
        category=MealCategory.SOUP,
        name="Polievka 3",
        weight_label="200g",
        base_weight_grams="200.00",
        components=[{"label": "Polievka", "grams": "200", "unit": "g"}],
    )


def _payload(**overrides):
    data = {
        "category": MealCategory.SOUP,
        "name": "Polievka 3",
        "components": [{"label": "Polievka", "grams": "200", "unit": "g"}],
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
def test_create_rejects_duplicate_name(admin_client, template):
    response = admin_client.post(URL, _payload(), format="json")

    assert response.status_code == 400
    assert "name" in response.data["error"]["details"]
    assert MealTemplate.objects.filter(name="Polievka 3").count() == 1


@pytest.mark.django_db
def test_create_rejects_duplicate_name_case_and_whitespace_insensitively(
    admin_client, template
):
    response = admin_client.post(URL, _payload(name="  polievka 3  "), format="json")

    assert response.status_code == 400
    assert MealTemplate.objects.count() == 1


@pytest.mark.django_db
def test_create_allows_a_new_name(admin_client, template):
    response = admin_client.post(URL, _payload(name="Polievka 5"), format="json")

    assert response.status_code == 201
    assert MealTemplate.objects.filter(name="Polievka 5").exists()


@pytest.mark.django_db
def test_update_keeping_own_name_is_allowed(admin_client, template):
    response = admin_client.patch(
        f"{URL}{template.id}/",
        {"name": "Polievka 3", "weight_label": "250g"},
        format="json",
    )

    assert response.status_code == 200
    template.refresh_from_db()
    assert template.name == "Polievka 3"


@pytest.mark.django_db
def test_update_to_another_existing_name_is_rejected(admin_client, template):
    other = MealTemplate.objects.create(
        category=MealCategory.SOUP,
        name="Polievka 4",
        weight_label="200g",
        base_weight_grams="200.00",
        components=[{"label": "Polievka", "grams": "200", "unit": "g"}],
    )

    response = admin_client.patch(
        f"{URL}{other.id}/", {"name": "Polievka 3"}, format="json"
    )

    assert response.status_code == 400
    other.refresh_from_db()
    assert other.name == "Polievka 4"
