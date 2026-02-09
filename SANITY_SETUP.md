# Sanity Setup - Quick Start Guide

## Step 1: Create Sanity Project

1. Go to [sanity.io](https://www.sanity.io) and sign up/login
2. Click "Create project"
3. Name it "Bannquet" (or whatever you want)
4. Choose a dataset name (default is "production")
5. **Copy your Project ID** - you'll see it in the project dashboard

## Step 2: Get API Token

1. In your Sanity project dashboard, go to **Settings** → **API** → **Tokens**
2. Click **Add API token**
3. Name it "Trip Reports Write Token"
4. Set permissions to **Editor** (needs write access for image uploads)
5. **Copy the token** (you'll only see it once!)

## Step 3: Create Trip Report Schema

You need to create the schema in Sanity. You have two options:

### Option A: Use Sanity Studio (Easiest)

1. Go to your Sanity project
2. Click "Manage" → "Schema"
3. Create a new document type called `tripReport` with these fields:
   - `title` (string, required)
   - `author` (string, required)
   - `date` (date, required)
   - `location` (object with: `name` string, `region` string optional, `coordinates` geopoint optional)
   - `description` (text, required)
   - `images` (array of images)
   - `tags` (array of strings)
   - `publishedAt` (datetime)

### Option B: Use Sanity CLI (Advanced)

If you want to use the CLI, I can help set that up, but Option A is simpler.

## Step 4: Add Environment Variables

Create or update `.env.local` in your project root:

```env
# Required
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-api-token-here

# Optional (for security)
TRIP_REPORT_PASSWORD=your-secret-password
ALLOWED_AUTHORS=Jake,Sarah,Mike,Alex,Emma,Chris,Jordan,Taylor,Sam,Casey,Riley,Drew
```

**Important:** 
- Replace `your-project-id-here` with your actual Project ID from Step 1
- Replace `your-api-token-here` with your token from Step 2
- The `NEXT_PUBLIC_` prefix is required for client-side access

## Step 5: Restart Dev Server

After adding environment variables:

```bash
# Stop your dev server (Ctrl+C)
# Then restart it
npm run dev
```

## That's It!

Now the trip reports feature should work:
- Visit `/trip-reports/submit` to submit a trip
- Visit `/trip-reports` to browse trips

## Troubleshooting

**Error: "Configuration must contain projectId"**
- Make sure `.env.local` exists and has `NEXT_PUBLIC_SANITY_PROJECT_ID`
- Restart your dev server after adding env vars

**Error: "Unauthorized" when submitting**
- Check that `SANITY_API_TOKEN` is set correctly
- Make sure the token has Editor permissions

**Images not uploading**
- Verify the token has write permissions
- Check file size (max 10MB per image)
