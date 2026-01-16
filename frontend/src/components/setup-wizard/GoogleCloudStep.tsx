import { useState } from 'react'
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

interface Props {
  onComplete: (stepId: string, data: any) => void
  onSaveVariable: (name: string, value: string, location: string) => void
}

export function GoogleCloudStep({ onComplete, onSaveVariable }: Props) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [projectId, setProjectId] = useState('')
  const [checklist, setChecklist] = useState({
    projectCreated: false,
    apisEnabled: false,
    credentialsCreated: false,
    redirectUrisConfigured: false,
  })

  const handleSave = async () => {
    // Salvar variáveis - vão para N8N
    await onSaveVariable('GOOGLE_CLIENT_ID', clientId, 'n8n')
    await onSaveVariable('GOOGLE_CLIENT_SECRET', clientSecret, 'n8n')
    await onSaveVariable('GOOGLE_PROJECT_ID', projectId, 'database')

    await onComplete('google_cloud', {
      client_id: clientId,
      project_id: projectId,
      checklist,
    })
  }

  return (
    <div className="space-y-6">
      {/* Checklist Guiado */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-4">📋 Checklist de Configuração</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.projectCreated}
              onChange={(e) =>
                setChecklist({ ...checklist, projectCreated: e.target.checked })
              }
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">1. Criar Projeto no Google Cloud</span>
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:underline text-sm"
              >
                Abrir Console <ExternalLink className="w-3 h-3 inline" />
              </a>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.apisEnabled}
              onChange={(e) => setChecklist({ ...checklist, apisEnabled: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">2. Habilitar APIs:</span>
              <ul className="text-sm text-gray-600 ml-4 mt-1 list-disc">
                <li>Google Sheets API</li>
                <li>Google Drive API</li>
              </ul>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.credentialsCreated}
              onChange={(e) =>
                setChecklist({ ...checklist, credentialsCreated: e.target.checked })
              }
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">3. Criar Credenciais OAuth 2.0</span>
              <p className="text-sm text-gray-600 ml-4">
                APIs e Serviços → Credenciais → + Criar Credenciais → ID do cliente OAuth
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.redirectUrisConfigured}
              onChange={(e) =>
                setChecklist({ ...checklist, redirectUrisConfigured: e.target.checked })
              }
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">4. Configurar URIs de Redirecionamento</span>
              <p className="text-sm text-gray-600 ml-4">
                Adicione: <code className="bg-gray-100 px-1 rounded">https://seu-n8n.com/rest/oauth2-credential/callback</code>
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Formulário para Credenciais */}
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">📍 Onde serão usadas:</p>
              <p className="text-sm text-yellow-800 mt-1">
                Essas credenciais serão configuradas no <strong>node do Google Sheets</strong> no
                N8N, após criar o workflow.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID do Projeto Google Cloud
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: meu-projeto-12345"
          />
          <p className="text-xs text-gray-500 mt-1">Salvo no banco de dados</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID do Cliente OAuth 2.0
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: 929000967938-7d5g93klkqbpolng30915jc1dv00r71c.apps.googleusercontent.com"
          />
          <p className="text-xs text-gray-500 mt-1">Será configurado no N8N</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chave Secreta do Cliente OAuth 2.0
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Sua chave secreta"
          />
          <p className="text-xs text-gray-500 mt-1">Será configurado no N8N (mantido seguro)</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!clientId || !clientSecret}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Salvar Credenciais e Continuar
      </button>
    </div>
  )
}

