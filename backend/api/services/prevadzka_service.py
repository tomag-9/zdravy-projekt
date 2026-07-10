"""Rozhodovanie, za ktorú prevádzku daný login objednáva."""

from __future__ import annotations

from django.contrib.auth.models import User

from ..models import Prevadzka


class PrevadzkaNedostupna(Exception):
    """Login nemá prístup k požadovanej prevádzke."""


class PrevadzkaNejednoznacna(Exception):
    """Login má viac prevádzok a nepovedal, za ktorú objednáva."""


def dostupne_prevadzky(user: User):
    """Prevádzky, za ktoré `user` smie objednávať (prázdne, ak nemá profil)."""
    profile = getattr(user, "profile", None)
    if profile is None:
        return Prevadzka.objects.none()
    return profile.dostupne_prevadzky()


def vyber_prevadzku(user: User, prevadzka_id: int | None = None) -> Prevadzka:
    """Prevádzka, na ktorú sa má objednávka zapísať.

    Bez `prevadzka_id` to ide iba vtedy, keď má login práve jednu prevádzku — vtedy
    sa klient nemusí nič pýtať a UI ostáva ako doteraz. Pri viacerých prevádzkach
    radšej zlyháme, než aby sme objednávku ticho pripísali nesprávnemu miestu.
    """
    dostupne = dostupne_prevadzky(user)

    if prevadzka_id is not None:
        prevadzka = dostupne.filter(pk=prevadzka_id).first()
        if prevadzka is None:
            raise PrevadzkaNedostupna(
                f"Prevádzka {prevadzka_id} nepatrí tomuto prihláseniu."
            )
        return prevadzka

    prve_dve = list(dostupne[:2])
    if not prve_dve:
        raise PrevadzkaNedostupna("Prihlásenie nemá priradenú žiadnu prevádzku.")
    if len(prve_dve) > 1:
        raise PrevadzkaNejednoznacna(
            "Prihlásenie má viac prevádzok — vyber, za ktorú objednávaš."
        )
    return prve_dve[0]
