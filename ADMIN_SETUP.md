# Admin Dashboard Setup Guide

## Overview

The admin dashboard has been completely revamped with:
- **Authentication**: Email/password login via Supabase Auth
- **Metrics Dashboard**: Real-time statistics about guests and RSVPs
- **Guest Management**: Add, view, and manage all guests
- **Link Generation**: Copy personalized invitation links for each guest

## Setup Steps

### 1. Create Admin User in Supabase

You need to create a user account in Supabase Auth that will be used for admin access.

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Click "Create user"

**Option B: Via API (if needed)**
```sql
-- In Supabase SQL Editor
-- This creates a user directly (development only)
INSERT INTO auth.users (email, email_confirmed_at, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'admin@example.com',
  now(),
  crypt('admin_password_123', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);
```

### 2. Access the Admin Panel

**Local Development:**
```
http://localhost:3000/admin
```

This will redirect to the login page automatically.

**Production:**
```
https://your-domain.com/admin
```

### 3. Login

Use the credentials created in step 1:
- Email: `admin@example.com`
- Password: `your_password`

After login, you'll be redirected to the dashboard.

## Admin Dashboard Features

### Metrics Overview

The dashboard shows 6 key metrics:

1. **Total Guests** - Number of people invited
2. **Plus Ones** - Total additional guests from plus ones
3. **Confirmed** - Green metric showing guests who confirmed attendance
4. **Declined** - Red metric showing guests who declined
5. **Pending** - Yellow metric showing guests awaiting response
6. **Godparents** - Count of guests marked as godparents

### Add New Guest

Fill in the form with:
- **Full Name** (required)
- **Email** (required, must be unique)
- **Plus Ones** (number of additional guests)
- **Is Godparent** (checkbox)
- **Gift Description** (optional notes about their gift)

After submission, the guest is added and will receive a unique UUID.

### View All Guests

The table displays:
- Guest name
- Email address
- Number of plus ones
- RSVP status (Confirmed/Declined/Pending)
- Role badge (if godparent)
- Copy button for invitation link

### Generate Invitation Links

Each guest has a unique UUID. The invitation link is:
```
https://your-domain.com/?guest=UUID
```

Click the "Copy" button to copy the full link to clipboard. Share this link with the guest.

## Guest Statuses

- **Confirmed** - Guest clicked "I will attend" on the invitation
- **Declined** - Guest clicked "Cannot attend" on the invitation
- **Pending** - Guest hasn't responded yet

The status updates automatically when guests interact with their invitation link.

## Security

- Admin access requires email/password authentication
- Only authenticated users can see the dashboard
- Invalid credentials are rejected with clear error messages
- Session is maintained until logout

## Logout

Click the "Logout" button in the top-right corner to sign out. This will redirect to the login page.

## Troubleshooting

### "Invalid credentials" Error
- Verify email and password are correct
- Check that the user was created successfully in Supabase

### Guests Not Loading
- Ensure the `guests` table exists in Supabase
- Run the database schema from `lib/database.sql`
- Check that you're authenticated

### Can't Add Guest
- Verify all required fields are filled (Full Name, Email)
- Check that the email doesn't already exist
- Ensure authentication is still valid

### Copy Link Not Working
- Click the "Copy" button again
- Check browser console for errors
- Try a different browser if issue persists

## Production Checklist

Before going live:

- [ ] Create strong admin password
- [ ] Enable email confirmation in Supabase Auth settings
- [ ] Set up proper database backups
- [ ] Configure CORS if needed
- [ ] Test with real data
- [ ] Verify RSVP tracking works
- [ ] Test all guest links

## API Endpoints Used

The dashboard uses:

- `auth.signInWithPassword()` - Admin login
- `auth.signOut()` - Admin logout
- `guests.select()` - Load all guests
- `guests.insert()` - Add new guest
- RLS policies for data security

## Environment Variables

Ensure these are set in your Vercel project:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These are automatically available if Supabase integration is connected.
