"""Explicit access records mirrored from the legacy UserProfile fields."""

from django.db import transaction

from api.models import ProfileCelokAccess, ProfilePrevadzkaAccess, UserProfile


@transaction.atomic
def sync_profile_access(profile: UserProfile) -> None:
    """Mirror legacy access semantics during the expand/contract migration."""
    explicit_ids = list(profile.prevadzky.values_list("pk", flat=True))
    if explicit_ids:
        ProfileCelokAccess.objects.filter(profile=profile).delete()
        ProfilePrevadzkaAccess.objects.filter(profile=profile).exclude(
            prevadzka_id__in=explicit_ids
        ).delete()
        existing_ids = set(
            ProfilePrevadzkaAccess.objects.filter(
                profile=profile,
                prevadzka_id__in=explicit_ids,
            ).values_list("prevadzka_id", flat=True)
        )
        ProfilePrevadzkaAccess.objects.bulk_create(
            [
                ProfilePrevadzkaAccess(
                    profile=profile,
                    prevadzka_id=prevadzka_id,
                )
                for prevadzka_id in explicit_ids
                if prevadzka_id not in existing_ids
            ]
        )
        return

    ProfilePrevadzkaAccess.objects.filter(profile=profile).delete()
    if profile.celok_id is None:
        ProfileCelokAccess.objects.filter(profile=profile).delete()
        return

    ProfileCelokAccess.objects.filter(profile=profile).exclude(
        celok_id=profile.celok_id
    ).delete()
    ProfileCelokAccess.objects.get_or_create(
        profile=profile,
        celok_id=profile.celok_id,
    )
