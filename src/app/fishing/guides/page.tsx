import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { FISHING_STATE_LINKS } from '@/lib/fishing/guides';

export default function FishingGuidesPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title="Guides">
          <p className="mb-4 text-sm text-gray-700">
            Seasons, special rules, and fish consumption advice stay on the state sites. This page does not copy them.
          </p>
          <div className="space-y-6">
            {FISHING_STATE_LINKS.map((state) => (
              <section key={state.state} className="space-y-3">
                <h2 className="text-sm font-bold uppercase">{state.state}</h2>
                <LinkGroup title="Regulations" links={state.regulations} />
                <LinkGroup title="Consumption advisories" links={state.advisories} />
              </section>
            ))}
          </div>
        </Window>
      </div>
    </PageWrapper>
  );
}

function LinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string; note: string }>;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase text-gray-700">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-bold underline">
              {link.label}
            </a>
            <p className="text-sm text-gray-700">{link.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
