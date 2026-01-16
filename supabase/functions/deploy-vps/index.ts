// Edge Function para fazer deploy via SSH na VPS
// Implementa conexão SSH, criação de arquivos e execução de docker-compose

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../utils/crypto.ts'

interface DeployRequest {
  vps_config_id: string
  workflow_id: string | null
  variables: Record<string, string>
}

interface SshConfig {
  host: string
  username: string
  password?: string
  ssh_key?: string
  port: number
  use_ssh_key: boolean
}

// Função para executar comandos SSH via subprocess
async function execSSHCommand(
  config: SshConfig,
  command: string,
  timeout = 30000
): Promise<{ stdout: string; stderr: string; code: number }> {
  const sshArgs = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ConnectTimeout=10',
    '-p', config.port.toString(),
  ]

  if (config.use_ssh_key && config.ssh_key) {
    // Salvar chave temporariamente e usar
    const tempKeyPath = `/tmp/ssh_key_${Date.now()}`
    await Deno.writeTextFile(tempKeyPath, config.ssh_key)
    await Deno.chmod(tempKeyPath, 0o600)
    sshArgs.push('-i', tempKeyPath)
  }

  sshArgs.push(`${config.username}@${config.host}`, command)

  try {
    const process = new Deno.Command('ssh', {
      args: sshArgs,
      stdin: config.password ? 'piped' : 'null',
      stdout: 'piped',
      stderr: 'piped',
    })

    const child = process.spawn()

    if (config.password) {
      // Enviar senha via sshpass (se disponível) ou usar expect
      // Por segurança, preferir chave SSH
      console.warn('Password authentication may not work. Use SSH key instead.')
    }

    const output = await child.output()
    const stdout = new TextDecoder().decode(output.stdout)
    const stderr = new TextDecoder().decode(output.stderr)

    // Limpar chave temporária se usada
    if (config.use_ssh_key && config.ssh_key) {
      try {
        await Deno.remove(`/tmp/ssh_key_${Date.now()}`)
      } catch (e) {
        console.warn('Failed to remove temp key:', e)
      }
    }

    return {
      stdout,
      stderr,
      code: output.code,
    }
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message,
      code: 1,
    }
  }
}

// Função para copiar arquivo via SCP
async function copyFileViaSCP(
  config: SshConfig,
  localContent: string,
  remotePath: string
): Promise<{ success: boolean; error?: string }> {
  const tempFile = `/tmp/file_${Date.now()}`
  await Deno.writeTextFile(tempFile, localContent)

  try {
    const scpArgs = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-P', config.port.toString(),
    ]

    if (config.use_ssh_key && config.ssh_key) {
      const tempKeyPath = `/tmp/scp_key_${Date.now()}`
      await Deno.writeTextFile(tempKeyPath, config.ssh_key)
      await Deno.chmod(tempKeyPath, 0o600)
      scpArgs.push('-i', tempKeyPath)
    }

    scpArgs.push(tempFile, `${config.username}@${config.host}:${remotePath}`)

    const process = new Deno.Command('scp', {
      args: scpArgs,
      stdin: 'null',
      stdout: 'piped',
      stderr: 'piped',
    })

    const child = process.spawn()
    const output = await child.output()

    // Limpar arquivos temporários
    try {
      await Deno.remove(tempFile)
      if (config.use_ssh_key && config.ssh_key) {
        await Deno.remove(`/tmp/scp_key_${Date.now()}`)
      }
    } catch (e) {
      console.warn('Failed to remove temp files:', e)
    }

    if (output.code !== 0) {
      const stderr = new TextDecoder().decode(output.stderr)
      return { success: false, error: stderr }
    }

    return { success: true }
  } catch (error) {
    await Deno.remove(tempFile).catch(() => {})
    return { success: false, error: error.message }
  }
}

// Função para copiar diretório recursivamente via SCP (usar tar para eficiência)
async function copyDirectoryViaSCP(
  config: SshConfig,
  localDir: string,
  remoteDir: string
): Promise<{ success: boolean; error?: string }> {
  // Criar tar do diretório local
  const tempTar = `/tmp/orchestrator_${Date.now()}.tar.gz`
  
  try {
    // Criar tar (requer tar disponível no Deno)
    const tarProcess = new Deno.Command('tar', {
      args: ['-czf', tempTar, '-C', localDir, '.'],
      stdout: 'piped',
      stderr: 'piped',
    })
    
    const tarOutput = await tarProcess.output()
    if (tarOutput.code !== 0) {
      return { success: false, error: 'Failed to create tar' }
    }

    // Copiar tar para VPS
    const scpResult = await copyFileViaSCP(config, await Deno.readTextFile(tempTar), `${remoteDir}.tar.gz`)
    
    // Extrair tar na VPS
    if (scpResult.success) {
      const extractResult = await execSSHCommand(
        config,
        `mkdir -p ${remoteDir} && tar -xzf ${remoteDir}.tar.gz -C ${remoteDir} && rm ${remoteDir}.tar.gz`
      )
      
      // Limpar tar local
      await Deno.remove(tempTar).catch(() => {})
      
      return { success: extractResult.code === 0, error: extractResult.stderr }
    }
    
    await Deno.remove(tempTar).catch(() => {})
    return scpResult
  } catch (error) {
    await Deno.remove(tempTar).catch(() => {})
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  try {
    // Autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { vps_config_id, workflow_id, variables }: DeployRequest = await req.json()

    // 1. Buscar configuração VPS
    const { data: vpsConfig, error: vpsError } = await supabaseClient
      .from('vps_configs')
      .select('*')
      .eq('id', vps_config_id)
      .eq('user_id', user.id)
      .single()

    if (vpsError || !vpsConfig) {
      return new Response(JSON.stringify({ error: 'VPS configuration not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Criar registro de deploy
    const { data: deployment, error: deployError } = await supabaseClient
      .from('deployments')
      .insert({
        user_id: user.id,
        vps_config_id: vps_config_id,
        workflow_id: workflow_id,
        status: 'pending',
      })
      .select()
      .single()

    if (deployError) {
      return new Response(JSON.stringify({ error: deployError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Preparar configuração SSH (descriptografar credenciais)
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente')
    }

    let decryptedPassword: string | undefined = undefined
    let decryptedSshKey: string | undefined = undefined

    // Descriptografar senha se existir
    if (vpsConfig.password_encrypted || vpsConfig.ssh_password) {
      const encryptedPassword = vpsConfig.password_encrypted || vpsConfig.ssh_password
      try {
        decryptedPassword = await decrypt(encryptedPassword, ENCRYPTION_KEY)
      } catch (e) {
        // Se falhar, pode não estar criptografado (compatibilidade)
        console.warn('Failed to decrypt password, using as plain text:', e.message)
        decryptedPassword = encryptedPassword as string
      }
    }

    // Descriptografar chave SSH se existir
    if (vpsConfig.ssh_key_encrypted || vpsConfig.ssh_private_key) {
      const encryptedSshKey = vpsConfig.ssh_key_encrypted || vpsConfig.ssh_private_key
      try {
        decryptedSshKey = await decrypt(encryptedSshKey, ENCRYPTION_KEY)
      } catch (e) {
        // Se falhar, pode não estar criptografado (compatibilidade)
        console.warn('Failed to decrypt SSH key, using as plain text:', e.message)
        decryptedSshKey = encryptedSshKey as string
      }
    }

    const sshConfig: SshConfig = {
      host: vpsConfig.host || vpsConfig.ip_address,
      username: vpsConfig.username || vpsConfig.ssh_user || 'root',
      password: decryptedPassword,
      ssh_key: decryptedSshKey,
      port: vpsConfig.port || 22,
      use_ssh_key: !!decryptedSshKey,
    }

    // 4. Gerar arquivos a partir de templates
    const dockerComposeYml = generateDockerComposeFromTemplate(variables)
    const envContent = generateEnvFile(variables)
    const orchestratorEnv = generateOrchestratorEnv(variables)

    // 5. Criar diretório de deploy na VPS
    const deployDir = '/opt/n8n-platform'
    const orchestratorDir = `${deployDir}/content-orchestrator`

    console.log(`Creating directories on ${sshConfig.host}...`)
    let result = await execSSHCommand(
      sshConfig,
      `mkdir -p ${deployDir} ${orchestratorDir} ${orchestratorDir}/downloads ${orchestratorDir}/logs ${orchestratorDir}/data`
    )

    if (result.code !== 0 && !result.stderr.includes('File exists')) {
      throw new Error(`Failed to create directories: ${result.stderr}`)
    }

    // 6. Copiar docker-compose.yml
    console.log('Copying docker-compose.yml...')
    result = await copyFileViaSCP(sshConfig, dockerComposeYml, `${deployDir}/docker-compose.yml`)
    if (!result.success) {
      throw new Error(`Failed to copy docker-compose.yml: ${result.error}`)
    }

    // 7. Copiar .env principal
    console.log('Copying .env...')
    result = await copyFileViaSCP(sshConfig, envContent, `${deployDir}/.env`)
    if (!result.success) {
      throw new Error(`Failed to copy .env: ${result.error}`)
    }

    // 8. Copiar código do Content Orchestrator
    // Tentar copiar diretório inteiro via tar (mais eficiente)
    console.log('Copying Content Orchestrator code...')
    try {
      // Verificar se diretório local existe
      const localOrchestratorDir = './deploy/content-orchestrator'
      try {
        await Deno.stat(localOrchestratorDir)
        
        // Copiar via tar (mais eficiente)
        const copyResult = await copyDirectoryViaSCP(sshConfig, localOrchestratorDir, `${deployDir}/content-orchestrator-source`)
        
        if (!copyResult.success) {
          // Fallback: copiar arquivos individuais
          console.log('Tar copy failed, falling back to individual files...')
          const orchestratorFiles = await prepareOrchestratorFiles()
          for (const file of orchestratorFiles) {
            const fileResult = await copyFileViaSCP(
              sshConfig,
              file.content,
              `${orchestratorDir}/${file.path}`
            )
            if (!fileResult.success) {
              console.warn(`Warning: Failed to copy ${file.path}: ${fileResult.error}`)
            }
          }
        }
      } catch (e) {
        console.warn(`Local orchestrator directory not found: ${e.message}`)
        // Continuar sem content-orchestrator (usuário pode adicionar manualmente)
      }
    } catch (error) {
      console.error(`Error copying Content Orchestrator: ${error.message}`)
      // Não falhar deploy por causa disso
    }

    // 9. Copiar .env do orchestrator
    result = await copyFileViaSCP(
      sshConfig,
      orchestratorEnv,
      `${orchestratorDir}/.env`
    )

    // 10. Executar docker-compose up -d
    console.log('Starting services with docker-compose...')
    result = await execSSHCommand(
      sshConfig,
      `cd ${deployDir} && docker-compose up -d --build`,
      60000 // 60 segundos timeout
    )

    if (result.code !== 0) {
      throw new Error(`Docker-compose failed: ${result.stderr || result.stdout}`)
    }

    // 11. Verificar serviços rodando
    console.log('Checking services status...')
    result = await execSSHCommand(
      sshConfig,
      `cd ${deployDir} && docker-compose ps --format json`,
      10000
    )

    const servicesStatus = result.stdout

    // 12. Atualizar status do deploy
    await supabaseClient
      .from('deployments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        logs: `Deploy completed successfully\n\n${servicesStatus}`,
      })
      .eq('id', deployment.id)

    // 13. Extrair URLs dos serviços
    const domain = variables.DOMAIN_NAME || extractDomainFromHost(sshConfig.host)
    const postizUrl = `https://${variables.POSTIZ_SUBDOMAIN || 'postiz'}.${domain}`
    const orchestratorUrl = variables.CONTENT_ORCHESTRATOR_URL || `http://content-orchestrator:8000`

    return new Response(
      JSON.stringify({
        message: 'Deploy completed successfully',
        deployment_id: deployment.id,
        status: 'completed',
        urls: {
          postiz_url: postizUrl,
          orchestrator_url: orchestratorUrl,
          docker_compose_dir: deployDir,
        },
        services_status: servicesStatus,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Deploy error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Helper: Gerar docker-compose.yml a partir de template
function generateDockerComposeFromTemplate(variables: Record<string, string>): string {
  // Template completo do docker-compose.yml (baseado no template existente)
  // Em produção, pode carregar de um arquivo ou banco de dados
  let template = `version: '3.8'

services:
  traefik:
    image: traefik
    restart: always
    command:
      - "--api=true"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.mytlschallenge.acme.tlschallenge=true"
      - "--certificatesresolvers.mytlschallenge.acme.email=\${SSL_EMAIL}"
      - "--certificatesresolvers.mytlschallenge.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - traefik_data:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro

  postiz:
    image: ghcr.io/gitroomhq/postiz-app:latest
    container_name: postiz
    restart: always
    expose:
      - "5000"
    environment:
      MAIN_URL: "https://\${POSTIZ_SUBDOMAIN}.\${DOMAIN_NAME}"
      FRONTEND_URL: "https://\${POSTIZ_SUBDOMAIN}.\${DOMAIN_NAME}"
      NEXT_PUBLIC_BACKEND_URL: "https://\${POSTIZ_SUBDOMAIN}.\${DOMAIN_NAME}/api"
      BACKEND_INTERNAL_URL: "http://postiz:3000"
      JWT_SECRET: \${JWT_SECRET}
      DATABASE_URL: "postgresql://postiz-user:postiz-password@postiz-postgres:5432/postiz-db-local"
      REDIS_URL: "redis://postiz-redis:6379"
      IS_GENERAL: "true"
      DISABLE_REGISTRATION: "false"
      NOT_SECURED: "false"
      STORAGE_PROVIDER: "local"
      UPLOAD_DIRECTORY: "/uploads"
      NEXT_PUBLIC_UPLOAD_DIRECTORY: "/uploads"
    volumes:
      - postiz-config:/config
      - postiz-uploads:/uploads
    labels:
      - traefik.enable=true
      - traefik.http.routers.postiz.rule=Host(\`\${POSTIZ_SUBDOMAIN}.\${DOMAIN_NAME}\`)
      - traefik.http.routers.postiz.entrypoints=web,websecure
      - traefik.http.routers.postiz.tls=true
      - traefik.http.routers.postiz.tls.certresolver=mytlschallenge
      - traefik.http.services.postiz.loadbalancer.server.port=5000
    depends_on:
      - postiz-postgres
      - postiz-redis

  postiz-postgres:
    image: postgres:17-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD: postiz-password
      POSTGRES_USER: postiz-user
      POSTGRES_DB: postiz-db-local
    volumes:
      - postgres-volume:/var/lib/postgresql/data

  postiz-redis:
    image: redis:7.2
    restart: always
    volumes:
      - postiz-redis-data:/data

  content-orchestrator:
    user: "1000:1000"
    build:
      context: ./content-orchestrator
      dockerfile: Dockerfile
    container_name: content-orchestrator
    restart: always
    env_file: ./content-orchestrator/.env
    environment:
      - STORAGE_TYPE=local
      - LOCAL_STORAGE_PATH=/app/downloads
    volumes:
      - ./content-orchestrator/downloads:/app/downloads
      - ./content-orchestrator/logs:/app/logs
      - ./content-orchestrator/data:/app/data
    ports:
      - "127.0.0.1:8002:8000"
    labels:
      - traefik.enable=true
      - traefik.http.routers.content-orchestrator.rule=Host(\`orchestrator.\${DOMAIN_NAME}\`)
      - traefik.http.routers.content-orchestrator.entrypoints=web,websecure
      - traefik.http.routers.content-orchestrator.tls=true
      - traefik.http.routers.content-orchestrator.tls.certresolver=mytlschallenge
      - traefik.http.services.content-orchestrator.loadbalancer.server.port=8000
    command: "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

volumes:
  traefik_data:
    external: false
  postgres-volume:
  postiz-config:
  postiz-uploads:
  postiz-redis-data:
`

  // Substituir variáveis ${VAR} pelo valor real
  let result = template
  const defaultVars = {
    SUBDOMAIN: 'n8n',
    DOMAIN_NAME: variables.DOMAIN_NAME || 'example.com',
    POSTIZ_SUBDOMAIN: 'postiz',
    SSL_EMAIL: variables.SSL_EMAIL || 'admin@example.com',
    GENERIC_TIMEZONE: 'America/Sao_Paulo',
    JWT_SECRET: variables.JWT_SECRET || generateRandomSecret(),
  }

  // Primeiro substituir todas as variáveis fornecidas
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
    result = result.replace(regex, String(value))
  }

  // Depois substituir defaults para variáveis não fornecidas
  for (const [key, value] of Object.entries(defaultVars)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
    if (result.includes(`\${${key}}`)) {
      result = result.replace(regex, String(value))
    }
  }

  return result
}

// Helper: Gerar arquivo .env principal
function generateEnvFile(variables: Record<string, string>): string {
  const envLines = Object.entries(variables)
    .filter(([key]) => !key.startsWith('ORCHESTRATOR_')) // Separar variáveis do orchestrator
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  return `# Generated by N8N Platform Deploy
# Do not edit manually - changes will be overwritten

${envLines}

# Default values if not provided
DOMAIN_NAME=${variables.DOMAIN_NAME || 'example.com'}
SUBDOMAIN=${variables.SUBDOMAIN || 'n8n'}
POSTIZ_SUBDOMAIN=${variables.POSTIZ_SUBDOMAIN || 'postiz'}
SSL_EMAIL=${variables.SSL_EMAIL || 'admin@example.com'}
GENERIC_TIMEZONE=${variables.GENERIC_TIMEZONE || 'America/Sao_Paulo'}
JWT_SECRET=${variables.JWT_SECRET || generateRandomSecret()}
`
}

// Helper: Gerar .env do Content Orchestrator
function generateOrchestratorEnv(variables: Record<string, string>): string {
  return `# Content Orchestrator - Environment Variables
# Generated automatically by deploy

STORAGE_TYPE=local
LOCAL_STORAGE_PATH=/app/downloads

# Optional - can be set via workflow variables
${variables.GOOGLE_SHEETS_ID ? `GOOGLE_SHEETS_ID=${variables.GOOGLE_SHEETS_ID}` : ''}
${variables.CONTENT_ORCHESTRATOR_URL ? `CONTENT_ORCHESTRATOR_URL=${variables.CONTENT_ORCHESTRATOR_URL}` : ''}
`
}

// Helper: Preparar arquivos do Content Orchestrator para cópia
async function prepareOrchestratorFiles(): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = []
  const baseDir = './deploy/content-orchestrator'

  try {
    // Ler Dockerfile
    const dockerfile = await Deno.readTextFile(`${baseDir}/Dockerfile`)
    files.push({ path: 'Dockerfile', content: dockerfile })
  } catch (e) {
    console.warn('Dockerfile not found, skipping')
  }

  try {
    // Ler requirements.txt
    const requirements = await Deno.readTextFile(`${baseDir}/requirements.txt`)
    files.push({ path: 'requirements.txt', content: requirements })
  } catch (e) {
    console.warn('requirements.txt not found, skipping')
  }

  // Copiar estrutura de diretórios Python (recursivamente)
  try {
    await addDirectoryFilesRecursive(`${baseDir}/app`, 'app', files)
  } catch (e) {
    console.warn(`app/ directory not found: ${e.message}`)
  }

  return files
}

async function addDirectoryFilesRecursive(
  dirPath: string,
  relativePath: string,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  try {
    for await (const entry of Deno.readDir(dirPath)) {
      const fullPath = `${dirPath}/${entry.name}`
      const relPath = `${relativePath}/${entry.name}`

      if (entry.isFile) {
        // Copiar apenas arquivos Python
        if (entry.name.endsWith('.py') || entry.name === '__init__.py') {
          try {
            const content = await Deno.readTextFile(fullPath)
            files.push({ path: relPath, content })
          } catch (e) {
            console.warn(`Failed to read ${fullPath}: ${e.message}`)
          }
        }
      } else if (entry.isDirectory) {
        // Processar subdiretórios recursivamente
        await addDirectoryFilesRecursive(fullPath, relPath, files)
      }
    }
  } catch (e) {
    // Diretório não existe ou sem permissão
    console.warn(`Failed to read directory ${dirPath}: ${e.message}`)
  }
}

// Helper: Gerar secret aleatório
function generateRandomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper: Extrair domínio do host
function extractDomainFromHost(host: string): string {
  // Se já é um domínio (tem pontos e não é IP), retornar
  if (host.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return host.split(':')[0] // Remove porta se houver
  }
  // Se é IP, retornar domínio padrão (usuário deve configurar)
  return 'example.com'
}

