# Backend Dockerfile

# Builder stage
FROM python:3.12-slim as builder

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
# Enable virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
# Switch to psycopg2 (source build) for production
RUN sed -i 's/psycopg2-binary/psycopg2/g' requirements.txt && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Enable virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Install runtime dependencies
# libpq5 is required for psycopg2
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy project
COPY . /app/

# Make manage.py executable
RUN chmod +x /app/manage.py

# Collect static files
# Note: collectstatic needs django installed, which is available via the venv in PATH
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Run migrations, seed roles, and start server
CMD ["sh", "-c", "python manage.py migrate && python manage.py init_roles && gunicorn app.wsgi:application --bind 0.0.0.0:8000"]
