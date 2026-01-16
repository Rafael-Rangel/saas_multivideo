# 🚀 N8N Platform - Plataforma de Deploy Automatizado

Plataforma SaaS para gerenciar workflows N8N, criar workflows a partir de templates e fazer deploy automático via SSH em VPS.

## 📁 Estrutura do Projeto

```
n8n-platform/
├── frontend/              # React.js + Vite + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── pages/        # Páginas (Login, Dashboard, Setup Wizard, etc.)
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Hooks customizados (useAuth)
│   │   └── lib/          # Configurações (Supabase client)
│   └── .env.local        # Variáveis de ambiente (criar com credenciais Supabase)
│
├── supabase/             # Backend (Supabase)
│   ├── migrations/       # SQL migrations (5 arquivos)
│   ├── functions/        # Edge Functions (Deno)
│   │   ├── create-workflow/  # Cria workflows no N8N
│   │   ├── deploy-vps/       # Deploy automático via SSH
│   │   ├── validate-n8n/     # Valida credenciais N8N
│   │   └── utils/            # Utilitários compartilhados (crypto)
│   └── config.toml       # Configuração Supabase
│
├── deploy/               # Templates e código para deploy
│   ├── templates/        # Templates Docker Compose e .env
│   └── content-orchestrator/  # Código Python (FastAPI)
│
├── tests/                # Testes end-to-end (Deno Test)
│   └── e2e/              # Testes de deploy
│
└── scripts/              # Scripts utilitários
    ├── seed-podcast-template.js  # Gera SQL para template Podcast
    └── insert-podcast-template.js # Insere template no banco
```

## 🚀 Início Rápido

### 1. Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase (https://supabase.com)
- Supabase CLI (`npm install -g supabase`)

### 2. Configurar Variáveis de Ambiente

**Frontend** (`frontend/.env.local`):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

**Supabase Dashboard** → Settings → Edge Functions → Secrets:
- `ENCRYPTION_KEY`: Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Instalar Dependências

```bash
# Raiz do projeto
npm install

# Frontend
cd frontend
npm install
```

### 4. Conectar ao Supabase e Rodar Migrations

```bash
# Conectar ao projeto Supabase Cloud
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF

# Rodar migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy
```

### 5. Rodar Frontend

```bash
cd frontend
npm run dev
```

Acesse: http://localhost:5173

## 🎯 Funcionalidades

### ✅ Implementado

- **Autenticação** - Login/Registro com Supabase Auth
- **Dashboard** - Interface principal do usuário
- **Setup Wizard** - Configuração guiada passo a passo:
  - Credenciais N8N
  - Configuração VPS (SSH, domínio, SSL)
  - Google Cloud Setup
  - Facebook Developer Setup
  - Seleção de Template
  - Variáveis do Workflow
  - Criação automática de workflow no N8N
- **Templates** - Visualização e criação de workflows
- **Deploy Automático** - Deploy de serviços (Postiz, Content Orchestrator) via SSH
- **Criptografia** - Credenciais criptografadas (AES-GCM)

### 📋 Funcionalidades por Tela

- **Login/Registro** - Autenticação Supabase
- **Dashboard** - Visão geral e navegação
- **Setup Wizard** - Fluxo completo de configuração
- **Templates** - Lista de templates disponíveis
- **Create Workflow** - Criação de workflow a partir de template
- **Workflows** - Lista de workflows criados
- **Settings** - Gerenciar credenciais N8N e VPS

## 🗄️ Database Schema

### Tabelas Principais

- `profiles` - Perfis de usuários
- `n8n_credentials` - Credenciais N8N (criptografadas)
- `vps_configs` - Configurações VPS (SSH, domínio, SSL)
- `workflow_templates` - Templates de workflows (Podcast, Fitness, etc.)
- `workflows` - Workflows criados pelos usuários
- `deployments` - Histórico de deploys
- `setup_progress` - Progresso do wizard por usuário
- `setup_variables` - Variáveis coletadas durante setup

## 🔐 Segurança

- **Row Level Security (RLS)** - Políticas de acesso configuradas
- **Criptografia** - Credenciais sensíveis criptografadas (AES-GCM)
- **Autenticação** - JWT via Supabase Auth

## 🧪 Testes

```bash
# Testes unitários
deno test tests/e2e/deploy.test.ts --allow-read

# Testes de integração (requer VPS)
export TEST_VPS_HOST=your.vps.ip
deno test tests/e2e/deploy.test.ts --allow-run --allow-read
```

## 📦 Deploy

### Frontend

**Vercel (Recomendado):**
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Deploy automático

**Netlify:**
- Similar ao Vercel

### Backend (Supabase)

- Edge Functions deployadas via CLI: `npx supabase functions deploy`
- Database gerenciado pelo Supabase

## 📚 Tecnologias

- **Frontend:** React 19, TypeScript, TailwindCSS, Vite
- **Backend:** Supabase (PostgreSQL, Edge Functions Deno)
- **Autenticação:** Supabase Auth (JWT)
- **Deploy:** SSH/SFTP via Edge Functions
- **Containerização:** Docker, Docker Compose

## 🔗 Links Úteis

- [Supabase Docs](https://supabase.com/docs)
- [N8N Docs](https://docs.n8n.io)
- [React Docs](https://react.dev)

## 📝 Licença

Proprietário - Todos os direitos reservados
