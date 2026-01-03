# GitHub Secrets Setup Guide

## Prehľad

Pre správne fungovanie CI/CD pipeline je potrebné nastaviť GitHub Secrets. Ak secrets nie sú nastavené, príslušné joby sa automaticky preskočia.

## 🔧 Ako nastaviť Secrets

1. Choď do GitHub repozitára
2. **Settings** → **Secrets and variables** → **Actions**
3. Klikni **New repository secret**
4. Pridaj jednotlivé secrets podľa návodu nižšie

---

## 📦 Container Registry (Voliteľné)

Ak používaš vlastný container registry (Docker Hub, GitHub Container Registry, atď.):

```bash
# Názov/URL registra
REGISTRY_URL=ghcr.io/your-org
# alebo
REGISTRY_URL=docker.io

# Prihlasovacie údaje
REGISTRY_USERNAME=your-username
REGISTRY_PASSWORD=your-token-or-password
```

**Poznámka:** Ak tieto secrets nie sú nastavené, workflow preskočí build a push kroky.

---

## 🌍 Staging Server (Pre staging deployment)

```bash
# Hostname staging servera
STAGING_HOST=staging.example.com

# SSH prístup
STAGING_USER=deploy
STAGING_SSH_KEY=<obsah-privatneho-kluca>
```

### Ako vygenerovať SSH kľúč:

```bash
# Na tvojom počítači
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/staging_deploy

# Skopíruj verejný kľúč na server
ssh-copy-id -i ~/.ssh/staging_deploy.pub deploy@staging.example.com

# Obsah privátneho kľúča vlož do STAGING_SSH_KEY
cat ~/.ssh/staging_deploy
```

**Poznámka:** Ak tieto secrets nie sú nastavené, staging deployment sa preskočí.

---

## 🚀 Production Server (Pre production deployment)

```bash
# Hostname production servera
PROD_HOST=example.com

# SSH prístup
PROD_USER=deploy
PROD_SSH_KEY=<obsah-privatneho-kluca>
```

### Ako vygenerovať SSH kľúč:

```bash
# Na tvojom počítači
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/prod_deploy

# Skopíruj verejný kľúč na server
ssh-copy-id -i ~/.ssh/prod_deploy.pub deploy@example.com

# Obsah privátneho kľúča vlož do PROD_SSH_KEY
cat ~/.ssh/prod_deploy
```

**Poznámka:** Ak tieto secrets nie sú nastavené, production deployment sa preskočí.

---

## ✅ Minimálna konfigurácia

**Pre vývoj bez deployment:**
- Žiadne secrets nie su potrebné
- PR workflow bude fungovať (testy, lint, docker build)

**Pre staging deployment:**
```
STAGING_HOST
STAGING_USER
STAGING_SSH_KEY
```

**Pre production deployment:**
```
PROD_HOST
PROD_USER
PROD_SSH_KEY
```

**Pre container registry (voliteľné):**
```
REGISTRY_URL
REGISTRY_USERNAME
REGISTRY_PASSWORD
```

---

## 🔒 Server Setup

Na každom serveri (staging/production) vytvor deploy usera:

```bash
# Prihlás sa na server ako root
sudo adduser deploy
sudo usermod -aG docker deploy

# Vytvor projektový adresár
sudo mkdir -p /opt/heltum
sudo chown deploy:deploy /opt/heltum

# Nastav SSH authorized_keys
sudo mkdir -p /home/deploy/.ssh
sudo touch /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Pridaj verejný kľúč do authorized_keys
echo "ssh-ed25519 AAAA... github-actions-staging" | sudo tee -a /home/deploy/.ssh/authorized_keys
```

---

## 🧪 Test pripojenia

```bash
# Test SSH pripojenia zo svojho počítača
ssh -i ~/.ssh/staging_deploy deploy@staging.example.com

# Overenie Docker prístupu
ssh -i ~/.ssh/staging_deploy deploy@staging.example.com "docker ps"
```

---

## 🎯 GitHub Environments

Vytvor environments v GitHub (Settings → Environments):

### `staging`
- **Deployment branches:** `develop` only
- **Required reviewers:** Nie
- **Wait timer:** 0 minutes

### `production-approval`
- **Deployment branches:** `main` only  
- **Required reviewers:** Áno - pridaj schvaľovateľov
- **Wait timer:** Voliteľné (napr. 5 min)

### `production`
- **Deployment branches:** `main` only
- **Required reviewers:** Nie
- **Wait timer:** 0 minutes

---

## ❓ FAQ

### Workflow sa vôbec nespustil
- Skontroluj, či máš správny branch (`develop` pre staging, `main` pre production)
- Skontroluj, či sú workflow súbory v `.github/workflows/`

### Job "build-and-push" sa preskočil
- Normálne, ak nemáš nastavené `REGISTRY_URL`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`
- Môžeš pokračovať bez container registry

### Job "deploy-staging" sa preskočil
- Normálne, ak nemáš nastavené `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`
- Workflow funguje aj bez deployment (len testy)

### SSH pripojenie zlyhalo
- Over, či je verejný kľúč v `~/.ssh/authorized_keys` na serveri
- Over, či privátny kľúč v GitHub secrets nemá extra riadky alebo medzery
- Over, či deploy user má práva na `/opt/heltum` a docker

### Ako otestujem bez production servera?
- Stačia ti len PR checks - nevyžadujú žiadne secrets
- Staging a production deployment sú voliteľné

---

## 📝 Checklist

**Základné fungovanie (len testy):**
- [ ] Repository existuje na GitHub
- [ ] Workflow súbory sú v `.github/workflows/`

**Staging deployment:**
- [ ] `STAGING_HOST` secret nastavený
- [ ] `STAGING_USER` secret nastavený  
- [ ] `STAGING_SSH_KEY` secret nastavený
- [ ] Server pripravený s Docker a deploy userom
- [ ] `staging` environment vytvorený v GitHub

**Production deployment:**
- [ ] `PROD_HOST` secret nastavený
- [ ] `PROD_USER` secret nastavený
- [ ] `PROD_SSH_KEY` secret nastavený  
- [ ] Server pripravený s Docker a deploy userom
- [ ] `production-approval` environment s reviewers
- [ ] `production` environment vytvorený v GitHub

**Container Registry (voliteľné):**
- [ ] `REGISTRY_URL` secret nastavený
- [ ] `REGISTRY_USERNAME` secret nastavený
- [ ] `REGISTRY_PASSWORD` secret nastavený
