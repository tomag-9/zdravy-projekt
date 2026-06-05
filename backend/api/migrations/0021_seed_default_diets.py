from django.db import migrations

DEFAULT_DIETS = [
    ("NO MILK", "Bez mlieka a mliečnych výrobkov."),
    ("NO GLUTEN", "Bez lepku."),
    ("NO MILK/NO GLUTEN", "Bez mlieka a lepku."),
    ("VEGGIE", "Vegetariánska strava."),
    ("HISTAMIN", "Nízkohistamínová strava."),
    ("NONONO", "Bez mlieka, lepku a vajec."),
    ("NO ORECH", "Bez orechov."),
    ("NO PARADAJKA", "Bez paradajok."),
    ("NO FISH", "Bez rýb."),
    ("NO EGG", "Bez vajec."),
    ("NO ZEMIAK", "Bez zemiakov."),
    ("NO SOJA", "Bez sóje."),
    ("NO ZELER", "Bez zeleru."),
]


def seed_default_diets(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    for name, description in DEFAULT_DIETS:
        Diet.objects.update_or_create(
            name=name,
            defaults={"description": description, "is_active": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0020_client_contact_and_portion_coefficients"),
    ]

    operations = [
        migrations.RunPython(seed_default_diets, migrations.RunPython.noop),
    ]
