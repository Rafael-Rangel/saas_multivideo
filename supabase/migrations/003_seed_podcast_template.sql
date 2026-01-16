-- Seed: Inserir template Podcast básico
-- O JSON completo será atualizado depois via aplicação ou script

INSERT INTO workflow_templates (
  name,
  slug,
  description,
  category,
  json_template,
  required_variables,
  is_active,
  created_by
) VALUES (
  'Podcast',
  'podcast',
  'Workflow automatizado para processar e publicar cortes de podcast em múltiplas plataformas (Instagram, TikTok). Inclui download de vídeos, edição com FFMPEG, geração de captions com IA, e publicação automática.',
  'podcast',
  '{
    "nodes": [],
    "connections": {},
    "settings": {
      "executionOrder": "v1",
      "saveManualExecutions": true
    },
    "tags": [],
    "pinData": {},
    "meta": {
      "templateCredsSetupCompleted": true
    }
  }'::jsonb,
  '[
    {
      "name": "GOOGLE_SHEETS_ID",
      "label": "ID da Planilha Google Sheets",
      "type": "string",
      "required": true,
      "description": "ID da planilha que contém as fontes e vídeos encontrados (ex: 19yAsXfAGtYJjsd7t_iyRvwSVFqXK8N4xdiX-MuUPLOY)"
    },
    {
      "name": "POSTIZ_API_URL",
      "label": "URL da API Postiz",
      "type": "string",
      "required": true,
      "description": "URL base da API do Postiz (ex: https://postiz.postagensapp.shop/api/public/v1)"
    },
    {
      "name": "GROUP_NAME",
      "label": "Nome do Grupo",
      "type": "string",
      "required": true,
      "description": "Nome do grupo de conteúdo (ex: PodCasts)"
    },
    {
      "name": "CONTENT_ORCHESTRATOR_URL",
      "label": "URL do Content Orchestrator",
      "type": "string",
      "required": false,
      "description": "URL do serviço content-orchestrator (ex: http://content-orchestrator:8000)"
    }
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT (slug) DO UPDATE
SET 
  description = EXCLUDED.description,
  required_variables = EXCLUDED.required_variables,
  updated_at = NOW();
