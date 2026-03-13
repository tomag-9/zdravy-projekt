"""
Gunicorn configuration for Zdravý projekt backend.

Handles:
- Timeout settings for slow requests (e.g., Redis connection delays)
- Worker concurrency
- Connection pooling and keepalive
- Graceful shutdown
"""

import os

# Bind to all interfaces on port 8000
bind = ["0.0.0.0:8000"]

# Number of worker processes
# For production, set to: (2 * CPU_CORES) + 1
workers = int(os.environ.get("GUNICORN_WORKERS", "4"))

# Worker class (sync is simpler, gevent for high concurrency)
worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "sync")

# Timeout for worker (in seconds)
# Requests taking longer than this will be killed and restarted
# Increased to 120s to allow for slow Redis/DB operations
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))

# Graceful timeout for shutdown (in seconds)
# Workers have this long to finish current requests before being force-killed
graceful_timeout = int(os.environ.get("GUNICORN_GRACEFUL_TIMEOUT", "30"))

# Seconds to wait before closing worker connections on shutdown
shutdown_timeout = int(os.environ.get("GUNICORN_SHUTDOWN_TIMEOUT", "30"))

# Connection keepalive in seconds
# Allows persistent connections to reduce overhead
keepalive = int(os.environ.get("GUNICORN_KEEPALIVE", "5"))

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log to stderr
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" response_time=%(M)sms'
)

# Pre-fork settings
preload_app = False  # Don't preload app (set False for auto-reload in dev)

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Maximum number of pending connections
# For production, increase if many clients connect
backlog = 2048

# Maximum size of request body (in bytes)
# Set to 100MB to allow large file uploads
limit_request_fields = 100
limit_request_line = 8190
limit_request_line_value_sz = 8190

# SSL
keyfile = None
certfile = None
ssl_version = None
cert_reqs = 0
ca_certs = None
do_handshake_on_connect = False
suppress_ragged_eof = True
ciphers = None
