// Script para inserir template Podcast completo no Supabase
// Execute: node scripts/insert-podcast-template.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configurações do Supabase
const SUPABASE_URL = 'https://lnywfsmjlumlwttilmpa.supabase.co'
const SUPABASE_SERVICE_KEY = 'sb_secret_6_Adg' // Use a service key para inserir como admin

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('your')) {
  console.error('❌ Configure SUPABASE_SERVICE_KEY no script')
  console.error('Use a service_role key do Supabase (não a anon key)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function insertPodcastTemplate() {
  try {
    console.log('📖 Lendo arquivo fluxon8n_PodCast.json...')
    
    const jsonPath = path.join(__dirname, '../fluxon8n_PodCast.json')
    const jsonContent = fs.readFileSync(jsonPath, 'utf8')
    const podcastJson = JSON.parse(jsonContent)

    console.log('✅ JSON lido com sucesso')
    console.log(`   - Nodes: ${podcastJson.nodes?.length || 0}`)
    console.log(`   - Connections: ${Object.keys(podcastJson.connections || {}).length}`)

    console.log('\n📝 Inserindo template no banco...')

    const { data, error } = await supabase
      .from('workflow_templates')
      .upsert({
        slug: 'podcast',
        name: 'Podcast',
        description: 'Workflow automatizado para processar e publicar cortes de podcast em múltiplas plataformas (Instagram, TikTok). Inclui download de vídeos, edição com FFMPEG, geração de captions com IA, e publicação automática.',
        category: 'podcast',
        json_template: podcastJson,
        required_variables: [
          {
            name: 'GOOGLE_SHEETS_ID',
            label: 'ID da Planilha Google Sheets',
            type: 'string',
            required: true,
            description: 'ID da planilha que contém as fontes e vídeos encontrados (ex: 19yAsXfAGtYJjsd7t_iyRvwSVFqXK8N4xdiX-MuUPLOY)'
          },
          {
            name: 'POSTIZ_API_URL',
            label: 'URL da API Postiz',
            type: 'string',
            required: true,
            description: 'URL base da API do Postiz (ex: https://postiz.postagensapp.shop/api/public/v1)'
          },
          {
            name: 'GROUP_NAME',
            label: 'Nome do Grupo',
            type: 'string',
            required: true,
            description: 'Nome do grupo de conteúdo (ex: PodCasts)'
          },
          {
            name: 'CONTENT_ORCHESTRATOR_URL',
            label: 'URL do Content Orchestrator',
            type: 'string',
            required: false,
            description: 'URL do serviço content-orchestrator (ex: http://content-orchestrator:8000)'
          }
        ],
        is_active: true,
        created_by: null
      }, {
        onConflict: 'slug'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao inserir template:', error)
      console.error('   Detalhes:', JSON.stringify(error, null, 2))
      process.exit(1)
    }

    console.log('✅ Template Podcast inserido com sucesso!')
    console.log(`   - ID: ${data.id}`)
    console.log(`   - Slug: ${data.slug}`)
    console.log(`   - Nome: ${data.name}`)
    console.log('\n🎉 Pronto! O template está disponível na aplicação.')

  } catch (err) {
    console.error('❌ Erro:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

insertPodcastTemplate()

