from io import StringIO

import pytest
from django.core.management import call_command

from api.models import Celok, Prevadzka


@pytest.mark.django_db
def test_seed_splits_ms_edulienka_into_palisady_and_stupava():
    """Regression test: SPLITS previously keyed on the bare "Edulienka" name,
    which never matches the real Celok.nazov ("MŠ Edulienka") and caused the
    split to be silently skipped (see command module docstring: this split is
    verified against live data and expected to run cleanly)."""
    celok = Celok.objects.create(nazov="MŠ Edulienka")
    Prevadzka.objects.create(
        celok=celok,
        nazov="MŠ Edulienka",
        billing_portion_coefficients={"Predškolák": "1.25"},
    )

    out = StringIO()
    err = StringIO()
    call_command("seed_prevadzky_edupage", stdout=out, stderr=err)

    # Jolly Homeschool / Škôlka MS legitimately don't exist in this isolated
    # test DB — only assert the Edulienka split itself wasn't skipped.
    assert "celok neexistuje: MŠ Edulienka" not in err.getvalue()

    sub_prevadzky = {
        p.nazov: p for p in Prevadzka.objects.filter(celok=celok, is_active=True)
    }
    assert set(sub_prevadzky) == {"Palisády", "Stupava"}
    assert sub_prevadzky["Palisády"].edupage_match == "Palisády"
    assert sub_prevadzky["Stupava"].edupage_match == "Stupava"
    # Billing coefficient must survive the split, not silently drop to {}.
    assert sub_prevadzky["Palisády"].billing_portion_coefficients == {
        "Predškolák": "1.25"
    }

    original_default = Prevadzka.objects.get(celok=celok, nazov="MŠ Edulienka")
    assert original_default.is_active is False
