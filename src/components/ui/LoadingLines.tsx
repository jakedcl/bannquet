export function LoadingLines({ label }: { label: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm">{label}</p>
      <div className="space-y-2" aria-hidden="true">
        <div className="skeleton-bar w-2/3" />
        <div className="skeleton-bar w-full" />
        <div className="skeleton-bar w-5/6" />
        <div className="skeleton-bar w-1/2" />
      </div>
    </div>
  );
}
