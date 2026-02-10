# Sanity Schema Setup - Quick Guide

Your schema files are already updated in the code! You just need to make sure Sanity Studio picks them up.

## Step 1: Access the Studio

1. Start your dev server: `npm run dev`
2. Go to: `http://localhost:3000/studio`
3. You should see the Sanity Studio interface

## Step 2: Verify the Schema

The Studio should automatically show:
- **Trip Report** document type with these fields:
  - ✅ title
  - ✅ authorName
  - ✅ **authorEmail** (NEW - should be there)
  - ✅ tripDate
  - ✅ locationPin
  - ✅ body
  - ✅ tags
  - ✅ **published** (NEW - should be there)
  - ✅ publishedAt

- **Trip Report Verification** document type (NEW - for storing edit tokens)

## Step 3: If Schema Doesn't Show Up

If you don't see the new fields:

1. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache** and refresh `/studio`

3. **Check environment variables:**
   Make sure `.env.local` has:
   ```env
   NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
   NEXT_PUBLIC_SANITY_DATASET=production
   ```

## Step 4: Test It

1. Go to `/trip-reports/submit`
2. Fill out the form (including email)
3. Submit
4. Check your email for the verification link
5. Click the link to publish

## That's It!

The schema is defined in code (`src/schemas/`), so it should automatically sync. No manual schema editing needed!

If you see errors in the Studio, let me know what they say.
