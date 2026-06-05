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


def enable_default_diets_for_clients(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Diet = apps.get_model("api", "Diet")
    ClientSettings = apps.get_model("api", "ClientSettings")

    for name, description in DEFAULT_DIETS:
        Diet.objects.update_or_create(
            name=name,
            defaults={"description": description, "is_active": True},
        )

    default_diet_ids = list(
        Diet.objects.filter(
            name__in=[name for name, _description in DEFAULT_DIETS],
            is_active=True,
        ).values_list("id", flat=True)
    )
    if not default_diet_ids:
        return

    for user in User.objects.filter(is_staff=False):
        ClientSettings.objects.get_or_create(user_id=user.id)

    for settings in ClientSettings.objects.all():
        if not settings.visible_diets.exists():
            settings.visible_diets.add(*default_diet_ids)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0022_meal_template_diet"),
    ]

    operations = [
        migrations.RunPython(
            enable_default_diets_for_clients, migrations.RunPython.noop
        ),
    ]
