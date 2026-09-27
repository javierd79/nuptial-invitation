export const GENDERS = ['male', 'female'] as const

export type Gender = (typeof GENDERS)[number]

export const GIFT_TYPES = [
  'fisico',
  'efectivo',
  'pago_movil',
  'binance',
  'paypal',
  'otro',
] as const

export type GiftType = (typeof GIFT_TYPES)[number]

/** A guest record, as stored in `data/invitados.json`. */
export interface Guest {
  /** UUID, used as the secret in the invitation link: `/?guest=<id>`. */
  id: string
  full_name: string
  email: string
  gender: Gender | null
  plus_ones: number
  is_courtesy: boolean
  courtesy_plus_ones: number
  is_godparent: boolean
  is_attending: boolean | null
  phone: string | null
  gift_type: GiftType | null
  gift_description: string | null
  gift_amount_usd: number | null
  gift_amount_bs: number | null
  created_at: string
  updated_at: string
}

/**
 * The subset handed to the public invitation. Deliberately omits `email` and
 * `phone` so they never reach the browser of whoever opens the link.
 */
export type PublicGuest = Pick<
  Guest,
  | 'id'
  | 'full_name'
  | 'gender'
  | 'plus_ones'
  | 'is_godparent'
  | 'is_attending'
  | 'gift_type'
  | 'gift_description'
  | 'gift_amount_usd'
  | 'gift_amount_bs'
>

export type CreateGuestInput = Pick<Guest, 'full_name' | 'email'> &
  Partial<Pick<Guest, 'gender' | 'plus_ones' | 'is_courtesy' | 'courtesy_plus_ones' | 'is_godparent'>>

/** Fields the admin panel is allowed to change. */
export type AdminGuestPatch = Partial<
  Pick<
    Guest,
    | 'full_name'
    | 'email'
    | 'gender'
    | 'plus_ones'
    | 'is_courtesy'
    | 'courtesy_plus_ones'
    | 'is_godparent'
    | 'is_attending'
    | 'phone'
  >
>

/** Fields a guest is allowed to change on their own invitation. */
export type GuestGiftPatch = Pick<
  Guest,
  'gift_type' | 'gift_description' | 'gift_amount_usd' | 'gift_amount_bs'
>

export const USER_ROLES = ['ADMIN'] as const

export type UserRole = (typeof USER_ROLES)[number]

/** An admin account, as stored in `data/usuarios.json`. */
export interface User {
  username: string
  role: UserRole
  /** Hex-encoded scrypt salt. */
  salt: string
  /** Hex-encoded scrypt hash. */
  passHash: string
}

export interface SessionUser {
  username: string
  role: UserRole
}
