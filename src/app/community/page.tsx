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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold uppercase tracking-wide">Community</h1>
        <p className="mb-6 text-sm text-gray-700">
          Posts, stats, trips, and the map for this little crew.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="block retro-box bg-white">
              <span className="retro-banner block px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white">
                {card.title}
              </span>
              <span className="block p-4 text-sm text-gray-800">{card.text}</span>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
