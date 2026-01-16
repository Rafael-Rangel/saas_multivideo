import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

const credentialSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  n8n_url: z.string().url('URL inválida'),
  n8n_api_key: z.string().min(1, 'API Key é obrigatória'),
})

type CredentialForm = z.infer<typeof credentialSchema>

interface Credential {
  id: string
  name: string
  n8n_url: string
  is_active: boolean
}

export function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CredentialForm>({
    resolver: zodResolver(credentialSchema),
  })

  useEffect(() => {
    if (!user) return

    async function loadCredentials() {
      const { data, error } = await supabase
        .from('n8n_credentials')
        .select('id, name, n8n_url, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading credentials:', error)
      } else {
        setCredentials(data || [])
      }
      setLoading(false)
    }

    loadCredentials()
  }, [user])

  // Validate N8N credentials directly from frontend
  const validateN8nCredentials = async (n8nUrl: string, apiKey: string) => {
    try {
      // Try to access N8N health endpoint or workflows endpoint
      const response = await fetch(`${n8nUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      })

      // If we get a response (even if error), the credentials are likely valid
      // A 401/403 means invalid credentials, but connection works
      // A network error means the URL might be wrong
      if (!response.ok && response.status === 401) {
        throw new Error('API Key inválida')
      }
      
      if (!response.ok && response.status === 403) {
        throw new Error('Sem permissão para acessar esta instância N8N')
      }

      // If we get here, credentials seem valid
      return true
    } catch (err: any) {
      // Network errors or CORS issues
      if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        throw new Error('Não foi possível conectar ao N8N. Verifique a URL e se o CORS está configurado.')
      }
      throw err
    }
  }

  const onSubmit = async (data: CredentialForm) => {
    if (!user) return

    setValidating(true)

    try {
      // Validate N8N credentials first (directly from frontend)
      try {
        await validateN8nCredentials(data.n8n_url, data.n8n_api_key)
      } catch (validationError: any) {
        // For MVP, we can allow saving without validation
        // or show a warning and let user proceed
        const proceed = confirm(
          `A validação falhou: ${validationError.message}\n\n` +
          'Deseja salvar mesmo assim? Você poderá testar depois.'
        )
        
        if (!proceed) {
          setValidating(false)
          return
        }
      }

      // Save credentials
      // Note: For production, this should be encrypted server-side via Edge Function
      const { error: insertError } = await supabase
        .from('n8n_credentials')
        .insert({
          user_id: user.id,
          name: data.name,
          n8n_url: data.n8n_url,
          n8n_api_key_encrypted: data.n8n_api_key, // TODO: Encrypt via Edge Function in production
        })

      if (insertError) {
        throw new Error(insertError.message || 'Erro ao salvar credenciais')
      }

      // Reload credentials
      const { data: newData } = await supabase
        .from('n8n_credentials')
        .select('id, name, n8n_url, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false})

      setCredentials(newData || [])
      setShowForm(false)
      reset()
      
      alert('Credenciais salvas com sucesso!')
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar credenciais')
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-600 hover:text-gray-900 mr-4"
                >
                  ← Voltar
                </button>
                <h1 className="text-xl font-bold text-gray-900">
                  Configurações
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Credenciais N8N
                </h2>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Adicionar Credencial
                  </button>
                )}
              </div>

              {showForm && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome
                    </label>
                    <input
                      {...register('name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Meu N8N Principal"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL do N8N
                    </label>
                    <input
                      {...register('n8n_url')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://n8n.exemplo.com"
                    />
                    {errors.n8n_url && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.n8n_url.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      {...register('n8n_api_key')}
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Sua API Key do N8N"
                    />
                    {errors.n8n_api_key && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.n8n_api_key.message}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={validating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {validating ? 'Validando...' : 'Salvar e Validar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        reset()
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {credentials.length === 0 ? (
                <p className="text-gray-600">
                  Nenhuma credencial N8N configurada.
                </p>
              ) : (
                <div className="space-y-3">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex justify-between items-center p-4 border border-gray-200 rounded-md"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{cred.name}</h3>
                        <p className="text-sm text-gray-600">{cred.n8n_url}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cred.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {cred.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

