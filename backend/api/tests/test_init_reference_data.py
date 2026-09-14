import pytest
from django.core.management import call_command

from api.models import Diet
from api.reference_data import ALL_DIETS


@pytest.mark.django_db
def test_seed_preserves_explicitly_deactivated_reference_diet():
    """A deployment must not revive a deliberately retired legacy diet."""
    name, _description = ALL_DIETS[0]
    diet = Diet.objects.create(name=name, is_active=False)

    call_command("init_reference_data")

    diet.refresh_from_db()
    assert diet.is_active is False
