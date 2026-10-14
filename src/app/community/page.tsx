import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';

const CARDS = [
  {
    href: '/posts',
    title: 'Posts',
    text: 'Stories, photos, and routes from the crew.',
  },
  {
    href: '/stats',
    title: 'Stats',
    text: 'Summit lists, plus miles, elevation, and summits.',
  },
  {
    href: '/trips',
    title: 'Trips',
    text: 'Pick a day, a trailhead, and who is coming.',
  },
  {
    href: '/map',
    title: 'Map',
    text: 'Routes, photos, and trip trailheads in one place.',
  },
] as const;

export default function CommunityPage() {
  return (
    <PageWrapper>
      <div className="page-shell page-pad">
        <p className="page-kicker mb-2">The crew</p>
        <h1 className="page-title mb-3">Community</h1>
        <p className="page-lede mb-6">
          Posts, stats, trips, and the map for this little crew.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="guide-card retro-box retro-window bg-paper-raised">
              <span className="retro-banner block text-sm font-bold uppercase tracking-wide">
                {card.title}
              </span>
              <span className="block p-4 text-sm text-ink-soft">{card.text}</span>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
