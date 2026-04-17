# Bannquet

A mountain weather dashboard and trip reports platform for the northeastern United States.

## 🌄 Overview

Bannquet provides real-time weather tools and community trip reports for four northeastern mountain regions:

- **New York (NY)** - Adirondacks, Catskills, Shawangunks, Thacher Park
- **Vermont (VT)** - Green Mountains (Jay Peak, Mansfield, Camel's Hump, Killington...)
- **New Hampshire (NH)** - White Mountains (Presidential Range, Franconia, Rumney)
- **Maine (ME)** - Baxter State Park, Mahoosucs, Acadia

## ✨ Features

### Mountain Weather Dashboard
- **Real-time weather data** from National Weather Service APIs
- **Summit vs. valley comparisons** for accurate alpine conditions
- **Multiple weather sections** per region (High Peaks, Notches, Crags, Valleys, etc.)
- **Live weather ticker** showing extreme conditions across all regions
- **Hourly and daily forecasts** with wind, precipitation, and alerts
- **Mount Washington Observatory** integration for New Hampshire

### Trip Reports
- **Rich text editor** with formatting tools (TipTap)
- **Image uploads** with automatic compression
- **Interactive map location picker** (Mapbox) - optional pin placement
- **Email verification system** - posts require email verification before publishing
- **Edit links** - permanent edit links sent via email
- **Tag system** - filter by activity type (hiking, climbing, skiing, etc.)
- **Browse and filter** trip reports by tags
- **Embedded Sanity Studio** for content management

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 3.4**
- **Framer Motion** (animations)
- **Mapbox GL JS** (maps)
- **TipTap** (rich text editor)
- **React Icons**

### Backend & Services
- **Sanity CMS** (trip reports & content)
- **Sanity CDN** (image storage)
- **Resend** (email service)
- **National Weather Service API** (weather data)
- **Next.js API Routes** (backend logic)

## 📁 Project Structure

```
bannquet/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                 # Homepage
│   │   ├── mountain-weather/        # Region picker
│   │   ├── weather/                 # Weather dashboard
│   │   ├── trip-reports/            # Trip reports pages
│   │   │   ├── page.tsx             # List view
│   │   │   ├── submit/              # Submit form
│   │   │   ├── edit/                # Edit page
│   │   │   └── [id]/                # Detail page
│   │   ├── studio/                  # Embedded Sanity Studio
│   │   └── api/                     # API routes
│   │       ├── trip-reports/        # Trip report endpoints
│   │       └── weather/             # Weather endpoints
│   ├── components/
│   │   ├── ui/                      # Reusable UI components
│   │   │   ├── Header.tsx           # Global header
│   │   │   ├── WeatherTicker.tsx     # Live weather ticker
│   │   │   └── PageWrapper.tsx      # Page wrapper
│   │   ├── trip-reports/            # Trip report components
│   │   └── WeatherDashboard.tsx     # Weather dashboard
│   ├── contexts/
│   │   └── RegionContext.tsx         # Active region state
│   ├── lib/
│   │   ├── regions.ts               # Region configurations
│   │   ├── weather.ts               # Weather API integration
│   │   └── sanity.ts                # Sanity client setup
│   ├── schemas/
│   │   ├── tripReport.ts            # Trip report schema
│   │   └── tripReportVerification.ts # Email verification schema
│   └── types/
│       ├── trip-reports.ts          # Trip report types
│       └── weather.ts               # Weather types
├── sanity.config.ts                 # Sanity Studio config
└── public/                           # Static assets
```

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+**
- **npm** or **yarn**

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Mapbox (for location picker)
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   
   # Sanity (for trip reports)
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=your_api_token
   
   # Email Service (Resend - for trip report verification)
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=noreply@yourdomain.com
   # Note: Use 'onboarding@resend.dev' for testing until domain is verified
   
   # App URL (for email links)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   # In production, set to your domain (e.g., https://bannquet.com)
   ```

3. **Set up Sanity:**
   - See `SANITY_SETUP.md` for detailed instructions
   - Create your Sanity project and configure the schema
   - Access Studio at `/studio` after setup

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📝 How It Works

### Trip Report Submission Flow

1. **Submit** - User fills out the trip report form with title, author info, date, content, images, and optional location pin
2. **Draft Created** - Post is saved as `published: false` in Sanity
3. **Email Sent** - Two links are sent to the author's email:
   - **Publish Link** (expires in 24 hours) - Makes the post visible to everyone
   - **Edit Link** (permanent) - Allows editing the post anytime
4. **Verification** - Author clicks publish link to make post live
5. **Editing** - Author can use edit link to modify the post later

### Weather Data

- Fetches real-time data from National Weather Service APIs
- Displays summit vs. valley conditions for accurate alpine weather
- Shows hourly and daily forecasts with wind, precipitation, and alerts
- Live ticker shows extreme conditions (highest wind, lowest temp, etc.) across all regions

## 🚢 Deployment

The application is configured for deployment on **Vercel** or similar Next.js-compatible hosts.

### Environment Variables for Production

Make sure to set all environment variables in your hosting platform's settings:

- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `SANITY_API_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL` (your production domain)

## 📄 License

© 2024 Bannquet. All rights reserved.
