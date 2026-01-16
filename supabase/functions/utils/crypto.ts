/**
 * Utilitários de criptografia para Supabase Edge Functions
 * Usa Web Crypto API (disponível no Deno)
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256 // bits
const IV_LENGTH = 12 // bytes para GCM
const TAG_LENGTH = 16 // bytes para GCM

/**
 * Deriva uma chave de criptografia a partir de uma string
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const data = encoder.encode(secret)
  
  // Usar PBKDF2 para derivar chave (mais seguro que usar secret diretamente)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = encoder.encode('supabase-n8n-platform-salt') // Salt fixo (melhorar em produção)
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Criptografa um texto usando AES-GCM
 * @param plaintext Texto a ser criptografado
 * @param secret Chave secreta (vem da variável de ambiente ENCRYPTION_KEY)
 * @returns Texto criptografado em base64 (IV + ciphertext + tag)
 */
export async function encrypt(plaintext: string, secret: string): Promise<string> {
  if (!plaintext) return ''
  if (!secret) {
    throw new Error('ENCRYPTION_KEY não configurada')
  }

  try {
    const key = await deriveKey(secret)
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)

    // Gerar IV aleatório
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Criptografar
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH * 8, // em bits
      },
      key,
      data
    )

    // Concatenar IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedData), iv.length)

    // Converter para base64 para armazenar no banco
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error(`Falha ao criptografar: ${error.message}`)
  }
}

/**
 * Descriptografa um texto criptografado com AES-GCM
 * @param ciphertext Texto criptografado em base64 (IV + ciphertext + tag)
 * @param secret Chave secreta (vem da variável de ambiente ENCRYPTION_KEY)
 * @returns Texto descriptografado
 */
export async function decrypt(ciphertext: string, secret: string): Promise<string> {
  if (!ciphertext) return ''
  if (!secret) {
    throw new Error('ENCRYPTION_KEY não configurada')
  }

  try {
    const key = await deriveKey(secret)

    // Converter de base64
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))

    // Extrair IV e dados criptografados
    const iv = combined.slice(0, IV_LENGTH)
    const encryptedData = combined.slice(IV_LENGTH)

    // Descriptografar
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH * 8, // em bits
      },
      key,
      encryptedData
    )

    // Converter para string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedData)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error(`Falha ao descriptografar: ${error.message}`)
  }
}

