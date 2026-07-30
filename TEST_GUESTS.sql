-- Test Guests SQL - Copy and paste into Supabase SQL editor
-- This will create sample guests for testing the invitation system

-- Insert test guests
INSERT INTO public.guests (full_name, email, plus_ones, gift_description, is_godparent, is_attending)
VALUES
  -- Regular guests
  ('Juan Pérez', 'juan.perez@email.com', 2, NULL, false, NULL),
  ('María García', 'maria.garcia@email.com', 1, 'Crystal Vase', false, NULL),
  ('Carlos López', 'carlos.lopez@email.com', 0, NULL, false, NULL),
  
  -- Godparents
  ('Roberto Martínez', 'roberto.martinez@email.com', 1, NULL, true, NULL),
  ('Sofía Rodríguez', 'sofia.rodriguez@email.com', 0, 'Silver Picture Frame', true, NULL),
  
  -- Guests with special gifts
  ('Ana Sánchez', 'ana.sanchez@email.com', 3, 'Luxury Bedding Set', false, NULL),
  ('Diego Fernández', 'diego.fernandez@email.com', 2, 'Wine Cellar Collection', false, NULL),
  
  -- Guests with responses already
  ('Elena Torres', 'elena.torres@email.com', 1, NULL, false, true),
  ('Francisco Morales', 'francisco.morales@email.com', 2, 'Kitchen Appliance', false, false),
  
  -- Large parties
  ('Javier Iglesias', 'javier.iglesias@email.com', 4, NULL, false, NULL),
  ('Lidia Gutierrez', 'lidia.gutierrez@email.com', 3, 'Garden Furniture Set', false, NULL),
  
  -- VIP guests
  ('Antonio Ruiz', 'antonio.ruiz@email.com', 1, NULL, true, true),
  ('Claudia Vargas', 'claudia.vargas@email.com', 0, 'Luxury Watch', false, true);

-- View your new guests with their UUIDs (use this to create invitation links)
SELECT full_name, email, id as uuid, plus_ones, gift_description, is_godparent
FROM public.guests
ORDER BY full_name;

-- To generate invitation links, use this query:
SELECT 
  full_name,
  'http://localhost:3000/?guest=' || id as local_link,
  'https://your-domain.com/?guest=' || id as production_link
FROM public.guests
ORDER BY full_name;

-- Count guests by status
SELECT 
  'Total Guests' as metric,
  COUNT(*) as count
FROM public.guests
UNION ALL
SELECT 
  'Attending',
  COUNT(*) 
FROM public.guests
WHERE is_attending = true
UNION ALL
SELECT 
  'Not Attending',
  COUNT(*) 
FROM public.guests
WHERE is_attending = false
UNION ALL
SELECT 
  'No Response Yet',
  COUNT(*) 
FROM public.guests
WHERE is_attending IS NULL
UNION ALL
SELECT 
  'Godparents',
  COUNT(*) 
FROM public.guests
WHERE is_godparent = true
UNION ALL
SELECT 
  'With Gift Descriptions',
  COUNT(*) 
FROM public.guests
WHERE gift_description IS NOT NULL;

-- Calculate total guests (including plus ones) for those attending
SELECT 
  COUNT(*) as attending_guests,
  SUM(plus_ones) as plus_ones_attending,
  COUNT(*) + SUM(plus_ones) as total_people_attending
FROM public.guests
WHERE is_attending = true;

-- Export all guest links as CSV-friendly format
SELECT 
  full_name || ' | ' || email || ' | http://localhost:3000/?guest=' || id as guest_data
FROM public.guests
ORDER BY full_name;

-- Get guests still needing to RSVP
SELECT full_name, email, id as uuid
FROM public.guests
WHERE is_attending IS NULL
ORDER BY full_name;

-- View godparents
SELECT full_name, email, id as uuid, gift_description
FROM public.guests
WHERE is_godparent = true
ORDER BY full_name;

-- View guests with specific gifts
SELECT full_name, email, gift_description, id as uuid
FROM public.guests
WHERE gift_description IS NOT NULL
ORDER BY full_name;

-- Calculate party sizes
SELECT 
  full_name,
  plus_ones,
  (plus_ones + 1) as total_party_size,
  id as uuid
FROM public.guests
WHERE plus_ones > 0
ORDER BY plus_ones DESC;
