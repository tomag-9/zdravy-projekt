from django.db import migrations


def seed_dia_diet(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    Diet.objects.update_or_create(
        name="DIA",
        defaults={
            "description": "Diabetická strava.",
            "is_active": True,
        },
    )


def remove_dia_diet(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    Diet.objects.filter(name="DIA").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0035_meal_weight_catalog"),
    ]

    operations = [
        migrations.RunPython(seed_dia_diet, remove_dia_diet),
    ]
