from django.db import migrations

# ZŠ Malokarpatská (Zdravé Brúško feed, letter "R"/"zšlaNMnEnOnJ") - potvrdené
# s userom 1.9.2026: mlieko + vajcia + orechy + jablko. Predtým fuzzy-matchovalo
# len na "NO MILK – NO GLUTEN" (chýbajúca kombinácia), viď
# api/edupage/overrides/zdravebrusko.py.
DIET_NAME = "NO MILK – NO EGG – NO ORECH – NO JABLKO"


def seed_diet(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    Diet.objects.update_or_create(
        name=DIET_NAME,
        defaults={
            "description": "Bez mlieka, vajec, orechov a jabĺk (ZŠ Malokarpatská).",
            "is_active": True,
        },
    )


def remove_diet(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    Diet.objects.filter(name=DIET_NAME).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0087_backfill_british_school_dedicated_scrape"),
    ]

    operations = [
        migrations.RunPython(seed_diet, remove_diet),
    ]
