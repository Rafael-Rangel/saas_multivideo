# Testes End-to-End - N8N Platform Deploy

## 📋 Estrutura de Testes

```
tests/
├── e2e/
│   └── deploy.test.ts    # Testes de deploy VPS
└── README.md              # Este arquivo
```

## 🧪 Tipos de Testes

### 1. Testes Unitários (Não requer VPS)
- ✅ Geração de templates (docker-compose.yml, .env)
- ✅ Validação de variáveis
- ✅ Validação de formatos (domínio, email)
- ✅ Estrutura de arquivos

### 2. Testes de Integração (Requer VPS)
- ⚠️ Conexão SSH
- ⚠️ Cópia de arquivos via SFTP
- ⚠️ Execução de docker-compose
- ⚠️ Verificação de serviços

## 🚀 Como Rodar

### Testes Unitários (Rápido)

```bash
deno test tests/e2e/deploy.test.ts --allow-read
```

### Testes de Integração (Requer VPS)

**1. Configurar variáveis de ambiente:**

```bash
export TEST_VPS_HOST=93.127.211.69
export TEST_VPS_USER=root
export TEST_VPS_PASSWORD=sua_senha
# OU usar chave SSH
export TEST_VPS_SSH_KEY="$(cat ~/.ssh/id_rsa)"
```

**2. Rodar testes:**

```bash
deno test --allow-run --allow-read --allow-write --allow-env tests/e2e/deploy.test.ts
```

### Teste Específico

```bash
deno test tests/e2e/deploy.test.ts --filter "SSH Connection"
```

## 📊 Cobertura de Testes

| Teste | Status | Requer VPS |
|-------|--------|------------|
| Geração docker-compose.yml | ✅ | Não |
| Geração .env | ✅ | Não |
| Validação de variáveis | ✅ | Não |
| Validação de domínio | ✅ | Não |
| Validação de email | ✅ | Não |
| Estrutura de arquivos | ✅ | Não |
| Conexão SSH | ⚠️ | Sim |
| Cópia SFTP | ⚠️ | Sim |
| Docker-compose | ⚠️ | Sim |

## ⚠️ Notas

- Testes de integração **requerem uma VPS real** configurada
- Use uma VPS de **desenvolvimento/teste** (não produção)
- Testes SSH podem falhar se:
  - VPS não está acessível
  - Credenciais incorretas
  - Firewall bloqueando porta 22
  - SSH não configurado

## 🔧 Configuração de VPS para Testes

```bash
# Na VPS de teste:
# 1. Garantir que SSH está funcionando
systemctl status ssh

# 2. Permitir conexões sem confirmação (apenas para testes)
# Adicionar no ~/.ssh/config:
#   StrictHostKeyChecking no
#   UserKnownHostsFile /dev/null

# 3. Garantir que docker-compose está instalado
docker-compose --version

# 4. Criar diretório de teste
mkdir -p /opt/n8n-platform-test
```

## 📈 Próximos Testes

- [ ] Teste completo end-to-end (todos os passos)
- [ ] Teste de rollback em caso de erro
- [ ] Teste de verificação de serviços após deploy
- [ ] Teste de logs e monitoramento
- [ ] Teste de múltiplos deploys simultâneos

