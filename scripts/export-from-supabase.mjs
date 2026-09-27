#!/usr/bin/env node
// One-shot export of the old Supabase `guests` table into data/invitados.json.
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/export-from-supabase.mjs
//
// Needs the *service role* key (Settings > API), because the anon key was only
// allowed to read guests. Existing UUIDs are kept, so links already sent by
// WhatsApp keep working after the import.
//
// Afterwards: panel admin > "Importar invitados.json".

import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const base = SUPABASE_URL.replace(/\/+$/, '')
const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
}

async function fetchRows(table) {
  const response = await fetch(`${base}/rest/v1/${table}?select=*`, { headers })

  if (!response.ok) {
    throw new Error(`${table}: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

const guests = await fetchRows('guests')

const rows = guests.map((guest) => ({
  id: guest.id,
  full_name: guest.full_name,
  email: guest.email,
  gender: guest.gender ?? null,
  plus_ones: guest.plus_ones ?? 0,
  is_courtesy: guest.is_courtesy ?? false,
  courtesy_plus_ones: guest.courtesy_plus_ones ?? 0,
  is_godparent: guest.is_godparent ?? false,
  is_attending: guest.is_attending ?? null,
  phone: guest.phone ?? null,
  gift_type: guest.gift_type ?? null,
  gift_description: guest.gift_description ?? null,
  gift_amount_usd: guest.gift_amount_usd ?? null,
  gift_amount_bs: guest.gift_amount_bs ?? null,
  created_at: guest.created_at ?? new Date().toISOString(),
  updated_at: guest.updated_at ?? guest.created_at ?? new Date().toISOString(),
}))

const target = path.join(process.cwd(), 'data', 'invitados.json')
await writeFile(target, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')

console.log(`${rows.length} invitados escritos en ${target}`)
console.log('Siguiente paso: panel admin > "Importar invitados.json".')
