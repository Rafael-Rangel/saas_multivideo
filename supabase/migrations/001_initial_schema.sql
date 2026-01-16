-- Perfis dos usuários (estende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  subscription_plan TEXT DEFAULT 'starter', -- starter, pro, enterprise
  subscription_status TEXT DEFAULT 'inactive', -- active, canceled, expired
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credenciais N8N (criptografadas)
CREATE TABLE IF NOT EXISTS n8n_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- Nome amigável (ex: "Meu N8N Principal")
  n8n_url TEXT NOT NULL,
  n8n_api_key_encrypted TEXT NOT NULL, -- Criptografado
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações VPS
CREATE TABLE IF NOT EXISTS vps_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT, -- Ou chave privada
  ssh_key_encrypted TEXT,
  port INTEGER DEFAULT 22,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates disponíveis
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Podcast", "Fitness", etc.
  slug TEXT UNIQUE NOT NULL, -- "podcast", "fitness"
  description TEXT,
  category TEXT, -- "podcast", "fitness", "financeiro", "casino"
  json_template JSONB NOT NULL, -- Template do workflow
  required_variables JSONB, -- Array de variáveis necessárias
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users, -- NULL = sistema
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows criados
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES workflow_templates,
  n8n_credential_id UUID REFERENCES n8n_credentials,
  name TEXT NOT NULL,
  n8n_workflow_id TEXT, -- ID retornado pelo N8N
  n8n_workflow_url TEXT, -- URL para abrir no N8N
  variables JSONB, -- Variáveis usadas na criação
  status TEXT DEFAULT 'created', -- created, active, error
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deploys realizados
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  vps_config_id UUID REFERENCES vps_configs,
  workflow_id UUID REFERENCES workflows,
  status TEXT DEFAULT 'pending', -- pending, running, success, error
  logs TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Assinaturas (integração Stripe/Mercado Pago)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL, -- active, canceled, past_due
  payment_provider TEXT, -- stripe, mercadopago
  external_subscription_id TEXT, -- ID no provedor de pagamento
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vps_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuário só acessa seus próprios registros
-- Drop se existir antes de criar (para ser idempotente - pode rodar múltiplas vezes)

-- Profiles
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
CREATE POLICY "Users can view own profiles" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
CREATE POLICY "Users can update own profiles" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;
CREATE POLICY "Users can insert own profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- N8N Credentials
DROP POLICY IF EXISTS "Users can manage own n8n credentials" ON n8n_credentials;
CREATE POLICY "Users can manage own n8n credentials" ON n8n_credentials
  FOR ALL USING (auth.uid() = user_id);

-- VPS Configs
DROP POLICY IF EXISTS "Users can manage own vps configs" ON vps_configs;
CREATE POLICY "Users can manage own vps configs" ON vps_configs
  FOR ALL USING (auth.uid() = user_id);

-- Workflows
DROP POLICY IF EXISTS "Users can manage own workflows" ON workflows;
CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (auth.uid() = user_id);

-- Deployments
DROP POLICY IF EXISTS "Users can manage own deployments" ON deployments;
CREATE POLICY "Users can manage own deployments" ON deployments
  FOR ALL USING (auth.uid() = user_id);

-- Subscriptions
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Templates públicos (todos podem ver)
DROP POLICY IF EXISTS "Templates are public" ON workflow_templates;
CREATE POLICY "Templates are public" ON workflow_templates
  FOR SELECT USING (is_active = true);

-- Função para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil ao registrar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_n8n_credentials_user_id ON n8n_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_vps_configs_user_id ON vps_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_template_id ON workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_slug ON workflow_templates(slug);

