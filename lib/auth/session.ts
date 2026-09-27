/**
 * Signed session cookie helpers.
 *
 * Everything here is built on Web Crypto rather than `node:crypto` so that
 * `middleware.ts` — which runs on the Edge runtime — can verify the cookie
 * without pulling Node built-ins into the bundle.
 */
import {
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
} from './types'

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './types'

const encoder = new TextEncoder()

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'Falta ADMIN_SESSION_SECRET en el entorno (se necesita una cadena de al menos 32 caracteres).',
    )
  }

  return encoder.encode(secret)
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    getSecret(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array | null {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')

  try {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
  } catch {
    return null
  }
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const key = await getKey()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))

  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

/** Returns the payload when the signature is valid and the token has not expired. */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const body = token.slice(0, separator)
  const signature = fromBase64Url(token.slice(separator + 1))
  if (signature === null) return null

  const key = await getKey()
  const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(body))
  if (!valid) return null

  const raw = fromBase64Url(body)
  if (raw === null) return null

  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder().decode(raw))
  } catch {
    return null
  }

  if (typeof payload !== 'object' || payload === null) return null

  const { u, r, exp } = payload as Record<string, unknown>
  if (typeof u !== 'string' || typeof r !== 'string' || typeof exp !== 'number') return null
  if (exp * 1000 <= Date.now()) return null

  return { u, r: r as SessionPayload['r'], exp }
}

export function sessionExpiry(): number {
  return Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
}
