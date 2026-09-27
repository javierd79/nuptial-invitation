import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { readJson } from './store'
import { USER_ROLES, type SessionUser, type User, type UserRole } from './types'

const USERS_FILE = 'usuarios.json'
const KEY_LENGTH = 64
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

const deriveKey = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)

function normalizeUsers(raw: unknown): User[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((entry): entry is User => {
    if (typeof entry !== 'object' || entry === null) return false
    const record = entry as Record<string, unknown>
    return (
      typeof record.username === 'string' &&
      record.username !== '' &&
      typeof record.salt === 'string' &&
      typeof record.passHash === 'string' &&
      isUserRole(record.role)
    )
  })
}

export async function getUsers(): Promise<User[]> {
  return normalizeUsers(await readJson<unknown>(USERS_FILE, []))
}

export async function findUser(username: string): Promise<User | null> {
  const key = username.trim().toLowerCase()
  const users = await getUsers()
  return users.find((user) => user.username.toLowerCase() === key) ?? null
}

/** Used by `scripts/hash-password.mjs` and by tests; never on a request path. */
export async function hashPassword(
  password: string,
  salt: string = randomBytes(16).toString('hex'),
): Promise<{ salt: string; passHash: string }> {
  const derived = await deriveKey(password, salt)
  return { salt, passHash: derived.toString('hex') }
}

export async function verifyPassword(password: string, user: User): Promise<boolean> {
  const derived = await deriveKey(password, user.salt)
  const expected = Buffer.from(user.passHash, 'hex')

  if (expected.length !== derived.length) return false
  return timingSafeEqual(derived, expected)
}

/**
 * Returns the signed-in identity for valid credentials, or null. The comparison
 * always runs scrypt, so a wrong username and a wrong password take the same
 * time and cannot be told apart.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUser(username)
  const derived = await deriveKey(password, user?.salt ?? 'not-a-real-user')

  if (user === null) return null

  const expected = Buffer.from(user.passHash, 'hex')
  if (expected.length !== derived.length) return null
  if (!timingSafeEqual(derived, expected)) return null

  return { username: user.username, role: user.role }
}
