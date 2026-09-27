import { mutateJson, readJson } from './store'
import { GIFT_TYPES, type AdminGuestPatch, type CreateGuestInput, type Gender, type GiftType, type Guest, type GuestGiftPatch, type PublicGuest } from './types'

const GUESTS_FILE = 'invitados.json'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isGuestId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = asNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback

const asNullableBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null

const asGender = (value: unknown): Gender | null =>
  value === 'male' || value === 'female' ? value : null

const nowIso = () => new Date().toISOString()

/**
 * Coerces a raw JSON value into a `Guest`, filling in anything a hand-edited
 * file may be missing. Rows without a usable UUID are dropped, because the
 * link cannot be built for them.
 */
function normalizeGuest(raw: unknown): Guest | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>

  const id = asString(record.id).trim()
  if (!isGuestId(id)) return null

  const createdAt = asString(record.created_at) || nowIso()
  const rawGiftType = asNullableString(record.gift_type)

  return {
    id,
    full_name: asString(record.full_name).trim().replace(/\s+/g, ' '),
    email: asString(record.email).trim().toLowerCase(),
    gender: asGender(record.gender),
    plus_ones: Math.max(0, Math.trunc(asNumber(record.plus_ones))),
    is_courtesy: asBoolean(record.is_courtesy),
    courtesy_plus_ones: Math.max(0, Math.trunc(asNumber(record.courtesy_plus_ones))),
    is_godparent: asBoolean(record.is_godparent),
    is_attending: asNullableBoolean(record.is_attending),
    phone: asNullableString(record.phone),
    // A hand-edited file must not be able to inject a type the UI cannot render.
    gift_type: GIFT_TYPES.includes(rawGiftType as GiftType) ? (rawGiftType as GiftType) : null,
    gift_description: asNullableString(record.gift_description),
    gift_amount_usd: asNullableNumber(record.gift_amount_usd),
    gift_amount_bs: asNullableNumber(record.gift_amount_bs),
    created_at: createdAt,
    updated_at: asString(record.updated_at) || createdAt,
  }
}

function normalizeList(raw: unknown): Guest[] {
  if (!Array.isArray(raw)) return []
  const guests = raw.map(normalizeGuest).filter((guest): guest is Guest => guest !== null)
  return guests.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
}

async function readGuests(): Promise<Guest[]> {
  return normalizeList(await readJson<unknown>(GUESTS_FILE, []))
}

async function writeGuests(guests: Guest[]): Promise<void> {
  await mutateJson<Guest[]>(GUESTS_FILE, [], (current) => {
    current.splice(0, current.length, ...guests)
  })
}

/** Every guest, newest first. */
export async function getGuests(): Promise<Guest[]> {
  return readGuests()
}

export async function getGuestById(id: string): Promise<Guest | null> {
  if (!isGuestId(id)) return null
  return (await readGuests()).find((guest) => guest.id === id) ?? null
}

export function toPublicGuest(guest: Guest): PublicGuest {
  return {
    id: guest.id,
    full_name: guest.full_name,
    gender: guest.gender,
    plus_ones: guest.plus_ones,
    is_godparent: guest.is_godparent,
    is_attending: guest.is_attending,
    gift_type: guest.gift_type,
    gift_description: guest.gift_description,
    gift_amount_usd: guest.gift_amount_usd,
    gift_amount_bs: guest.gift_amount_bs,
  }
}

/** Guest behind an invitation link, without the private fields. */
export async function getPublicGuest(id: string): Promise<PublicGuest | null> {
  const guest = await getGuestById(id)
  return guest === null ? null : toPublicGuest(guest)
}

export class DuplicateEmailError extends Error {}

export async function createGuest(input: CreateGuestInput): Promise<Guest> {
  const email = input.email.trim().toLowerCase()
  if (email !== '' && (await readGuests()).some((guest) => guest.email === email)) {
    throw new DuplicateEmailError('Ya existe un invitado con ese correo.')
  }

  const timestamp = nowIso()
  const guest: Guest = {
    id: crypto.randomUUID(),
    full_name: input.full_name.trim().replace(/\s+/g, ' '),
    email,
    gender: input.gender ?? null,
    plus_ones: Math.max(0, Math.trunc(input.plus_ones ?? 0)),
    is_courtesy: input.is_courtesy ?? false,
    courtesy_plus_ones: input.is_courtesy
      ? Math.max(0, Math.trunc(input.courtesy_plus_ones ?? 0))
      : 0,
    is_godparent: input.is_godparent ?? false,
    is_attending: null,
    phone: null,
    gift_type: null,
    gift_description: null,
    gift_amount_usd: null,
    gift_amount_bs: null,
    created_at: timestamp,
    updated_at: timestamp,
  }

  await mutateJson<Guest[]>(GUESTS_FILE, [], (current) => {
    current.push(guest)
  })

  return guest
}

export async function updateGuest(id: string, patch: AdminGuestPatch): Promise<Guest | null> {
  if (!isGuestId(id)) return null

  let updated: Guest | null = null

  await mutateJson<Guest[]>(GUESTS_FILE, [], (current) => {
    const index = current.findIndex((guest) => guest.id === id)
    if (index === -1) return

    const next = applyPatch(current[index], patch)
    next.updated_at = nowIso()
    current[index] = next
    updated = next
  })

  return updated
}

function applyPatch(guest: Guest, patch: AdminGuestPatch): Guest {
  const next: Guest = { ...guest }

  if (patch.full_name !== undefined) {
    next.full_name = patch.full_name.trim().replace(/\s+/g, ' ')
  }
  if (patch.email !== undefined) {
    next.email = patch.email.trim().toLowerCase()
  }
  if (patch.gender !== undefined) next.gender = patch.gender
  if (patch.plus_ones !== undefined) {
    next.plus_ones = Math.max(0, Math.trunc(patch.plus_ones))
  }
  if (patch.is_courtesy !== undefined) {
    next.is_courtesy = patch.is_courtesy
    if (!patch.is_courtesy) next.courtesy_plus_ones = 0
  }
  if (patch.courtesy_plus_ones !== undefined) {
    next.courtesy_plus_ones = Math.max(0, Math.trunc(patch.courtesy_plus_ones))
  }
  if (patch.is_godparent !== undefined) next.is_godparent = patch.is_godparent
  if (patch.is_attending !== undefined) next.is_attending = patch.is_attending
  if (patch.phone !== undefined) next.phone = patch.phone

  if (next.is_courtesy === false) next.courtesy_plus_ones = 0
  next.courtesy_plus_ones = Math.min(next.courtesy_plus_ones, next.plus_ones)

  return next
}

/** Called by a guest from their own invitation. `is_attending` only. */
export async function updateGuestRsvp(
  id: string,
  attending: boolean,
): Promise<Guest | null> {
  return updateGuest(id, { is_attending: attending })
}

/** Called by a guest from their own invitation. Gift fields only. */
export async function updateGuestGift(id: string, patch: GuestGiftPatch): Promise<Guest | null> {
  if (!isGuestId(id)) return null

  let updated: Guest | null = null

  await mutateJson<Guest[]>(GUESTS_FILE, [], (current) => {
    const index = current.findIndex((guest) => guest.id === id)
    if (index === -1) return

    const next: Guest = {
      ...current[index],
      gift_type: patch.gift_type,
      gift_description: patch.gift_description,
      gift_amount_usd: patch.gift_amount_usd,
      gift_amount_bs: patch.gift_amount_bs,
      updated_at: nowIso(),
    }
    current[index] = next
    updated = next
  })

  return updated
}

export async function deleteGuest(id: string): Promise<boolean> {
  if (!isGuestId(id)) return false

  let removed = false

  await mutateJson<Guest[]>(GUESTS_FILE, [], (current) => {
    const index = current.findIndex((guest) => guest.id === id)
    if (index === -1) return
    current.splice(index, 1)
    removed = true
  })

  return removed
}

/** One-shot migration from the old Supabase export. */
export async function replaceGuests(raw: unknown): Promise<{ imported: number; skipped: number }> {
  const seen = new Set<string>()
  const guests = normalizeList(raw).filter((guest) => {
    // Keep the email unique, the same invariant createGuest enforces.
    if (guest.email === '') return true
    if (seen.has(guest.email)) return false
    seen.add(guest.email)
    return true
  })

  await writeGuests(guests)

  // Rows dropped for a missing/invalid id, so the panel can say so out loud
  // instead of reporting a silent no-op.
  return { imported: guests.length, skipped: Array.isArray(raw) ? raw.length - guests.length : 0 }
}
