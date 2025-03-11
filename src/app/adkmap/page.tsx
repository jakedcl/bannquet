import type { Metadata } from 'next';
import MapClientWrapper from '@/components/projects/adk-map/MapClientWrapper';

export const metadata: Metadata = {
  title: 'Adirondacks Interactive Map | Bannquet',
  description: 'Explore the Adirondack Mountains with our interactive 3D map featuring trails, peaks, and points of interest.',
};

export default function AdirondacksMapPage() {
  return <MapClientWrapper />;
} 