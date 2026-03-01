# Backend Dockerfile
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    curl \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Make manage.py executable
RUN chmod +x /app/manage.py

# Create a dedicated non-root user for runtime processes.
RUN groupadd --system appuser && useradd --system --gid appuser --create-home appuser

# Collect static files
RUN DJANGO_SETTINGS_MODULE=app.settings.base python manage.py collectstatic --noinput

# Ensure runtime user can read/write where needed (e.g., pyc, temp files).
RUN chown -R appuser:appuser /app

# Drop root privileges for runtime (backend + celery + beat).
USER appuser

# Expose port
EXPOSE 8000

# Run migrations, seed roles, and start server
CMD ["sh", "-c", "python manage.py migrate && python manage.py init_roles && gunicorn app.wsgi:application --bind 0.0.0.0:8000"]
