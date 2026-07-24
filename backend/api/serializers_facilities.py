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
    edupage_connection_name = serializers.CharField(
        source="edupage_connection.name", read_only=True
    )
    orders_count = serializers.SerializerMethodField()
    client_user_id = serializers.SerializerMethodField()
    visible_diets = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.all(), many=True, required=False
    )

    def _detail_profile(self, obj):
        scoped_accesses = getattr(obj, "_admin_profile_accesses", None)
        if scoped_accesses is None:
            scoped_accesses = getattr(obj, "_prefetched_objects_cache", {}).get(
                "profile_accesses"
            )
            if scoped_accesses is None:
                scoped_accesses = list(
                    obj.profile_accesses.select_related("profile__user")
                )
        if scoped_accesses:
            return scoped_accesses[0].profile

        celok_accesses = self.context.get("celok_accesses")
        if celok_accesses is None:
            celok = self.context.get("celok") or obj.celok
            celok_accesses = list(
                celok.profile_accesses.select_related("profile__user")
            )
        return celok_accesses[0].profile if celok_accesses else None

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
            "edupage_connection",
            "edupage_connection_name",
            "edupage_match",
            "report_alias",
            "delivery_note",
            "sort_order",
            "is_active",
            "billing_portion_coefficients",
            "visible_menus",
            "visible_meals",
            "visible_diets",
            "pack_separately_enabled",
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
            "prevadzky_count",
            "prevadzky",
            "logins",
        ]

    @staticmethod
    def _prevadzky(obj):
        prefetched = getattr(obj, "_admin_prevadzky", None)
        if prefetched is not None:
            return prefetched
        return sorted(obj.prevadzky.all(), key=lambda p: (p.sort_order, p.nazov))

    @staticmethod
    def _celok_accesses(obj):
        prefetched = getattr(obj, "_admin_profile_accesses", None)
        return (
            prefetched if prefetched is not None else list(obj.profile_accesses.all())
        )

    def get_logins(self, obj):
        profiles_by_user_id = {}
        for access in self._celok_accesses(obj):
            profile = access.profile
            profiles_by_user_id[profile.user_id] = {
                "profile": profile,
                "whole_celok": True,
                "prevadzka_ids": set(),
            }
        for prevadzka in self._prevadzky(obj):
            accesses = getattr(prevadzka, "_admin_profile_accesses", None)
            if accesses is None:
                accesses = prevadzka.profile_accesses.all()
            for access in accesses:
                profile = access.profile
                current = profiles_by_user_id.setdefault(
                    profile.user_id,
                    {
                        "profile": profile,
                        "whole_celok": False,
                        "prevadzka_ids": set(),
                    },
                )
                if not current["whole_celok"]:
                    current["prevadzka_ids"].add(prevadzka.id)
        return [
            {
                "user_id": entry["profile"].user_id,
                "email": entry["profile"].user.email,
                "company_name": entry["profile"].company_name,
                "is_edupage": (obj.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE),
                "prevadzka_ids": sorted(entry["prevadzka_ids"]),
            }
            for entry in profiles_by_user_id.values()
        ]

    def get_prevadzky(self, obj):
        return AdminPrevadzkaSerializer(
            self._prevadzky(obj),
            many=True,
            context={
                **self.context,
                "celok": obj,
                "celok_accesses": self._celok_accesses(obj),
            },
        ).data

    def get_prevadzky_count(self, obj):
        # Počítame len aktívne — deaktivované (napr. retirovaný default po splite)
        # sa v zozname ukážu, ale do počtu „(N prevádzok)" nepatria.
        return sum(1 for p in self._prevadzky(obj) if p.is_active)
