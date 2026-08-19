"""
JWT autentifikácia, ktorá rovno donesie aj profil (#482).

Rolový systém sa pýta na `user.profile` prakticky pri každom requeste
(`api.roles.role_of`). Reverzný one-to-one je lenivý, takže by to bol jeden
dotaz navyše na každé volanie API — hoci používateľa aj tak práve načítavame.
`select_related` ho pribalí do toho istého dotazu, čím je cena rolí nulová.

`get_user` je vernou kópiou `JWTAuthentication.get_user` z simplejwt; líši sa
jediným `select_related("profile")`. Knižnica na to nemá vhodný zásuvný bod —
načítanie je zadrôtované priamo v metóde. Správanie (chýbajúci používateľ,
neaktívny účet, zmenené heslo) preto zamyká `tests/test_auth_profile_preload`.
"""

from __future__ import annotations

from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password


class ProfileAwareJWTAuthentication(JWTAuthentication):
    """`JWTAuthentication`, ktorá k používateľovi pripojí aj jeho profil."""

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as exc:
            raise InvalidToken(
                _("Token contained no recognizable user identification")
            ) from exc

        try:
            user = self.user_model.objects.select_related("profile").get(
                **{api_settings.USER_ID_FIELD: user_id}
            )
        except self.user_model.DoesNotExist as exc:
            raise AuthenticationFailed(
                _("User not found"), code="user_not_found"
            ) from exc

        if api_settings.CHECK_USER_IS_ACTIVE and not user.is_active:
            raise AuthenticationFailed(_("User is inactive"), code="user_inactive")

        if api_settings.CHECK_REVOKE_TOKEN:
            if validated_token.get(
                api_settings.REVOKE_TOKEN_CLAIM
            ) != get_md5_hash_password(user.password):
                raise AuthenticationFailed(
                    _("The user's password has been changed."), code="password_changed"
                )

        return user
