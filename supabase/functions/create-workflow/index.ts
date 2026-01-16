import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../utils/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Obter usuário autenticado
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { template_id, n8n_credential_id, variables, workflow_name } = await req.json()

    if (!template_id || !n8n_credential_id || !variables) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template_id, n8n_credential_id, variables' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar credenciais N8N do usuário
    const { data: credential, error: credError } = await supabaseClient
      .from('n8n_credentials')
      .select('*')
      .eq('id', n8n_credential_id)
      .eq('user_id', user.id)
      .single()

    if (credError || !credential) {
      return new Response(
        JSON.stringify({ error: 'N8N credential not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar template
    const { data: template, error: templateError } = await supabaseClient
      .from('workflow_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Descriptografar API Key
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente')
    }

    let n8nApiKey = credential.api_key || credential.n8n_api_key_encrypted
    
    // Tentar descriptografar (se estiver criptografado)
    try {
      n8nApiKey = await decrypt(n8nApiKey, ENCRYPTION_KEY)
    } catch (e) {
      // Se falhar, pode ser que não esteja criptografado ainda (compatibilidade com dados antigos)
      console.warn('Failed to decrypt API key, using as plain text:', e.message)
      // Manter n8nApiKey como está
    }

    // Preparar workflow JSON substituindo variáveis
    let workflowJson = JSON.parse(JSON.stringify(template.json_template))

    // Substituir placeholders {{VARIAVEL}} pelos valores fornecidos
    const jsonString = JSON.stringify(workflowJson)
    let processedJson = jsonString

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      processedJson = processedJson.replace(regex, String(value))
    }

    // Substituir timestamp e outros valores dinâmicos
    processedJson = processedJson.replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())
    processedJson = processedJson.replace(/\{\{VERSION_ID\}\}/g, `v${Date.now()}`)

    workflowJson = JSON.parse(processedJson)

    // Chamar API do N8N para criar workflow
    const n8nUrl = credential.n8n_url.replace(/\/$/, '') // Remove trailing slash
    const createWorkflowUrl = `${n8nUrl}/api/v1/workflows`

    const createResponse = await fetch(createWorkflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify({
        name: workflow_name || `${template.name} - ${new Date().toLocaleDateString()}`,
        nodes: workflowJson.nodes,
        connections: workflowJson.connections,
        settings: workflowJson.settings,
        staticData: workflowJson.staticData,
        tags: workflowJson.tags || [],
        active: false, // Criar inativo por padrão
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      return new Response(
        JSON.stringify({ error: `N8N API error: ${errorText}` }),
        { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const createdWorkflow = await createResponse.json()

    // Construir URL do workflow no N8N
    const workflowUrl = `${n8nUrl}/workflow/${createdWorkflow.id}`

    // Salvar workflow criado no banco
    const { data: savedWorkflow, error: saveError } = await supabaseClient
      .from('workflows')
      .insert({
        user_id: user.id,
        template_id: template_id,
        n8n_credential_id: n8n_credential_id,
        name: workflow_name || createdWorkflow.name,
        n8n_workflow_id: String(createdWorkflow.id),
        n8n_workflow_url: workflowUrl,
        variables: variables,
        status: 'created',
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving workflow:', saveError)
      // Workflow foi criado no N8N mas não salvou no banco - retornar sucesso parcial
    }

    return new Response(
      JSON.stringify({
        success: true,
        workflow: savedWorkflow || {
          n8n_workflow_id: String(createdWorkflow.id),
          n8n_workflow_url: workflowUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

