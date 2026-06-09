from django.db import migrations, models

import api.models


def backfill_empty_visible_menus(apps, schema_editor):
    ClientSettings = apps.get_model("api", "ClientSettings")
    ClientSettings.objects.filter(visible_menus=[]).update(visible_menus=["A"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0023_enable_default_diets_for_clients"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clientsettings",
            name="visible_menus",
            field=models.JSONField(
                blank=True,
                default=api.models._default_visible_menus,
            ),
        ),
        migrations.RunPython(backfill_empty_visible_menus, migrations.RunPython.noop),
    ]
