"""Backfill: každý UserProfile → Celok + jedna Prevadzka; DailyOrder sa na ňu naviaže.

Split viac-prevádzkových celkov (Jolly, Rozmanitá…) sa TU nerobí — historické
objednávky už spätne nevedia, ktorej prevádzke patrili. Každý celok teda dostane
jednu prevádzku pomenovanú ako celok; ďalšie prevádzky sa pridajú zvlášť a prejavia
sa až na nových objednávkach.

`DailyOrder.data` sa nemení: ostáva `{meal: {porcia: {menuCounts, diets}}}`.
Prevádzka je teraz riadok, nie kľúč v JSON-e.
"""

from django.db import migrations, models


def _nazov(profile) -> str:
    return (profile.company_name or "").strip() or profile.user.email


def forwards(apps, schema_editor):
    UserProfile = apps.get_model("api", "UserProfile")
    Celok = apps.get_model("api", "Celok")
    Prevadzka = apps.get_model("api", "Prevadzka")
    DailyOrder = apps.get_model("api", "DailyOrder")

    prevadzka_by_user_id = {}
    celok_by_user_id = {}
    nazov_by_user_id = {}

    for profile in UserProfile.objects.select_related("user").all():
        nazov = _nazov(profile)
        celok, _ = Celok.objects.get_or_create(
            nazov=nazov,
            defaults={
                "billing_name": profile.billing_name,
                "ico": profile.ico,
                "dic": profile.dic,
            },
        )
        prevadzka, _ = Prevadzka.objects.get_or_create(celok=celok, nazov=nazov)

        profile.celok = celok
        profile.save(update_fields=["celok"])
        prevadzka_by_user_id[profile.user_id] = prevadzka.pk
        celok_by_user_id[profile.user_id] = celok.pk
        nazov_by_user_id[profile.user_id] = nazov

    for order in DailyOrder.objects.filter(prevadzka__isnull=True).iterator():
        prevadzka_pk = prevadzka_by_user_id.get(order.user_id)
        if prevadzka_pk is None:
            # Objednávka používateľa bez profilu — nemáme ju kam priradiť.
            continue
        if DailyOrder.objects.filter(
            prevadzka_id=prevadzka_pk, date=order.date
        ).exists():
            # Dva profily mohli mať rovnaký company_name, teda by spätný backfill
            # skončil na rovnakej prevádzke a dátume. Historické dáta nezlučujeme;
            # vytvoríme bezpečnú legacy prevádzku pre daný login.
            celok_pk = celok_by_user_id[order.user_id]
            nazov = nazov_by_user_id[order.user_id]
            fallback_nazov = f"{nazov[:180]} ({order.user.email[:60]})"
            fallback, _ = Prevadzka.objects.get_or_create(
                celok_id=celok_pk,
                nazov=fallback_nazov,
                defaults={"is_active": False},
            )
            prevadzka_pk = fallback.pk
        order.prevadzka_id = prevadzka_pk
        order.save(update_fields=["prevadzka"])


def backwards(apps, schema_editor):
    """Odviaže objednávky; Celok/Prevadzka riadky zmaže schéma migrácia."""
    DailyOrder = apps.get_model("api", "DailyOrder")
    UserProfile = apps.get_model("api", "UserProfile")
    DailyOrder.objects.update(prevadzka=None)
    UserProfile.objects.update(celok=None)


class Migration(migrations.Migration):
    dependencies = [("api", "0040_celok_alter_dailyorder_unique_together_and_more")]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AddConstraint(
            model_name="dailyorder",
            constraint=models.UniqueConstraint(
                fields=("prevadzka", "date"), name="unique_order_per_prevadzka_date"
            ),
        ),
    ]
