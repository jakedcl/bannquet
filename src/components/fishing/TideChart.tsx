import { formatEasternDay } from '@/lib/fishing/clock';
import type { TideExtreme, TidePoint } from '@/lib/fishing/tides';

export function TideChart({ curve, extremes }: { curve: TidePoint[]; extremes: TideExtreme[] }) {
  if (curve.length < 2) return null;
  const start = curve[0].time;
  const end = curve[curve.length - 1].time;
  const span = end - start || 1;
  const heights = curve.map((point) => point.feet);
  const minFeet = Math.min(0, ...heights);
  const maxFeet = Math.max(1, ...heights);
  const range = maxFeet - minFeet || 1;
  const width = 640;
  const height = 176;
  const padX = 8;
  const padY = 12;

  function x(time: number): number {
    return padX + ((time - start) / span) * (width - padX * 2);
  }

  function y(feet: number): number {
    return padY + ((maxFeet - feet) / range) * (height - padY * 2);
  }

  const line = curve
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.time).toFixed(1)} ${y(point.feet).toFixed(1)}`)
    .join(' ');

  const days: { time: number; label: string }[] = [];
  for (const point of curve) {
    const label = formatEasternDay(point.time);
    if (days.at(-1)?.label !== label) days.push({ time: point.time, label });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Tide curve for today and the next three days, heights in feet above MLLW"
      className="h-44 w-full bg-white"
    >
      {days.map((day, index) => {
        const left = x(day.time);
        const right = index + 1 < days.length ? x(days[index + 1].time) : width - padX;
        if (index % 2 === 0) return null;
        return <rect key={day.label} x={left} y={0} width={Math.max(0, right - left)} height={height} fill="#f4efe4" />;
      })}
      <line x1={padX} x2={width - padX} y1={y(0)} y2={y(0)} stroke="#9a8b74" strokeDasharray="3 3" />
      <path d={line} fill="none" stroke="#1f4e9c" strokeWidth="2" />
      {extremes.map((extreme) => (
        <circle key={`${extreme.time}-${extreme.kind}`} cx={x(extreme.time)} cy={y(extreme.feet)} r="3.5" fill={extreme.kind === 'H' ? '#c0392b' : '#1f4e9c'} />
      ))}
    </svg>
  );
}
