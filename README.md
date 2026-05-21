# Zdravý Projekt

Full-stack web application with Django backend and React frontend, containerized with Docker.

## 🏗️ Architecture

- **Backend**: Django 5.0 + Django REST Framework + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS + TypeScript
- **Reverse Proxy**: Traefik (managed by Dokploy)
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## 🤝 Contributing

**Commit Message Format:**
```
<type>(<scope>): <subject>
```

**Príklady:**
- `feat(backend): add user authentication`
- `fix(frontend): resolve navbar issues`
- `docs: update setup instructions`

Commit messages sú automaticky validované pri každom PR.

## 📋 Prerequisites

- Docker & Docker Compose
- Git
- (Optional) Python 3.11+ and Node.js 20+ for local development without Docker

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd zdravy-projekt
```

### 2. Set up environment variables

```bash
cp env/dev.example .env.dev
```

Edit `.env.dev` and configure the variables (database, secrets, etc.).

### 3. Start development environment

```bash
docker compose -f compose/dev.yml up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

### 4. Run initial migrations

```bash
docker compose -f compose/dev.yml exec backend python manage.py migrate
docker compose -f compose/dev.yml exec backend python manage.py createsuperuser
```

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
docker compose -f compose/dev.yml exec backend pytest

# Run with coverage (terminal + HTML report)
docker compose -f compose/dev.yml exec backend pytest --cov=api --cov=app --cov-report=term-missing --cov-report=html

# Enforce minimum backend coverage (60%)
docker compose -f compose/dev.yml exec backend pytest --cov=api --cov=app --cov-fail-under=60

# Run specific test file
docker compose -f compose/dev.yml exec backend pytest api/tests/integration/test_order_api.py
```

**Local testing without Docker:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pytest
```

### Frontend Tests

```bash
# Run all tests
docker compose -f compose/dev.yml exec frontend npm test

# Watch mode
docker compose -f compose/dev.yml exec frontend npm run test:watch
```

**Local testing without Docker:**

```bash
cd frontend
npm install
npm test
```

## 📂 Project Structure

```
zdravy-projekt/
├── backend/                    # Django backend
│   ├── app/                    # Main Django app
│   │   ├── settings/           # Environment-specific settings
│   │   │   ├── base.py         # Shared settings
│   │   │   ├── dev.py          # Development settings
│   │   │   ├── staging.py      # Staging settings
│   │   │   └── prod.py         # Production settings
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── tests/                  # Legacy + broad backend tests
│   ├── api/tests/              # Structured API test layers
│   │   ├── conftest.py
│   │   ├── factories.py
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pytest.ini
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── api/                # API client utilities
│   │   ├── __tests__/          # Test files
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── nginx.conf
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── pr.yml              # PR checks
│       └── staging.yml         # Staging image build + Dokploy webhook
│
├── compose/                    # Docker Compose files
│   ├── dev.yml                 # Development environment
│   ├── staging.yml             # Dokploy staging app stack
│   ├── prod.yml                # Dokploy production app stack
│   └── observability.yml       # Alloy observability stack
├── env/                        # Environment variable templates
│   ├── dev.example
│   ├── staging.example
│   ├── prod.example
│   └── observability.example
├── observability/
│   └── alloy/
│       └── config.alloy
├── .gitignore
└── README.md
```

## 🔧 Development

### Backend Development

The backend uses Django with environment-specific settings:

```bash
# Run development server
docker compose -f compose/dev.yml exec backend python manage.py runserver 0.0.0.0:8000

# Create migrations
docker compose -f compose/dev.yml exec backend python manage.py makemigrations

# Apply migrations
docker compose -f compose/dev.yml exec backend python manage.py migrate

# Create superuser
docker compose -f compose/dev.yml exec backend python manage.py createsuperuser

# Django shell
docker compose -f compose/dev.yml exec backend python manage.py shell
```

### Frontend Development

The frontend uses React with Vite for fast development:

```bash
# Install new package
docker compose -f compose/dev.yml exec frontend npm install <package-name>

# Build for production
docker compose -f compose/dev.yml exec frontend npm run build

# Lint code
docker compose -f compose/dev.yml exec frontend npm run lint
```

### Code Quality

Pre-commit hooks enforce formatting and linting automatically on every commit.

**Setup (once per clone):**

```bash
pip install pre-commit   # or: brew install pre-commit
pre-commit install
```

**Run against all files manually:**

```bash
pre-commit run --all-files
```

**Hooks configured:**

| Hook | Tool | What it does |
|------|------|-------------|
| `black` | black 25.1.0 | Formats Python code |
| `isort` | isort 5.13.2 | Sorts imports (black-compatible) |
| `flake8` | flake8 7.0.0 | Lints for style/logic errors |
| `mypy` | mypy 1.11.2 | Static type checking |

**Via Docker (without local Python):**

```bash
# Backend: Format code with black
docker compose -f compose/dev.yml exec backend black .

# Backend: Sort imports
docker compose -f compose/dev.yml exec backend isort .

# Backend: Lint with flake8
docker compose -f compose/dev.yml exec backend flake8 .

# Frontend: Lint
docker compose -f compose/dev.yml exec frontend npm run lint
```

## 🌍 Environments

### Development

```bash
docker compose -f compose/dev.yml up
```

- DEBUG mode enabled
- Hot reload for both backend and frontend
- CORS allows all origins
- Fast password hasher
- Console email backend

### Staging

```bash
docker compose -f compose/staging.yml up -d
```

- Production-like environment
- SSL/TLS enabled
- Mirrors production settings

### Production

Deployment is managed by Dokploy (Traefik + Compose stack).

- DEBUG disabled
- SSL/TLS required
- Security headers enabled
- Gunicorn WSGI server
- Optimized static file serving

## 🔐 Environment Variables

See [env/dev.example](env/dev.example), [env/staging.example](env/staging.example), [env/prod.example](env/prod.example), and [env/observability.example](env/observability.example) for available environment variables.

Key variables:
- `DJANGO_SECRET_KEY`: Django secret key (generate for production)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Database credentials
- `POSTGRES_HOST`: Dokploy-managed Postgres hostname for staging/production
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_URL`: Dokploy-managed Redis URLs for staging/production
- `DJANGO_SETTINGS_MODULE`: Settings module (`app.settings.dev/staging/prod`)

## 🚢 Deployment

### Staging Deployment (Dokploy)

Staging deploy flow:

1. GitHub Actions builds and pushes Docker images on push to `develop`
2. Workflow calls Dokploy webhook from secret `DOKPLOY_WEBHOOK_URL`
3. Dokploy pulls fresh images and deploys `compose/staging.yml`

Required setup:

- GitHub Secrets: `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `DOKPLOY_WEBHOOK_URL`
- Dokploy app envs: `DJANGO_SECRET_KEY`, `POSTGRES_*`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_URL`, `EMAIL_*`, `STAGING_HOST`, etc.
- Dokploy network available as `dokploy-network`

### CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on every pull request
2. Checks code quality (linting, formatting)
3. Builds staging images and triggers Dokploy deploy on push to `develop` branch

### Production Deployment

Production deployment is handled via Dokploy similarly to staging:

1. GitHub Actions builds and pushes `prod` Docker images on push to `main`
2. Workflow triggers Dokploy webhook from secret `DOKPLOY_WEBHOOK_URL_PROD`
3. Dokploy pulls fresh images and deploys `compose/prod.yml`
4. Dokploy owns the public route/Traefik configuration for the production stack

### Observability

Observability runs as a separate Alloy stack:

```bash
docker compose -f compose/observability.yml up -d
```

Configure the stack from [env/observability.example](env/observability.example).
Alloy tails Docker logs through the Docker socket and scrapes Django metrics from
`ALLOY_METRICS_TARGET` over the Dokploy network.

## 🐛 Troubleshooting

### Database connection issues

```bash
# Check database status
docker compose -f compose/dev.yml ps db

# View database logs
docker compose -f compose/dev.yml logs db

# Reset database
docker compose -f compose/dev.yml down -v
docker compose -f compose/dev.yml up -d
```

### Frontend build issues

```bash
# Clear node_modules and reinstall
docker compose -f compose/dev.yml exec frontend rm -rf node_modules
docker compose -f compose/dev.yml exec frontend npm install
```

### View logs

```bash
# All services
docker compose -f compose/dev.yml logs -f

# Specific service
docker compose -f compose/dev.yml logs -f backend
docker compose -f compose/dev.yml logs -f frontend
```

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker Compose](https://docs.docker.com/compose/)
