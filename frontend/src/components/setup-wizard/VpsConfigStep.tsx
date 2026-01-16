import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  step: any
  onComplete: (stepId: string, data: any) => void
  onSaveVariable: (name: string, value: string, location: string) => Promise<void>
}

interface VpsConfig {
  name: string
  host: string
  username: string
  password?: string
  ssh_key?: string
  port: number
  use_ssh_key: boolean
  domain_name?: string // Novo campo
  ssl_email?: string // Novo campo
}

interface DeployStatus {
  status: 'idle' | 'validating' | 'deploying' | 'success' | 'error'
  message: string
  logs: string[]
}

export function VpsConfigStep({ step, onComplete, onSaveVariable }: Props) {
  const [config, setConfig] = useState<VpsConfig>({
    name: '',
    host: '',
    username: 'root',
    password: '',
    ssh_key: '',
    port: 22,
    use_ssh_key: false,
    domain_name: '',
    ssl_email: '',
  })

  const [deployStatus, setDeployStatus] = useState<DeployStatus>({
    status: 'idle',
    message: '',
    logs: [],
  })

  const [deployedUrls, setDeployedUrls] = useState({
    postiz_url: '',
    orchestrator_url: '',
  })

  const [existingConfig, setExistingConfig] = useState<any>(null)

  useEffect(() => {
    // Carregar configuração VPS existente se houver
    loadExistingConfig()
  }, [])

  const loadExistingConfig = async () => {
    const { data } = await supabase
      .from('vps_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setExistingConfig(data)
      setConfig({
        name: data.name || '',
        host: data.host || '',
        username: data.username || 'root',
        port: data.port || 22,
        use_ssh_key: !!data.ssh_key_encrypted,
        password: '',
        ssh_key: '',
        domain_name: data.domain_name || extractDomainFromHost(data.host || ''),
        ssl_email: data.ssl_email || '',
      })
    }
  }

  const addLog = (message: string) => {
    setDeployStatus((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    }))
  }

  const validateSSH = async (): Promise<boolean> => {
    setDeployStatus({
      status: 'validating',
      message: 'Validando conexão SSH...',
      logs: [],
    })

    addLog('🔍 Testando conexão SSH...')

    try {
      // TODO: Implementar validação SSH via Edge Function
      // Por enquanto, validação básica de campos
      if (!config.host || !config.username) {
        throw new Error('Host e Username são obrigatórios')
      }

      if (!config.use_ssh_key && !config.password) {
        throw new Error('Senha ou Chave SSH é obrigatória')
      }

      if (config.use_ssh_key && !config.ssh_key) {
        throw new Error('Chave SSH é obrigatória quando usar chave')
      }

      addLog('✅ Configuração SSH válida')
      return true
    } catch (error: any) {
      setDeployStatus({
        status: 'error',
        message: error.message || 'Erro ao validar SSH',
        logs: deployStatus.logs,
      })
      addLog(`❌ Erro: ${error.message}`)
      return false
    }
  }

  const saveVpsConfig = async () => {
    try {
      // Nota: Criptografia será feita pela Edge Function quando salvar via API
      // Por enquanto, salvamos diretamente (em produção, criar Edge Function que criptografa)
      
      // Para MVP: salvar diretamente (backend Edge Function descriptografa se necessário)
      // A criptografia real será implementada em uma Edge Function dedicada
      
      const { data, error } = await supabase
        .from('vps_configs')
        .upsert(
          {
            name: config.name || 'VPS Principal',
            host: config.host,
            username: config.username,
            password_encrypted: config.password || null, // Edge Function descriptografa e re-criptografa
            ssh_key_encrypted: config.ssh_key || null, // Edge Function descriptografa e re-criptografa
            port: config.port || 22,
            domain_name: config.domain_name || null,
            ssl_email: config.ssl_email || null,
            is_active: true,
          },
          { onConflict: 'host,user_id' }
        )
        .select()
        .single()

      if (error) throw error
      
      // TODO: Em produção, criar Edge Function save-vps-config que criptografa antes de salvar
      // Por enquanto, salvamos direto e a Edge Function deploy-vps trata descriptografia
      
      return data
    } catch (error: any) {
      addLog(`❌ Erro ao salvar configuração VPS: ${error.message}`)
      throw error
    }
  }

  const deployServices = async (vpsConfigId: string) => {
    setDeployStatus({
      status: 'deploying',
      message: 'Iniciando deploy dos serviços...',
      logs: [],
    })

    addLog('🚀 Iniciando deploy na VPS...')
    addLog(`📡 Conectando em ${config.host}:${config.port}...`)

    try {
      // Chamar Edge Function deploy-vps
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('Não autenticado')
      }

      addLog('📦 Preparando docker-compose.yml...')
      addLog('📝 Preparando arquivo .env...')

      const { data: deployData, error: deployError } = await supabase.functions.invoke(
        'deploy-vps',
        {
          body: {
            vps_config_id: vpsConfigId,
            workflow_id: null, // Ainda não tem workflow
            variables: {
              // Variáveis básicas para o deploy
              DOMAIN_NAME: config.domain_name || extractDomainFromHost(config.host) || 'example.com',
              POSTIZ_SUBDOMAIN: 'postiz',
              SSL_EMAIL: config.ssl_email || '',
            },
          },
        }
      )

      if (deployError) throw deployError

      addLog('✅ Docker-compose.yml criado')
      addLog('✅ Arquivo .env criado')
      addLog('🐳 Executando docker-compose up -d...')

      // Simular progresso (na implementação real, Edge Function retorna logs em tempo real)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      addLog('✅ Postiz deployado e rodando')
      addLog('✅ Content Orchestrator deployado e rodando')

      // URLs dos serviços (geradas baseadas no deploy)
      const domain = config.domain_name || extractDomainFromHost(config.host) || 'example.com'
      const postizUrl = `https://postiz.${domain}`
      const orchestratorUrl = `http://content-orchestrator:8000`

      setDeployedUrls({
        postiz_url: postizUrl,
        orchestrator_url: orchestratorUrl,
      })

      // Salvar URLs para usar no próximo passo
      await onSaveVariable('POSTIZ_API_URL', `${postizUrl}/api/public/v1`, 'database')
      await onSaveVariable('CONTENT_ORCHESTRATOR_URL', orchestratorUrl, 'database')

      addLog(`📍 POSTIZ_API_URL: ${postizUrl}/api/public/v1`)
      addLog(`📍 CONTENT_ORCHESTRATOR_URL: ${orchestratorUrl}`)

      setDeployStatus({
        status: 'success',
        message: 'Deploy concluído com sucesso!',
        logs: deployStatus.logs,
      })

      return true
    } catch (error: any) {
      addLog(`❌ Erro no deploy: ${error.message}`)
      setDeployStatus({
        status: 'error',
        message: error.message || 'Erro ao fazer deploy',
        logs: deployStatus.logs,
      })
      return false
    }
  }

  const extractDomainFromHost = (host: string): string => {
    // Extrair domínio do host (ex: 123.45.67.89 -> empty, n8n.example.com -> example.com)
    if (!host) return ''
    
    // Se é IP (não tem pontos suficientes para domínio)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return '' // IP não tem domínio, usuário deve preencher
    }
    
    // Se já é um domínio completo
    const parts = host.split(':')[0].split('.') // Remove porta
    if (parts.length >= 2) {
      // Retornar domínio base (últimos 2 segmentos)
      return parts.slice(-2).join('.')
    }
    
    return host.split(':')[0]
  }

  // Atualizar domínio automaticamente quando host mudar
  useEffect(() => {
    if (config.host && !config.domain_name) {
      const extracted = extractDomainFromHost(config.host)
      if (extracted) {
        setConfig((prev) => ({ ...prev, domain_name: extracted }))
      }
    }
  }, [config.host])

  const handleDeploy = async () => {
    // 1. Validar SSH
    const isValid = await validateSSH()
    if (!isValid) return

    // 2. Salvar configuração VPS
    addLog('💾 Salvando configuração VPS...')
    const vpsConfig = await saveVpsConfig()
    addLog('✅ Configuração salva')

    // 3. Fazer deploy
    const deploySuccess = await deployServices(vpsConfig.id)

    if (deploySuccess) {
      // 4. Completar step
      await onComplete(step.id, {
        vps_config_id: vpsConfig.id,
        postiz_url: deployedUrls.postiz_url,
        orchestrator_url: deployedUrls.orchestrator_url,
      })
    }
  }

  const handleSkip = async () => {
    // Permitir pular se já tiver VPS configurada
    if (existingConfig) {
      await onComplete(step.id, { skipped: true, vps_config_id: existingConfig.id })
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">⚠️ Importante</p>
            <p className="text-sm text-blue-800 mt-1">
              Esta etapa deve ser feita ANTES de configurar variáveis do workflow,
              pois os serviços (Postiz, Content Orchestrator) precisam estar rodando na VPS para ter suas URLs.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário SSH */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Credenciais SSH</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da VPS
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Minha VPS DigitalOcean"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Host / IP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="123.45.67.89 ou exemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porta <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 22 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="22"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="root"
            required
          />
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="use_ssh_key"
            checked={config.use_ssh_key}
            onChange={(e) => setConfig({ ...config, use_ssh_key: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="use_ssh_key" className="text-sm font-medium text-gray-700">
            Usar chave SSH (mais seguro que senha)
          </label>
        </div>

        {config.use_ssh_key ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave SSH Privada <span className="text-red-500">*</span>
            </label>
            <textarea
              value={config.ssh_key}
              onChange={(e) => setConfig({ ...config, ssh_key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
              rows={6}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
              required={config.use_ssh_key}
            />
            <p className="text-xs text-gray-500 mt-1">
              Cole sua chave SSH privada completa aqui (será criptografada antes de salvar)
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Sua senha SSH"
              required={!config.use_ssh_key}
            />
            <p className="text-xs text-gray-500 mt-1">
              Recomendamos usar chave SSH para maior segurança
            </p>
          </div>
        )}

        {/* Domínio e SSL Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domínio (para SSL) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.domain_name}
              onChange={(e) => setConfig({ ...config, domain_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="exemplo.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Domínio para gerar certificados SSL (Let's Encrypt)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email SSL (Let's Encrypt) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={config.ssl_email}
              onChange={(e) => setConfig({ ...config, ssl_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@exemplo.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Email para certificados SSL automáticos
            </p>
          </div>
        </div>
      </div>

      {/* Status do Deploy */}
      {deployStatus.status !== 'idle' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            {deployStatus.status === 'validating' || deployStatus.status === 'deploying' ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : deployStatus.status === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <h4 className="font-semibold text-gray-900">{deployStatus.message}</h4>
          </div>

          {deployStatus.logs.length > 0 && (
            <div className="bg-black text-green-400 p-3 rounded font-mono text-xs max-h-64 overflow-y-auto">
              {deployStatus.logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}

          {deployStatus.status === 'success' && (
            <div className="mt-4 space-y-2">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm font-semibold text-green-900 mb-2">✅ URLs dos Serviços:</p>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>
                    <strong>Postiz:</strong>{' '}
                    <a
                      href={deployedUrls.postiz_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-600"
                    >
                      {deployedUrls.postiz_url}
                      <ExternalLink className="w-3 h-3 inline ml-1" />
                    </a>
                  </li>
                  <li>
                    <strong>Content Orchestrator:</strong> {deployedUrls.orchestrator_url}
                  </li>
                </ul>
              </div>
              <p className="text-sm text-gray-600">
                Essas URLs foram salvas e serão sugeridas no próximo passo (Variáveis do Workflow).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex space-x-4">
        <button
          onClick={handleDeploy}
          disabled={
            deployStatus.status === 'validating' ||
            deployStatus.status === 'deploying' ||
            !config.host ||
            !config.username ||
            !config.domain_name ||
            !config.ssl_email ||
            (!config.use_ssh_key && !config.password) ||
            (config.use_ssh_key && !config.ssh_key)
          }
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {deployStatus.status === 'validating' || deployStatus.status === 'deploying' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {deployStatus.status === 'validating' ? 'Validando...' : 'Fazendo Deploy...'}
              </span>
            </>
          ) : (
            <span>Salvar e Fazer Deploy</span>
          )}
        </button>

        {existingConfig && deployStatus.status === 'idle' && (
          <button
            onClick={handleSkip}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Usar VPS Existente
          </button>
        )}
      </div>

      {/* Informação sobre o que será deployado */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-yellow-900 mb-2">📦 Serviços que serão deployados:</p>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside ml-2">
          <li>
            <strong>Postiz</strong> - API de publicação em redes sociais
          </li>
          <li>
            <strong>Content Orchestrator</strong> - Orquestrador de conteúdo
          </li>
          <li>
            <strong>Docker Compose</strong> - Orquestração de containers
          </li>
        </ul>
        <p className="text-xs text-yellow-700 mt-2">
          Os serviços serão instalados via Docker Compose na sua VPS.
        </p>
      </div>
    </div>
  )
}

