"""
Tests for push notification signal scheduling and Celery task logic.

Covers:
  - _sync_push_reminder_schedule: PeriodicTask creation/update/grouping/cleanup
  - send_push_deadline_reminder_task: sends to ALL subscribed clients unconditionally
"""

import datetime
import json
from unittest.mock import patch

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import GlobalSettings
from api.signals import (
    PUSH_REMINDER_OFFSET_MINUTES,
    PUSH_REMINDER_TASK_PREFIX,
    _push_reminder_task_name,
)
from api.tasks import send_push_deadline_reminder_task

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

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
    def test_creates_reminder_tasks_on_settings_save(self):
        """Saving GlobalSettings creates at least one push-reminder PeriodicTask."""
        _make_settings()
        assert (
            PeriodicTask.objects.filter(
                name__startswith=PUSH_REMINDER_TASK_PREFIX
            ).count()
            >= 1
        )

    def test_separate_deadlines_create_separate_tasks(self):
        """Three distinct deadlines → three separate tasks."""
        _make_settings(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )
        count = PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).count()
        assert count == 3

    def test_shared_deadline_creates_grouped_task(self):
        """Breakfast and lunch sharing a deadline → one combined task, not two."""
        _make_settings(
            deadline_breakfast=datetime.time(10, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )
        tasks = list(
            PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX)
        )
        assert len(tasks) == 2

        grouped_name = _push_reminder_task_name(["breakfast", "lunch"])
        assert any(t.name == grouped_name for t in tasks)

    def test_all_same_deadline_creates_single_task(self):
        """All three meals at the same time → exactly one combined task."""
        _make_settings(
            deadline_breakfast=datetime.time(10, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(10, 0),
        )
        tasks = PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX)
        assert tasks.count() == 1

        expected_name = _push_reminder_task_name(["breakfast", "lunch", "olovrant"])
        assert tasks.first().name == expected_name

    def test_reminder_fires_30_min_before_each_deadline(self):
        """Each task crontab is PUSH_REMINDER_OFFSET_MINUTES before the deadline."""
        assert PUSH_REMINDER_OFFSET_MINUTES == 30

        _make_settings(
            deadline_breakfast=datetime.time(8, 30),  # reminder → 08:00
            deadline_lunch=datetime.time(11, 0),  # reminder → 10:30
            deadline_olovrant=datetime.time(9, 30),  # reminder → 09:00
        )

        expectations = {
            _push_reminder_task_name(["breakfast"]): (8, 0),
            _push_reminder_task_name(["lunch"]): (10, 30),
            _push_reminder_task_name(["olovrant"]): (9, 0),
        }
        for task_name, (exp_hour, exp_min) in expectations.items():
            task = PeriodicTask.objects.get(name=task_name)
            assert task.crontab.hour == str(
                exp_hour
            ), f"{task_name}: expected hour {exp_hour}, got {task.crontab.hour}"
            assert task.crontab.minute == str(
                exp_min
            ), f"{task_name}: expected minute {exp_min}, got {task.crontab.minute}"

    def test_tasks_run_only_monday_to_friday(self):
        """Push reminder tasks are restricted to weekdays."""
        _make_settings()
        for task in PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ):
            assert task.crontab.day_of_week == "1-5"

    def test_tasks_are_enabled(self):
        _make_settings()
        for task in PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ):
            assert task.enabled is True

    def test_tasks_point_to_correct_celery_task(self):
        """All push reminder tasks point to the deadline reminder Celery task."""
        _make_settings()
        for task in PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ):
            assert task.task == "api.tasks.send_push_deadline_reminder_task"

    def test_task_args_contain_meal_type_list(self):
        """Each task is scheduled with a list of meal_types as the first argument."""
        _make_settings(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )

        for task in PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ):
            args = json.loads(task.args)
            assert isinstance(args, list) and len(args) == 1
            assert isinstance(args[0], list), "First arg must be a list of meal types"

    def test_grouped_task_args_contain_all_grouped_meals(self):
        """A grouped task receives both meal types as a single list arg."""
        _make_settings(
            deadline_breakfast=datetime.time(10, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )

        task_name = _push_reminder_task_name(["breakfast", "lunch"])
        task = PeriodicTask.objects.get(name=task_name)
        args = json.loads(task.args)
        assert sorted(args[0]) == ["breakfast", "lunch"]

    def test_updates_schedule_when_deadline_changes(self):
        """Re-saving GlobalSettings with a different deadline updates the crontab."""
        settings = _make_settings(deadline_lunch=datetime.time(11, 0))

        task_name = _push_reminder_task_name(["lunch"])
        task_before = PeriodicTask.objects.get(name=task_name)
        assert task_before.crontab.hour == "10"
        assert task_before.crontab.minute == "30"

        settings.deadline_lunch = datetime.time(12, 0)
        settings.save()

        task_after = PeriodicTask.objects.get(name=task_name)
        assert task_after.crontab.hour == "11"
        assert task_after.crontab.minute == "30"

    def test_orphaned_tasks_deleted_when_deadlines_merge(self):
        """When two previously separate deadlines merge, the old tasks are deleted."""
        settings = _make_settings(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )
        assert (
            PeriodicTask.objects.filter(
                name__startswith=PUSH_REMINDER_TASK_PREFIX
            ).count()
            == 3
        )

        # Merge breakfast and lunch to the same deadline
        settings.deadline_breakfast = datetime.time(10, 0)
        settings.save()

        tasks = list(
            PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX)
        )
        assert len(tasks) == 2
        task_names = {t.name for t in tasks}
        assert _push_reminder_task_name(["breakfast", "lunch"]) in task_names
        assert _push_reminder_task_name(["olovrant"]) in task_names
        # Old standalone breakfast task must be gone
        assert _push_reminder_task_name(["breakfast"]) not in task_names

    def test_clamps_to_midnight_when_deadline_less_than_offset(self):
        """Deadlines < PUSH_REMINDER_OFFSET_MINUTES are clamped to 00:00."""
        _make_settings(deadline_breakfast=datetime.time(0, 10))

        task = PeriodicTask.objects.get(name=_push_reminder_task_name(["breakfast"]))
        assert task.crontab.hour == "0"
        assert task.crontab.minute == "0"


# ─────────────────────────────────────────────────────────────────────────────
# Task: send_push_deadline_reminder_task
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSendPushDeadlineReminderTask:
    """
    Test the Celery task logic without actually sending push messages.
    PushNotificationService.send_to_user is mocked throughout.
    """

    def _setup_gs(self, **kwargs):
        defaults = dict(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )
        defaults.update(kwargs)
        GlobalSettings.objects.get_or_create(pk=1, defaults=defaults)
        if kwargs:
            gs = GlobalSettings.objects.get(pk=1)
            for k, v in kwargs.items():
                setattr(gs, k, v)
            gs.save()

    def test_skips_saturday(self):
        """Task returns early on Saturdays without sending anything."""
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_SATURDAY
            result = send_push_deadline_reminder_task(["lunch"])

        assert result["skipped"] == "weekend"
        mock_svc.send_to_user.assert_not_called()

    def test_sends_to_all_subscribed_users_regardless_of_order(self):
        """Every subscribed client receives a notification even if they already ordered."""
        user_with_order = _make_user_with_subscription("has-order")
        user_without_order = _make_user_with_subscription("no-order")

        from api.models import DailyOrder

        DailyOrder.objects.create(
            user=user_with_order,
            date=FUTURE_TUESDAY,
            data={"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        )

        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task(["lunch"])

        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert user_with_order.pk in called_ids
        assert user_without_order.pk in called_ids

    def test_skips_users_without_subscriptions(self):
        """Users without push subscriptions are not notified."""
        from django.contrib.auth.models import User

        user_no_sub = User.objects.create_user(
            username="nosub@example.com",
            email="nosub@example.com",
            password="x",
        )
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 0, "stale_removed": 0}
            send_push_deadline_reminder_task(["lunch"])

        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert user_no_sub.pk not in called_ids

    def test_ignores_staff_accounts(self):
        """Reminder targets client accounts only, not staff/admin users."""
        staff_user = _make_user_with_subscription("staff")
        staff_user.is_staff = True
        staff_user.save(update_fields=["is_staff"])

        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            send_push_deadline_reminder_task(["lunch"])

        called_ids = {
            call.kwargs["user_id"] for call in mock_svc.send_to_user.call_args_list
        }
        assert staff_user.pk not in called_ids

    def test_single_meal_body_mentions_meal_in_slovak(self):
        """Notification body contains the Slovak label for the meal."""
        _make_user_with_subscription("body-test")
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task(["lunch"])

        body = mock_svc.send_to_user.call_args.kwargs["body"]
        assert "obed" in body

    def test_two_meals_body_uses_a_conjunction(self):
        """Two grouped meals are joined with 'a' in the notification body."""
        _make_user_with_subscription("two-meals")
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task(["breakfast", "lunch"])

        body = mock_svc.send_to_user.call_args.kwargs["body"]
        assert "raňajky" in body
        assert "obed" in body
        assert " a " in body

    def test_three_meals_body_uses_comma_and_a_conjunction(self):
        """Three grouped meals: comma-separated with 'a' before the last."""
        _make_user_with_subscription("three-meals")
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task(["breakfast", "lunch", "olovrant"])

        body = mock_svc.send_to_user.call_args.kwargs["body"]
        assert "raňajky" in body
        assert "obed" in body
        assert "olovrant" in body
        assert ", " in body
        assert " a " in body

    def test_uses_next_workday_when_is_day_before_set(self):
        """With is_day_before=True, the target date is the next workday."""
        _make_user_with_subscription("day-before")
        next_workday = datetime.date(2099, 1, 7)  # Wednesday after FUTURE_TUESDAY

        self._setup_gs(
            deadline_lunch_is_day_before=True,
        )
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            result = send_push_deadline_reminder_task(["lunch"])

        assert result.get("date") == str(next_workday)

    def test_returns_sent_count_and_meal_types(self):
        """Task returns a dict with sent count and meal_types list."""
        _make_user_with_subscription("count-test")
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            result = send_push_deadline_reminder_task(["breakfast"])

        assert result["meal_types"] == ["breakfast"]
        assert "sent" in result
        assert "date" in result

    def test_push_url_is_order_page(self):
        """Notifications are sent with url='/order' so users land on the order page."""
        _make_user_with_subscription("url-test")
        self._setup_gs()
        with patch("api.tasks.timezone") as mock_tz, patch(
            "api.tasks.PushNotificationService"
        ) as mock_svc:
            mock_tz.localdate.return_value = FUTURE_TUESDAY
            mock_svc.send_to_user.return_value = {"sent": 1, "stale_removed": 0}
            send_push_deadline_reminder_task(["lunch"])

        assert mock_svc.send_to_user.call_args.kwargs["url"] == "/order"
