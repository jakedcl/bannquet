# Bannquet (BNQT)

A mountain weather and mapping platform for the northeastern United States, featuring real-time weather data, interactive 3D terrain maps, and community visitor tracking.

## Overview

Bannquet provides comprehensive weather and mapping tools for four northeastern mountain regions:
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

### 2. Interactive 3D Maps
- **Mapbox GL JS** with 3D terrain visualization
- Region-specific map styles (satellite, outdoors)
- Points of interest with custom markers:
  - High peaks, low peaks
  - Trailheads, viewpoints
  - Lean-tos, primitive sites
  - Parking, food, stay locations
  - Canoe launches, waterfalls
- Pin submission system for community contributions
- Admin panel for managing pins and submissions

### 3. Community Map & Chat
- Real-time visitor presence tracking
- Interactive map showing visitor locations
- Live chat with persistent message history
- Anonymous visitor IDs with optional nicknames
- Opt-in location sharing
- Speech bubbles on map for active messages
- WebSocket-based real-time updates

## Tech Stack

### Frontend
- **Framework**: Next.js 15.1.6 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 3.4.1
- **Animations**: Framer Motion 12.4.10
- **Maps**: Mapbox GL JS 3.10.0
- **Charts**: Chart.js 4.4.7, react-chartjs-2 5.3.0
- **Icons**: react-icons 5.4.0

### Backend & Real-time
- **Socket.io**: 4.8.1 (client & server)
- **Express**: 4.18.2 (usermap-server)
- **Storage**: JSON file-based persistence
  - `data/usermap-visitors.json` - Visitor location data
  - `data/usermap-messages.json` - Chat message history
  - `data/map-submissions.json` - Pin submissions

### State Management
- React Context API (`RegionContext`, `UserMapContext`)
- LocalStorage for user preferences

## Project Structure

```
bannquet/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Homepage with region picker
│   │   ├── weather/           # Weather dashboard pages
│   │   ├── map/               # Interactive map pages
│   │   ├── usermap/           # Community map & chat
│   │   ├── projects/          # Project showcase pages
│   │   ├── admin/             # Admin panel (pins, submissions, users)
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Reusable UI components (Header, etc.)
│   │   ├── adk-map/           # Map components (AdirondacksMap, markers, etc.)
│   │   ├── usermap/           # Community map components
│   │   ├── weather/           # Weather dashboard components
│   │   └── admin/             # Admin panel components
│   ├── contexts/              # React Context providers
│   │   ├── RegionContext.tsx  # Active region state (NY, VT, NH, ME)
│   │   └── UserMapContext.tsx # Community map state & socket
│   ├── lib/
│   │   ├── regions.ts         # Region configurations & weather sections
│   │   ├── weather.ts         # Weather API integration
│   │   └── projects.ts        # Project showcase data
│   ├── data/
│   │   └── regions/           # Region-specific pin data (JSON)
│   │       ├── ny/           # New York markers
│   │       ├── vt/           # Vermont markers
│   │       ├── nh/           # New Hampshire markers
│   │       └── me/           # Maine markers
│   └── styles/
│       └── globals.css       # Global styles
├── usermap-server/            # Separate Socket.io server
│   ├── index.js              # Express + Socket.io server
│   └── package.json
├── data/                      # JSON file storage
│   ├── usermap-visitors.json
│   ├── usermap-messages.json
│   └── map-submissions.json
└── public/                    # Static assets
    ├── markers/              # Custom map marker icons
    └── projects/             # Project images
```

## Design System

### Visual Identity
- **Typography**: Helvetica (via CSS variable)
- **Color Palette**:
  - Primary: Brand green `#1F3F28`
  - Light: `#2A5637`
  - Dark: `#162B1C`
  - Accent: White, grays for UI elements
- **Design Principles**:
  - Clean, minimalist interface
  - Smooth transitions and animations
  - Responsive across all devices
  - Interactive map-first experience

### Component Architecture
- **Header**: Fixed navigation with region selector
- **Weather Dashboard**: Grid-based layout with forecast cards
- **Interactive Maps**: Full-screen Mapbox GL with custom controls
- **Community Map**: Split view (map + chat sidebar)
- **Admin Panel**: Table-based management interfaces

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   NEXT_PUBLIC_USERMAP_SERVER_URL=http://localhost:3002
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

4. **Start the usermap server (for community map feature):**
   ```bash
   cd usermap-server
   npm install
   npm run dev
   ```
   The Socket.io server will run on `http://localhost:3002`

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features Implementation

### Region Selection
- State-based region context (NY, VT, NH, ME)
- Persisted in localStorage
- Affects weather data and map views
- Header dropdown selector

### Weather Integration
- National Weather Service API
- Real-time forecast data
- Summit vs. valley comparisons
- Weather alerts and warnings

### Map Features
- 3D terrain rendering
- Custom marker categories
- Pin submission form
- Admin pin management
- Region-specific bounds and styles

### Community Map
- Real-time WebSocket connections
- Visitor location tracking
- Persistent chat history (last 200 messages)
- Anonymous IDs with optional nicknames
- Opt-in location sharing
- Speech bubbles for active messages

## Data Storage

The application uses **JSON file-based storage** for simplicity:
- Visitor data: `data/usermap-visitors.json`
- Chat messages: `data/usermap-messages.json`
- Map submissions: `data/map-submissions.json`
- Region pin data: `src/data/regions/[region]/[category].json`

For production, consider migrating to a proper database (PostgreSQL, MongoDB, etc.).

## Deployment

The application is configured for deployment on platforms like Vercel or similar Next.js-compatible hosts.

**Note**: The `usermap-server` must be deployed separately as a Node.js service, or integrated into the Next.js app via API routes.

## License

© 2024 Bannquet (BNQT). All rights reserved.
