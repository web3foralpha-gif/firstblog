import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY_HEX = process.env.SETTINGS_ENCRYPTION_KEY || ''

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length < 32) {
    // 开发环境：用固定 fallback（生产必须设置环境变量）
    return crypto.scryptSync('dev-fallback-change-in-prod', 'salt', 32)
  }
  // 支持 hex 或 base64 格式的密钥
  if (/^[0-9a-f]{64}$/i.test(KEY_HEX)) return Buffer.from(KEY_HEX, 'hex')
  return Buffer.from(KEY_HEX, 'base64').slice(0, 32)
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // 格式: iv(12B):tag(16B):ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  try {
    const key = getKey()
    const buf = Buffer.from(ciphertext, 'base64')
    const iv  = buf.slice(0, 12)
    const tag = buf.slice(12, 28)
    const enc = buf.slice(28)
    const decipher = crypto.createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(enc).toString('utf8') + decipher.final('utf8')
  } catch {
    return ''
  }
}

export function maskSecret(value: string): string {
  if (!value || value.length < 8) return '••••••••'
  return value.slice(0, 4) + '••••••••' + value.slice(-4)
}
