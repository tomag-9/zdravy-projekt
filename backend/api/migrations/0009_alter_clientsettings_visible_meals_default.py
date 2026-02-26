from django.db import migrations, models


def _default_all_meals():
    return ["breakfast", "lunch", "olovrant"]


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_passwordresettoken_add_compound_index"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clientsettings",
            name="visible_meals",
            field=models.JSONField(blank=True, default=_default_all_meals),
        ),
    ]
