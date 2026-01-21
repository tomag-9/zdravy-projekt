# Setup Guide: Separate Runner & Staging Server

## Architektúra

```
GitHub Actions
    ↓
Self-hosted Runner (builder)  →  HTTPS/Docker API  →  Staging Server
    - Builduje images                                    - Beží containery
    - Pushuje do Docker Hub                              - Port 2010
    - Deploy príkazy cez Docker API                      - Cloudflare proxy
```

---

## 1) Self-hosted Runner Setup (builder)

**Nainštaluj na oddelenom stroji/kontajneri:**

```bash
# Stiahni GitHub Actions runner
cd ~
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf actions-runner-linux-x64-2.311.0.tar.gz

# Konfigurácia
./config.sh --url https://github.com/YOUR_USERNAME/zdravy-projekt --token YOUR_TOKEN

# Pri konfigurácii zadaj labels: self-hosted,Linux,builder

# Spusti ako service
sudo ./svc.sh install
sudo ./svc.sh start
```

**Potrebné na runneri:**
- Docker + docker compose
- Git
- Prístup k Docker Hub (docker login)

---

## 2) Staging Server Setup

### A) Expozovať Docker API cez HTTPS

**Variant 1: Docker TLS (bezpečné)**

```bash
# Na staging serveri
cd /etc/docker

# Vygeneruj CA a certifikáty
openssl genrsa -aes256 -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem

# Server certifikát
openssl genrsa -out server-key.pem 4096
openssl req -subj "/CN=staging-server-hostname" -sha256 -new -key server-key.pem -out server.csr
echo subjectAltName = DNS:staging-server,IP:STAGING_IP > extfile.cnf
openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -extfile extfile.cnf

# Client certifikát (pre runnera)
openssl genrsa -out key.pem 4096
openssl req -subj '/CN=client' -new -key key.pem -out client.csr
echo extendedKeyUsage = clientAuth > extfile-client.cnf
openssl x509 -req -days 365 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out cert.pem -extfile extfile-client.cnf

# Uprav Docker daemon
sudo nano /etc/docker/daemon.json
```

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tls": true,
  "tlscacert": "/etc/docker/ca.pem",
  "tlscert": "/etc/docker/server-cert.pem",
  "tlskey": "/etc/docker/server-key.pem",
  "tlsverify": true
}
```

```bash
sudo systemctl restart docker
```

**Skopíruj client certifikáty na runner:**
```bash
# Z staging servera
scp /etc/docker/ca.pem runner-host:~/docker-certs/
scp /etc/docker/cert.pem runner-host:~/docker-certs/
scp /etc/docker/key.pem runner-host:~/docker-certs/
```

---

**Variant 2: Nginx Reverse Proxy (jednoduchšie)**

```nginx
# /etc/nginx/sites-available/docker-api
server {
    listen 2376 ssl;
    server_name staging.internal;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://unix:/var/run/docker.sock;
        proxy_set_header Host $host;
    }
}
```

---

### B) Pripraviť staging environment súbory

```bash
# Na staging serveri
mkdir -p /opt/zdravy-projekt/nginx

# Vytvor .env.staging (tento súbor NIKDY nekopíruj cez git!)
cat > /opt/zdravy-projekt/.env.staging << 'EOF'
REGISTRY_USERNAME=tvoj-dockerhub-username
DJANGO_SECRET_KEY=super-secret-key-12345
POSTGRES_DB=zdravy_staging
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password-here
STAGING_HOST=zb.tomag.xyz
FRONTEND_URL=https://zb.tomag.xyz
VITE_API_URL=https://zb.tomag.xyz/api
EOF

chmod 600 /opt/zdravy-projekt/.env.staging
```

**Poznámka:** `docker-compose.staging.yml` a `nginx/staging.conf` sa stiahnu z repo počas deploy jobu (sparse checkout).

---

## 3) GitHub Secrets

V GitHub → Settings → Secrets and variables → Actions:

```
REGISTRY_USERNAME = tvoj-dockerhub-username
REGISTRY_PASSWORD = tvoj-dockerhub-token

STAGING_DOCKER_HOST = tcp://STAGING_IP:2376
STAGING_DOCKER_CERT = /home/runner/docker-certs
# alebo base64 encoded cert content
```

**Ak používaš inline certs:**
```bash
# Na runneri vytvor pre každý workflow run
echo "${{ secrets.STAGING_DOCKER_CA }}" > /tmp/ca.pem
echo "${{ secrets.STAGING_DOCKER_CERT }}" > /tmp/cert.pem
echo "${{ secrets.STAGING_DOCKER_KEY }}" > /tmp/key.pem
export DOCKER_CERT_PATH=/tmp
```

---

## 4) Firewall na Staging Serveri

```bash
# Povoľ iba IP runnera
sudo ufw allow from RUNNER_IP to any port 2376 proto tcp

# Port 2010 pre Cloudflare (proxy ranges)
sudo ufw allow 2010/tcp
```

---

## 5) Deploy Flow

```
1. Push do develop
   ↓
2. Runner builduje images
   ↓
3. Runner pushuje do Docker Hub
   ↓
4. Runner sa pripojí na staging Docker API (HTTPS/TLS)
   ↓
5. Staging server pullne images z Docker Hub
   ↓
6. Staging server spustí containery
   ↓
7. Prístup cez https://zb.tomag.xyz (Cloudflare → port 2010)
```

---

## Troubleshooting

### Test Docker API connectivity

```bash
# Na runneri
export DOCKER_HOST=tcp://STAGING_IP:2376
export DOCKER_CERT_PATH=~/docker-certs
export DOCKER_TLS_VERIFY=1

docker ps  # Malo by zobraziť containery na staging serveri
```

### Test deploy manuálne

```bash
docker -H tcp://STAGING_IP:2376 \
  --tlscacert=~/docker-certs/ca.pem \
  --tlscert=~/docker-certs/cert.pem \
  --tlskey=~/docker-certs/key.pem \
  compose -f docker-compose.staging.yml pull

docker -H tcp://STAGING_IP:2376 \
  --tlscacert=~/docker-certs/ca.pem \
  --tlscert=~/docker-certs/cert.pem \
  --tlskey=~/docker-certs/key.pem \
  compose -f docker-compose.staging.yml up -d
```

---

## Bezpečnosť

✅ Docker API len cez TLS  
✅ Firewall povoľuje len runner IP  
✅ .env.staging len na serveri (nie v gite)  
✅ GitHub secrets pre certifikáty  
✅ Žiadne SSH connections  
✅ Komunikácia len cez HTTPS/TLS
