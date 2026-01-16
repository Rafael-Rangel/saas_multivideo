import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

interface Template {
  id: string
  name: string
  slug: string
  description: string
  category: string
}

export function Templates() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadTemplates() {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, slug, description, category')
        .eq('is_active', true)

      if (error) {
        console.error('Error loading templates:', error)
      } else {
        setTemplates(data || [])
      }
      setLoading(false)
    }

    loadTemplates()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando templates...</div>
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
                <h1 className="text-xl font-bold text-gray-900">Templates</h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Escolha um Template
            </h2>

            {templates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600 mb-4">
                  Nenhum template disponível.
                </p>
                <p className="text-sm text-gray-500">
                  Execute as migrations do Supabase para criar templates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => navigate(`/create/${template.slug}`)}
                    className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{template.description}</p>
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {template.category}
                    </span>
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
