-- Create guests table
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plus_ones INT DEFAULT 0,
  gift_description TEXT,
  is_godparent BOOLEAN DEFAULT FALSE,
  is_attending BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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
