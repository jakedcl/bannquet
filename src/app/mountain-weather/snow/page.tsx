import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';

export const dynamic = 'force-dynamic';

export default function MountainSnowHubPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-4 px-4 pb-12 pt-6">
        <nav className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">
            Mountain Weather
          </Link>
        </nav>
        <LargeTitle title="Snow" eyebrow="Hub" />
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            <Link href="/mountain-weather/snow/avalanche" className="font-bold underline">
              Avalanche
            </Link>{' '}
            — MWAC, NYSAC, and NWS avalanche weather guidance (AVG) by point.
          </li>
        </ul>
      </div>
    </PageWrapper>
  );
}