from django.db import migrations

PORTION_TYPES = [
    ("Jasle", "0.7500", 1),
    ("Škôlka", "1.0000", 2),
    ("ZŠ 1.stupeň", "1.2500", 3),
    ("ZŠ 2.stupeň", "1.5000", 4),
    ("Dospelý (SŠ)", "2.0000", 5),
]


def sync_real_portion_coefficients(apps, schema_editor):
    PortionType = apps.get_model("api", "PortionType")
    for name, coefficient, sort_order in PORTION_TYPES:
        PortionType.objects.update_or_create(
            name=name,
            defaults={"coefficient": coefficient, "sort_order": sort_order},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0036_seed_dia_diet"),
    ]

    operations = [
        migrations.RunPython(sync_real_portion_coefficients, migrations.RunPython.noop),
    ]
