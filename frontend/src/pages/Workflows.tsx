import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { ExternalLink, Trash2 } from 'lucide-react'

interface Workflow {
  id: string
  name: string
  n8n_workflow_url: string
  status: string
  created_at: string
  template: {
    name: string
  }
}

export function Workflows() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadWorkflows() {
      const { data, error } = await supabase
        .from('workflows')
        .select(
          `
          id,
          name,
          n8n_workflow_url,
          status,
          created_at,
          workflow_templates (
            name
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading workflows:', error)
      } else {
        setWorkflows(
          (data || []).map((w: any) => ({
            ...w,
            template: w.workflow_templates,
          }))
        )
      }
      setLoading(false)
    }

    loadWorkflows()
  }, [user])

  const handleOpenWorkflow = (url: string) => {
    window.open(url, '_blank')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este workflow?')) return

    const { error } = await supabase.from('workflows').delete().eq('id', id)

    if (error) {
      console.error('Error deleting workflow:', error)
      alert('Erro ao excluir workflow')
    } else {
      setWorkflows(workflows.filter((w) => w.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando workflows...</div>
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
                  Meus Workflows
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Workflows Criados
              </h2>
              <button
                onClick={() => navigate('/templates')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Criar Novo Workflow
              </button>
            </div>

            {workflows.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600 mb-4">
                  Você ainda não criou nenhum workflow.
                </p>
                <button
                  onClick={() => navigate('/templates')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Criar Primeiro Workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {workflow.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Template: {workflow.template?.name || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          workflow.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : workflow.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {workflow.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                      Criado em:{' '}
                      {new Date(workflow.created_at).toLocaleDateString('pt-BR')}
                    </p>

                    <div className="flex space-x-2">
                      {workflow.n8n_workflow_url && (
                        <button
                          onClick={() => handleOpenWorkflow(workflow.n8n_workflow_url)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir no N8N</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        className="px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

