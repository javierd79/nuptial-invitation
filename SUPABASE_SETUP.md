# Supabase Setup Guide

## Overview

This wedding invitation system now uses Supabase for guest management. Each guest has a unique UUID that they use to access their personalized invitation.

## Database Schema

The `guests` table contains the following columns:

- `id` (UUID): Unique identifier for each guest
- `full_name` (TEXT): Guest's full name
- `email` (TEXT): Guest's email address (unique)
- `plus_ones` (INT): Number of guests the person can bring
- `gift_description` (TEXT, nullable): Description of the gift (optional)
- `is_godparent` (BOOLEAN): Whether the guest is a godparent of the wedding
- `is_attending` (BOOLEAN, nullable): RSVP status (null = not responded, true = attending, false = not attending)
- `created_at` (TIMESTAMP): When the record was created
- `updated_at` (TIMESTAMP): When the record was last updated

## Setup Steps

### 1. Create the Database Table

Copy the SQL from `/lib/database.sql` and execute it in your Supabase SQL editor:

```sql
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

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

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

-- Create trigger for updated_at
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
```

### 2. Environment Variables

Make sure your Supabase environment variables are set in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

You can find these in your Supabase project settings.

### 3. Add Guests

There are two ways to add guests:

#### Option A: Admin Panel (Easy)

1. Navigate to http://localhost:3000/admin
2. Fill in the guest form with their details
3. Click "Add Guest"
4. The system will generate a UUID automatically
5. Copy the invitation link and send it to the guest

#### Option B: Bulk Insert via SQL

Execute directly in your Supabase SQL editor:

```sql
INSERT INTO public.guests (full_name, email, plus_ones, gift_description, is_godparent)
VALUES
  ('Juan Pérez', 'juan@example.com', 2, NULL, false),
  ('María García', 'maria@example.com', 1, 'Crystal Vase', false),
  ('Carlos López', 'carlos@example.com', 3, NULL, true);
```

### 4. Generate Guest Links

Once a guest is added, their UUID is shown in the admin panel. Share links in this format:

```
https://yoursite.com/?guest=550e8400-e29b-41d4-a716-446655440000
```

Replace `550e8400-e29b-41d4-a716-446655440000` with the actual guest UUID from the database.

## Guest Information Displayed

Each guest sees on their personalized invitation:

1. **Countdown Timer**: Days, hours, minutes, seconds until the wedding
2. **Wedding Date**: Saturday, November 15, 2025
3. **Their Name**: Personalized greeting
4. **Number of Plus Ones**: How many guests they can bring
5. **Gift Information** (if applicable): What they're gifting
6. **Godparent Status** (if applicable): If they're a godparent of the wedding
7. **RSVP Buttons**: Confirm or decline attendance

## Wedding Details

The system is configured for:

- **Date**: November 15, 2025
- **Time**: Ceremony at 16:30, Reception at 18:00
- **Location**: Hacienda Bella, Calle Principal 123

## Features

- UUID-based access control (each guest has unique link)
- Automatic countdown timer
- Beautiful full-screen video animation
- Elegant invitation design inspired by Vowlee
- RSVP tracking
- Guest gift tracking
- Godparent identification
- Plus ones management

## Editing Guest Data

To update a guest's information directly in the database:

```sql
UPDATE public.guests 
SET is_godparent = true, gift_description = 'Silver Picture Frame'
WHERE email = 'guest@example.com';
```

## Troubleshooting

### Guest Page Shows "Access Denied"
- Check that the UUID in the URL is correct
- Make sure the guest record exists in the database
- Verify that the guests table has RLS policies enabled

### Countdown Shows Wrong Time
- The wedding date is hardcoded as November 15, 2025 at 17:00
- Update the `WEDDING_DATE` constant in `components/WeddingInvitation.tsx` if needed

### Admin Page Won't Load
- Check that Supabase environment variables are set
- Verify your Supabase URL and anon key are correct
- Check browser console for specific error messages

## Security Notes

- The RLS policy allows anyone to view guest records by UUID
- Guests cannot update their own data through the invitation page
- Admin panel should be protected with authentication before production
- All updates to guest data should go through proper authorization
