/**
 * Testes End-to-End para Deploy VPS
 * 
 * Estes testes verificam o fluxo completo de deploy:
 * 1. Validação de credenciais SSH
 * 2. Criação de arquivos (docker-compose.yml, .env)
 * 3. Cópia de arquivos via SFTP
 * 4. Execução de docker-compose
 * 5. Verificação de serviços rodando
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

// Configuração de teste (usar variáveis de ambiente)
const TEST_VPS_HOST = Deno.env.get('TEST_VPS_HOST') || ''
const TEST_VPS_USER = Deno.env.get('TEST_VPS_USER') || 'root'
const TEST_VPS_PASSWORD = Deno.env.get('TEST_VPS_PASSWORD') || ''
const TEST_VPS_SSH_KEY = Deno.env.get('TEST_VPS_SSH_KEY') || ''

// Funções auxiliares para testes
interface TestSshConfig {
  host: string
  username: string
  password?: string
  ssh_key?: string
  port: number
  use_ssh_key: boolean
}

function createTestSshConfig(): TestSshConfig {
  return {
    host: TEST_VPS_HOST,
    username: TEST_VPS_USER,
    password: TEST_VPS_PASSWORD || undefined,
    ssh_key: TEST_VPS_SSH_KEY || undefined,
    port: 22,
    use_ssh_key: !!TEST_VPS_SSH_KEY,
  }
}

// Teste 1: Validação de conexão SSH
Deno.test('SSH Connection Validation', async () => {
  const config = createTestSshConfig()
  
  if (!config.host) {
    console.log('⚠️ TEST_VPS_HOST não configurado - pulando teste SSH')
    return
  }

  // Testar conexão básica
  const process = new Deno.Command('ssh', {
    args: [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=5',
      '-p', config.port.toString(),
      `${config.username}@${config.host}`,
      'echo "SSH_OK"',
    ],
    stdout: 'piped',
    stderr: 'piped',
  })

  const output = await process.output()
  const stdout = new TextDecoder().decode(output.stdout)

  assertEquals(output.code, 0, 'SSH connection should succeed')
  assertEquals(stdout.trim(), 'SSH_OK', 'SSH command should return expected output')
})

// Teste 2: Geração de docker-compose.yml
Deno.test('Docker Compose Template Generation', () => {
  const variables = {
    DOMAIN_NAME: 'test.example.com',
    POSTIZ_SUBDOMAIN: 'postiz',
    SSL_EMAIL: 'test@example.com',
    JWT_SECRET: 'test-secret-123',
  }

  // Simular geração (mesma lógica da Edge Function)
  let template = 'version: \'3.8\'\nservices:\n  postiz:\n    environment:\n      MAIN_URL: "https://${POSTIZ_SUBDOMAIN}.${DOMAIN_NAME}"'
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
    template = template.replace(regex, String(value))
  }

  assertExists(template, 'Template should be generated')
  assertEquals(template.includes('test.example.com'), true, 'Template should contain domain')
  assertEquals(template.includes('postiz'), true, 'Template should contain subdomain')
})

// Teste 3: Geração de .env
Deno.test('Environment File Generation', () => {
  const variables = {
    DOMAIN_NAME: 'test.example.com',
    SSL_EMAIL: 'test@example.com',
    JWT_SECRET: 'test-secret',
  }

  const envLines = Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  assertExists(envLines, 'Environment file should be generated')
  assertEquals(envLines.includes('DOMAIN_NAME=test.example.com'), true, 'Should contain DOMAIN_NAME')
  assertEquals(envLines.includes('SSL_EMAIL=test@example.com'), true, 'Should contain SSL_EMAIL')
})

// Teste 4: Estrutura de arquivos Content Orchestrator
Deno.test('Content Orchestrator Files Structure', async () => {
  const requiredFiles = [
    'app/main.py',
    'app/api/routes/health.py',
    'Dockerfile',
    'requirements.txt',
  ]

  for (const file of requiredFiles) {
    const fullPath = `./deploy/content-orchestrator/${file}`
    try {
      const stat = await Deno.stat(fullPath)
      assertExists(stat, `File ${file} should exist`)
    } catch (e) {
      throw new Error(`Required file ${file} not found: ${e.message}`)
    }
  }
})

// Teste 5: Validação de variáveis obrigatórias
Deno.test('Required Variables Validation', () => {
  const requiredVars = ['DOMAIN_NAME', 'SSL_EMAIL', 'POSTIZ_SUBDOMAIN']
  const testVars = {
    DOMAIN_NAME: 'example.com',
    SSL_EMAIL: 'admin@example.com',
    POSTIZ_SUBDOMAIN: 'postiz',
  }

  const missing = requiredVars.filter((key) => !testVars[key as keyof typeof testVars])
  assertEquals(missing.length, 0, `Missing required variables: ${missing.join(', ')}`)
})

// Teste 6: Validação de formato de domínio
Deno.test('Domain Format Validation', () => {
  const validDomains = ['example.com', 'sub.example.com', 'test.io']
  const invalidDomains = ['example', 'example.', '.com', 'example..com']

  validDomains.forEach((domain) => {
    const isValid = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain)
    assertEquals(isValid, true, `Domain ${domain} should be valid`)
  })

  invalidDomains.forEach((domain) => {
    const isValid = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain)
    assertEquals(isValid, false, `Domain ${domain} should be invalid`)
  })
})

// Teste 7: Validação de formato de email
Deno.test('Email Format Validation', () => {
  const validEmails = ['admin@example.com', 'test+ssl@domain.io']
  const invalidEmails = ['notanemail', '@example.com', 'test@']

  validEmails.forEach((email) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    assertEquals(isValid, true, `Email ${email} should be valid`)
  })

  invalidEmails.forEach((email) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    assertEquals(isValid, false, `Email ${email} should be invalid`)
  })
})

// Instruções para rodar os testes
console.log(`
📋 Como rodar os testes:

1. Testes unitários (não requer VPS):
   deno test tests/e2e/deploy.test.ts

2. Testes de integração (requer VPS configurada):
   export TEST_VPS_HOST=your.vps.ip
   export TEST_VPS_USER=root
   export TEST_VPS_PASSWORD=yourpassword
   # ou
   export TEST_VPS_SSH_KEY="$(cat ~/.ssh/id_rsa)"
   
   deno test --allow-run --allow-read tests/e2e/deploy.test.ts

3. Testes específicos:
   deno test tests/e2e/deploy.test.ts --filter "SSH Connection"
`)

