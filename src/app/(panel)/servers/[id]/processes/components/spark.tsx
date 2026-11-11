"use client"

import { cn } from "@/lib/utils"

// A tiny CPU trend: samples oldest first, scaled to at least `floor`%.
export function Spark({
  samples,
  floor = 100,
  label,
  className,
}: {
  samples: number[]
  floor?: number
  label: string
  className?: string
}) {
  if (samples.length < 2) {
    return (
      <div
        role="img"
        aria-label={label}
        className={cn("flex items-end", className)}
      >
        <div className="h-0.5 w-full rounded-full bg-brand-soft" />
      </div>
    )
  }
  const top = Math.max(floor, ...samples)
  const step = 100 / (samples.length - 1)
  const pts = samples.map((v, i) => `${i * step},${100 - (v / top) * 100}`)
  const line = pts.join(" ")
  return (
    <div role="img" aria-label={label} className={cn("relative", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <polygon points={`0,100 ${line} 100,100`} className="fill-brand-soft" />
        <polyline
          points={line}
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-brand"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
