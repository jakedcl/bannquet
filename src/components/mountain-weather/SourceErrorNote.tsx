export function SourceErrorNote({ label, href }: { label: string; href: string }) {
  return (
    <p className="text-sm text-gray-700">
      {label} did not load (source error).{' '}
      <a href={href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
        Open official source
      </a>
    </p>
  );
}