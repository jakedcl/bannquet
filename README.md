# BNQT (Bannquet)

A creative web development agency crafting immersive digital experiences. We blend computer science expertise with innovative design to create memorable digital solutions.

## Our Philosophy

At BNQT, we believe in pushing the boundaries of web technology while maintaining clean, fundamental design principles. Our work combines:
- Advanced web technologies
- Creative interactive experiences
- Data visualization
- Modern UI/UX principles

## Featured Projects

### 1. Mountain Weather Platform
An interactive weather visualization system for northeastern US mountains
- Real-time data integration
- Dynamic weather dashboards
- Custom API implementation
- Responsive design system

### 2. Interactive Experiences (Coming Soon)
- 3D terrain visualization
- WebGL experiments
- Creative animations
- Interactive storytelling

## Tech Expertise

### Frontend Development
- **Modern Frameworks**: Next.js 14, React
- **Styling**: Tailwind CSS, Framer Motion
- **3D & Graphics**: Three.js, WebGL
- **State Management**: React Query, Redux

### Backend & Integration
- **APIs**: RESTful, GraphQL
- **Databases**: PostgreSQL, MongoDB
- **CMS**: Sanity.io
- **Cloud**: Vercel, AWS

## Project Architecture

```
bnqt/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage/Landing
│   │   ├── projects/         # Project showcases
│   │   ├── about/            # Agency info
│   │   └── contact/          # Contact form
│   ├── components/
│   │   ├── ui/               # Reusable components
│   │   ├── projects/         # Project-specific components
│   │   └── animations/       # Interactive elements
│   ├── lib/
│   │   ├── animations.ts     # Animation utilities
│   │   └── api/             # API integrations
│   └── styles/
│       └── globals.css       # Global styles
```

## Design System

### Visual Identity
- **Typography**: Helvetica for clean, professional presentation
- **Color Palette**: 
  - Primary: Brand green (#[YOUR_GREEN_COLOR])
  - Secondary: Monochromatic grays
  - Accent: Project-specific colors
- **Design Principles**:
  - Minimalist base with creative accents
  - Smooth transitions and animations
  - Responsive and adaptive layouts
  - Interactive elements that enhance storytelling

### Component Architecture

#### Core Components
- Dynamic navigation system
- Project showcase cards
- Interactive case studies
- Animated transitions
- Contact forms with validation

#### Project Integration
Each project in our portfolio is:
- Fully functional and interactive
- Independently routed
- Responsive across devices
- Optimized for performance

## Development Workflow

1. **Project Setup**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_id
   NEXT_PUBLIC_SANITY_DATASET=production
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```

## Project Showcase Integration

To add a new project to the portfolio:

1. Create project directory in `src/app/projects/[project-name]`
2. Add project metadata to Sanity CMS
3. Create necessary components in `src/components/projects`
4. Implement interactive features
5. Add case study and documentation

## Deployment

- **Production**: [www.bannquet.com](https://www.bannquet.com)
- **Staging**: [staging.bannquet.com](https://staging.bannquet.com)

## Contact

For business inquiries: [contact@bannquet.com](mailto:contact@bannquet.com)

## License

© 2024 Bannquet (BNQT). All rights reserved.
