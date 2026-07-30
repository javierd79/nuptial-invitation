# Guest UUID Links - Complete Guide

## What is a UUID?

A UUID (Universally Unique Identifier) is a 128-bit number used to uniquely identify information. In this system, each guest gets an auto-generated UUID that serves as their private access code to the invitation.

Example UUID: `550e8400-e29b-41d4-a716-446655440000`

## How UUIDs Work in This System

1. When you add a guest via the admin panel, Supabase automatically generates a unique UUID
2. Each guest gets exactly one UUID
3. The guest uses their UUID in the invitation link
4. The system validates the UUID and shows the personalized invitation
5. No two guests have the same UUID (cryptographically guaranteed)

## Getting Guest UUIDs

### Method 1: Admin Panel (Recommended)
1. Go to http://localhost:3000/admin
2. Add a new guest or load existing guests
3. View the "Guests List" table
4. Find the guest and locate their UUID (first 8 characters shown, full UUID available)
5. Copy the full UUID

### Method 2: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to Tables → guests
3. Select the guest record
4. Copy the `id` field value (this is their UUID)

### Method 3: SQL Query
```sql
SELECT full_name, email, id FROM public.guests;
```

## Creating Guest Links

The invitation link format is:

```
https://yoursite.com/?guest=GUEST_UUID
```

### Examples

**Local Development:**
```
http://localhost:3000/?guest=550e8400-e29b-41d4-a716-446655440000
http://localhost:3000/?guest=6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

**Production (Vercel):**
```
https://your-wedding.vercel.app/?guest=550e8400-e29b-41d4-a716-446655440000
https://your-wedding.vercel.app/?guest=6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

**Custom Domain:**
```
https://yourdomain.com/?guest=550e8400-e29b-41d4-a716-446655440000
```

## Creating Multiple Guest Links

If you need to create links for all guests at once:

### Using SQL

```sql
SELECT 
  full_name,
  email,
  'https://your-domain.com/?guest=' || id AS invitation_link
FROM public.guests
ORDER BY full_name;
```

This will generate a table showing:
- Guest Name
- Email
- Their unique invitation link

### Copy & Paste Method

1. Get the SQL output above
2. Copy all invitation links
3. Paste into your email template or CSV

### Bulk Email Template

```
Dear [GUEST_NAME],

We're delighted to invite you to our wedding celebration!

Please visit your personalized invitation here:
[INVITATION_LINK]

We can't wait to celebrate with you!

Warmly,
Javier & Maria
```

## Special Guest Types

### Godparents
Godparents see special messaging on their invitation:
```
Role: Godparent of the Wedding
```

To mark someone as a godparent:
1. Check the "Is Godparent" box in the admin form, OR
2. Run this SQL:
   ```sql
   UPDATE public.guests SET is_godparent = true WHERE email = 'godparent@example.com';
   ```

### Guests with Gifts
Guests with specific gifts see their gift details:
```
Gift: Crystal Vase
```

To add a gift:
1. Fill the "Gift Description" field in admin form, OR
2. Run this SQL:
   ```sql
   UPDATE public.guests 
   SET gift_description = 'Crystal Vase' 
   WHERE email = 'guest@example.com';
   ```

## Plus Ones

Each guest can bring a certain number of additional guests (plus ones).

To set plus ones:
1. Enter the number in "Plus Ones" field in admin form, OR
2. Run this SQL:
   ```sql
   UPDATE public.guests SET plus_ones = 2 WHERE email = 'guest@example.com';
   ```

On their invitation, they'll see:
```
Party Size
3
guests
```

## What Guests See with Their UUID

When a guest visits their unique link, they see:

1. **Loading Screen** (1.5 seconds)
   - Validates their UUID against the database

2. **Interactive Envelope**
   - Beautiful animated envelope
   - "Tap to open" prompt

3. **Video** (full screen)
   - Auto-plays beautiful invitation video
   - Fade transition effects

4. **Personalized Invitation**
   - Their name in the greeting
   - Countdown timer to the wedding
   - Their plus one count
   - Gift information (if applicable)
   - Special godparent recognition (if applicable)
   - RSVP buttons

## Tracking RSVP Status

### View RSVP Status

SQL Query:
```sql
SELECT full_name, email, is_attending, updated_at
FROM public.guests
WHERE is_attending IS NOT NULL
ORDER BY updated_at DESC;
```

### Get Attendance Summary

```sql
SELECT 
  SUM(CASE WHEN is_attending = true THEN 1 ELSE 0 END) as attending,
  SUM(CASE WHEN is_attending = false THEN 1 ELSE 0 END) as not_attending,
  SUM(CASE WHEN is_attending IS NULL THEN 1 ELSE 0 END) as no_response
FROM public.guests;
```

### Calculate Total Guest Count

```sql
SELECT 
  SUM(CASE WHEN is_attending = true THEN (1 + plus_ones) ELSE 0 END) as total_guests_attending
FROM public.guests;
```

## Sharing Guest Links

### Email
Send each guest their individual link via email

### Text/Messaging
Share the link directly in messaging apps

### QR Code
Generate QR codes for links to print or display:
- Use qr-code generators like qr-server.com
- Scan with phone to access invitation

### Social Media (Private)
Send links via DMs or private messages

## Security Best Practices

### Do's:
- Share links directly with intended guests
- Use HTTPS links (automatic if deployed to Vercel)
- Regenerate links if compromised
- Keep UUID pattern consistent (36 characters with hyphens)

### Don'ts:
- Don't post guest links publicly on social media
- Don't share UUIDs in unencrypted messages
- Don't use predictable patterns for UUIDs
- Don't reuse UUIDs across different systems

## Troubleshooting Guest Links

### Link Shows "Access Denied"
- Verify UUID is exactly correct (36 characters)
- Check that guest record exists in database
- Ensure database table is created and accessible

### Guest Gets Different Name
- The UUID is definitely correct; check the database
- Verify you copied the full UUID (not truncated version)

### Invitation Won't Load
- Check internet connection
- Try in an incognito/private browser window
- Clear browser cache and cookies
- Verify Supabase credentials are set

### UUID Looks Wrong
UUIDs always follow this format:
```
8chars-4chars-4chars-4chars-12chars
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

If different, the UUID might be truncated or corrupted.

## Testing Links

Before sending to all guests, test a few links:

1. Create test guests in admin panel
2. Copy their links
3. Open in fresh browser/incognito window
4. Verify:
   - Correct guest name appears
   - Countdown shows correct time
   - RSVP buttons work
   - All details display correctly

## Bulk Import

If you have a spreadsheet of guests, you can bulk import:

### Via Supabase API

1. Prepare CSV with columns: `full_name`, `email`, `plus_ones`, `gift_description`, `is_godparent`
2. Use Supabase dashboard bulk import feature
3. UUIDs are auto-generated

### Manual SQL Import

```sql
INSERT INTO public.guests (full_name, email, plus_ones, gift_description, is_godparent)
VALUES 
  ('Guest 1', 'guest1@email.com', 2, NULL, false),
  ('Guest 2', 'guest2@email.com', 1, 'Gift Item', false),
  ('Guest 3', 'guest3@email.com', 0, NULL, true);
```

Then generate links for all new UUIDs.

## Exporting Guest Links

### Export as Text File

```sql
SELECT 'https://your-domain.com/?guest=' || id AS link
FROM public.guests
ORDER BY full_name;
```

Copy results and save as `guest_links.txt`

### Export as CSV

```sql
COPY (
  SELECT full_name, email, 'https://your-domain.com/?guest=' || id AS link
  FROM public.guests
  ORDER BY full_name
)
TO PROGRAM 'cat > /tmp/guest_links.csv'
WITH CSV HEADER;
```

## Changing a Guest UUID

Not recommended, but if needed:

**Note: This will invalidate existing links!**

```sql
UPDATE public.guests 
SET id = gen_random_uuid() 
WHERE email = 'guest@example.com';
```

Generate a new link with the new UUID.

---

**Remember:** Each UUID is unique and linked to a specific guest record. Keep them confidential and share only with intended recipients!
