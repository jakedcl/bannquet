/** A named, accessible placeholder while one weather source is loading. */
export function WeatherLoading({ label }: { label: string }) {
  return (
    <p role="status" className="panel px-3.5 py-3 text-meta text-ink-2">
      Loading {label.toLowerCase()}…
    </p>
  );
}
