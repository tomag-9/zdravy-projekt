# CI/CD Pipeline

Projekt používa tri samostatné GitHub Actions workflows pre rôzne fázy vývoja.

## 📋 Workflows

### 1. Pull Request Checks ([pr.yml](.github/workflows/pr.yml))

**Trigger:** Pull request do `main` alebo `develop`

**Jobs:**
- ✅ **Backend Lint** - flake8, black, isort
- ✅ **Frontend Lint** - ESLint
- ✅ **Backend Unit Tests** - pytest s coverage
- ✅ **Frontend Unit Tests** - Vitest s coverage  
- ✅ **Docker Build** - test build oboch images

**Blokovanie merge:** Áno - všetky testy musia prejsť

---

### 2. Staging Deployment ([staging.yml](.github/workflows/staging.yml))

**Trigger:** Push do `develop` branch

**Jobs:**
1. 🏗️ **Build and Push** - Docker images do registry
2. 🚀 **Deploy to Staging** - nasadenie na staging server
3. 📊 **Migrate** - databázové migrácie
4. 🧪 **E2E Tests** - Playwright end-to-end testy

**Environment:** `staging`

---

### 3. Production Deployment ([production.yml](.github/workflows/production.yml))

**Trigger:** Push do `main` branch

**Jobs:**
1. 🏗️ **Build and Push** - Docker images do registry
2. ✋ **Manual Approval** - čaká na schválenie
3. 💾 **Backup** - záloha databázy
4. 🚀 **Deploy to Production** - nasadenie
5. 📊 **Migrate** - databázové migrácie
6. 🏥 **Health Check** - kontrola zdravia služieb
7. 🧪 **Smoke Tests** - základné testy
8. 🔄 **Rollback** (pri zlyhani) - automatický rollback

**Environment:** `production-approval` → `production`

---

## 🔧 Potrebné GitHub Secrets

Nastavte tieto secrets v GitHub repo (Settings → Secrets and variables → Actions):

### Container Registry
```
REGISTRY_URL=registry.example.com
REGISTRY_USERNAME=your-username
REGISTRY_PASSWORD=your-password
```

### Staging Server
```
STAGING_HOST=staging.example.com
STAGING_USER=deploy
STAGING_SSH_KEY=<private-key>
```

### Production Server
```
PROD_HOST=example.com
PROD_USER=deploy
PROD_SSH_KEY=<private-key>
```

---

## 🌍 Environments

V GitHub repo vytvorte environments (Settings → Environments):

### `staging`
- ❌ Required reviewers: nie
- 🕐 Deployment branches: `develop` only

### `production-approval`
- ✅ Required reviewers: áno (pridať schvaľovateľov)
- 🕐 Wait timer: voliteľné (napr. 5 min)
- 🕐 Deployment branches: `main` only

### `production`
- ❌ Required reviewers: nie (už schválené v predchadzajucom stepe)
- 🕐 Deployment branches: `main` only

---

## 📊 Workflow Diagram

```
Pull Request
├─ Lint (backend + frontend)
├─ Unit Tests (backend + frontend)
├─ Coverage Report
└─ Docker Build Test
    ↓ (merge approved)

develop branch
├─ Build & Push Images
├─ Deploy to Staging
├─ Run Migrations
└─ E2E Tests
    ↓ (manual merge to main)

main branch
├─ Build & Push Images
├─ ⏸️  Manual Approval
├─ Create Backup
├─ Deploy to Production
├─ Run Migrations
├─ Health Check
└─ Smoke Tests
    ↓
    ✅ Success / ❌ Rollback
```

---

## 🚀 Ako používať

### Feature Development
```bash
git checkout -b feature/nova-funkcionalita
# ... vývoj ...
git push origin feature/nova-funkcionalita
```
→ Vytvor PR do `develop` → CI checks bežia automaticky

### Staging Release
```bash
git checkout develop
git merge feature/nova-funkcionalita
git push origin develop
```
→ Automaticky nasadí na staging + spustí E2E testy

### Production Release
```bash
git checkout main
git merge develop
git push origin main
```
→ Build → čaká na approval → Deploy → Health checks

---

## 🔒 Server Setup

Na staging a production serveroch musí byť:

```bash
# Adresárová štruktúra
/opt/heltum/
├── docker-compose.staging.yml  # alebo prod
├── .env.staging               # alebo .env.prod
└── backups/

# Docker a Docker Compose nainštalované
docker --version
docker compose version

# SSH prístup pre deploy usera
/home/deploy/.ssh/authorized_keys  # obsahuje deploy key
```

---

## 📝 Poznámky

- **Coverage reports** sa uploadujú do Codecov (voliteľné)
- **E2E testy** používajú Playwright
- **Rollback** sa spúšťa automaticky pri zlyhaní health checkov
- **Zero-downtime deployment** pomocou docker compose
- **Database backups** sa vytvárajú pred každým production deployom
