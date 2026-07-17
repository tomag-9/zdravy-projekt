import datetime

import pytest
from django.contrib.auth.models import User

from api.models import (
    Celok,
    DailyMealPlan,
    DailyOrder,
    DeliveryBlock,
    DeliveryRoute,
    MealPlanItem,
    MealTemplate,
    PortionType,
    Prevadzka,
)
from api.services.meal_plan_service import MealPlanService

pytestmark = pytest.mark.django_db


def _prevadzka(nazov, *, route=None, order=0):
    celok, _ = Celok.objects.get_or_create(nazov=f"Celok {nazov}")
    return Prevadzka.objects.create(
        celok=celok,
        nazov=nazov,
        delivery_route=route,
        delivery_sort_order=order,
    )


def test_delivery_layout_endpoint_returns_blocks_routes_and_unassigned(
    admin_authenticated_client,
):
    block = DeliveryBlock.objects.create(name="Bežné trasy", sort_order=1)
    route = DeliveryRoute.objects.create(block=block, name="Trasa 1", sort_order=1)
    assigned = _prevadzka("Jolly 1", route=route, order=1)
    unassigned = _prevadzka("Jolly 2")

    response = admin_authenticated_client.get("/api/admin/delivery-blocks/layout/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["blocks"][0]["name"] == "Bežné trasy"
    assert payload["blocks"][0]["routes"][0]["name"] == "Trasa 1"
    assert payload["blocks"][0]["routes"][0]["prevadzky"][0]["id"] == assigned.id
    assert [row["id"] for row in payload["unassigned_prevadzky"]] == [unassigned.id]


def test_delivery_layout_reorder_moves_prevadzky_between_routes(
    admin_authenticated_client,
):
    block = DeliveryBlock.objects.create(name="Bežné trasy", sort_order=1)
    route_a = DeliveryRoute.objects.create(block=block, name="Trasa A", sort_order=1)
    route_b = DeliveryRoute.objects.create(block=block, name="Trasa B", sort_order=2)
    first = _prevadzka("Prvá", route=route_a, order=1)
    second = _prevadzka("Druhá", route=route_a, order=2)

    response = admin_authenticated_client.post(
        "/api/admin/delivery-blocks/reorder/",
        {
            "blocks": [
                {
                    "id": block.id,
                    "routes": [
                        {"id": route_a.id, "prevadzky": [{"id": second.id}]},
                        {"id": route_b.id, "prevadzky": [{"id": first.id}]},
                    ],
                }
            ],
            "unassigned_prevadzky": [],
        },
        format="json",
    )

    assert response.status_code == 200
    first.refresh_from_db()
    second.refresh_from_db()
    assert first.delivery_route_id == route_b.id
    assert first.delivery_sort_order == 1
    assert second.delivery_route_id == route_a.id
    assert second.delivery_sort_order == 1


def test_gramage_dashboard_groups_rows_by_delivery_layout_order():
    block = DeliveryBlock.objects.create(name="Extra", sort_order=2)
    route = DeliveryRoute.objects.create(block=block, name="TRASA EXTRA", sort_order=3)
    later = _prevadzka("B prevádzka", route=route, order=2)
    earlier = _prevadzka("A prevádzka", route=route, order=1)

    user = User.objects.create_user(
        username="admin@example.com", email="admin@example.com"
    )
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    template = MealTemplate.objects.create(
        category="main_course",
        name="Rizoto",
        weight_label="200g",
        base_weight_grams="200.00",
        components=[{"label": "Hlavná zložka", "grams": "200", "unit": "g"}],
    )
    plan = DailyMealPlan.objects.create(
        date=datetime.date(2026, 7, 17), created_by=user
    )
    MealPlanItem.objects.create(
        meal_plan=plan, template=template, category="main_course"
    )

    for prevadzka in (later, earlier):
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzka,
            date=plan.date,
            data={
                "lunch": {
                    "Škôlka": {"menuCounts": {"A": 1}, "diets": {}},
                }
            },
        )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())

    assert [row["client"] for row in data["rows"]] == ["A prevádzka", "B prevádzka"]
    assert data["blocks"][0]["name"] == "Extra"
    assert data["blocks"][0]["routes"][0]["name"] == "TRASA EXTRA"
    assert [row["client"] for row in data["blocks"][0]["routes"][0]["rows"]] == [
        "A prevádzka",
        "B prevádzka",
    ]
