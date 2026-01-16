import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PlusCircle, Settings, Workflow, BookOpen, Rocket } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">N8N Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Dashboard
          </h2>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 O que você precisa saber:</h3>
            <p className="text-sm text-blue-800 mb-2">
              <strong>✅ Automático:</strong> Nossa plataforma cria o workflow no N8N com toda a estrutura.
            </p>
            <p className="text-sm text-blue-800">
              <strong>⚠️ Manual:</strong> Você precisa configurar credenciais externas (Google Cloud, Facebook Developer, etc.).
              Veja o{' '}
              <span 
                onClick={() => navigate('/guia-configuracao')} 
                className="font-semibold underline cursor-pointer hover:text-blue-600 text-blue-700"
              >
                Guia de Configuração
              </span>{' '}
              para detalhes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              onClick={() => navigate('/setup')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow text-white"
            >
              <Rocket className="w-12 h-12 text-white mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                🚀 Configuração Guiada
              </h3>
              <p className="text-blue-100">
                Comece aqui! Configure tudo passo a passo com nosso wizard
              </p>
            </div>

            <div
              onClick={() => navigate('/templates')}
              className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
            >
              <PlusCircle className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Criar Workflow
              </h3>
              <p className="text-gray-600">
                Escolha um template e crie um novo workflow no N8N
              </p>
            </div>

            <div
              onClick={() => navigate('/workflows')}
              className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
            >
              <Workflow className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Meus Workflows
              </h3>
              <p className="text-gray-600">
                Visualize e gerencie seus workflows criados
              </p>
            </div>

            <div
              onClick={() => navigate('/settings')}
              className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
            >
              <Settings className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configurações
              </h3>
              <p className="text-gray-600">
                Configure suas credenciais N8N e VPS
              </p>
            </div>

            <div
              onClick={() => navigate('/guia-configuracao')}
              className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
            >
              <BookOpen className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Guia de Configuração
              </h3>
              <p className="text-gray-600">
                Aprenda como configurar Google Cloud, Facebook Developer, etc.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

