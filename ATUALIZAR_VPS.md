# 🔄 Como Atualizar na VPS

## 🎯 Método Recomendado: Substituir Tudo (Mais Seguro)

Este método remove tudo antigo e coloca a versão nova. É o mais seguro para garantir que não há conflitos.

### Passo 1: Fazer Backup (Opcional mas Recomendado)

```bash
# Conectar na VPS
ssh root@seu-ip-vps

# Fazer backup dos downloads (se tiver vídeos importantes)
cd /root
tar -czf backup-downloads-$(date +%Y%m%d).tar.gz content-orchestrator/downloads/

# Fazer backup do docker-compose.yml principal (se tiver)
cp docker-compose.yml docker-compose.yml.backup
```

### Passo 2: Parar e Remover Container Antigo

```bash
# Parar container
cd /root
docker compose stop content-orchestrator

# Remover container
docker compose rm -f content-orchestrator

# Remover imagem antiga (opcional, mas libera espaço)
docker rmi content-orchestrator_content-orchestrator || true
```

### Passo 3: Remover Código Antigo

```bash
# Remover diretório antigo
rm -rf /root/content-orchestrator
```

### Passo 4: Clonar Versão Nova

```bash
# Clonar do GitHub
cd /root
git clone https://github.com/seu-usuario/seu-repositorio.git content-orchestrator
cd content-orchestrator
```

**OU se já tinha o repositório em outro lugar:**

```bash
cd /root
git clone https://github.com/seu-usuario/seu-repositorio.git content-orchestrator-temp
rm -rf content-orchestrator
mv content-orchestrator-temp content-orchestrator
cd content-orchestrator
```

### Passo 5: Criar/Atualizar .env

```bash
# Criar .env (se não existir)
nano .env
```

**Conteúdo do .env (SIMPLIFICADO - sem Supabase):**

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

**Salvar:** `Ctrl+X`, depois `Y`, depois `Enter`

### Passo 6: Verificar docker-compose.yml Principal

```bash
# Voltar para raiz
cd /root

# Verificar se o serviço está no docker-compose.yml principal
cat docker-compose.yml | grep -A 20 content-orchestrator
```

Se não estiver, adicione (ou use o docker-compose.yml do projeto):

```yaml
  content-orchestrator:
    build: ./content-orchestrator
    container_name: content-orchestrator
    restart: always
    env_file: ./content-orchestrator/.env
    environment:
      - STORAGE_TYPE=local
      - LOCAL_STORAGE_PATH=/app/downloads
    volumes:
      - ./content-orchestrator/downloads:/app/downloads
      - ./content-orchestrator/logs:/app/logs
      - ./content-orchestrator/data:/app/data
    ports:
      - "127.0.0.1:8002:8000"
    labels:
      - traefik.enable=true
      - traefik.http.routers.content-orchestrator.rule=Host(`orchestrator.${DOMAIN_NAME}`)
      - traefik.http.routers.content-orchestrator.entrypoints=web,websecure
      - traefik.http.routers.content-orchestrator.tls=true
      - traefik.http.routers.content-orchestrator.tls.certresolver=mytlschallenge
      - traefik.http.services.content-orchestrator.loadbalancer.server.port=8000
    command: "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    networks:
      - default
```

### Passo 7: Construir e Iniciar

```bash
# Construir nova imagem
docker compose build content-orchestrator

# Iniciar
docker compose up -d content-orchestrator

# Verificar logs
docker logs -f content-orchestrator
```

### Passo 8: Verificar se Funcionou

```bash
# Verificar se container está rodando
docker ps | grep content-orchestrator

# Testar health check
curl http://localhost:8002/health

# Ou testar endpoint n8n
curl http://localhost:8002/v1/n8n/health
```

**Resposta esperada:**
```json
{"status":"ok","message":"n8n integration ready"}
```

---

## 🚀 Método Alternativo: Atualizar Sem Remover (Mais Rápido)

Se você já tem o repositório Git na VPS:

```bash
# Conectar na VPS
ssh root@seu-ip-vps

# Ir para diretório do projeto
cd /root/content-orchestrator

# Atualizar código
git pull origin main

# Voltar para raiz
cd /root

# Reconstruir e reiniciar
docker compose build content-orchestrator
docker compose up -d content-orchestrator

# Verificar
docker logs -f content-orchestrator
```

**⚠️ Atenção:** Este método pode deixar arquivos antigos. Se tiver problemas, use o método de substituir tudo.

---

## 🔧 Script Automatizado de Atualização

Crie na VPS: `/root/atualizar-orchestrator.sh`

```bash
#!/bin/bash
set -e

echo "🔄 Atualizando Content Orchestrator..."

# Parar serviço
cd /root
docker compose stop content-orchestrator || true

# Atualizar código
cd /root/content-orchestrator
git pull origin main

# Reconstruir
cd /root
docker compose build content-orchestrator

# Iniciar
docker compose up -d content-orchestrator

# Aguardar
sleep 5

# Verificar
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ Atualização concluída!"
    docker ps | grep content-orchestrator
else
    echo "❌ Erro na atualização"
    docker logs --tail 50 content-orchestrator
    exit 1
fi
```

Tornar executável:
```bash
chmod +x /root/atualizar-orchestrator.sh
```

Usar:
```bash
/root/atualizar-orchestrator.sh
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker logs content-orchestrator

# Verificar se porta está livre
netstat -tulpn | grep 8002

# Verificar .env
cat /root/content-orchestrator/.env
```

### Erro de dependências

```bash
# Reconstruir do zero
cd /root
docker compose build --no-cache content-orchestrator
docker compose up -d content-orchestrator
```

### Porta já em uso

```bash
# Ver o que está usando a porta
lsof -i :8002

# Parar o que está usando
docker stop <container-id>
```

---

## ✅ Checklist de Atualização

- [ ] Backup feito (opcional)
- [ ] Container antigo parado e removido
- [ ] Código antigo removido
- [ ] Código novo clonado/atualizado
- [ ] `.env` criado/atualizado (sem Supabase)
- [ ] `docker-compose.yml` principal verificado
- [ ] Imagem construída
- [ ] Container iniciado
- [ ] Health check funcionando
- [ ] Logs sem erros

---

## 📝 Notas Importantes

1. **Sem Banco de Dados:** A nova versão não usa banco de dados. Tudo é gerenciado via Google Sheets no n8n.

2. **Downloads Preservados:** Os vídeos em `downloads/` são preservados se você não remover o volume.

3. **Sem Migração:** Não precisa migrar dados do banco antigo, pois agora usa Google Sheets.

4. **API Simplificada:** A API agora é stateless - recebe dados, processa e retorna. Veja `GUIA_N8N_FLUXO.md` para o fluxo completo.

---

**Pronto!** Sua VPS está atualizada com a nova versão sem banco de dados! 🎉

