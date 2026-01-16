import { useState } from 'react'
import { AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react'

interface Props {
  onComplete: (stepId: string, data: any) => void
  onSaveVariable: (name: string, value: string, location: string) => void
}

export function FacebookDeveloperStep({ onComplete, onSaveVariable }: Props) {
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [instagramAppId, setInstagramAppId] = useState('')
  const [instagramAppSecret, setInstagramAppSecret] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [checklist, setChecklist] = useState({
    appCreated: false,
    instagramApiConfigured: false,
    accountConnected: false,
    tokenGenerated: false,
  })

  const handleSave = async () => {
    // Salvar variáveis - todas vão para N8N
    await onSaveVariable('INSTAGRAM_APP_ID', instagramAppId || appId, 'n8n')
    await onSaveVariable('INSTAGRAM_APP_SECRET', instagramAppSecret || appSecret, 'n8n')
    await onSaveVariable('INSTAGRAM_ACCESS_TOKEN', accessToken, 'n8n')
    await onSaveVariable('FACEBOOK_APP_ID', appId, 'n8n')

    await onComplete('facebook_developer', {
      app_id: appId,
      instagram_app_id: instagramAppId,
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
              checked={checklist.appCreated}
              onChange={(e) => setChecklist({ ...checklist, appCreated: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">1. Criar App no Meta Developers</span>
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:underline text-sm"
              >
                Abrir <ExternalLink className="w-3 h-3 inline" />
              </a>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.instagramApiConfigured}
              onChange={(e) =>
                setChecklist({ ...checklist, instagramApiConfigured: e.target.checked })
              }
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">2. Configurar API do Instagram</span>
              <p className="text-sm text-gray-600 ml-4">
                Configuração da API com login empresarial no Instagram
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.accountConnected}
              onChange={(e) => setChecklist({ ...checklist, accountConnected: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">3. Conectar Conta do Instagram</span>
              <p className="text-sm text-gray-600 ml-4">
                Adicione sua conta profissional do Instagram ao app
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.tokenGenerated}
              onChange={(e) => setChecklist({ ...checklist, tokenGenerated: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <div>
              <span className="font-medium">4. Gerar Token de Acesso</span>
              <p className="text-sm text-gray-600 ml-4">
                Gere e salve o Access Token (não poderá ver novamente!)
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Informações sobre onde encontrar */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Exemplo de onde encontrar:</p>
            <ul className="text-sm text-green-800 mt-1 space-y-1">
              <li>
                <strong>ID do Aplicativo:</strong> Na página "Configurações Básicas" do app
              </li>
              <li>
                <strong>ID do app do Instagram:</strong> Em "Configuração da API com login
                empresarial no Instagram"
              </li>
              <li>
                <strong>Chave Secreta:</strong> Clique em "Mostrar" nas configurações
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">📍 Onde serão usadas:</p>
              <p className="text-sm text-yellow-800 mt-1">
                Essas credenciais serão configuradas no <strong>node do Instagram</strong> no N8N,
                após criar o workflow.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID do Aplicativo (App ID Principal)
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Ex: 1866646963947514"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chave Secreta do Aplicativo (App Secret)
          </label>
          <input
            type="password"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Sua chave secreta"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID do app do Instagram (Opcional - se diferente)
          </label>
          <input
            type="text"
            value={instagramAppId}
            onChange={(e) => setInstagramAppId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Ex: 1335517341421758 (ou deixe vazio para usar App ID acima)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chave Secreta do app do Instagram (Opcional)
          </label>
          <input
            type="password"
            value={instagramAppSecret}
            onChange={(e) => setInstagramAppSecret(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Ou deixe vazio para usar App Secret acima"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token de Acesso (Access Token) ⚠️
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Token gerado para sua conta Instagram"
            required
          />
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Salve este token em local seguro - você não poderá vê-lo novamente!
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!appId || !appSecret || !accessToken}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        Salvar Credenciais e Continuar
      </button>
    </div>
  )
}

