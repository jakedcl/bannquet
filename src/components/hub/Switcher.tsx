import Link from 'next/link';

export type SwitcherItem = { id: string; label: string; href?: string };

/**
 * Segmented control: one row of choices in a sunken track, the chosen one
 * yellow. With `href` on each item it is navigation (e.g. `?tab=` on a
 * weather place); with `onSelect` it is a client-side toggle.
 */
export function Switcher({
  items,
  value,
  label,
  onSelect,
  className = '',
}: {
  items: SwitcherItem[];
  value: string;
  label: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={`switcher ${className}`}>
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.id}
            href={item.href}
            scroll={false}
            aria-current={item.id === value ? 'page' : undefined}
            className="switcher-item"
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === value}
            onClick={() => onSelect?.(item.id)}
            className="switcher-item"
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
