# Trip Reports Feature Setup Guide

## 🎯 Overview

The trip reports feature allows your 12 friends to submit and browse mountain adventure stories with photos. It uses Sanity CMS for content management and image hosting.

## 📦 Installation

First, install the required dependencies:

```bash
npm install @sanity/client @sanity/image-url date-fns
```

## 🔧 Sanity Setup

### 1. Create a Sanity Project

1. Go to [sanity.io](https://www.sanity.io) and sign up/login
2. Create a new project
3. Note your **Project ID** and **Dataset** name (usually "production")

### 2. Create the Trip Report Schema

In your Sanity Studio (or via API), create a schema for trip reports. Here's the schema structure:

```javascript
// schemas/tripReport.js
export default {
  name: 'tripReport',
  title: 'Trip Report',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'author',
      title: 'Author',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'date',
      title: 'Trip Date',
      type: 'date',
      validation: Rule => Rule.required()
    },
    {
      name: 'location',
      title: 'Location',
      type: 'object',
      fields: [
        {
          name: 'name',
          title: 'Location Name',
          type: 'string',
          validation: Rule => Rule.required()
        },
        {
          name: 'region',
          title: 'Region',
          type: 'string'
        },
        {
          name: 'coordinates',
          title: 'Coordinates',
          type: 'geopoint'
        }
      ]
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 5,
      validation: Rule => Rule.required()
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image' }],
      options: {
        hotspot: true
      }
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Hiking', value: 'hiking' },
          { title: 'Skiing', value: 'skiing' },
          { title: 'Climbing', value: 'climbing' },
          { title: 'Camping', value: 'camping' },
          { title: 'Backpacking', value: 'backpacking' },
          { title: 'Mountaineering', value: 'mountaineering' },
          { title: 'Trail Running', value: 'trail-running' },
          { title: 'Biking', value: 'biking' }
        ]
      }
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author',
      media: 'images.0'
    },
    prepare({ title, author, media }) {
      return {
        title,
        subtitle: `By ${author}`,
        media
      }
    }
  }
}
```

### 3. Generate API Token

1. Go to your Sanity project settings
2. Navigate to **API** → **Tokens**
3. Click **Add API token**
4. Name it "Trip Reports Write Token"
5. Set permissions to **Editor** (needs write access)
6. Copy the token (you'll need it for `.env.local`)

### 4. Environment Variables

Create or update `.env.local` with:

```env
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=your-api-token-here

# Optional: Password protection for submissions
TRIP_REPORT_PASSWORD=your-secret-password

# Optional: Author whitelist (comma-separated)
ALLOWED_AUTHORS=Jake,Sarah,Mike,Alex,Emma,Chris,Jordan,Taylor,Sam,Casey,Riley,Drew
```

## 🚀 Usage

### For Your 12 Friends (No Sanity Account Needed)

1. Visit `/trip-reports/submit`
2. Fill out the form:
   - Title
   - Your name
   - Trip date
   - Location name and region
   - Description
   - Upload images (up to 20, max 10MB each)
   - Select tags
   - Enter password (if password protection is enabled)
3. Submit!

### For You (With Sanity Studio Access)

- Use Sanity Studio to edit/delete trip reports (visit your Sanity project's studio URL)
- Or build admin pages in your Next.js app (future enhancement)

## 📁 File Structure

```
src/
├── app/
│   ├── trip-reports/
│   │   ├── page.tsx              # Browse all trips
│   │   ├── submit/
│   │   │   └── page.tsx          # Submit form
│   │   └── [id]/
│   │       └── page.tsx          # Individual trip view
│   └── api/
│       └── trip-reports/
│           ├── route.ts          # GET all trips
│           ├── submit/
│           │   └── route.ts      # POST new trip
│           ├── upload/
│           │   └── route.ts      # POST image upload
│           └── [id]/
│               └── route.ts      # GET single trip
├── components/
│   └── trip-reports/
│       ├── TripCard.tsx          # Trip card component
│       └── TripSubmitForm.tsx    # Submit form component
├── lib/
│   └── sanity.ts                 # Sanity client config
└── types/
    └── trip-reports.ts           # TypeScript types
```

## 🔒 Security Options

### Option 1: Password Protection (Recommended)
Set `TRIP_REPORT_PASSWORD` in `.env.local`. All submissions require this password.

### Option 2: Author Whitelist
Set `ALLOWED_AUTHORS` in `.env.local` with comma-separated names. Only listed authors can submit.

### Option 3: No Protection
Remove both env vars for a completely open system (trusted friend group).

## 🎨 Features

- ✅ Image upload with preview
- ✅ Multiple images per trip (up to 20)
- ✅ Image gallery with navigation
- ✅ Filter by author or tag
- ✅ Responsive design
- ✅ Automatic image optimization via Sanity CDN
- ✅ Clean, modern UI matching your brand

## 🐛 Troubleshooting

### Images not uploading?
- Check that `SANITY_API_TOKEN` has write permissions
- Verify file size is under 10MB
- Check browser console for errors

### Can't fetch trip reports?
- Verify `NEXT_PUBLIC_SANITY_PROJECT_ID` is correct
- Check that dataset name matches
- Ensure schema is deployed to Sanity

### Submit form not working?
- Check API routes are accessible
- Verify environment variables are set
- Check password/whitelist if enabled

## 📝 Next Steps

- Add map view showing all trip locations
- Add author profile pages
- Add search functionality
- Add comments/reactions (future)
- Add trip report editing (for authors)

## 💡 Tips

- Sanity free tier: 10GB storage, 10GB bandwidth/month
- Images are automatically optimized and served via CDN
- All 12 friends can submit without Sanity accounts
- Only you (or 1-2 admins) need Studio access
