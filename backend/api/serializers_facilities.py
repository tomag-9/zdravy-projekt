"""Serializery pre admin správu celkov a ich prevádzok.

Zoznam v admin konzole je po novom orientovaný na **celok** (fakturačná jednotka),
ktorý sa rozbalí na svoje **prevádzky**. Prevádzky žijú v jednej tabuľke (`Prevadzka`)
a majú plný CRUD; presun medzi celkami sa zámerne nepodporuje (celok je pri vytvorení
fixný). Model ostáva ako je — niektoré celky sú 1:1 s prevádzkou, iné (Jolly Homeschool,
Škôlka MS) majú viac prevádzok, a Zdravé Brúsko je päť samostatných celkov. UI len
zobrazuje realitu, nič nemigruje.
"""

from __future__ import annotations

from rest_framework import serializers

from .models import Celok, Diet, Prevadzka


class AdminPrevadzkaSerializer(serializers.ModelSerializer):
    """Zapisovateľná prevádzka pre admin CRUD.

    `celok` je povinné pri vytvorení a potom nemenné (presun medzi celkami sa
    nepodporuje) — validuje sa vo `validate_celok`/`update`.
    """

    celok_nazov = serializers.CharField(source="celok.nazov", read_only=True)
    celok_zdroj_objednavok = serializers.CharField(
        source="celok.zdroj_objednavok", read_only=True
    )
    orders_count = serializers.SerializerMethodField()
    client_user_id = serializers.SerializerMethodField()
    visible_diets = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.all(), many=True, required=False
    )

    def _detail_profile(self, obj):
        scoped_profiles = getattr(obj, "_prefetched_objects_cache", {}).get("profily")
        if scoped_profiles is None:
            scoped_profiles = list(obj.profily.select_related("user").all())
        if scoped_profiles:
            return scoped_profiles[0]

        celok_profiles = self.context.get("celok_profiles")
        if celok_profiles is None:
            celok = self.context.get("celok") or obj.celok
            celok_profiles = list(
                celok.profily.select_related("user").prefetch_related("prevadzky")
            )
        for profile in celok_profiles:
            if not profile.prevadzky.exists():
                return profile
        return celok_profiles[0] if celok_profiles else None

    def get_orders_count(self, obj):
        # Anotované vo viewsete; v inom kontexte (napr. po vytvorení) môže chýbať.
        return getattr(obj, "orders_count", None)

    def get_client_user_id(self, obj):
        profile = self._detail_profile(obj)
        return profile.user_id if profile else None

    class Meta:
        model = Prevadzka
        fields = [
            "id",
            "celok",
            "celok_nazov",
            "celok_zdroj_objednavok",
            "nazov",
            "adresa",
            "edupage_match",
            "report_alias",
            "delivery_note",
            "sort_order",
            "is_active",
            "billing_portion_coefficients",
            "visible_menus",
            "visible_meals",
            "visible_diets",
            "admin_order_note",
            "orders_count",
            "client_user_id",
        ]

    def validate(self, attrs):
        # Unikátnosť názvu v rámci celku (DB constraint) — vrátime peknú chybu.
        celok = attrs.get("celok") or getattr(self.instance, "celok", None)
        nazov = attrs.get("nazov", getattr(self.instance, "nazov", None))
        if celok and nazov:
            qs = Prevadzka.objects.filter(celok=celok, nazov=nazov)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"nazov": "Prevádzka s týmto názvom už v celku existuje."}
                )
        return attrs

    def update(self, instance, validated_data):
        # Celok je po vytvorení nemenný — prípadnú zmenu ticho ignorujeme.
        validated_data.pop("celok", None)
        return super().update(instance, validated_data)


class AdminCelokSerializer(serializers.ModelSerializer):
    """Celok s vnorenými prevádzkami pre rozbaliteľný zoznam."""

    prevadzky = serializers.SerializerMethodField()
    prevadzky_count = serializers.SerializerMethodField()
    logins = serializers.SerializerMethodField()

    class Meta:
        model = Celok
        fields = [
            "id",
            "nazov",
            "billing_name",
            "adresa",
            "ico",
            "dic",
            "zdroj_objednavok",
            "edupage_api_identifier",
            "mealsguest_url",
            "prevadzky_count",
            "prevadzky",
            "logins",
        ]

    def get_logins(self, obj):
        # Priame loginy celku + M2M-only loginy pripnuté na prevádzky tohto celku.
        profiles_by_user_id = {}
        for profile in obj.profily.select_related("user").prefetch_related("prevadzky"):
            profiles_by_user_id[profile.user_id] = profile
        for prevadzka in obj.prevadzky.all():
            for profile in prevadzka.profily.all():
                profiles_by_user_id.setdefault(profile.user_id, profile)
        return [
            {
                "user_id": p.user_id,
                "email": p.user.email,
                "company_name": p.company_name,
                "is_edupage": p.is_edupage,
                # Prázdne = login pokrýva celý celok; inak je obmedzený na tieto prevádzky.
                "prevadzka_ids": list(p.prevadzky.values_list("id", flat=True)),
            }
            for p in profiles_by_user_id.values()
        ]

    def get_prevadzky(self, obj):
        prevadzky = sorted(obj.prevadzky.all(), key=lambda p: (p.sort_order, p.nazov))
        return AdminPrevadzkaSerializer(
            prevadzky,
            many=True,
            context={
                **self.context,
                "celok": obj,
                "celok_profiles": list(obj.profily.all()),
            },
        ).data

    def get_prevadzky_count(self, obj):
        # Počítame len aktívne — deaktivované (napr. retirovaný default po splite)
        # sa v zozname ukážu, ale do počtu „(N prevádzok)" nepatria.
        return sum(1 for p in obj.prevadzky.all() if p.is_active)
