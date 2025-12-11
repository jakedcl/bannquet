import { Category } from './types';

export default function MarkerStyle(categoryId: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    backgroundColor: 'transparent',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    cursor: 'pointer'
  };
  
  return {
    ...baseStyle,
    backgroundImage: `url("/markers/${categoryId}.png")`
  };
}

export const categories: Category[] = [
  { name: 'High Peaks', id: 'highpeaks', endpoint: 'highpeaks', color: '#8A2BE2' },
  { name: 'Low Peaks', id: 'lowpeaks', endpoint: 'lowpeaks', color: '#1E90FF' },
  { name: 'Trailheads', id: 'trailheads', endpoint: 'trailheads', color: '#4682B4' },
  { name: 'Primitive Sites', id: 'primitivesites', endpoint: 'primitivesites', color: '#DA70D6' },
  { name: 'Lean-tos', id: 'leantos', endpoint: 'leantos', color: '#FF4500' },
  { name: 'Parking', id: 'parking', endpoint: 'parking', color: '#228B22' },
  { name: 'Viewpoints', id: 'viewpoints', endpoint: 'viewpoints', color: '#32CD32' },
  { name: 'Stay', id: 'stay', endpoint: 'stay', color: '#FF69B4' },
  { name: 'Food', id: 'food', endpoint: 'food', color: '#FF6347' },
  { name: 'Canoe Launch', id: 'canoe', endpoint: 'canoe', color: '#FFD700' },
  { name: 'Waterfalls', id: 'waterfalls', endpoint: 'waterfalls', color: '#00CED1' }
]; 