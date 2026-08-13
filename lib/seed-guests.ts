import { createClient } from './supabase/server'

export async function seedGuests() {
  const supabase = createClient()

  const testGuests = [
    {
      full_name: 'Juan Pérez',
      email: 'juan@example.com',
      plus_ones: 2,
      gift_description: null,
      is_godparent: false,
      is_attending: null,
    },
    {
      full_name: 'María García',
      email: 'maria@example.com',
      plus_ones: 1,
      gift_description: 'Crystal Vase',
      is_godparent: false,
      is_attending: null,
    },
    {
      full_name: 'Carlos López',
      email: 'carlos@example.com',
      plus_ones: 3,
      gift_description: null,
      is_godparent: true,
      is_attending: null,
    },
  ]

  for (const guest of testGuests) {
    const { data, error } = await (await supabase)
      .from('guests')
      .insert([guest])
      .select()

    if (error) {
      console.error('Error inserting guest:', error)
    } else {
      console.log('Guest created:', data?.[0]?.id, guest.full_name)
    }
  }
}
