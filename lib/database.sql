-- Create guests table
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plus_ones INT DEFAULT 0,
  gift_description TEXT,
  gift_type TEXT,
  gift_amount_usd NUMERIC,
  gift_amount_bs NUMERIC,
  is_godparent BOOLEAN DEFAULT FALSE,
  is_attending BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add gift columns to an existing guests table (run in the Supabase SQL editor)
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS gift_type TEXT,
  ADD COLUMN IF NOT EXISTS gift_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS gift_amount_bs NUMERIC;

-- Enable Row Level Security
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to select by UUID (for public invitations)
CREATE POLICY "Allow public access via UUID" ON public.guests
  FOR SELECT
  USING (true);

-- Allow inserting new guests (admin panel / seed script)
CREATE POLICY "Allow public inserts" ON public.guests
  FOR INSERT
  WITH CHECK (true);

-- Allow updating guests (RSVP from invitation page)
CREATE POLICY "Allow public updates" ON public.guests
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for the guests table (so the admin dashboard updates live).
-- Run this line in the Supabase SQL editor.
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;

-- Courtesy invitations: guests we know will not attend but receive the
-- invitation as a courtesy. courtesy_plus_ones = how many of their plus_ones
-- will attend anyway. Run in the Supabase SQL editor.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS is_courtesy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS courtesy_plus_ones INT DEFAULT 0;

-- Gender for personalizing the invitation (saludo y padrino/madrina).
-- Values: 'male' | 'female'; NULL = not assigned. Run in the Supabase SQL editor.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- -----------------------------------------------------------------------------
-- Gifts received at the wedding. Run in the Supabase SQL editor.
-- guest_id is optional (a gift can come from someone who is not a guest).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.received_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  gift_type TEXT,
  description TEXT,
  amount_usd NUMERIC,
  amount_bs NUMERIC,
  notes TEXT,
  received_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.received_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select received gifts" ON public.received_gifts
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert received gifts" ON public.received_gifts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update received gifts" ON public.received_gifts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete received gifts" ON public.received_gifts
  FOR DELETE
  USING (true);

DROP TRIGGER IF EXISTS update_received_gifts_updated_at ON public.received_gifts;

CREATE TRIGGER update_received_gifts_updated_at
  BEFORE UPDATE ON public.received_gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.received_gifts;

-- -----------------------------------------------------------------------------
-- Protocol check-in. Run in the Supabase SQL editor.
-- checked_in_at: arrival timestamp (NULL = not arrived yet).
-- attended_ceremony / attended_brindis: which parts of the day they attended.
-- protocol_notes: free-form comments from the protocol team about the guest.
-- -----------------------------------------------------------------------------
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attended_ceremony BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attended_brindis BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS protocol_notes TEXT;

-- -----------------------------------------------------------------------------
-- User roles for admin panel users ('ADMIN' | 'PROTOCOL').
-- Roles live in each Supabase Auth user's raw_user_meta_data. Assign them by
-- running these statements in the Supabase SQL editor:
--
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"role":"ADMIN"}'
--   WHERE email = 'admin@example.com';
--
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"role":"PROTOCOL"}'
--   WHERE email = 'protocol@example.com';
--
-- ADMIN has full dashboard access; PROTOCOL only sees /admin/protocol
-- (RSVP confirmations + day-of check-in). Users without a role are rejected.
-- -----------------------------------------------------------------------------

-- Who exactly showed up at check-in. Run in the Supabase SQL editor.
-- arrival_mode: 'alone' | 'with_companion' | 'companion_only'; NULL = not recorded.
-- companions_arrived: how many plus-ones actually arrived (0..plus_ones).
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS arrival_mode TEXT,
  ADD COLUMN IF NOT EXISTS companions_arrived INT DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Team chat. Run in the Supabase SQL editor.
--
-- chat_profiles: staff directory (auth.users is not readable with the anon
--   key). Each user upserts their own row when they open the chat.
-- chat_messages: room_id is 'group' for the team channel or 'dm:{a}|{b}' with
--   both user UUIDs sorted ascending for 1-on-1 conversations.
-- chat_message_status: one row per (message, user) with delivery/read times.
-- RLS is scoped to authenticated users only; the chat is never public.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx
  ON public.chat_messages (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_message_status (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_message_status_user_idx
  ON public.chat_message_status (user_id);

ALTER TABLE public.chat_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage own profile" ON public.chat_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated read profiles" ON public.chat_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read messages" ON public.chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender updates own messages" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Authenticated read statuses" ON public.chat_message_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated manage own status" ON public.chat_message_status
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_chat_profiles_updated_at ON public.chat_profiles;

CREATE TRIGGER update_chat_profiles_updated_at
  BEFORE UPDATE ON public.chat_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_status;

-- -----------------------------------------------------------------------------
-- Guest contact phone. Run in the Supabase SQL editor.
-- Stored as E.164 without spaces: '+584121688466'. NULL = not provided yet.
-- -----------------------------------------------------------------------------
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS phone TEXT;
