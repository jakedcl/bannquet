export function NotInIssuanceNote({
  label,
  href,
  latestIssuanceEt,
  priorIssuanceEt,
}: {
  label: string;
  href: string;
  latestIssuanceEt?: string | null;
  priorIssuanceEt?: string | null;
}) {
  return (
    <p className="text-sm text-gray-700">
      {label} is not in {priorIssuanceEt ? 'the latest' : 'this'} issuance
      {latestIssuanceEt ? ` (${latestIssuanceEt} ET)` : ''}.
      {priorIssuanceEt ? (
        <>
          {' '}
          Showing prior bulletin from {priorIssuanceEt} ET.
        </>
      ) : null}{' '}
      <a href={href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
        Open official source
      </a>
    </p>
  );
}