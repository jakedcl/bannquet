export function SourceErrorNote({
  label,
  href,
  serverError,
}: {
  label: string;
  href: string;
  /** Logged in HTML for sweeps only; not shown to users. */
  serverError?: string | null;
}) {
  return (
    <p className="text-sm text-ink-2" data-mwx-source-error={serverError ?? undefined}>
      {label} did not load (source error).{' '}
      <a href={href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
        Open official source
      </a>
    </p>
  );
}