"""Integration tests for H1: DailyOrder.data schema validation."""

import datetime

import pytest
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.integration

DATE = datetime.date(2099, 3, 3)  # Far-future Monday — no deadline interference

VALID_DATA = {
    "breakfast": {
        "Dospelý (SŠ)": {"menuCounts": {"A": 2, "B": 1}, "diets": {"Bez lepku": 0}},
        "Škôlka": {"menuCounts": {"A": 5}, "diets": {}},
    },
    "lunch": {
        "Dospelý (SŠ)": {"menuCounts": {"A": 3}, "diets": {}},
    },
    "olovrant": {},
}


@pytest.mark.django_db
class TestOrderDataValidation:
    """DailyOrderSerializer.validate_data() rejects malformed payloads."""

    def _post(self, client, data):
        url = reverse("dailyorder-list")
        return client.post(
            url,
            {"date": str(DATE), "data": data},
            format="json",
        )

    # ------------------------------------------------------------------ #
    # Happy paths
    # ------------------------------------------------------------------ #

    def test_valid_category_nested_data_accepted(self, authenticated_client):
        response = self._post(authenticated_client, VALID_DATA)
        assert response.status_code == status.HTTP_201_CREATED

    def test_empty_data_accepted(self, authenticated_client):
        response = self._post(authenticated_client, {})
        assert response.status_code == status.HTTP_201_CREATED

    def test_partial_meals_accepted(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Jasle": {"menuCounts": {"A": 1}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_zero_counts_accepted(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {
                "lunch": {
                    "Dospelý (SŠ)": {"menuCounts": {"A": 0}, "diets": {"Bez lepku": 0}}
                }
            },
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_max_count_accepted(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 9999}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_pack_separately_subset_accepted(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {
                "lunch": {
                    "Dospelý (SŠ)": {
                        "menuCounts": {"A": 3},
                        "diets": {"Bez lepku": 2},
                        "packSeparately": {
                            "menus": {"A": 2},
                            "diets": {"Bez lepku": 1},
                        },
                    }
                }
            },
        )
        assert response.status_code == status.HTTP_201_CREATED

    # ------------------------------------------------------------------ #
    # Unknown top-level keys
    # ------------------------------------------------------------------ #

    def test_unknown_meal_key_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {}, "dinner": {"Cat": {"menuCounts": {"A": 1}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            "dinner" in str(response.data).lower()
            or "unknown" in str(response.data).lower()
        )

    # ------------------------------------------------------------------ #
    # Flat shape compatibility
    # ------------------------------------------------------------------ #

    def test_flat_shape_with_menu_counts_accepted(self, authenticated_client):
        """Legacy flat shape {meal: {menuCounts: ...}} remains supported."""
        response = self._post(
            authenticated_client,
            {"lunch": {"menuCounts": {"A": 5}, "diets": {}}},
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_flat_shape_with_diets_accepted(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"diets": {"Bez lepku": 1}}},
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_flat_shape_negative_menu_count_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"menuCounts": {"A": -1}, "diets": {}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------ #
    # Negative and out-of-range counts
    # ------------------------------------------------------------------ #

    def test_negative_menu_count_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": -1}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_count_exceeding_max_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 10000}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_negative_diet_count_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {
                "lunch": {
                    "Dospelý (SŠ)": {"menuCounts": {"A": 1}, "diets": {"Bez lepku": -1}}
                }
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_pack_separately_menu_exceeding_base_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {
                "lunch": {
                    "Dospelý (SŠ)": {
                        "menuCounts": {"A": 1},
                        "diets": {},
                        "packSeparately": {"menus": {"A": 2}},
                    }
                }
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "nemôže byť väčšie" in str(response.data)

    def test_pack_separately_diet_exceeding_base_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {
                "lunch": {
                    "Dospelý (SŠ)": {
                        "menuCounts": {"A": 2},
                        "diets": {"Bez lepku": 1},
                        "packSeparately": {"diets": {"Bez lepku": 2}},
                    }
                }
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "nemôže byť väčšie" in str(response.data)

    # ------------------------------------------------------------------ #
    # Non-integer counts
    # ------------------------------------------------------------------ #

    def test_string_menu_count_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": "five"}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_float_menu_count_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 1.5}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_boolean_menu_count_rejected(self, authenticated_client):
        """True/False must not be accepted as integers (bool subclasses int in Python)."""
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": True}, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------ #
    # Structural violations
    # ------------------------------------------------------------------ #

    def test_data_not_object_rejected(self, authenticated_client):
        response = self._post(authenticated_client, [1, 2, 3])
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_meal_not_object_rejected(self, authenticated_client):
        response = self._post(authenticated_client, {"lunch": "invalid"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_category_not_object_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": "invalid"}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_menu_counts_not_object_rejected(self, authenticated_client):
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": [1, 2], "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_null_menu_counts_rejected(self, authenticated_client):
        """Explicit null for menuCounts must be rejected (not silently treated as empty)."""
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": None, "diets": {}}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_null_diets_rejected(self, authenticated_client):
        """Explicit null for diets must be rejected (not silently treated as empty)."""
        response = self._post(
            authenticated_client,
            {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 1}, "diets": None}}},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_boolean_diet_count_rejected(self, authenticated_client):
        """Boolean values in diets must be rejected (bool is a subclass of int in Python)."""
        response = self._post(
            authenticated_client,
            {
                "lunch": {
                    "Dospelý (SŠ)": {
                        "menuCounts": {"A": 1},
                        "diets": {"Bez lepku": True},
                    }
                }
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------ #
    # Size limit
    # ------------------------------------------------------------------ #

    def test_oversized_payload_rejected(self, authenticated_client):
        """A payload exceeding 10 KB must be rejected."""
        big_data = {
            "lunch": {
                f"Cat{i}": {
                    "menuCounts": {"A": 1},
                    "diets": {f"diet_{j}": 0 for j in range(200)},
                }
                for i in range(50)
            }
        }
        response = self._post(authenticated_client, big_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
