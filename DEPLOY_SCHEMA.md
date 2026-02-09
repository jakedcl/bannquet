# Deploy Schema to Sanity

## Quick Setup

1. **Navigate to the studio directory:**
   ```bash
   cd sanity-studio
   ```

2. **Copy your env vars:**
   ```bash
   # Copy from your main .env.local
   # Edit sanity-studio/.env.local and add:
   NEXT_PUBLIC_SANITY_PROJECT_ID=042pyqmm
   NEXT_PUBLIC_SANITY_DATASET=production
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Deploy the schema:**
   ```bash
   npm run deploy
   ```

   This will:
   - Build the Studio
   - Deploy it to Sanity
   - Make the schema available at `bannquet.sanity.studio`

5. **Done!** The schema is now live and your trip reports feature will work.

## Alternative: Run Studio Locally

If you want to test locally first:

```bash
cd sanity-studio
npm install
npm run dev
```

Then visit `http://localhost:3333` to see the Studio locally.

## What This Does

- Creates the `tripReport` document type in Sanity
- Makes it available for your API to use
- Deploys a minimal Studio (optional - you can use it for admin)

**Note:** You don't need to use the Studio - your friends can still submit via `/trip-reports/submit`. The Studio is just for you to manage/edit trips if you want.
