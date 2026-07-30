# Supabase Integration - Complete Implementation

## Overview

Your wedding invitation system is now fully integrated with Supabase for guest management. Each guest has a unique UUID for secure, personalized access.

## What Was Implemented

### 1. Database Schema
- **guests** table with comprehensive guest information
- UUID primary key for each guest
- Fields: name, email, plus ones, gift description, godparent status, RSVP status
- Automatic timestamp tracking (created_at, updated_at)
- Row Level Security enabled for data protection

### 2. Component Updates
- **WeddingInvitation.tsx**: Now queries Supabase using guest UUID from URL parameter
- **Countdown Timer**: Real-time countdown showing days, hours, minutes, seconds
- **Guest Personalization**: Each guest sees their name, plus ones, gift details, godparent status
- **RSVP System**: Guests can confirm or decline attendance (updates database in real-time)
- **Smooth Transitions**: Video → Invitation with fade-in animations

### 3. Admin Panel
- **Location**: `/admin`
- **Features**:
  - Add new guests with full details
  - Auto-generated UUID for each guest
  - View all guests in a table with UUIDs
  - Copy guest links with UUID for sharing
  - Real-time feedback on successful submissions

### 4. Setup Files
- `/lib/supabase/client.ts`: Browser-side Supabase client
- `/lib/supabase/server.ts`: Server-side Supabase client
- `/lib/database.sql`: Database schema (execute in Supabase SQL editor)
- `/lib/seed-guests.ts`: Helper to seed test data

## Key Features

### Guest Access Flow
1. Guest receives personalized link: `https://yoursite.com/?guest=UUID`
2. Page loads with validation spinner (loading screen)
3. If UUID is valid:
   - Shows interactive envelope
   - Video plays fullscreen on tap
   - After video, displays personalized invitation
4. If UUID is invalid:
   - Shows elegant "Access Denied" page

### Invitation Content
- **Countdown Timer**: Live countdown to November 15, 2025, 17:00
- **Wedding Date**: Displayed below countdown
- **Guest Name**: Personalized greeting
- **Timeline**: Full day schedule with times
- **Details**: Location, dress code, celebration message
- **Personal Info**: Plus ones, godparent status, gift details (if applicable)
- **RSVP**: Two buttons to confirm/decline attendance

### Database Structure
```sql
guests (
  id UUID (PRIMARY KEY),
  full_name TEXT,
  email TEXT (UNIQUE),
  plus_ones INT,
  gift_description TEXT (nullable),
  is_godparent BOOLEAN,
  is_attending BOOLEAN (nullable),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## How to Use

### Step 1: Set Up Supabase in Vercel
1. Open Supabase project settings
2. Copy your Project URL and Anon Key
3. Add to Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Create Database Table
1. Go to your Supabase project SQL editor
2. Copy and execute the SQL from `/lib/database.sql`
3. This creates the guests table with all necessary fields

### Step 3: Add Guests
**Option A - Via Admin Panel (Easiest)**
1. Go to `http://localhost:3000/admin` (or your deployed URL + /admin)
2. Fill in guest details (name, email, plus ones, etc.)
3. Click "Add Guest"
4. System auto-generates UUID

**Option B - Via SQL**
```sql
INSERT INTO public.guests (full_name, email, plus_ones, gift_description, is_godparent)
VALUES ('Guest Name', 'guest@email.com', 2, 'Gift item', false);
```

### Step 4: Generate Guest Links
Each guest gets a personalized link in this format:
```
https://yoursite.com/?guest=550e8400-e29b-41d4-a716-446655440000
```

Copy the UUID from the admin panel guests table or SQL query result.

### Step 5: Share Links
Send each guest their unique invitation link via email or messaging.

## Guest Experience

### Loading Screen
- Elegant spinner with vertical dividers
- Shows "Validating your invitation"
- Animated dots for visual feedback

### Envelope (Interactive)
- Beautiful envelope preview video
- "Tap to open" prompt with divider
- Black background for focus
- Clicking opens fullscreen video

### Video
- Fullscreen playback
- Fade-in animation
- Plays automatically
- Returns to invitation when complete

### Invitation
- Fade-in animation from black
- Large countdown timer
- Complete wedding schedule
- Personalized guest information
- RSVP buttons
- Elegant serif typography
- Minimalista design (Vowlee-inspired)

## Technical Details

### URL Parameters
- `?guest=UUID`: Main invitation access
- No other parameters needed

### Error Handling
- Invalid UUID → "Access Denied" page
- Database connection errors → Console logging
- RSVP failures → User feedback message

### Real-Time Updates
- Countdown updates every second
- RSVP changes save immediately to database
- Page stays responsive during updates

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## File Structure
```
app/
  admin/
    page.tsx                 ← Admin panel for managing guests
  page.tsx                   ← Main invitation page
components/
  WeddingInvitation.tsx      ← Main invitation component
lib/
  supabase/
    client.ts                ← Browser client
    server.ts                ← Server client
  database.sql               ← Schema & setup
  seed-guests.ts             ← Test data helper
SUPABASE_SETUP.md            ← Setup instructions
```

## Customization

### Change Wedding Date
Edit in `components/WeddingInvitation.tsx`:
```typescript
const WEDDING_DATE = new Date('2025-11-15T17:00:00').getTime()
```

### Change Couple Names
Edit in multiple places (search for "Javier Andrés" and "Maria Zolis"):
```typescript
<h1 className="text-5xl md:text-6xl font-serif font-light mb-4">
  Your Names Here
</h1>
```

### Change Wedding Details
Edit location, time, ceremony details in the invitation component.

## Security Considerations

### Before Production
1. **Protect admin panel** with authentication
2. **Use environment variables** for sensitive data
3. **Enable RLS** on all tables (already done)
4. **Add rate limiting** to Supabase functions
5. **Validate all input** on server-side

### Current Security
- UUIDs are cryptographically random and hard to guess
- Database uses Row Level Security
- Admin panel is public (NEEDS PROTECTION before production)

## Troubleshooting

### "Access Denied" Error
- Verify UUID is correct
- Check guest exists in database
- Ensure Supabase connection is working

### Countdown Shows Wrong Time
- Wedding date is hardcoded: November 15, 2025, 17:00
- Update in `components/WeddingInvitation.tsx`

### RSVP Not Saving
- Check browser console for error messages
- Verify Supabase connection
- Check that table updates are allowed by RLS

### Admin Page Shows Errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ensure guests table exists
- Check network tab in browser developer tools

## Next Steps

1. Configure Supabase credentials in Vercel
2. Create database table using SQL from `/lib/database.sql`
3. Add your guests via admin panel
4. Customize wedding details (names, date, location)
5. Deploy to Vercel
6. Share guest links with invitees

## Support & References

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- This project's SUPABASE_SETUP.md for detailed setup guide
