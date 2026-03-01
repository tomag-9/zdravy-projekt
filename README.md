# Zdravý Projekt

Full-stack web application with Django backend and React frontend, containerized with Docker.

## 🏗️ Architecture

- **Backend**: Django 5.0 + Django REST Framework + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS + TypeScript
- **Reverse Proxy**: Nginx
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
cp .env.example .env.dev
```

Edit `.env.dev` and configure the variables (database, secrets, etc.).

### 3. Start development environment

```bash
docker compose -f docker-compose.dev.yml up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

### 4. Run initial migrations

```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
docker compose -f docker-compose.dev.yml exec backend pytest

# Run with coverage (terminal + HTML report)
docker compose -f docker-compose.dev.yml exec backend pytest --cov=api --cov=app --cov-report=term-missing --cov-report=html

# Enforce minimum backend coverage (60%)
docker compose -f docker-compose.dev.yml exec backend pytest --cov=api --cov=app --cov-fail-under=60

# Run specific test file
docker compose -f docker-compose.dev.yml exec backend pytest api/tests/integration/test_order_api.py
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
docker compose -f docker-compose.dev.yml exec frontend npm test

# Watch mode
docker compose -f docker-compose.dev.yml exec frontend npm run test:watch
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
│
├── nginx/                      # Nginx configuration
│   └── default.conf
│
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml              # CI pipeline
│       └── deploy.yml          # Deployment pipeline
│
├── docker-compose.dev.yml      # Development environment
├── docker-compose.staging.yml  # Staging environment
├── docker-compose.prod.yml     # Production environment
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

## 🔧 Development

### Backend Development

The backend uses Django with environment-specific settings:

```bash
# Run development server
docker compose -f docker-compose.dev.yml exec backend python manage.py runserver 0.0.0.0:8000

# Create migrations
docker compose -f docker-compose.dev.yml exec backend python manage.py makemigrations

# Apply migrations
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Create superuser
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser

# Django shell
docker compose -f docker-compose.dev.yml exec backend python manage.py shell
```

### Frontend Development

The frontend uses React with Vite for fast development:

```bash
# Install new package
docker compose -f docker-compose.dev.yml exec frontend npm install <package-name>

# Build for production
docker compose -f docker-compose.dev.yml exec frontend npm run build

# Lint code
docker compose -f docker-compose.dev.yml exec frontend npm run lint
```

### Code Quality

```bash
# Backend: Format code with black
docker compose -f docker-compose.dev.yml exec backend black .

# Backend: Sort imports
docker compose -f docker-compose.dev.yml exec backend isort .

# Backend: Lint with flake8
docker compose -f docker-compose.dev.yml exec backend flake8 .

# Frontend: Lint
docker compose -f docker-compose.dev.yml exec frontend npm run lint
```

## 🌍 Environments

### Development

```bash
docker compose -f docker-compose.dev.yml up
```

- DEBUG mode enabled
- Hot reload for both backend and frontend
- CORS allows all origins
- Fast password hasher
- Console email backend

### Staging

```bash
docker compose -f docker-compose.staging.yml up -d
```

- Production-like environment
- SSL/TLS enabled
- Mirrors production settings

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

- DEBUG disabled
- SSL/TLS required
- Security headers enabled
- Gunicorn WSGI server
- Optimized static file serving

## 🔐 Environment Variables

See [.env.example](.env.example) for all available environment variables.

Key variables:
- `DJANGO_SECRET_KEY`: Django secret key (generate for production)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Database credentials
- `DJANGO_SETTINGS_MODULE`: Settings module (`app.settings.dev/staging/prod`)

## 🚢 Deployment

### CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on every pull request
2. Checks code quality (linting, formatting)
3. Deploys to staging on push to `staging` branch
4. Deploys to production on push to `main` branch

### Manual Deployment

1. Build and push Docker images
2. SSH to server
3. Pull latest images
4. Run migrations
5. Restart containers

```bash
# On production server
cd /opt/heltum
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

## 🐛 Troubleshooting

### Database connection issues

```bash
# Check database status
docker compose -f docker-compose.dev.yml ps db

# View database logs
docker compose -f docker-compose.dev.yml logs db

# Reset database
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Frontend build issues

```bash
# Clear node_modules and reinstall
docker compose -f docker-compose.dev.yml exec frontend rm -rf node_modules
docker compose -f docker-compose.dev.yml exec frontend npm install
```

### View logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker Compose](https://docs.docker.com/compose/)

