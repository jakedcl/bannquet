import type { Metadata } from 'next';
import { PeakFinder } from '@/components/peak-finder/PeakFinder';

export const metadata: Metadata = {
  title: 'Peak Finder',
  description: 'See the peaks around a spot. Hold up your phone, or drop a pin and drag the skyline.',
};

export default function PeakFinderPage() {
  return (
    <div className="fixed inset-x-0 top-[var(--bar-h)] bottom-[var(--tab-h)] z-0 overflow-hidden">
      <PeakFinder />
    </div>
  );
}
