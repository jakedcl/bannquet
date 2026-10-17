import { addCalendarDays, easternDate, easternMidnight, zonedStamp } from '@/lib/fishing/clock';
import { skyFor } from '@/lib/fishing/sky';
import { cosineCurve, heightAt, tideAxisTicks } from '@/lib/fishing/tide-curve';
import type { TideExtreme, TidePoint } from '@/lib/fishing/tides';
import { TideScroller } from '@/components/fishing/TideScroller';

const ZONE = 'America/New_York';

function clockLabel(time: number): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(time).map((part) => [part.type, part.value]),
  );
  const hour = parts.hour ?? '';
  const minute = parts.minute ?? '00';
  const suffix = (parts.dayPeriod ?? 'AM').toLowerCase().startsWith('p') ? 'p' : 'a';
  return minute === '00' ? `${hour}${suffix}` : `${hour}:${minute}${suffix}`;
}

function dayLabel(time: number): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE,
      weekday: 'short',
      day: 'numeric',
    }).formatToParts(time).map((part) => [part.type, part.value]),
  );
  return `${parts.weekday ?? ''} ${parts.day ?? ''}`.trim();
}

function datesBetween(start: number, end: number): string[] {
  const dates: string[] = [];
  let cursor = easternDate(start);
  const last = easternDate(end);
  while (cursor <= last && dates.length < 8) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function TideChart({
  curve,
  extremes,
  now,
  latitude,
  longitude,
}: {
  curve: TidePoint[];
  extremes: TideExtreme[];
  now: number;
  latitude: number;
  longitude: number;
}) {
  const estimated = curve.length < 2;
  const plotted = estimated ? cosineCurve(extremes) : curve;
  if (plotted.length < 2) return null;

  const rangeStart = plotted[0].time;
  const rangeEnd = plotted[plotted.length - 1].time;
  const dates = datesBetween(rangeStart, rangeEnd);
  const padLeft = 46;
  const padRight = 18;
  const padTop = 30;
  const padBottom = 36;
  const dayWidth = 280;
  const width = padLeft + Math.max(1, dates.length) * dayWidth + padRight;
  const height = 280;
  const ticks = tideAxisTicks(
    Math.min(0, ...plotted.map((point) => point.feet)),
    Math.max(...plotted.map((point) => point.feet)),
  );
  const yMin = ticks[0] ?? 0;
  const yMax = ticks[ticks.length - 1] ?? 1;
  const span = rangeEnd - rangeStart || 1;

  function x(time: number): number {
    return padLeft + ((time - rangeStart) / span) * (width - padLeft - padRight);
  }

  function y(feet: number): number {
    return padTop + ((yMax - feet) / (yMax - yMin || 1)) * (height - padTop - padBottom);
  }

  const line = plotted
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.time).toFixed(1)} ${y(point.feet).toFixed(1)}`)
    .join(' ');
  const fill = `${line} L${x(rangeEnd).toFixed(1)} ${y(yMin).toFixed(1)} L${x(rangeStart).toFixed(1)} ${y(yMin).toFixed(1)} Z`;
  const axisTimes = dates.flatMap((date) => [6, 12, 18].map((hour) => zonedStamp(`${date} ${String(hour).padStart(2, '0')}:00`)))
    .filter((time) => time >= rangeStart && time <= rangeEnd);
  const nights = dates.flatMap((date) => {
    const sky = skyFor(latitude, longitude, easternMidnight(date) + 12 * 60 * 60 * 1000);
    const dayStart = easternMidnight(date);
    const dayEnd = easternMidnight(addCalendarDays(date, 1));
    const bands: { start: number; end: number }[] = [];
    if (sky.sunrise != null) bands.push({ start: dayStart, end: sky.sunrise });
    if (sky.sunset != null) bands.push({ start: sky.sunset, end: dayEnd });
    return bands;
  });
  const nowFeet = now >= rangeStart && now <= rangeEnd ? heightAt(plotted, now) : null;
  const days = dates.map((date) => ({ id: `tide-${date}`, label: dayLabel(easternMidnight(date)) }));

  return (
    <div>
      <TideScroller days={days}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={estimated
            ? 'Estimated tide curve from the highs and lows, heights in feet above MLLW'
            : 'Tide curve, heights in feet above MLLW'}
          className="block h-auto max-w-none bg-white"
        >
          {nights.map((band) => {
            const left = x(Math.max(band.start, rangeStart));
            const right = x(Math.min(band.end, rangeEnd));
            if (right - left < 1) return null;
            return <rect key={`${band.start}-${band.end}`} x={left} y={padTop} width={right - left} height={y(yMin) - padTop} fill="#d5e2f2" />;
          })}
          <text x={padLeft - 6} y={padTop - 6} textAnchor="end" fontSize="11" fill="#444444">ft</text>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={padLeft} x2={width - padRight} y1={y(tick)} y2={y(tick)} stroke="#e4dccd" />
              <text x={padLeft - 6} y={y(tick) + 3} textAnchor="end" fontSize="11" fill="#444444">{tick}</text>
            </g>
          ))}
          {dates.map((date) => {
            const midnight = easternMidnight(date);
            const inside = midnight > rangeStart && midnight < rangeEnd;
            const anchor = x(inside ? midnight : Math.max(midnight, rangeStart));
            return (
              <g key={date} id={`tide-${date}`}>
                <rect x={anchor} y={padTop} width="1" height="1" fill="transparent" />
                {inside ? <line x1={anchor} x2={anchor} y1={padTop} y2={y(yMin)} stroke="#9a8b74" /> : null}
                {inside || date === dates[0] ? (
                  <text x={anchor + 4} y={padTop + 12} fontSize="11" fill="#444444">{dayLabel(midnight)}</text>
                ) : null}
              </g>
            );
          })}
          {axisTimes.map((time) => (
            <text key={time} x={x(time)} y={height - 10} textAnchor="middle" fontSize="11" fill="#444444">
              {clockLabel(time)}
            </text>
          ))}
          <path d={fill} fill="#1f4e9c" opacity="0.28" />
          <path d={line} fill="none" stroke="#1f4e9c" strokeWidth="2.5" />
          {extremes.map((extreme) => {
            if (extreme.time < rangeStart || extreme.time > rangeEnd) return null;
            const cx = x(extreme.time);
            const cy = y(extreme.feet);
            const above = extreme.kind === 'H' || cy > height - padBottom - 36;
            const labelY = above ? cy - 18 : cy + 14;
            return (
              <g key={`${extreme.time}-${extreme.kind}`}>
                <circle cx={cx} cy={cy} r="4" fill={extreme.kind === 'H' ? '#c0392b' : '#1f4e9c'} stroke="#ffffff" strokeWidth="1.5" />
                <text x={cx} y={labelY} textAnchor="middle" fontSize="10" fontWeight="700" fill="#222222">{clockLabel(extreme.time)}</text>
                <text x={cx} y={labelY + 11} textAnchor="middle" fontSize="10" fill="#222222">{extreme.feet.toFixed(1)}</text>
              </g>
            );
          })}
          {nowFeet != null ? (
            <g>
              <line x1={x(now)} x2={x(now)} y1={padTop} y2={y(yMin)} stroke="#222222" strokeDasharray="3 3" />
              <circle cx={x(now)} cy={y(nowFeet)} r="4" fill="#222222" />
              <text
                x={x(now) + (x(now) > width - 78 ? -8 : 8)}
                y={Math.min(Math.max(y(nowFeet) - 8, padTop + 22), y(yMin) - 4)}
                textAnchor={x(now) > width - 78 ? 'end' : 'start'}
                fontSize="11"
                fontWeight="700"
                fill="#222222"
              >
                {`Now ${nowFeet.toFixed(1)} ft`}
              </text>
            </g>
          ) : null}
        </svg>
      </TideScroller>
      <p className="px-2 py-1 text-xs text-gray-700">
        {estimated ? 'Estimated from the highs and lows. ' : ''}
        Feet above MLLW.
      </p>
    </div>
  );
}
