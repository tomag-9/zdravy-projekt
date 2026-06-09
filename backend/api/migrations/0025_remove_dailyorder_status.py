from django.db import migrations


def delete_draft_orders(apps, schema_editor):
    DailyOrder = apps.get_model("api", "DailyOrder")
    DailyOrder.objects.filter(status="draft").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0024_clientsettings_visible_menus_default"),
    ]

    operations = [
        migrations.RunPython(delete_draft_orders, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="dailyorder",
            name="status",
        ),
    ]
