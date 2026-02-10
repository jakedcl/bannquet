# Simple Email-Based Authentication Setup

This is a **simple, maintainable** authentication system that uses email links - no complex auth libraries, no sessions, just tokens stored in Sanity.

## How It Works

1. **Submit Trip Report** → Saved as draft (`published: false`)
2. **Email Sent** with two links:
   - **Publish Link** (expires in 24 hours) - Makes post visible
   - **Edit Link** (permanent) - Allows editing anytime
3. **Click Publish** → Post goes live
4. **Click Edit** → Can edit the post

## Setup

### 1. Environment Variables

Add to `.env.local`:

```env
# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
# Or Vercel will auto-set VERCEL_URL

# Email Service (Resend - free tier: 3,000 emails/month)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Get Resend API Key

1. Sign up at [resend.com](https://resend.com) (free)
2. Get API key from dashboard
3. Add to `.env.local`

### 4. Update Sanity Schema

The schema files are already updated. You need to:
1. Go to `/studio` in your app
2. The new fields should sync automatically
3. If not, manually add `authorEmail` and `published` fields to `tripReport` type

## What's Different from Complex Auth

✅ **No NextAuth.js** - Removed entirely  
✅ **No sessions** - Just token-based links  
✅ **No login pages** - Edit links work directly  
✅ **Simple tokens** - Stored in Sanity, easy to manage  
✅ **Works forever** - No dependency on auth libraries  

## User Flow

1. Friend submits trip report → Gets email
2. Email has:
   - "Publish" button (one-time, expires)
   - "Edit" link (permanent, save this!)
3. Click publish → Post is live
4. Want to edit? → Use the edit link from email

## Files Structure

- `src/app/api/trip-reports/submit/route.ts` - Creates draft + sends email
- `src/app/api/trip-reports/verify/route.ts` - Publishes post
- `src/app/api/trip-reports/edit/route.ts` - Loads/updates post for editing
- `src/app/trip-reports/edit/page.tsx` - Edit page (uses same form)
- `src/schemas/tripReportVerification.ts` - Stores tokens in Sanity

## That's It!

This system is:
- ✅ Simple to understand
- ✅ Easy to maintain
- ✅ Won't break with library updates
- ✅ Works on Vercel
- ✅ Free (Resend free tier)

No complex auth, no sessions, just email links. Perfect for a small group of friends.
