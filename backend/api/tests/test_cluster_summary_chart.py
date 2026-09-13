from decimal import Decimal

from api.services.cluster_summary_chart import aggregate_day


def test_aggregate_day_anchors_selected_meals_to_lunch_cluster_and_filters_diets():
    data = {
        "rows": [
            {
                "delivery_by_meal": {"lunch": {"delivery_route_id": 1, "vydaj": "A"}},
                "sub_rows": [
                    {
                        "meal": "breakfast_snack",
                        "type": "standard",
                        "count": 2,
                        "_ms_recalc": 2,
                    },
                    {
                        "meal": "main_course",
                        "type": "diet",
                        "variant": "A",
                        "count": 3,
                        "_ms_recalc": 4,
                    },
                    {
                        "meal": "main_course",
                        "type": "standard",
                        "variant": "B",
                        "count": 5,
                        "_ms_recalc": 6,
                    },
                ],
            }
        ]
    }

    assert aggregate_day(
        data, {"breakfast", "lunch"}, {"A"}, {"A"}, "all", "heads"
    ) == {"A": Decimal("5")}
    assert aggregate_day(data, {"lunch"}, {"A"}, {"A"}, "diets", "ms") == {
        "A": Decimal("4")
    }
