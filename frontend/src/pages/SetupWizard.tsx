import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { GoogleCloudStep } from '../components/setup-wizard/GoogleCloudStep'
import { FacebookDeveloperStep } from '../components/setup-wizard/FacebookDeveloperStep'
import { VpsConfigStep } from '../components/setup-wizard/VpsConfigStep'

interface SetupStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  isAutomatic: boolean
  storageLocation?: 'n8n' | 'vps_env' | 'database'
  variables?: string[]
}

export function SetupWizard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [steps, setSteps] = useState<SetupStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [credentials, setCredentials] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSetupProgress()
      initializeSteps()
    }
  }, [user])

  const initializeSteps = () => {
    // ORDEM CORRETA BASEADA EM DEPENDÊNCIAS:
    // 1. N8N primeiro (base para tudo)
    // 2. VPS Config e Deploy ANTES de variáveis (Precisa Postiz/Orchestrator rodando)
    // 3. Google/Facebook podem ser paralelos (não bloqueiam)
    // 4. Template Selection
    // 5. Variáveis do Workflow (agora pode preencher URLs dos serviços já rodando)
    // 6. Criar Workflow
    // 7. Teste Final
    const initialSteps: SetupStep[] = [
      {
        id: 'n8n_credentials',
        name: 'Credenciais N8N',
        description: 'Configure a URL e API Key do seu N8N (obrigatório para criar workflows)',
        status: 'pending',
        isAutomatic: false,
        storageLocation: 'database',
      },
      {
        id: 'vps_config',
        name: 'Configuração e Deploy VPS',
        description: 'Configure acesso SSH e faça deploy dos serviços (Postiz, Content Orchestrator) na VPS',
        status: 'pending',
        isAutomatic: false,
        storageLocation: 'vps_env',
      },
      {
        id: 'google_cloud',
        name: 'Google Cloud Setup',
        description: 'Configure Google Cloud: APIs, credenciais OAuth (pode fazer em paralelo)',
        status: 'pending',
        isAutomatic: false,
        storageLocation: 'n8n',
        variables: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      },
      {
        id: 'facebook_developer',
        name: 'Facebook Developer Setup',
        description: 'Configure Meta Developer: App ID, App Secret, Access Token (pode fazer em paralelo)',
        status: 'pending',
        isAutomatic: false,
        storageLocation: 'n8n',
        variables: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_ACCESS_TOKEN'],
      },
      {
        id: 'template_selection',
        name: 'Escolher Template',
        description: 'Selecione o template de workflow (Podcast, Fitness, etc.)',
        status: 'pending',
        isAutomatic: true,
      },
      {
        id: 'workflow_variables',
        name: 'Variáveis do Workflow',
        description: 'Configure variáveis: GOOGLE_SHEETS_ID, POSTIZ_API_URL (do deploy), GROUP_NAME, etc.',
        status: 'pending',
        isAutomatic: false,
        storageLocation: 'n8n',
        variables: ['GOOGLE_SHEETS_ID', 'POSTIZ_API_URL', 'GROUP_NAME', 'CONTENT_ORCHESTRATOR_URL'],
      },
      {
        id: 'create_workflow',
        name: 'Criar Workflow no N8N',
        description: 'Cria o workflow completo no N8N com todas as configurações',
        status: 'pending',
        isAutomatic: true,
      },
      {
        id: 'final_test',
        name: 'Teste Final',
        description: 'Teste o workflow criado e verifique se tudo está funcionando',
        status: 'pending',
        isAutomatic: false,
      },
    ]
    setSteps(initialSteps)
    setLoading(false)
  }

  const loadSetupProgress = async () => {
    if (!user) return

    const { data } = await supabase
      .from('setup_progress')
      .select('*')
      .eq('user_id', user.id)

    if (data) {
      const progressMap = new Map(data.map((p) => [p.step_name, p.status]))
      setSteps((prev) =>
        prev.map((step) => ({
          ...step,
          status: (progressMap.get(step.id) as any) || step.status,
        }))
      )
    }
  }

  const updateStepStatus = async (stepId: string, status: SetupStep['status'], data?: any) => {
    if (!user) return

    await supabase
      .from('setup_progress')
      .upsert({
        user_id: user.id,
        step_name: stepId,
        status,
        credentials_data: data || null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })

    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status } : step))
    )
  }

  const saveVariable = async (
    variableName: string,
    value: string,
    storageLocation: 'n8n' | 'vps_env' | 'database',
    workflowId?: string
  ) => {
    if (!user) return

    await supabase.from('setup_variables').upsert({
      user_id: user.id,
      workflow_id: workflowId || null,
      variable_name: variableName,
      variable_value: value, // TODO: Criptografar se necessário
      storage_location: storageLocation,
    })
  }

  const renderStepContent = (step: SetupStep) => {
    switch (step.id) {
      case 'n8n_credentials':
        return <N8nCredentialsStep step={step} onComplete={handleStepComplete} />
      case 'vps_config':
        return (
          <VpsConfigStep
            step={step}
            onComplete={handleStepComplete}
            onSaveVariable={saveVariable}
          />
        )
      case 'google_cloud':
        return (
          <GoogleCloudStep
            onComplete={handleStepComplete}
            onSaveVariable={saveVariable}
          />
        )
      case 'facebook_developer':
        return (
          <FacebookDeveloperStep
            onComplete={handleStepComplete}
            onSaveVariable={saveVariable}
          />
        )
      case 'template_selection':
        return <TemplateSelectionStep step={step} onComplete={handleStepComplete} />
      case 'workflow_variables':
        return (
          <WorkflowVariablesStep
            step={step}
            onComplete={handleStepComplete}
            onSaveVariable={saveVariable}
          />
        )
      case 'create_workflow':
        return <CreateWorkflowStep step={step} onComplete={handleStepComplete} />
      case 'final_test':
        return <FinalTestStep step={step} onComplete={handleStepComplete} />
      default:
        return <div>Conteúdo não encontrado</div>
    }
  }

  const handleStepComplete = async (stepId: string, data?: any) => {
    await updateStepStatus(stepId, 'completed', data)
    const currentIndex = steps.findIndex((s) => s.id === stepId)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(currentIndex + 1)
    } else {
      // Setup completo!
      navigate('/dashboard')
    }
  }

  const getStepIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />
      case 'in_progress':
        return <Circle className="w-6 h-6 text-blue-600" />
      case 'skipped':
        return <Circle className="w-6 h-6 text-gray-400" />
      default:
        return <Circle className="w-6 h-6 text-gray-300" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando configuração...</div>
      </div>
    )
  }

  const current = steps[currentStep]
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const progress = (completedCount / steps.length) * 100

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
                <h1 className="text-xl font-bold text-gray-900">Configuração Guiada</h1>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-600">
                  {completedCount} de {steps.length} concluídos
                </span>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Progress Bar */}
          <div className="mb-6 px-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso</span>
                <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">
            {/* Sidebar - Steps List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold text-gray-900 mb-4">Passos</h2>
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 p-2 rounded cursor-pointer ${
                        index === currentStep ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setCurrentStep(index)}
                    >
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            index === currentStep ? 'text-blue-900' : 'text-gray-700'
                          }`}
                        >
                          {step.name}
                        </p>
                        {step.isAutomatic && (
                          <span className="text-xs text-green-600">Automático</span>
                        )}
                        {step.storageLocation && (
                          <span className="text-xs text-gray-500">
                            → {step.storageLocation === 'n8n' ? 'N8N' : step.storageLocation === 'vps_env' ? 'VPS .env' : 'Banco'}
                          </span>
                        )}
                      </div>
                      {index === currentStep && (
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{current.name}</h2>
                  <p className="text-gray-600 mt-2">{current.description}</p>
                  {current.storageLocation && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>📍 Onde será salvo:</strong>{' '}
                        {current.storageLocation === 'n8n'
                          ? 'Credenciais configuradas diretamente no N8N (node do workflow)'
                          : current.storageLocation === 'vps_env'
                          ? 'Variáveis salvas no arquivo .env da VPS'
                          : 'Variáveis salvas no banco de dados da plataforma'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6">{renderStepContent(current)}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

// Componentes para cada step
function N8nCredentialsStep({ step, onComplete }: any) {
  const [n8nUrl, setN8nUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Salvar credenciais N8N (implementar chamada à API)
    await onComplete(step.id, { n8n_url: n8nUrl, api_key: apiKey, name })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome da Instância
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Ex: Meu N8N Principal"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">URL do N8N</label>
        <input
          type="url"
          value={n8nUrl}
          onChange={(e) => setN8nUrl(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="https://n8n.exemplo.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Salvar e Continuar
      </button>
    </form>
  )
}

function TemplateSelectionStep({ step, onComplete }: any) {
  // Redirecionar para /templates ou implementar seleção inline
  return (
    <div className="text-center py-8">
      <p className="text-gray-600 mb-4">Escolha um template para começar</p>
      <button
        onClick={() => (window.location.href = '/templates')}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Ver Templates
      </button>
    </div>
  )
}

function WorkflowVariablesStep({ step, onComplete, onSaveVariable }: any) {
  // TODO: Implementar formulário para variáveis do workflow
  // Sugerir URLs dos serviços do deploy VPS anterior
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>✅ VPS Deploy Completo!</strong> Agora você pode preencher as variáveis com as URLs dos serviços que estão rodando.
        </p>
      </div>
      <div className="text-center py-4 text-gray-600">
        Formulário de Variáveis do Workflow (em desenvolvimento)
        <p className="text-sm mt-2">Será implementado para coletar: GOOGLE_SHEETS_ID, POSTIZ_API_URL, GROUP_NAME, etc.</p>
      </div>
    </div>
  )
}

// VpsConfigStep movido para componente separado

function CreateWorkflowStep({ step, onComplete }: any) {
  // TODO: Implementar criação automática do workflow
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>✅ Tudo configurado!</strong> Agora vamos criar o workflow no N8N com todas as configurações.
        </p>
      </div>
      <div className="text-center py-4 text-gray-600">
        Criação automática do workflow (em desenvolvimento)
        <p className="text-sm mt-2">Será implementado para criar o workflow automaticamente no N8N via API.</p>
      </div>
    </div>
  )
}

function FinalTestStep({ step, onComplete }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>🎉 Workflow criado!</strong> Agora teste se tudo está funcionando corretamente.
        </p>
      </div>
      <div className="text-center py-4 text-gray-600">
        Teste Final (em desenvolvimento)
        <p className="text-sm mt-2">Será implementado para abrir workflow no N8N e testar execução.</p>
      </div>
    </div>
  )
}

