import { NavButton } from '@/components/ui/NavButton';
import type { NavLink } from '@/lib/sections';

export function SectionList({
  links,
  activeHref,
  label = 'Sections',
}: {
  links: readonly NavLink[];
  activeHref?: string;
  label?: string;
}) {
  return (
    <nav aria-label={label} className="mx-auto flex w-full max-w-md flex-col gap-2">
      {links.map((item) => (
        <NavButton key={item.label} href={item.href} active={item.href === activeHref} className="w-full">
          {item.label}
        </NavButton>
      ))}
    </nav>
  );
}
