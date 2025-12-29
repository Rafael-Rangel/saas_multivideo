# ⚡ Deploy Rápido - Content Orchestrator

## 🎯 Método Recomendado: GitHub

### 1. No Seu Computador (Local)

```bash
# Inicializar Git
git init
git add .
git commit -m "Initial commit"

# Criar repositório no GitHub (via web)
# Depois:
git remote add origin https://github.com/seu-usuario/content-orchestrator.git
git branch -M main
git push -u origin main
```

### 2. Na VPS

```bash
# Conectar
ssh root@seu-ip-vps

# Clonar
cd /root
git clone https://github.com/seu-usuario/content-orchestrator.git
cd content-orchestrator

# Criar .env
nano .env
# (Cole suas credenciais do Supabase)

# Adicionar ao docker-compose.yml principal
cd /root
nano docker-compose.yml
# (Adicione o serviço content-orchestrator - veja DEPLOY.md)

# Deploy
docker compose build content-orchestrator
docker compose up -d content-orchestrator

# Verificar
curl http://localhost:8002/health
```

### 3. Atualizar no Futuro

```bash
# Na VPS
cd /root/content-orchestrator
git pull
cd /root
docker compose build content-orchestrator
docker compose up -d content-orchestrator
```

---

## 🛠️ Método Manual (Sem GitHub)

### 1. Compactar Localmente

**Windows (PowerShell):**
```powershell
# Com 7-Zip instalado
7z a -tgzip content-orchestrator.tar.gz . -xr!.git -xr!__pycache__ -xr!*.pyc -xr!.env -xr!downloads -xr!logs
```

**Linux/Mac:**
```bash
tar -czf content-orchestrator.tar.gz \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.env' \
  --exclude='downloads' \
  --exclude='logs' \
  .
```

### 2. Enviar para VPS

```bash
scp content-orchestrator.tar.gz root@seu-ip-vps:/root/
```

### 3. Na VPS

```bash
# Extrair
cd /root
tar -xzf content-orchestrator.tar.gz -C content-orchestrator
cd content-orchestrator

# Criar .env
nano .env
# (Cole suas credenciais)

# Adicionar ao docker-compose.yml e fazer deploy
# (Mesmo processo do método GitHub)
```

---

## 📝 Exemplo de .env

```env
# Storage (local apenas - dados gerenciados via Google Sheets no n8n)
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=/app/downloads

# API
PROJECT_NAME=Content Orchestrator
API_V1_STR=/v1

# Traefik (se usar)
DOMAIN_NAME=postagensapp.shop
ORCHESTRATOR_SUBDOMAIN=orchestrator
SSL_EMAIL=seu-email@exemplo.com
```

**⚠️ Importante:** Não precisa mais de Supabase! Tudo é gerenciado via Google Sheets no n8n.

---

## 🔧 Script de Deploy Automatizado

Na VPS, crie `/root/content-orchestrator/deploy.sh`:

```bash
#!/bin/bash
cd /root/content-orchestrator && git pull
cd /root && docker compose build content-orchestrator && docker compose up -d content-orchestrator
```

Tornar executável:
```bash
chmod +x /root/content-orchestrator/deploy.sh
```

Usar:
```bash
/root/content-orchestrator/deploy.sh
```

---

## ✅ Verificação

```bash
# Container rodando?
docker ps | grep content-orchestrator

# Health check
curl http://localhost:8002/health

# Logs
docker logs -f content-orchestrator
```

---

**Para mais detalhes, veja `DEPLOY.md`**

