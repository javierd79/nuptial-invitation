# 🚀 Quick Start Guide - Wedding Invitation System

Get your Supabase-backed wedding invitation system running in 5 minutes!

## Step 1: Set Environment Variables (1 min)

Add these to your Vercel project settings (or `.env.local` for local development):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from your Supabase project settings → API.

## Step 2: Create Database Table (2 min)

1. Go to your Supabase project → SQL Editor
2. Click "New Query"
3. Copy and paste the SQL from `/lib/database.sql`
4. Click "Run"
5. Done! Table is created

## Step 3: Add Test Guests (1 min)

Option A - Quick (Recommended):
1. Go to `http://localhost:3000/admin`
2. Fill in the form
3. Click "Add Guest"
4. Repeat for each guest

Option B - Bulk:
1. Go to Supabase → SQL Editor
2. Paste SQL from `/TEST_GUESTS.sql`
3. Click "Run"
4. You now have 13 test guests!

## Step 4: Get Guest Links (1 min)

Via Admin Panel:
1. Go to `/admin`
2. Click "Load Guests"
3. View the table → Copy each guest's UUID
4. Create link: `http://localhost:3000/?guest=UUID`

Via SQL:
```sql
SELECT full_name, email, id as uuid FROM public.guests;
```

## Step 5: Test It! (1 min)

1. Visit `http://localhost:3000/?guest=UUID`
2. See the loading screen → envelope → video → invitation
3. Try RSVP buttons
4. Check `/admin` to see RSVP saved

## Common Tasks

### Add a Single Guest
**Admin Panel Method:**
```
1. Visit http://localhost:3000/admin
2. Fill form:
   - Full Name: Juan Pérez
   - Email: juan@email.com
   - Plus Ones: 2
   - Gift: (optional)
   - Is Godparent: (checkbox)
3. Click "Add Guest"
4. Copy UUID from confirmation message
```

### Add Multiple Guests
**SQL Method:**
```sql
INSERT INTO public.guests (full_name, email, plus_ones, gift_description, is_godparent)
VALUES 
  ('Guest 1', 'guest1@email.com', 2, NULL, false),
  ('Guest 2', 'guest2@email.com', 1, 'Gift Item', true);
```

### Generate All Invitation Links
```sql
SELECT 'http://localhost:3000/?guest=' || id AS link, full_name
FROM public.guests
ORDER BY full_name;
```

### Check RSVP Status
```sql
SELECT full_name, email, is_attending
FROM public.guests
WHERE is_attending IS NOT NULL;
```

### Get Attendance Count
```sql
SELECT 
  COUNT(*) as attending
FROM public.guests
WHERE is_attending = true;
```

## File Structure You Need to Know

```
app/
  page.tsx                  ← Main invitation (uses WeddingInvitation component)
  admin/page.tsx            ← Guest management at /admin
  
components/
  WeddingInvitation.tsx     ← The magic happens here
  
lib/
  supabase/
    client.ts               ← Browser client (you don't need to edit)
    server.ts               ← Server client (you don't need to edit)
  database.sql              ← Create table with this SQL
  
QUICKSTART.md               ← This file
SUPABASE_SETUP.md           ← Detailed setup guide
UUID_GUEST_LINKS.md         ← UUID & links deep dive
TEST_GUESTS.sql             ← 13 sample guests
```

## Customize Your Invitation

### Change Wedding Date
Edit `components/WeddingInvitation.tsx`:
```typescript
const WEDDING_DATE = new Date('2025-11-15T17:00:00').getTime()
// Change to your date
const WEDDING_DATE = new Date('2025-06-20T17:00:00').getTime()
```

### Change Names
Search for "Javier Andrés" and "Maria Zolis" in `components/WeddingInvitation.tsx` and replace with your names.

### Change Wedding Details
Edit these in the invitation component:
- Location
- Time
- Ceremony schedule
- Dress code
- All other text

## Deployment to Vercel

```bash
# Commit all changes
git add .
git commit -m "feat: Wedding invitation system ready"

# Push to your repo
git push

# Vercel auto-deploys!
```

Then update the invitation link to use your Vercel domain:
```
https://your-wedding-site.vercel.app/?guest=UUID
```

## Troubleshooting

### "Access Denied" Error
- Check the UUID is correct (36 characters with hyphens)
- Verify guest exists in database
- Check console for errors (F12 → Console)

### Admin Page Won't Load
- Verify Supabase env vars are set
- Check that database table exists
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### RSVP Button Doesn't Work
- Check browser console for errors
- Verify Supabase credentials
- Make sure database RLS is enabled

### Countdown Shows Wrong Time
- Edit `WEDDING_DATE` in WeddingInvitation.tsx
- Format: `new Date('YYYY-MM-DDTHH:mm:ss').getTime()`

## Next Steps

1. **Test Everything**: Visit a few guest links to verify they work
2. **Customize**: Change names, date, location to match your wedding
3. **Add All Guests**: Use admin panel or bulk SQL insert
4. **Deploy**: Push to Vercel
5. **Share**: Send personalized links to guests!

## Support

For detailed info, see:
- Setup help: `SUPABASE_SETUP.md`
- UUID management: `UUID_GUEST_LINKS.md`
- Technical details: `SUPABASE_INTEGRATION_COMPLETE.md`

---

**You're ready! Start with Step 1 and you'll be done in 5 minutes.** 🎉
