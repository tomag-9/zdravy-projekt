import pytest

from api.models import Diet
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
    # Odpoveď je stránkovaná, takže položky sú pod "results".
    payload = response.json()
    items = payload["results"] if isinstance(payload, dict) else payload
    names = [item["name"] for item in items]

    # Zulu a Beta majú sort_order 0 → idú pred Alpha (5), medzi sebou podľa názvu.
    assert names.index("Beta") < names.index("Zulu") < names.index("Alpha")


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
