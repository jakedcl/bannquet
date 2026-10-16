import Link from 'next/link';
import { Window } from '@/components/retro/Window';

export function DashboardWindow({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <Link href={href} aria-label={title} className="absolute inset-0 z-0" />
      <div className="pointer-events-none relative z-10">
        <Window
          pad="tight"
          title={<Link href={href} className="pointer-events-auto text-white no-underline">{title}</Link>}
        >
          <div className="[&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            {children}
          </div>
        </Window>
      </div>
    </div>
  );
}
