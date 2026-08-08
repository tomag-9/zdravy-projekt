import datetime

import pytest

from api.models import DailyMealPlan, Diet, MealCategory, MealPlanItem, MealTemplate
from api.tests.factories import AdminUserFactory


@pytest.mark.django_db
def test_diet_list_respects_sort_order_then_name(api_client):
    """Hlavné diéty musia ísť hore — poradie riadi `sort_order`, až potom názov."""
    admin = AdminUserFactory()
    api_client.force_authenticate(user=admin)
    Diet.objects.create(name="Zulu", sort_order=0)
    Diet.objects.create(name="Alpha", sort_order=5)
    Diet.objects.create(name="Beta", sort_order=0)

    response = api_client.get("/api/diets/")

    assert response.status_code == 200
    payload = response.json()
    names = [item["name"] for item in payload]

    # Zulu a Beta majú sort_order 0 → idú pred Alpha (5), medzi sebou podľa názvu.
    assert names.index("Beta") < names.index("Zulu") < names.index("Alpha")


@pytest.mark.django_db
def test_diet_list_returns_all_items_without_pagination(api_client):
    """Admin screens must see diets beyond the former 20-item first page."""
    admin = AdminUserFactory()
    api_client.force_authenticate(user=admin)
    Diet.objects.bulk_create(
        [Diet(name=f"Diet {index:02d}", sort_order=index) for index in range(25)]
    )

    response = api_client.get("/api/diets/")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 25


@pytest.mark.django_db
def test_diet_model_ordering_is_sort_order_then_name():
    """Ordering musí platiť na úrovni modelu, nie len v jednom endpointe."""
    Diet.objects.create(name="Zulu", sort_order=0)
    Diet.objects.create(name="Alpha", sort_order=5)
    Diet.objects.create(name="Beta", sort_order=0)

    assert list(Diet.objects.values_list("name", flat=True)) == [
        "Beta",
        "Zulu",
        "Alpha",
    ]


@pytest.mark.django_db
def test_diet_reorder_updates_only_included_rows_and_invalidates_cache(api_client):
    admin = AdminUserFactory()
    api_client.force_authenticate(user=admin)
    first = Diet.objects.create(name="First", sort_order=10)
    second = Diet.objects.create(name="Second", sort_order=20)
    untouched = Diet.objects.create(name="Untouched", sort_order=30)

    # Populate the 24-hour list cache with the original order.
    initial_response = api_client.get("/api/diets/")
    assert [item["id"] for item in initial_response.json()] == [
        first.id,
        second.id,
        untouched.id,
    ]

    response = api_client.post(
        "/api/diets/reorder/",
        {
            "diets": [
                {"id": second.id, "sort_order": 1},
                {"id": first.id, "sort_order": 2},
            ]
        },
        format="json",
    )

    assert response.status_code == 200
    first.refresh_from_db()
    second.refresh_from_db()
    untouched.refresh_from_db()
    assert (first.sort_order, second.sort_order, untouched.sort_order) == (2, 1, 30)

    cached_list_response = api_client.get("/api/diets/")
    assert [item["id"] for item in cached_list_response.json()] == [
        second.id,
        first.id,
        untouched.id,
    ]


@pytest.mark.django_db
def test_diet_base_diets_can_be_added_and_removed():
    milk_free = Diet.objects.create(name="No Milk", color="#2563EB")
    gluten_free = Diet.objects.create(name="No Gluten", color="#F59E0B")
    composite = Diet.objects.create(name="No Milk - No Gluten")

    composite.base_diets.add(milk_free, gluten_free)
    assert set(composite.base_diets.all()) == {milk_free, gluten_free}

    composite.base_diets.remove(milk_free)
    assert list(composite.base_diets.all()) == [gluten_free]


@pytest.mark.django_db
def test_diet_serializer_exposes_base_diet_ids_and_colors(api_client):
    api_client.force_authenticate(user=AdminUserFactory())
    milk_free = Diet.objects.create(name="No Milk", color="#2563EB")
    gluten_free = Diet.objects.create(name="No Gluten", color="#F59E0B")
    colorless = Diet.objects.create(name="No Color")
    composite = Diet.objects.create(name="Composite", color="#7C3AED")
    composite.base_diets.add(milk_free, gluten_free, colorless)

    response = api_client.get(f"/api/diets/{composite.id}/")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload["base_diets"]) == {
        milk_free.id,
        gluten_free.id,
        colorless.id,
    }
    assert payload["base_colors"] == ["#FDE68A", "#F59E0B", "#2563EB"]


@pytest.mark.django_db
def test_menu_variant_map_defaults_active_diets_to_a_without_meal_plan(api_client):
    api_client.force_authenticate(user=AdminUserFactory())
    Diet.objects.create(name="Bezlepková")
    Diet.objects.create(name="Vegetariánska")

    response = api_client.get("/api/diets/menu-variant-map/?date=2026-08-10")

    assert response.status_code == 200
    assert response.json() == {"Bezlepková": "A", "Vegetariánska": "A"}


@pytest.mark.django_db
def test_menu_variant_map_uses_explicit_main_course_override(api_client):
    api_client.force_authenticate(user=AdminUserFactory())
    gluten_free = Diet.objects.create(name="Bezlepková")
    vegetarian = Diet.objects.create(name="Vegetariánska")
    meal_plan = DailyMealPlan.objects.create(date=datetime.date(2026, 8, 10))
    template = MealTemplate.objects.create(
        category=MealCategory.MAIN_COURSE,
        name="Vegetariánsky obed",
        base_weight_grams="250.00",
        menu_variant="V",
        diet=vegetarian,
    )
    MealPlanItem.objects.create(
        meal_plan=meal_plan,
        template=template,
        category=MealCategory.MAIN_COURSE,
        menu_variant="V",
        diet=vegetarian,
    )

    response = api_client.get("/api/diets/menu-variant-map/?date=2026-08-10")

    assert response.status_code == 200
    assert response.json() == {gluten_free.name: "A", vegetarian.name: "V"}


@pytest.mark.django_db
def test_menu_variant_map_prefers_a_for_multiple_explicit_rows(api_client):
    api_client.force_authenticate(user=AdminUserFactory())
    vegetarian = Diet.objects.create(name="Vegetariánska")
    meal_plan = DailyMealPlan.objects.create(date=datetime.date(2026, 8, 10))
    template = MealTemplate.objects.create(
        category=MealCategory.MAIN_COURSE,
        name="Vegetariánsky obed",
        base_weight_grams="250.00",
        menu_variant="V",
        diet=vegetarian,
    )
    MealPlanItem.objects.create(
        meal_plan=meal_plan,
        template=template,
        category=MealCategory.MAIN_COURSE,
        menu_variant="V",
        diet=vegetarian,
    )
    MealPlanItem.objects.create(
        meal_plan=meal_plan,
        template=template,
        category=MealCategory.MAIN_COURSE,
        menu_variant="A",
        diet=vegetarian,
    )

    response = api_client.get("/api/diets/menu-variant-map/?date=2026-08-10")

    assert response.status_code == 200
    assert response.json() == {vegetarian.name: "A"}


@pytest.mark.django_db
def test_menu_variant_map_requires_date(api_client):
    api_client.force_authenticate(user=AdminUserFactory())

    response = api_client.get("/api/diets/menu-variant-map/")

    assert response.status_code == 400
    assert response.json() == {"error": "date query param required"}


@pytest.mark.django_db
def test_menu_variant_map_rejects_invalid_date(api_client):
    api_client.force_authenticate(user=AdminUserFactory())

    response = api_client.get("/api/diets/menu-variant-map/?date=10-08-2026")

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "validation_error",
            "message": "Validation failed.",
            "details": {"date": "Invalid date format, use YYYY-MM-DD"},
        }
    }


@pytest.mark.django_db
def test_menu_variant_map_excludes_inactive_diets(api_client):
    api_client.force_authenticate(user=AdminUserFactory())
    Diet.objects.create(name="Aktívna")
    Diet.objects.create(name="Neaktívna", is_active=False)

    response = api_client.get("/api/diets/menu-variant-map/?date=2026-08-10")

    assert response.status_code == 200
    assert response.json() == {"Aktívna": "A"}


@pytest.mark.django_db
def test_menu_variant_map_requires_authentication(api_client):
    response = api_client.get("/api/diets/menu-variant-map/?date=2026-08-10")

    assert response.status_code in (401, 403)
