import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import type { StormReportLine, StormReportProduct } from '@/lib/mountain-weather/snow-types';

function parseAmountInches(raw: string): number | null {
  const m = raw.match(/([\d.]+)\s*inch/i);
  if (!m) return null;
  return Number(m[1]);
}

export function parsePnsSnowReports(
  text: string,
  office: MountainWfo,
  productId: string | null,
  issuanceTime: string | null,
): StormReportProduct {
  const lines: StormReportLine[] = [];
  const rowRe = /^(\d[\d.]*\s+[NSEW]+|[\d.]+\s+\w)/;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('...') || trimmed.startsWith('Location')) continue;
    if (!rowRe.test(trimmed)) continue;
    const cols = trimmed.split(/\s{2,}/);
    if (cols.length < 3) continue;
    const location = cols[0].trim();
    const amount = cols[1]?.trim() ?? '';
    const timeLabel = cols[2]?.trim() ?? '';
    const provider = cols[3]?.trim() ?? null;
    const isSnow = /snow/i.test(`${amount} ${provider ?? ''} ${trimmed}`);
    const amountIn = parseAmountInches(amount);
    if (isSnow || amountIn !== null) {
      lines.push({ location, amount, amountIn, timeLabel, provider, isSnow: isSnow || /inch/i.test(amount) });
    }
  }
  const snowLines = lines.filter((l) => l.isSnow);
  return {
    office,
    productId,
    title: 'Public Information Statement — precipitation reports',
    issuanceTime,
    parsedLines: snowLines.length ? snowLines : lines.slice(0, 40),
    fullText: text,
    parseReliable: snowLines.length >= 1,
  };
}