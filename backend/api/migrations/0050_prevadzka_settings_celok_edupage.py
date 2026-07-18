from django.db import migrations, models

import api.models


def copy_login_settings_to_prevadzky(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    UserProfile = apps.get_model("api", "UserProfile")
    ClientSettings = apps.get_model("api", "ClientSettings")

    for prevadzka in Prevadzka.objects.all().iterator():
        profile = prevadzka.profily.order_by("pk").first()
        if profile is None:
            profile = (
                UserProfile.objects.filter(
                    celok_id=prevadzka.celok_id, prevadzky__isnull=True
                )
                .order_by("pk")
                .first()
            )
        if profile is None:
            profile = (
                UserProfile.objects.filter(celok_id=prevadzka.celok_id)
                .order_by("pk")
                .first()
            )
        if profile is None:
            continue

        settings = ClientSettings.objects.filter(user_id=profile.user_id).first()
        if settings is None:
            continue

        prevadzka.visible_menus = settings.visible_menus or ["A"]
        prevadzka.visible_meals = settings.visible_meals or [
            "breakfast",
            "lunch",
            "olovrant",
        ]
        prevadzka.admin_order_note = settings.admin_order_note or ""
        prevadzka.save(
            update_fields=["visible_menus", "visible_meals", "admin_order_note"]
        )
        prevadzka.visible_diets.set(settings.visible_diets.all())


def copy_edupage_config_to_celky(apps, schema_editor):
    Celok = apps.get_model("api", "Celok")
    UserProfile = apps.get_model("api", "UserProfile")

    for profile in UserProfile.objects.filter(
        models.Q(is_edupage=True)
        | ~models.Q(mealsguest_url="")
        | ~models.Q(api_identifier="")
    ).iterator():
        celok_ids = set()
        if profile.celok_id:
            celok_ids.add(profile.celok_id)
        celok_ids.update(profile.prevadzky.values_list("celok_id", flat=True))

        for celok in Celok.objects.filter(id__in=celok_ids):
            changed = []
            if profile.is_edupage and celok.zdroj_objednavok != "edupage":
                celok.zdroj_objednavok = "edupage"
                changed.append("zdroj_objednavok")
            if profile.api_identifier and not celok.edupage_api_identifier:
                celok.edupage_api_identifier = profile.api_identifier
                changed.append("edupage_api_identifier")
            if profile.mealsguest_url and not celok.mealsguest_url:
                celok.mealsguest_url = profile.mealsguest_url
                changed.append("mealsguest_url")
            if changed:
                celok.save(update_fields=changed)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0049_dailyorder_prevadzka_not_null"),
    ]

    operations = [
        migrations.AddField(
            model_name="celok",
            name="edupage_api_identifier",
            field=models.CharField(
                blank=True,
                help_text="Voliteľný identifikátor celku pre ručný EduPage import.",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="celok",
            name="mealsguest_url",
            field=models.CharField(
                blank=True,
                help_text="EduPage mealsGuest URL pre scrape objednávok, napr. https://school.edupage.org/menu/mealsGuest?id=TOKEN",
                max_length=500,
            ),
        ),
        migrations.AddField(
            model_name="prevadzka",
            name="admin_order_note",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Interná poznámka k objednávkam prevádzky v admin prehľadoch.",
            ),
        ),
        migrations.AddField(
            model_name="prevadzka",
            name="visible_meals",
            field=models.JSONField(
                blank=True,
                default=api.models._default_all_meals,
                help_text="Chody dostupné pre objednávky tejto prevádzky.",
            ),
        ),
        migrations.AddField(
            model_name="prevadzka",
            name="visible_menus",
            field=models.JSONField(
                blank=True,
                default=api.models._default_visible_menus,
                help_text="Menu typy dostupné pre objednávky tejto prevádzky.",
            ),
        ),
        migrations.AddField(
            model_name="prevadzka",
            name="visible_diets",
            field=models.ManyToManyField(
                blank=True,
                help_text="Diéty dostupné pre objednávky tejto prevádzky.",
                related_name="visible_for_prevadzky",
                to="api.diet",
            ),
        ),
        migrations.RunPython(
            copy_login_settings_to_prevadzky, migrations.RunPython.noop
        ),
        migrations.RunPython(copy_edupage_config_to_celky, migrations.RunPython.noop),
    ]
