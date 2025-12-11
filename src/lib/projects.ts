export type ProjectType = 'nextjs' | 'static' | 'iframe' | 'github';

export interface Project {
  id: string;
  title: string;
  description: string;
  type: ProjectType;
  image: string;
  tags: string[];
  link: string;
  demoUrl?: string;  // For iframe or hosted projects
  githubUrl?: string;
  staticPath?: string;  // For static exports
}

export const projects: Project[] = [ 
  {
    id: 'mountain-weather',
    title: 'Mountain Weather Platform',
    description: 'Real-time weather visualization system for northeastern US mountains, featuring dynamic dashboards and custom API integration.',
    type: 'nextjs',
    image: '/projects/mountain-weather.jpg',
    tags: ['Next.js', 'TypeScript', 'Weather API', 'Real-time Data'],
    link: '/projects/mountain-weather'
  },
  {
    id: 'adirondacks-map',
    title: 'Adirondacks Interactive Map',
    description: 'A full-featured 3D interactive map of the Adirondack mountain region with points of interest, trails, and more.',
    type: 'nextjs',
    image: '/projects/adirondacks-map.jpg',
    tags: ['Mapbox GL', '3D Visualization', 'Interactive', 'Next.js'],
    link: '/map'
  },
  // Example of an iframe project
  {
    id: 'vanilla-js-game',
    title: 'JavaScript Game',
    description: 'A pure JavaScript game showcasing interactive animations and game mechanics.',
    type: 'iframe',
    image: '/projects/game-preview.jpg',
    tags: ['JavaScript', 'Canvas', 'Game Development'],
    link: '/projects/js-game',
    demoUrl: 'https://your-hosted-game-url.com'
  },
  // Example of a static export
  {
    id: 'react-dashboard',
    title: 'React Analytics Dashboard',
    description: 'A React-based analytics dashboard with complex data visualizations.',
    type: 'static',
    image: '/projects/dashboard-preview.jpg',
    tags: ['React', 'D3.js', 'Analytics'],
    link: '/projects/react-dashboard',
    staticPath: '/projects/react-dashboard/index.html'
  }
]; 