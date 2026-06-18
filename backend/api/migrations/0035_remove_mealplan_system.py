"""Drop MealTemplate, DailyMealPlan, MealPlanItem, EnrolledCount tables."""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0034_diet_docx_tag"),
    ]

    operations = [
        migrations.DeleteModel(name="EnrolledCount"),
        migrations.DeleteModel(name="MealPlanItem"),
        migrations.DeleteModel(name="DailyMealPlan"),
        migrations.DeleteModel(name="MealTemplate"),
    ]
