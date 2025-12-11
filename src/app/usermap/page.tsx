import type { Metadata } from 'next';
import UserMapWrapper from '@/components/usermap/UserMapWrapper';

export const metadata: Metadata = {
  title: 'Live Visitor Map | Bannquet',
  description: 'See who else is exploring the map in real-time. Drop a pin, set your nickname, and broadcast messages!',
};

export default function UserMapPage() {
  return <UserMapWrapper />;
}
