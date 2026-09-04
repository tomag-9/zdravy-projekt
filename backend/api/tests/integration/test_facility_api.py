from datetime import date

import pytest
from django.contrib.auth.models import User

from api.models import (
    Celok,
    DailyOrder,
    Diet,
    Prevadzka,
    PrevadzkaDiet,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
    UserProfile,
)


@pytest.mark.django_db
def test_delete_prevadzka_with_orders_returns_protected_error(admin_client, admin_user):
    celok = Celok.objects.create(nazov="Chránený celok")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Chránená prevádzka")
    DailyOrder.objects.create(
        user=admin_user,
        prevadzka=prevadzka,
        date=date.today(),
        data={},
    )

    response = admin_client.delete(f"/api/admin/facility-prevadzky/{prevadzka.pk}/")

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "protected_error",
            "message": (
                "Túto položku nie je možné odstrániť, pretože sú na ňu naviazané "
                "ďalšie záznamy."
            ),
            "details": {},
        }
    }
    assert Prevadzka.objects.filter(pk=prevadzka.pk).exists()


@pytest.mark.django_db
def test_delete_prevadzka_with_diet_note_succeeds(admin_client):
    """Regresný test: 0095 previedla `visible_diets` na explicitný `through`
    model (`PrevadzkaDiet`), ale ponechala starú implicitnú M2M tabuľku so
    živým FK constraintom na `api_prevadzka` — mazanie prevádzky s aspoň
    jednou priradenou diétou tak padalo na `ForeignKeyViolation` (zistené
    pri seed_merge_celky). Opravené v 0096 (dropne starú tabuľku)."""
    celok = Celok.objects.create(nazov="Mazanie s diétou")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka s diétou")
    diet = Diet.objects.create(name="Testovacia diéta")
    PrevadzkaDiet.objects.create(prevadzka=prevadzka, diet=diet, note="poznámka")

    response = admin_client.delete(f"/api/admin/facility-prevadzky/{prevadzka.pk}/")

    assert response.status_code == 204
    assert not Prevadzka.objects.filter(pk=prevadzka.pk).exists()


@pytest.mark.django_db
def test_delete_celok_without_prevadzky_succeeds(admin_client):
    celok = Celok.objects.create(nazov="Prázdny celok")

    response = admin_client.delete(f"/api/admin/celky/{celok.pk}/")

    assert response.status_code == 204
    assert not Celok.objects.filter(pk=celok.pk).exists()


@pytest.mark.django_db
def test_delete_celok_with_prevadzky_cascades(admin_client, admin_user):
    """Issue #462: deleting a Celok cascades to its Prevádzky and their orders
    instead of being blocked by the PROTECT FKs."""
    celok = Celok.objects.create(nazov="Celok na zmazanie")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka pod celkom")
    other_prevadzka = Prevadzka.objects.create(celok=celok, nazov="Druhá prevádzka")
    order = DailyOrder.objects.create(
        user=admin_user,
        prevadzka=prevadzka,
        date=date.today(),
        data={},
    )
    other_celok = Celok.objects.create(nazov="Iný celok, kam prístup ostáva")
    other_prevadzka_2 = Prevadzka.objects.create(
        celok=other_celok, nazov="Prevádzka iného celku"
    )
    login_user = User.objects.create_user(
        username="klient@example.com", email="klient@example.com"
    )
    profile = UserProfile.objects.create(user=login_user)
    celok_access = ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    prevadzka_access = ProfilePrevadzkaAccess.objects.create(
        profile=profile, prevadzka=other_prevadzka
    )
    # Prístup na iný, nemazaný celok — tento login nesmie byť dotknutý.
    surviving_access = ProfilePrevadzkaAccess.objects.create(
        profile=profile, prevadzka=other_prevadzka_2
    )

    response = admin_client.delete(f"/api/admin/celky/{celok.pk}/")

    assert response.status_code == 204
    assert not Celok.objects.filter(pk=celok.pk).exists()
    assert not Prevadzka.objects.filter(
        pk__in=[prevadzka.pk, other_prevadzka.pk]
    ).exists()
    assert not DailyOrder.objects.filter(pk=order.pk).exists()
    assert not ProfileCelokAccess.objects.filter(pk=celok_access.pk).exists()
    assert not ProfilePrevadzkaAccess.objects.filter(pk=prevadzka_access.pk).exists()
    # Login má ešte prístup na iný celok — nezmazalo sa (issue #520).
    assert UserProfile.objects.filter(pk=profile.pk).exists()
    assert ProfilePrevadzkaAccess.objects.filter(pk=surviving_access.pk).exists()


@pytest.mark.django_db
def test_delete_celok_deletes_orphaned_client_login(admin_client):
    """Issue #520: a klient login left with zero remaining access after the
    cascade is deleted too — otherwise it's an invisible, undeletable-via-UI
    orphan (neither FacilityManager nor AdminUserList lists it)."""
    celok = Celok.objects.create(nazov="Celok na zmazanie 2")
    Prevadzka.objects.create(celok=celok, nazov="Jediná prevádzka")
    login_user = User.objects.create_user(
        username="osirely@example.com", email="osirely@example.com"
    )
    # `_skip_default_facility` avoids the `on_user_profile_saved` signal handing
    # this profile its own auto-created celok/prevádzka — we want it to end up
    # with *zero* access once the one explicit grant below is cascaded away.
    profile = UserProfile(user=login_user, role=UserProfile.Role.KLIENT)
    profile._skip_default_facility = True
    profile.save()
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)

    response = admin_client.delete(f"/api/admin/celky/{celok.pk}/")

    assert response.status_code == 204
    assert not UserProfile.objects.filter(pk=profile.pk).exists()
    assert not User.objects.filter(pk=login_user.pk).exists()


@pytest.mark.django_db
def test_delete_celok_never_deletes_internal_role_login(admin_client):
    """Internal roles (admin/superadmin/kuchyňa) aren't tied 1:1 to facility
    access, so an "orphaned" one is never auto-deleted, unlike a klient."""
    celok = Celok.objects.create(nazov="Celok na zmazanie 3")
    Prevadzka.objects.create(celok=celok, nazov="Jediná prevádzka")
    login_user = User.objects.create_user(
        username="kuchyna@example.com", email="kuchyna@example.com"
    )
    profile = UserProfile.objects.create(user=login_user, role=UserProfile.Role.KUCHYNA)
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)

    response = admin_client.delete(f"/api/admin/celky/{celok.pk}/")

    assert response.status_code == 204
    assert UserProfile.objects.filter(pk=profile.pk).exists()


@pytest.mark.django_db
def test_delete_prevadzka_deletes_orphaned_client_login(admin_client):
    """Issue #520: same cleanup as celok delete, but for a single prevádzka —
    a celok-level access (to a sibling prevádzka) must survive untouched."""
    celok = Celok.objects.create(nazov="Celok s dvomi prevádzkami")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka na zmazanie")
    Prevadzka.objects.create(celok=celok, nazov="Sesterská prevádzka")
    login_user = User.objects.create_user(
        username="len-tato@example.com", email="len-tato@example.com"
    )
    profile = UserProfile(user=login_user, role=UserProfile.Role.KLIENT)
    profile._skip_default_facility = True
    profile.save()
    ProfilePrevadzkaAccess.objects.create(profile=profile, prevadzka=prevadzka)

    response = admin_client.delete(f"/api/admin/facility-prevadzky/{prevadzka.pk}/")

    assert response.status_code == 204
    assert not UserProfile.objects.filter(pk=profile.pk).exists()


@pytest.mark.django_db
def test_delete_prevadzka_keeps_login_with_celok_level_access(admin_client):
    celok = Celok.objects.create(nazov="Celok s celok-level prístupom")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka na zmazanie")
    login_user = User.objects.create_user(
        username="celok-level@example.com", email="celok-level@example.com"
    )
    profile = UserProfile.objects.create(user=login_user, role=UserProfile.Role.KLIENT)
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)

    response = admin_client.delete(f"/api/admin/facility-prevadzky/{prevadzka.pk}/")

    assert response.status_code == 204
    assert UserProfile.objects.filter(pk=profile.pk).exists()


@pytest.mark.django_db
def test_delete_celok_cascade_logs_event(admin_client):
    celok = Celok.objects.create(nazov="Auditovaný celok")
    Prevadzka.objects.create(celok=celok, nazov="Prevádzka")

    from api.models import EventLog

    response = admin_client.delete(f"/api/admin/celky/{celok.pk}/")

    assert response.status_code == 204
    event = EventLog.objects.filter(
        event_type=EventLog.EventType.SETTINGS_CHANGE
    ).latest("created_at")
    assert "Auditovaný celok" in event.summary
    assert event.payload["cascade"]["prevadzky_count"] == 1


@pytest.mark.django_db
def test_create_celok_via_admin_api(admin_client):
    """Issue #463: a new Celok can be created directly through the admin API
    (the endpoint already supported it; only the frontend lacked a button)."""
    response = admin_client.post(
        "/api/admin/celky/",
        {"nazov": "Nová škôlka s.r.o."},
        format="json",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["nazov"] == "Nová škôlka s.r.o."
    assert data["prevadzky"] == []
    assert data["prevadzky_count"] == 0
    assert data["logins"] == []
    celok = Celok.objects.get(pk=data["id"])
    assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.APP


@pytest.mark.django_db
def test_create_celok_rejects_duplicate_nazov(admin_client):
    Celok.objects.create(nazov="Existujúci celok")

    response = admin_client.post(
        "/api/admin/celky/",
        {"nazov": "Existujúci celok"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_onboard_new_celok_with_prevadzka_and_login(admin_client):
    """End-to-end onboarding path issue #463 is meant to unblock: create celok →
    add its first prevádzka → add its first login, all through admin endpoints."""
    celok_res = admin_client.post(
        "/api/admin/celky/", {"nazov": "Onboard Škôlka"}, format="json"
    )
    assert celok_res.status_code == 201
    celok_id = celok_res.json()["id"]

    prevadzka_res = admin_client.post(
        "/api/admin/facility-prevadzky/",
        {"celok": celok_id, "nazov": "Onboard Škôlka — hlavná budova"},
        format="json",
    )
    assert prevadzka_res.status_code == 201
    prevadzka_id = prevadzka_res.json()["id"]

    from unittest.mock import patch

    with patch("api.email_utils.send_account_setup_email"):
        login_res = admin_client.post(
            "/api/admin/users/",
            {
                "email": "onboard@example.com",
                "company_name": "Onboard Škôlka",
                "celok": celok_id,
                "prevadzky": [prevadzka_id],
            },
            format="json",
        )
    assert login_res.status_code == 201

    celok = Celok.objects.get(pk=celok_id)
    assert celok.prevadzky.count() == 1
    assert ProfilePrevadzkaAccess.objects.filter(prevadzka_id=prevadzka_id).exists()


@pytest.mark.django_db
def test_diet_assignments_include_notes_per_prevadzka(admin_client):
    """Poznámka k diéte je viazaná na dvojicu (prevádzka, diéta), nie na
    diétu samu — dve prevádzky s tou istou diétou majú vlastnú poznámku."""
    celok = Celok.objects.create(nazov="Poznámky k diétam")
    prevadzka_a = Prevadzka.objects.create(celok=celok, nazov="A")
    prevadzka_b = Prevadzka.objects.create(celok=celok, nazov="B")
    diet = Diet.objects.create(name="Bezlepková", color="#F59E0B")
    PrevadzkaDiet.objects.create(
        prevadzka=prevadzka_a, diet=diet, note="Alergik, nahlásiť kuchyni"
    )
    PrevadzkaDiet.objects.create(prevadzka=prevadzka_b, diet=diet, note="")

    response_a = admin_client.get(f"/api/admin/facility-prevadzky/{prevadzka_a.pk}/")
    response_b = admin_client.get(f"/api/admin/facility-prevadzky/{prevadzka_b.pk}/")

    assert response_a.status_code == 200
    assignments_a = response_a.json()["diet_assignments"]
    assert assignments_a == [
        {
            "diet": diet.id,
            "name": "Bezlepková",
            "color": "#F59E0B",
            "note": "Alergik, nahlásiť kuchyni",
        }
    ]
    assignments_b = response_b.json()["diet_assignments"]
    assert assignments_b[0]["note"] == ""


@pytest.mark.django_db
def test_patch_diet_notes_updates_only_matching_assignment(admin_client):
    celok = Celok.objects.create(nazov="Update poznámok")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka")
    diet_1 = Diet.objects.create(name="Diéta 1")
    diet_2 = Diet.objects.create(name="Diéta 2")
    PrevadzkaDiet.objects.create(prevadzka=prevadzka, diet=diet_1, note="stará")
    PrevadzkaDiet.objects.create(prevadzka=prevadzka, diet=diet_2, note="")

    response = admin_client.patch(
        f"/api/admin/facility-prevadzky/{prevadzka.pk}/",
        {"diet_notes": {str(diet_1.id): "nová poznámka"}},
        format="json",
    )

    assert response.status_code == 200
    diet_1_assignment = PrevadzkaDiet.objects.get(prevadzka=prevadzka, diet=diet_1)
    diet_2_assignment = PrevadzkaDiet.objects.get(prevadzka=prevadzka, diet=diet_2)
    assert diet_1_assignment.note == "nová poznámka"
    assert diet_2_assignment.note == ""


@pytest.mark.django_db
def test_patch_visible_diets_assigns_diet_with_empty_note(admin_client):
    """Priradenie novej diéty (bez poznámky) cez visible_diets založí through
    riadok s prázdnou poznámkou, nie chybu z `.set()` na through modeli."""
    celok = Celok.objects.create(nazov="Nové priradenie")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka")
    diet = Diet.objects.create(name="Vegánska")

    response = admin_client.patch(
        f"/api/admin/facility-prevadzky/{prevadzka.pk}/",
        {"visible_diets": [diet.id]},
        format="json",
    )

    assert response.status_code == 200
    assignment = PrevadzkaDiet.objects.get(prevadzka=prevadzka, diet=diet)
    assert assignment.note == ""


@pytest.mark.django_db
def test_removing_diet_from_visible_diets_deletes_its_note(admin_client):
    celok = Celok.objects.create(nazov="Odobratie diéty")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka")
    diet = Diet.objects.create(name="Diabetická")
    PrevadzkaDiet.objects.create(prevadzka=prevadzka, diet=diet, note="poznámka")

    response = admin_client.patch(
        f"/api/admin/facility-prevadzky/{prevadzka.pk}/",
        {"visible_diets": []},
        format="json",
    )

    assert response.status_code == 200
    assert not PrevadzkaDiet.objects.filter(prevadzka=prevadzka, diet=diet).exists()
