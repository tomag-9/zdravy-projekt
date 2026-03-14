"""
Tests for push notification signal scheduling and Celery task logic.

Covers:
  - _sync_push_reminder_schedule: PeriodicTask creation/update
  - send_push_deadline_reminder_task: correct targeting and skip logic
"""

import datetime
from unittest.mock import patch

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import DailyOrder, GlobalSettings
from api.signals import PUSH_REMINDER_TASK_NAMES
from api.tasks import send_push_deadline_reminder_task

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

MEAL_TYPES = ["breakfast", "lunch", "olovrant"]

FUTURE_TUESDAY = datetime.date(2099, 1, 6)  # weekday == 1
FUTURE_SATURDAY = datetime.date(2099, 1, 10)  # weekday == 5


def _make_settings(**kwargs):
    defaults = dict(
        deadline_breakfast=datetime.time(8, 0),
        deadline_lunch=datetime.time(10, 0),
        deadline_olovrant=datetime.time(9, 0),
    )
    defaults.update(kwargs)
    return GlobalSettings.objects.create(**defaults)


def _make_user_with_subscription(endpoint_suffix="1"):
    from django.contrib.auth.models import User

    from api.models import PushSubscription

    user = User.objects.create_user(
        username=f"push_user_{endpoint_suffix}@example.com",
        email=f"push_user_{endpoint_suffix}@example.com",
        password="testpass",
    )
    PushSubscription.objects.create(
        user=user,
        endpoint=f"https://example.com/ep-{endpoint_suffix}",
        p256dh=f"p256dh-{endpoint_suffix}",
        auth=f"auth-{endpoint_suffix}",
    )
    return user


# ─────────────────────────────────────────────────────────────────────────────
# Signal: _sync_push_reminder_schedule
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSyncPushReminderSchedule:
    def test_creates_three_reminder_tasks_on_settings_save(self):
        """Saving GlobalSettings creates one PeriodicTask per meal type."""
        _make_settings()

        for meal_type, task_name in PUSH_REMINDER_TASK_NAMES.items():
            assert PeriodicTask.objects.filter(
                name=task_name
            ).exists(), f"PeriodicTask {task_name!r} was not created"

    def test_reminder_fires_15_min_before_each_deadline(self):
        """Each task crontab is 15 minutes before the corresponding deadline."""
        _make_settings(
            deadline_breakfast=datetime.time(8, 15),  # reminder → 08:00
            deadline_lunch=datetime.time(10, 30),  # reminder → 10:15
            deadline_olovrant=datetime.time(11, 0),  # reminder → 10:45
        )

        expectations = {
            "breakfast": (8, 0),
            "lunch": (10, 15),
            "olovrant": (10, 45),
        }
        for meal_type, (exp_hour, exp_min) in expectations.items():
            task = PeriodicTask.objects.get(name=PUSH_REMINDER_TASK_NAMES[meal_type])
            assert task.crontab.hour == str(
                exp_hour
            ), f"{meal_type}: expected hour {exp_hour}, got {task.crontab.hour}"
            assert task.crontab.minute == str(
                exp_min
            ), f"{meal_type}: expected minute {exp_min}, got {task.crontab.minute}"

    def test_tasks_run_only_monday_to_friday(self):
        """Push reminder tasks are restricted to weekdays."""
        _make_settings()

        for meal_type, task_name in PUSH_REMINDER_TASK_NAMES.items():
            task = PeriodicTask.objects.get(name=task_name)
            assert task.crontab.day_of_week == "1-5"

    def test_tasks_are_enabled(self):
        _make_settings()

        for task_name in PUSH_REMINDER_TASK_NAMES.values():
            task = PeriodicTask.objects.get(name=task_name)
            assert task.enabled is True

    def test_task_names_correct_celery_task(self):
        """All push reminder tasks point to the deadline reminder Celery task."""
        _make_settings()

        for task_name in PUSH_REMINDER_TASK_NAMES.values():
            task = PeriodicTask.objects.get(name=task_name)
            assert task.task == "api.tasks.send_push_deadline_reminder_task"

    def test_updates_schedule_when_deadline_changes(self):
        """Re-saving GlobalSettings with a different deadline updates the crontab."""
        settings = _make_settings(deadline_lunch=datetime.time(10, 0))

        task_before = PeriodicTask.objects.get(name=PUSH_REMINDER_TASK_NAMES["lunch"])
        assert task_before.crontab.hour == "9"
        assert task_before.crontab.minute == "45"

        settings.deadline_lunch = datetime.time(11, 30)
        settings.save()

        task_after = PeriodicTask.objects.get(name=PUSH_REMINDER_TASK_NAMES["lunch"])
        assert task_after.crontab.hour == "11"
        assert task_after.crontab.minute == "15"

    def test_clamps_to_midnight_when_deadline_less_than_15_min(self):
        """Deadlines < 00:15 are clamped to 00:00 instead of rolling back."""
        _make_settings(deadline_breakfast=datetime.time(0, 10))  # 10 min past midnight

        task = PeriodicTask.objects.get(name=PUSH_REMINDER_TASK_NAMES["breakfast"])
        assert task.crontab.hour == "0"
        assert task.crontab.minute == "0"

    def test_task_args_contain_meal_type(self):
        """Each task is scheduled with the correct meal_type argument."""
        import json

        _make_settings()

        for meal_type, task_name in PUSH_REMINDER_TASK_NAMES.items():
            task = PeriodicTask.objects.get(name=task_name)
            args = json.loads(task.args)
            assert args == [
                meal_type
            ], f"Task {task_name!r} should have args=[{meal_type!r}], got {args}"


# ─────────────────────────────────────────────────────────────────────────────
# Task: send_push_deadline_reminder_task
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSendPushDeadlineReminderTask:
    """
    Test the Celery task logic without actually sending push messages.
    PushNotificationService.send_to_user is mocked throughout.
    """

    def _run_task(self, meal_type: str, today: datetime.date, **settings_kwargs):
        """Helper: create GlobalSettings, patch today's date, run task."""
        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults=settings_kwargs
            or {
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_lunch": datetime.time(10, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )
        if settings_kwargs:
            gs = GlobalSettings.objects.get(pk=1)
            for k, v in settings_kwargs.items():
                setattr(gs, k, v)
            gs.save()

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_service:
            mock_tz.localdate.return_value = today
            mock_service.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            result = send_push_deadline_reminder_task(meal_type)
        return result, mock_service

    def test_skips_saturday(self):
        """Task returns early on Saturdays without sending anything."""
        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_lunch": datetime.time(10, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_service:
            mock_tz.localdate.return_value = FUTURE_SATURDAY
            result = send_push_deadline_reminder_task("lunch")

        assert result["skipped"] == "weekend"
        mock_service.send_to_user.assert_not_called()

    def test_sends_to_users_without_order(self):
        """Users who haven't ordered receive a push; ordered users are skipped."""
        subscribed_user = _make_user_with_subscription("no-order")
        ordered_user = _make_user_with_subscription("has-order")

        DailyOrder.objects.create(
            user=ordered_user,
            date=FUTURE_TUESDAY,
            data={"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        )

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_lunch": datetime.time(10, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task("lunch")

        # Only the user without an order should be notified
        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert subscribed_user.pk in called_ids
        assert ordered_user.pk not in called_ids

    def test_skips_users_without_subscriptions(self):
        """Users without push subscriptions are excluded even if they lack orders."""
        from django.contrib.auth.models import User

        user_no_sub = User.objects.create_user(
            username="nosub@example.com",
            email="nosub@example.com",
            password="x",
        )

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_lunch": datetime.time(10, 0),
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 0, "stale_removed": 0}
            send_push_deadline_reminder_task("lunch")

        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert user_no_sub.pk not in called_ids

    def test_ignores_staff_accounts_even_with_subscription(self):
        """Reminder targets client accounts only, not staff/admin users."""
        staff_user = _make_user_with_subscription("staff")
        staff_user.is_staff = True
        staff_user.save(update_fields=["is_staff"])

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_lunch": datetime.time(10, 0),
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            send_push_deadline_reminder_task("lunch")

        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert staff_user.pk not in called_ids

    def test_reminds_user_when_other_meal_exists_but_target_meal_is_empty(self):
        """Order rows with an empty target meal should still get a reminder."""
        subscribed_user = _make_user_with_subscription("partial-order")

        DailyOrder.objects.create(
            user=subscribed_user,
            date=FUTURE_TUESDAY,
            data={"breakfast": {"menuCounts": {"A": 1}, "diets": {}}, "lunch": {}},
        )

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_lunch": datetime.time(10, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task("lunch")

        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert subscribed_user.pk in called_ids

    def test_uses_next_workday_when_is_day_before_set(self):
        """With is_day_before=True, the target date is the next workday."""
        subscribed_user = _make_user_with_subscription("day-before")
        # FUTURE_TUESDAY is the "today"; next workday is Wednesday 2099-01-07
        next_workday = datetime.date(2099, 1, 7)

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_lunch": datetime.time(10, 0),
                "deadline_lunch_is_day_before": True,
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )
        gs = GlobalSettings.objects.get(pk=1)
        gs.deadline_lunch_is_day_before = True
        gs.save()

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            result = send_push_deadline_reminder_task("lunch")

        # Result should contain next_workday as the target date
        assert result.get("date") == str(next_workday)

    def test_returns_sent_count(self):
        """Task returns a dict with sent count and meal_type."""
        user = _make_user_with_subscription("count-test")

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_lunch": datetime.time(10, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            result = send_push_deadline_reminder_task("breakfast")

        assert result["meal_type"] == "breakfast"
        assert "sent" in result
        assert "date" in result

    def test_push_url_is_order_page(self):
        """Notifications are sent with url='/order' so users land on the order page."""
        _make_user_with_subscription("url-test")

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "deadline_breakfast": datetime.time(8, 0),
                "deadline_lunch": datetime.time(10, 0),
                "deadline_olovrant": datetime.time(9, 0),
            },
        )

        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task("lunch")

        call_kwargs = mock_svc.send_to_user.call_args.kwargs
        assert call_kwargs["url"] == "/order"
