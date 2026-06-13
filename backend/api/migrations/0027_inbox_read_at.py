from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0026_push_notification_reliability"),
    ]

    operations = [
        migrations.AddField(
            model_name="pushnotificationattempt",
            name="read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="pushnotificationattempt",
            index=models.Index(
                fields=["user", "read_at"], name="api_pushno_user_id_read_at_idx"
            ),
        ),
    ]
