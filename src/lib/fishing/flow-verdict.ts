import { parseGaugeNumber, type GaugeView } from '@/lib/fishing/readings'

export function flowVerdict(flow: number | null, median: number | null, trend: string | null): string | null {
  if (flow == null || flow < 0) return null
  const direction = trendWord(trend, flow)
  if (median == null || median <= 0) {
    return direction ? direction.charAt(0).toUpperCase() + direction.slice(1) : null
  }
  const ratio = flow / median
  const level = ratio >= 1.5 ? 'High' : ratio <= 0.67 ? 'Low' : 'Normal'
  const against = ratio >= 0.85 && ratio < 1.15 ? 'near the median' : `${times(ratio)} normal`
  return direction ? `${level}, ${against}, ${direction}` : `${level}, ${against}`
}

export function withVerdicts(gauges: GaugeView[], medians: Record<string, number>): GaugeView[] {
  return gauges.map((gauge) => ({
    ...gauge,
    verdict: flowVerdict(
      gauge.flowState === 'value' ? parseGaugeNumber(gauge.flow) : null,
      medians[gauge.site] ?? null,
      gauge.trend,
    ),
  }))
}

function times(ratio: number): string {
  if (ratio >= 10) return '10x+'
  const rounded = ratio >= 2 ? Math.round(ratio) : Math.round(ratio * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}x`
}

function trendWord(trend: string | null, flow: number): 'rising' | 'falling' | 'steady' | null {
  if (!trend) return null
  const delta = Number(trend)
  if (!Number.isFinite(delta)) return null
  const band = Math.max(1, Math.abs(flow) * 0.02)
  if (Math.abs(delta) <= band) return 'steady'
  return delta > 0 ? 'rising' : 'falling'
}
