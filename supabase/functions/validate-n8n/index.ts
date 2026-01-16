import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { n8n_url, n8n_api_key } = await req.json()

    if (!n8n_url || !n8n_api_key) {
      return new Response(
        JSON.stringify({ error: 'Missing n8n_url or n8n_api_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Testar conexão com N8N fazendo uma chamada simples à API
    const n8nUrl = n8n_url.replace(/\/$/, '')
    const testUrl = `${n8nUrl}/api/v1/workflows`

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': n8n_api_key,
      },
    })

    if (response.ok) {
      return new Response(
        JSON.stringify({ valid: true, message: 'Connection successful' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: `Connection failed: ${response.status} ${errorText}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: `Error: ${error.message}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

