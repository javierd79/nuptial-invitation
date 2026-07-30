# Supabase Integration Complete

Your wedding invitation system is now fully integrated with Supabase and production-ready!

## What's New

### Database-Backed Guest Management
- Each guest has a unique UUID
- Access invitations using their personalized UUID link
- Guest information is stored and tracked in Supabase
- RSVP status updates in real-time

### Live Countdown Timer
- Days, hours, minutes, seconds until the wedding
- Updates every second
- Shows full wedding date below (November 15, 2025)

### Enhanced Guest Information
- Gift descriptions tracked
- Godparent status recognized
- Plus ones per guest
- RSVP tracking with database persistence

## Key Features Implemented

1. **Supabase Database** (`guests` table)
   - UUID primary key (auto-generated)
   - Guest name, email, plus ones
   - Gift description field
   - Godparent boolean
   - RSVP status
   - Automatic timestamps

2. **Admin Panel** (`/admin`)
   - Add guests with full details
   - View all guests and their UUIDs
   - Generate shareable links
   - Real-time feedback

3. **Personalized Invitations**
   - Load guest data from Supabase by UUID
   - Show personalized greeting with guest name
   - Display plus ones count
   - Show gift details if applicable
   - Highlight godparent status
   - Live countdown timer
   - RSVP buttons that update database

4. **Elegant Design**
   - Loading screen with spinner
   - Access denied page (for invalid UUIDs)
   - Interactive envelope
   - Full-screen video
   - Smooth fade transitions
   - Minimalista Vowlee-inspired design

## Quick Start

### 1. Set Environment Variables
In Vercel project settings, add:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Create Database Table
Execute SQL from `/lib/database.sql` in Supabase SQL editor

### 3. Add Guests
Go to `http://localhost:3000/admin` and add guests

### 4. Share Links
Each guest gets a personalized link:
```
https://yoursite.com/?guest=UUID
```

## File Structure

```
app/
  admin/page.tsx                    ← Guest management panel
  page.tsx                          ← Main invitation page
components/
  WeddingInvitation.tsx             ← Invitation component
lib/
  supabase/
    client.ts                       ← Browser client
    server.ts                       ← Server client
  database.sql                      ← Schema & RLS
  seed-guests.ts                    ← Test data helper
public/
  letter.mp4                        ← Invitation video
  letter.png                        ← Envelope image
Documentation/
  SUPABASE_INTEGRATION_COMPLETE.md  ← Full technical guide
  SUPABASE_SETUP.md                 ← Setup instructions
  UUID_GUEST_LINKS.md               ← UUID & link guide
```

## Core Changes

### WeddingInvitation Component
- Now queries Supabase using UUID from URL (`?guest=UUID`)
- Real-time countdown timer (updates every second)
- Guest data from database (name, plus ones, gift, godparent status)
- RSVP buttons save to database immediately
- Smooth fade-in animations

### Admin Panel
- Create guests via form
- All fields editable
- UUID auto-generated
- Copy invitation links
- View all guests in table

### Database Schema
```sql
CREATE TABLE guests (
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
```

## Guest Experience

1. Clicks personalized link: `https://site.com/?guest=UUID`
2. Sees loading spinner
3. If valid: Shows beautiful envelope
4. Taps envelope: Fullscreen video plays
5. Video ends: Invitation fades in smoothly
6. Sees personalized greeting with their name
7. Live countdown timer
8. All wedding details
9. Can RSVP (buttons update database)

## Security Features

- UUID-based access control
- Row Level Security on database
- Cryptographically unique identifiers
- Admin panel (needs auth before production)
- Input validation
- Error handling

## Customization

### Change Wedding Date
`components/WeddingInvitation.tsx`:
```typescript
const WEDDING_DATE = new Date('2025-11-15T17:00:00').getTime()
```

### Change Names
Search for "Javier Andrés" and "Maria Zolis" throughout component

### Change Details
Location, time, ceremony schedule in invitation component

## Testing

### Local Testing
1. `pnpm dev` to start server
2. Go to `/admin` to add test guests
3. Copy guest UUID from admin table
4. Visit `http://localhost:3000/?guest=UUID`
5. Test full flow: envelope → video → invitation → RSVP

### Invalid UUID Test
`http://localhost:3000/?guest=invalid-uuid` → Shows access denied

## Deployment

### Deploy to Vercel
```bash
git add .
git commit -m "Add Supabase integration"
git push
```

Vercel automatically detects Next.js and deploys

### Post-Deploy Checklist
- [ ] Supabase env vars set in Vercel
- [ ] Database table created
- [ ] Test guests added
- [ ] Links work with deployed URL
- [ ] Admin panel accessible
- [ ] RSVP saves to database

## Documentation Files

1. **SUPABASE_INTEGRATION_COMPLETE.md**
   - Technical overview
   - Complete feature list
   - Troubleshooting guide

2. **SUPABASE_SETUP.md**
   - Step-by-step setup
   - SQL schema
   - Admin panel instructions

3. **UUID_GUEST_LINKS.md**
   - UUID explanation
   - How to generate links
   - Guest link templates
   - Bulk operations

## Next Steps

1. Verify Supabase credentials in Vercel
2. Create database table
3. Add your guests (or test guests)
4. Customize wedding details
5. Deploy to production
6. Send personalized links to guests

## Support

For detailed setup: See `SUPABASE_SETUP.md`
For UUID/links: See `UUID_GUEST_LINKS.md`
For technical details: See `SUPABASE_INTEGRATION_COMPLETE.md`

---

**Your wedding invitation system is now live and ready!**

Each guest will have a personalized, secure experience with their custom countdown and RSVP tracking.
