-- Tabela para armazenar progresso de configuração do usuário
CREATE TABLE IF NOT EXISTS setup_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  step_name TEXT NOT NULL, -- 'n8n_credentials', 'google_cloud', 'facebook_developer', etc.
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  credentials_data JSONB, -- Dados coletados (senhas criptografadas)
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

-- Tabela para armazenar variáveis coletadas durante setup
CREATE TABLE IF NOT EXISTS setup_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE,
  variable_name TEXT NOT NULL, -- 'GOOGLE_SHEETS_ID', 'POSTIZ_API_URL', etc.
  variable_value TEXT NOT NULL, -- Valor (pode ser criptografado)
  storage_location TEXT NOT NULL, -- 'n8n', 'vps_env', 'database'
  is_encrypted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_setup_progress_user_id ON setup_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_variables_user_id ON setup_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_variables_workflow_id ON setup_variables(workflow_id);

-- RLS
ALTER TABLE setup_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own setup progress" ON setup_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own setup variables" ON setup_variables
  FOR ALL USING (auth.uid() = user_id);

