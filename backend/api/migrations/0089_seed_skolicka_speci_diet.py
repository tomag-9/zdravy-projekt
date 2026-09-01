from django.db import migrations

# Školička (trieda Lúka), payer "ŠPECI - Lúka" (live od 2.9.2026) - nahlásené
# p. Berlakovi rodičom, potvrdené p. Kohútom (1.9.2026 večer), viď
# api/edupage/overrides/skolickams.py.
DIET_NAME = (
    "NO GLUTEN – NO ORECH – NO STRUKOVINY – NO PARADAJKA – NO PAPRIKA – "
    "NO POHANKA – NO SOJA – NO QUINOA"
)


def seed_diet(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    Diet.objects.update_or_create(
        name=DIET_NAME,
        defaults={
            "description": (
                "Bez lepku, orechov, strukovín, paradajok, papriky, "
                "pohánky, sóje a quinoy (Školička, trieda Lúka)."
            ),
            "is_active": True,
        },
    )


def remove_diet(apps, schema_editor):
    Diet = apps.get_model("api", "Diet")
    Diet.objects.filter(name=DIET_NAME).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0088_seed_zs_malokarpatska_diet"),
    ]

    operations = [
        migrations.RunPython(seed_diet, remove_diet),
    ]
