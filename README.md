# Bannquet

A mountain weather dashboard and trip reports platform for the northeastern United States.

## Overview

Bannquet provides weather tools and community trip reports for four northeastern mountain regions:
- **New York** (NY) - Adirondacks, Catskills, Shawangunks, Thacher Park
- **Vermont** (VT) - Green Mountains (Jay Peak, Mansfield, Camel's Hump, Killington)
- **New Hampshire** (NH) - White Mountains (Presidential Range, Franconia, Rumney)
- **Maine** (ME) - Baxter State Park, Mahoosucs, Acadia

## Features

### 1. Mountain Weather Dashboard
- Real-time weather data for summit vs. valley conditions
- Multiple weather sections per region (High Peaks, Notches, Crags, etc.)
- Integration with National Weather Service APIs
- Mount Washington Observatory data for New Hampshire
- Weather alerts and forecasts

### 2. Trip Reports
- Community trip reports with rich text editing
- Image uploads with automatic compression
- Interactive map location picker
- Browse and filter trip reports by author
- Embedded Sanity Studio for content management

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 3.4.1
- **Animations**: Framer Motion 12.4.10
- **Maps**: Mapbox GL JS 3.10.0
- **Rich Text Editor**: TipTap
- **Icons**: react-icons 5.4.0

### Backend & CMS
- **CMS**: Sanity (for trip reports)
- **Image Storage**: Sanity CDN
- **API Routes**: Next.js API routes

## Project Structure

```
bannquet/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx              # Homepage
│   │   ├── mountain-weather/     # Region picker
│   │   ├── weather/               # Weather dashboard
│   │   ├── trip-reports/          # Trip reports pages
│   │   ├── studio/                # Embedded Sanity Studio
│   │   └── api/                   # API routes
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   ├── trip-reports/          # Trip report components
│   │   └── WeatherDashboard.tsx  # Weather dashboard
│   ├── contexts/
│   │   └── RegionContext.tsx      # Active region state
│   ├── lib/
│   │   ├── regions.ts             # Region configurations
│   │   ├── weather.ts             # Weather API integration
│   │   └── sanity.ts              # Sanity client setup
│   ├── schemas/
│   │   └── tripReport.ts          # Sanity schema
│   └── types/
│       ├── trip-reports.ts        # Trip report types
│       └── weather.ts              # Weather types
├── sanity.config.ts               # Sanity Studio config
└── public/                         # Static assets
```

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Set up environment variables:**
   Create `.env.local`:
   ```env
   # Mapbox (for location picker)
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   
   # Sanity (for trip reports)
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=your_api_token
   
   # Optional: Author whitelist
   ALLOWED_AUTHORS=Jake,Sarah,Mike
   ```

3. **Set up Sanity:**
   - See `SANITY_SETUP.md` for detailed instructions
   - Create your Sanity project and schema
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

## Key Features

### Weather Dashboard
- Region-based weather data
- Summit vs. valley comparisons
- Real-time forecasts and alerts

### Trip Reports
- Rich text editor with formatting tools
- Image uploads (auto-compressed if >4MB)
- Interactive map location picker
- Browse and filter reports
- Embedded Sanity Studio for content management

## Deployment

The application is configured for deployment on Vercel or similar Next.js-compatible hosts.

Make sure to set all environment variables in your hosting platform's settings.

## License

© 2024 Bannquet. All rights reserved.
