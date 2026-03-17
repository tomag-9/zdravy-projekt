from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_userprofile_add_onboarding_completed"),
    ]

    operations = [
        migrations.CreateModel(
            name="Holiday",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField(db_index=True, unique=True)),
                ("reason", models.CharField(blank=True, max_length=200)),
            ],
            options={
                "ordering": ["date"],
            },
        ),
    ]
