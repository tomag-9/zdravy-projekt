from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0115_external_order_snapshot")]

    operations = [
        migrations.AddField(
            model_name="externalordersnapshot",
            name="merged_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
