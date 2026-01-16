// Script para inserir template Podcast no banco
// Execute: node scripts/seed-podcast-template.js

const fs = require('fs');
const path = require('path');

const podcastJsonPath = path.join(__dirname, '../fluxon8n_PodCast.json');
const podcastJson = JSON.parse(fs.readFileSync(podcastJsonPath, 'utf8'));

// SQL para inserir template
const sql = `
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
  '${JSON.stringify(podcastJson).replace(/'/g, "''")}'::jsonb,
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
  json_template = EXCLUDED.json_template,
  required_variables = EXCLUDED.required_variables,
  description = EXCLUDED.description,
  updated_at = NOW();
`;

console.log('SQL para inserir template Podcast:');
console.log(sql);
console.log('\nExecute este SQL no Supabase SQL Editor');

// Salvar em arquivo
fs.writeFileSync(
  path.join(__dirname, '../supabase/migrations/003_seed_podcast_template.sql'),
  sql
);

console.log('\n✅ SQL salvo em supabase/migrations/003_seed_podcast_template.sql');

