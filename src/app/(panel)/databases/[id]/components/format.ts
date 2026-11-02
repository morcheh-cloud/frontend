import { formatDuration, formatSize } from "@/lib/format"
import type { DatabaseCheckInfo } from "@/lib/services"

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const plain = new Intl.NumberFormat("en", { maximumFractionDigits: 1 })

// 12, 1,240, 18.2K: compact once it stops being readable at a glance.
export const num = (n: number) =>
  Math.abs(n) >= 100_000 ? compact.format(n) : plain.format(n)

// A 0–1 share as a percent; one decimal near the top, where 99.4% and 99.9%
// mean different things for a cache.
export function pct(r: number) {
  const p = r * 100
  return p >= 99 && p < 100 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`
}

// Seconds the way a person reads a wait: 350 ms, 4.2 s, 12 m, 3h 10m.
export function secs(s: number) {
  if (s < 1) return `${Math.round(s * 1000)} ms`
  if (s < 10) return `${s.toFixed(1)} s`
  if (s < 60) return `${Math.round(s)} s`
  return formatDuration(s)
}

export function ms(n: number) {
  if (n < 1) return "<1 ms"
  if (n < 1000) return `${n < 10 ? n.toFixed(1) : Math.round(n)} ms`
  return secs(n / 1000)
}

export const perSecond = (n: number) => `${num(n)}/s`

// A check's measured value in its own unit.
export function checkValue(value: number, unit?: DatabaseCheckInfo["unit"]) {
  switch (unit) {
    case "ratio":
      return pct(value)
    case "seconds":
      return secs(value)
    case "hours":
      return `${plain.format(value)} h`
    case "ms":
      return ms(value)
    case "bytes":
      return formatSize(value)
    default:
      return num(value)
  }
}
