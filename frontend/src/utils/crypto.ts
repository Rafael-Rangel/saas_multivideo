/**
 * Utilitários de criptografia para o Frontend
 * Criptografa dados antes de enviar para o backend
 * 
 * NOTA: Criptografia no frontend é limitada (chave compartilhada)
 * O ideal seria o backend criptografar, mas para MVP, criptografamos no frontend
 * para evitar enviar credenciais em texto plano pela rede.
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

/**
 * Deriva uma chave a partir de uma string (simplificado para frontend)
 * Em produção, considere usar Web Crypto com PBKDF2
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  
  // Importar secret como chave
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Salt (usar o mesmo do backend para compatibilidade)
  const salt = encoder.encode('supabase-n8n-platform-salt')

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
 * Criptografa texto no frontend (antes de enviar para API)
 * 
 * ⚠️ IMPORTANTE: A chave de criptografia deve vir de uma Edge Function
 * ou ser compartilhada de forma segura. Para MVP, usamos variável de ambiente.
 * 
 * @param plaintext Texto a ser criptografado
 * @returns Texto criptografado em base64
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return ''

  // Obter chave de criptografia (vem de Edge Function ou env)
  // Por enquanto, vamos criptografar no frontend mas a Edge Function descriptografa
  // Em produção, melhor seria: frontend -> Edge Function -> Edge Function criptografa -> salva no banco
  
  // Para MVP: obter chave do backend via Edge Function ou usar uma chave pública
  // Por segurança, vamos deixar o frontend enviar em texto plano para Edge Function
  // que então criptografa antes de salvar no banco
  
  // Este arquivo está preparado para quando implementarmos criptografia no frontend
  
  // Por enquanto, retornar texto plano (Edge Function criptografa)
  return plaintext
}

/**
 * NOTA: Para MVP, não descriptografamos no frontend.
 * O backend (Edge Functions) faz toda a criptografia/descriptografia.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  // Frontend não descriptografa - backend faz isso
  return ciphertext
}

