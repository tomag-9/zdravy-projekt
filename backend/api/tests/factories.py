"""Factory Boy factories for API unit/integration/e2e tests."""

import datetime

import factory
from django.contrib.auth.models import User
from django.utils import timezone
from factory.django import DjangoModelFactory

from api.models import (
    ClientSettings,
    DailyOrder,
    Diet,
    PasswordResetToken,
    PushNotificationAttempt,
    PushSubscription,
    UserProfile,
)


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        # factory_boy 4 will no longer auto-save in _after_postgeneration.
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}@example.com")
    email = factory.LazyAttribute(lambda obj: obj.username)
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_staff = False
    is_superuser = False

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        raw_password = extracted or "testpassword123"
        self.set_password(raw_password)
        if create:
            self.save(update_fields=["password"])


class AdminUserFactory(UserFactory):
    is_staff = True
    is_superuser = True


class DietFactory(DjangoModelFactory):
    class Meta:
        model = Diet

    name = factory.Sequence(lambda n: f"Diet {n}")
    is_active = True
    description = factory.Faker("sentence")


class ClientSettingsFactory(DjangoModelFactory):
    class Meta:
        model = ClientSettings

    user = factory.SubFactory(UserFactory)
    visible_menus = ["A", "B"]
    visible_meals = ["breakfast", "lunch", "olovrant"]


class DailyOrderFactory(DjangoModelFactory):
    class Meta:
        model = DailyOrder

    user = factory.SubFactory(UserFactory)
    date = factory.LazyFunction(datetime.date.today)
    status = "submitted"
    is_auto = False
    data = {
        "breakfast": {"Dospelý": {"menuCounts": {"A": 1}, "diets": {}}},
        "lunch": {},
        "olovrant": {},
    }


class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(UserFactory)
    company_name = factory.Faker("company")
    ico = factory.Sequence(lambda n: f"ICO{n:08d}")
    dic = factory.Sequence(lambda n: f"DIC{n:08d}")


class PasswordResetTokenFactory(DjangoModelFactory):
    class Meta:
        model = PasswordResetToken

    user = factory.SubFactory(UserFactory)
    token = factory.Faker("sha1")
    expires_at = factory.LazyFunction(
        lambda: timezone.now() + datetime.timedelta(hours=2)
    )
    used = False


class PushSubscriptionFactory(DjangoModelFactory):
    class Meta:
        model = PushSubscription

    user = factory.SubFactory(UserFactory)
    endpoint = factory.Sequence(
        lambda n: f"https://fcm.googleapis.com/fcm/send/fake-endpoint-{n}"
    )
    p256dh = factory.Sequence(lambda n: f"fake-p256dh-key-{n}")
    auth = factory.Sequence(lambda n: f"fake-auth-{n}")


class PushNotificationAttemptFactory(DjangoModelFactory):
    class Meta:
        model = PushNotificationAttempt

    subscription = factory.SubFactory(PushSubscriptionFactory)
    user = factory.SelfAttribute("subscription.user")
    endpoint = factory.SelfAttribute("subscription.endpoint")
    title = "Test notification"
    body = "Test body"
    url = "/home"
    status = PushNotificationAttempt.STATUS_SENT
