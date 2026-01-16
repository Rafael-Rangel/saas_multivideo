import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

const createWorkflowSchema = z.object({
  workflow_name: z.string().min(1, 'Nome é obrigatório'),
  n8n_credential_id: z.string().min(1, 'Credencial N8N é obrigatória'),
  variables: z.record(z.string()),
})

type CreateWorkflowForm = z.infer<typeof createWorkflowSchema>

interface Template {
  id: string
  name: string
  slug: string
  description: string
  required_variables: Array<{
    name: string
    label: string
    type: string
    required: boolean
    description: string
  }>
}

interface N8nCredential {
  id: string
  name: string
  n8n_url: string
  is_active: boolean
}

export function CreateWorkflow() {
  const { templateSlug } = useParams<{ templateSlug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [template, setTemplate] = useState<Template | null>(null)
  const [credentials, setCredentials] = useState<N8nCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateWorkflowForm>({
    resolver: zodResolver(createWorkflowSchema),
  })

  useEffect(() => {
    if (!user || !templateSlug) return

    async function loadData() {
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('slug', templateSlug)
        .eq('is_active', true)
        .single()

      if (templateError || !templateData) {
        setError('Template não encontrado')
        setLoading(false)
        return
      }

      setTemplate(templateData)

      // Set default values for variables
      if (templateData.required_variables) {
        const defaultVars: Record<string, string> = {}
        templateData.required_variables.forEach((varDef) => {
          if (varDef.required) {
            defaultVars[varDef.name] = ''
          }
        })
        setValue('variables', defaultVars)
      }

      // Load N8N credentials
      const { data: credData, error: credError } = await supabase
        .from('n8n_credentials')
        .select('id, name, n8n_url, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (credError) {
        console.error('Error loading credentials:', credError)
      } else {
        setCredentials(credData || [])
        if (credData && credData.length > 0) {
          setValue('n8n_credential_id', credData[0].id)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [user, templateSlug, setValue])

  const onSubmit = async (data: CreateWorkflowForm) => {
    if (!template) return

    setCreating(true)
    setError(null)

    try {
      // Call Edge Function to create workflow
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            template_id: template.id,
            n8n_credential_id: data.n8n_credential_id,
            variables: data.variables,
            workflow_name: data.workflow_name,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar workflow')
      }

      // Navigate to workflows page or open workflow in new tab
      if (result.workflow?.n8n_workflow_url) {
        window.open(result.workflow.n8n_workflow_url, '_blank')
      }
      navigate('/workflows')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar workflow')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Template não encontrado</div>
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
                  onClick={() => navigate('/templates')}
                  className="text-gray-600 hover:text-gray-900 mr-4"
                >
                  ← Voltar
                </button>
                <h1 className="text-xl font-bold text-gray-900">
                  Criar Workflow: {template.name}
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informações do Workflow
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Workflow
                  </label>
                  <input
                    {...register('workflow_name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={`${template.name} - ${new Date().toLocaleDateString()}`}
                  />
                  {errors.workflow_name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.workflow_name.message}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credencial N8N
                  </label>
                  {credentials.length === 0 ? (
                    <div className="text-sm text-red-600 mb-2">
                      Nenhuma credencial N8N configurada.{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="text-blue-600 hover:underline"
                      >
                        Configure uma credencial
                      </button>
                    </div>
                  ) : (
                    <select
                      {...register('n8n_credential_id')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {credentials.map((cred) => (
                        <option key={cred.id} value={cred.id}>
                          {cred.name} ({cred.n8n_url})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.n8n_credential_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.n8n_credential_id.message}
                    </p>
                  )}
                </div>
              </div>

              {template.required_variables &&
                template.required_variables.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Variáveis do Template
                    </h2>

                    <div className="space-y-4">
                      {template.required_variables.map((varDef) => (
                        <div key={varDef.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {varDef.label}
                            {varDef.required && (
                              <span className="text-red-600 ml-1">*</span>
                            )}
                          </label>
                          <input
                            {...register(`variables.${varDef.name}` as const)}
                            type={varDef.type === 'password' ? 'password' : 'text'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={varDef.description}
                          />
                          {errors.variables?.[varDef.name] && (
                            <p className="mt-1 text-sm text-red-600">
                              {String(errors.variables[varDef.name]?.message)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/templates')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || credentials.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Criando...' : 'Criar Workflow'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

