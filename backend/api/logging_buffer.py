import logging
import os
import threading
from collections import deque
from itertools import count
from typing import Any

from django.utils import timezone

_MAX_RECORDS = int(os.environ.get("ADMIN_LOG_BUFFER_SIZE", "2000"))
_records: deque[dict[str, Any]] = deque(maxlen=max(100, _MAX_RECORDS))
_lock = threading.Lock()
_sequence = count(1)


class InMemoryLogHandler(logging.Handler):
    """Keep recent application logs available for the admin logs screen."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = record.getMessage()
            traceback = None
            if record.exc_info:
                formatter = self.formatter or logging.Formatter()
                traceback = formatter.formatException(record.exc_info)

            created_at = timezone.datetime.fromtimestamp(
                record.created,
                tz=timezone.get_current_timezone(),
            )

            item = {
                "id": next(_sequence),
                "timestamp": created_at.isoformat(),
                "level": record.levelname,
                "level_no": record.levelno,
                "logger": record.name,
                "module": record.module,
                "line": record.lineno,
                "process": record.process,
                "thread": record.threadName,
                "message": message,
                "traceback": traceback,
            }

            with _lock:
                _records.append(item)
        except Exception:
            self.handleError(record)


def get_log_records() -> list[dict[str, Any]]:
    with _lock:
        return list(_records)


def clear_log_records() -> None:
    with _lock:
        _records.clear()
