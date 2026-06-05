from django.db import migrations, models

PORTION_TYPES = [
    ("Jasle", "0.7000", 1),
    ("Škôlka", "1.0000", 2),
    ("ZŠ 1.stupeň", "1.1500", 3),
    ("ZŠ 2.stupeň", "1.3000", 4),
    ("Dospelý (SŠ)", "1.5000", 5),
]


def sync_portion_coefficients(apps, schema_editor):
    PortionType = apps.get_model("api", "PortionType")
    for name, coefficient, sort_order in PORTION_TYPES:
        PortionType.objects.update_or_create(
            name=name,
            defaults={"coefficient": coefficient, "sort_order": sort_order},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0019_holiday"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="client_contact_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="client_contact_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="client_contact_phone",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="client_contact_role",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.RunPython(sync_portion_coefficients, migrations.RunPython.noop),
    ]
