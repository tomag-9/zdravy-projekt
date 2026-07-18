import django.db.models.deletion
from django.db import migrations, models


def _profile_name(profile) -> str:
    return (profile.company_name or "").strip() or profile.user.email


def _fallback_prevadzka(apps, profile, order):
    Celok = apps.get_model("api", "Celok")
    Prevadzka = apps.get_model("api", "Prevadzka")

    if profile is not None and profile.celok_id:
        celok = profile.celok
        existing = celok.prevadzky.order_by("sort_order", "nazov").first()
        if existing is not None:
            return existing
        name = _profile_name(profile)
    elif profile is not None:
        name = _profile_name(profile)
        celok, _ = Celok.objects.get_or_create(nazov=name)
        profile.celok = celok
        profile.save(update_fields=["celok"])
    else:
        name = f"Legacy {order.user.email}"
        celok, _ = Celok.objects.get_or_create(nazov=name)

    prevadzka, _ = Prevadzka.objects.get_or_create(celok=celok, nazov=name)
    return prevadzka


def forwards(apps, schema_editor):
    DailyOrder = apps.get_model("api", "DailyOrder")
    UserProfile = apps.get_model("api", "UserProfile")
    Prevadzka = apps.get_model("api", "Prevadzka")

    for order in DailyOrder.objects.filter(prevadzka__isnull=True).select_related(
        "user"
    ):
        profile = (
            UserProfile.objects.select_related("user", "celok")
            .filter(user_id=order.user_id)
            .first()
        )
        prevadzka = None
        if profile is not None:
            prevadzka = profile.prevadzky.order_by("sort_order", "nazov").first()
        if prevadzka is None:
            prevadzka = _fallback_prevadzka(apps, profile, order)

        if DailyOrder.objects.filter(prevadzka=prevadzka, date=order.date).exists():
            fallback_name = f"{prevadzka.nazov[:180]} ({order.user.email[:60]})"
            prevadzka, _ = Prevadzka.objects.get_or_create(
                celok=prevadzka.celok,
                nazov=fallback_name,
                defaults={"is_active": False},
            )
        order.prevadzka = prevadzka
        order.save(update_fields=["prevadzka"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0048_deliveryblock_diet_color_prevadzka_delivery_note_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="dailyorder",
            name="prevadzka",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="orders",
                to="api.prevadzka",
            ),
        ),
    ]
