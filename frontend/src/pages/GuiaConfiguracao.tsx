import { useNavigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'

export function GuiaConfiguracao() {
  const navigate = useNavigate()

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
                  Guia de Configuração
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                O que é Automático vs Manual?
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-green-700 mb-2">
                    ✅ Automático (Nossa Plataforma Faz)
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Criação do workflow no seu N8N</li>
                    <li>Configuração das variáveis de ambiente no workflow</li>
                    <li>Integração dos nodes do N8N</li>
                    <li>Estrutura completa do fluxo de automação</li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-orange-700 mb-2">
                    ⚠️ Manual (Você Precisa Fazer)
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Configurar Google Cloud (APIs e credenciais OAuth)</li>
                    <li>Configurar Facebook Developer (para Instagram)</li>
                    <li>Configurar Zapper e Buffer (para TikTok)</li>
                    <li>Configurar credenciais do Postiz</li>
                    <li>Habilitar APIs necessárias nos serviços</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Google Cloud */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                📊 Google Cloud - Configuração Manual
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold mb-2">1. Criar Projeto no Google Cloud</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                    <li>Crie um novo projeto ou selecione um existente</li>
                    <li>Anote o ID do projeto</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Habilitar APIs Necessárias</h3>
                  <p className="mb-2">Vá em <strong>APIs e Serviços → Biblioteca</strong> e habilite:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Google Sheets API</strong> - Para ler/escrever planilhas</li>
                    <li><strong>Google Drive API</strong> - Para acessar arquivos</li>
                    <li><strong>YouTube Data API v3</strong> - Para integração com YouTube (se necessário)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Criar Credenciais OAuth 2.0</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Vá em <strong>APIs e Serviços → Credenciais</strong></li>
                    <li>Clique em <strong>+ Criar Credenciais → ID do cliente OAuth</strong></li>
                    <li>Tipo: <strong>Aplicativo da Web</strong></li>
                    <li>Configure as URIs de redirecionamento:
                      <ul className="list-disc list-inside ml-6 mt-1">
                        <li><code>https://seu-n8n.com/rest/oauth2-credential/callback</code></li>
                        <li>Substitua <code>seu-n8n.com</code> pela URL do seu N8N</li>
                      </ul>
                    </li>
                    <li>Salve o <strong>ID do cliente</strong> e a <strong>Chave secreta do cliente</strong></li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm">
                    <strong>⚠️ Importante:</strong> Você precisará inserir essas credenciais (ID e Secret) 
                    no N8N quando configurar os nodes de Google Sheets/Drive no workflow criado.
                  </p>
                </div>
              </div>
            </div>

            {/* Facebook Developer */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                📷 Facebook Developer / Meta Developer - Para Instagram
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold mb-2">1. Criar App no Meta Developers</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Developers</a></li>
                    <li>Crie um novo app ou selecione um existente</li>
                    <li>Tipo: <strong>Empresa</strong> (recomendado para uso comercial)</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Configurar API do Instagram</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>No painel do app, vá em <strong>Configuração da API com login empresarial no Instagram</strong></li>
                    <li>Configure o <strong>Nome do app do Instagram</strong></li>
                    <li>Anote as credenciais:
                      <ul className="list-disc list-inside ml-6 mt-1">
                        <li><strong>ID do app do Instagram</strong> (ex: 1335517341421758)</li>
                        <li><strong>Chave secreta do app do Instagram</strong></li>
                        <li><strong>ID do Aplicativo</strong> principal (ex: 1866646963947514)</li>
                        <li><strong>Chave Secreta do Aplicativo</strong> principal</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Gerar Token de Acesso</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Adicione uma conta profissional do Instagram ao app</li>
                    <li>Gere um <strong>Token de Acesso</strong> (Access Token)</li>
                    <li>Salve este token - você precisará dele no N8N</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">4. Configurar URLs (Opcional)</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>URL de callback para webhooks (se necessário)</li>
                    <li>URLs de redirecionamento OAuth</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-sm text-green-800">
                    <strong>✅ Exemplo de configuração real:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-green-700 mt-2 space-y-1">
                    <li>ID do Aplicativo: <code>1866646963947514</code></li>
                    <li>ID do app do Instagram: <code>1335517341421758</code></li>
                    <li>Você também precisará do <strong>Token de Acesso</strong> gerado para sua conta</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm">
                    <strong>⚠️ Como usar no N8N:</strong>
                  </p>
                  <ol className="list-decimal list-inside text-sm mt-2 space-y-1 ml-2">
                    <li>Após criar o workflow na nossa plataforma, abra-o no N8N</li>
                    <li>Encontre o node do <strong>Instagram</strong></li>
                    <li>Configure as credenciais:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>App ID (ID do app do Instagram)</li>
                        <li>App Secret (Chave secreta do app do Instagram)</li>
                        <li>Access Token (token gerado para sua conta)</li>
                      </ul>
                    </li>
                    <li>Salve e teste a conexão</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Mantenha suas credenciais seguras. Nunca compartilhe a Chave Secreta ou o Token de Acesso publicamente.
                  </p>
                </div>
              </div>
            </div>

            {/* Zapper e Buffer */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                🎵 Zapper e Buffer - Para TikTok
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold mb-2">1. Configurar Zapper</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Crie conta no <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Zapier</a> ou similar</li>
                    <li>Configure trigger para Google Sheets (atualização na tabela TikTok)</li>
                    <li>Configure ação para enviar para Buffer (URL do vídeo MP4)</li>
                    <li>Use login com Google para facilitar integração</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Configurar Buffer</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Crie conta no <a href="https://buffer.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Buffer</a></li>
                    <li>Faça login com a mesma conta Google do Zapper</li>
                    <li>Conecte sua conta do TikTok no Buffer</li>
                    <li>Autorize o Buffer a publicar no TikTok</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm">
                    <strong>⚠️ Fluxo:</strong> Google Sheets → Zapper (trigger) → Buffer (ação) → TikTok (publicação)
                  </p>
                </div>
              </div>
            </div>

            {/* Postiz */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                📱 Postiz - API de Publicação
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold mb-2">Obter Credenciais Postiz</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Acesse o painel do Postiz</li>
                    <li>Vá em <strong>API → Credenciais</strong></li>
                    <li>Obtenha:
                      <ul className="list-disc list-inside ml-6 mt-1">
                        <li>URL da API (ex: <code>https://postiz.postagensapp.shop/api/public/v1</code>)</li>
                        <li>API Key (se necessário)</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm">
                    <strong>✅ Boa notícia:</strong> A URL da API do Postiz você já configura diretamente 
                    nas variáveis de ambiente ao criar o workflow na nossa plataforma!
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-blue-50 border border-blue-200 rounded p-6">
              <h3 className="font-bold text-blue-900 mb-3">📋 Resumo do Processo</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li><strong>Na nossa plataforma:</strong> Configure suas credenciais N8N e crie o workflow</li>
                <li><strong>Manual:</strong> Configure Google Cloud, Facebook Developer, Zapper, Buffer</li>
                <li><strong>No N8N:</strong> Abra o workflow criado e configure os nodes com as credenciais obtidas manualmente</li>
                <li><strong>Teste:</strong> Execute o workflow e verifique se tudo funciona</li>
              </ol>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/templates')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
              >
                Começar a Criar Workflow
              </button>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

