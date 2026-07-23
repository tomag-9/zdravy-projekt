from django.db import migrations, models


def seed_visible_menus_per_meal(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    for prevadzka in Prevadzka.objects.all().iterator():
        next_value = dict(prevadzka.visible_menus_per_meal or {})
        next_value["breakfast"] = ["A"]
        next_value["olovrant"] = ["A"]
        prevadzka.visible_menus_per_meal = next_value
        prevadzka.save(update_fields=["visible_menus_per_meal"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0051_prevadzka_pack_separately_enabled"),
    ]

    operations = [
        migrations.AddField(
            model_name="diet",
            name="sort_order",
            field=models.PositiveSmallIntegerField(db_index=True, default=0),
        ),
        migrations.AlterModelOptions(
            name="diet",
            options={"ordering": ["sort_order", "name"]},
        ),
        migrations.AddField(
            model_name="prevadzka",
            name="visible_menus_per_meal",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Voliteľné menu typy per chod, napr. "
                    "{'breakfast': ['A'], 'olovrant': ['A']}. Chýbajúci chod = fallback "
                    "na visible_menus."
                ),
            ),
        ),
        migrations.RunPython(seed_visible_menus_per_meal, migrations.RunPython.noop),
    ]
