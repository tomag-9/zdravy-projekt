from django.db import migrations, models


def seed_visible_portion_types(apps, schema_editor):
    PortionType = apps.get_model("api", "PortionType")
    Prevadzka = apps.get_model("api", "Prevadzka")
    portion_types = list(PortionType.objects.filter(is_active=True))
    if not portion_types:
        return
    for prevadzka in Prevadzka.objects.all().iterator():
        prevadzka.visible_portion_types.set(portion_types)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0060_eventlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="prevadzka",
            name="visible_portion_types",
            field=models.ManyToManyField(
                blank=True,
                help_text=("Veľkosti porcií dostupné pre objednávky tejto prevádzky."),
                related_name="visible_for_prevadzky_portion_types",
                to="api.portiontype",
            ),
        ),
        migrations.RunPython(
            seed_visible_portion_types,
            migrations.RunPython.noop,
        ),
    ]
