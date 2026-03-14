from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_meal_plan_module"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="deadline_breakfast_is_day_before",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "When enabled, breakfast deadline applies to the day"
                    " before the meal date"
                ),
            ),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="deadline_lunch_is_day_before",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "When enabled, lunch deadline applies to the day"
                    " before the meal date"
                ),
            ),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="deadline_olovrant_is_day_before",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "When enabled, olovrant deadline applies to the day"
                    " before the meal date"
                ),
            ),
        ),
    ]
