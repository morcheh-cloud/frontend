"use client"

import type { PitrBackup } from "@/lib/services"
import { cn } from "@/lib/utils"
import { backupTypeLabel } from "./meta"

const tickHeight: Record<PitrBackup["type"], string> = {
  full: "h-6",
  diff: "h-4",
  incr: "h-2.5",
}

const day = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })

// The span it can go back over, as a bar from the oldest backup to now:
// filled where a restore can land, a tick per backup (taller = bigger
// kind). While archiving works the fill reaches now (a restore archives
// the current WAL first; a quiet database just has nothing newer); when it
// fails, what's after the last archived WAL is hatched. A click on the bar
// picks that moment.
export function Timeline({
  from,
  to,
  failing,
  backups,
  onPick,
}: {
  from: string
  to: string
  failing: boolean
  backups: PitrBackup[]
  onPick?: (at: Date) => void
}) {
  const start = new Date(from).getTime()
  const now = Math.max(Date.now(), start + 60_000)
  const end = failing ? Math.max(new Date(to).getTime(), start) : now
  const span = now - start
  const at = (t: number) => `${(((t - start) / span) * 100).toFixed(3)}%`
  // Day marks, at most ~8.
  const days: number[] = []
  const d0 = new Date(start)
  d0.setHours(0, 0, 0, 0)
  const step = Math.max(1, Math.ceil(span / 86_400_000 / 8))
  for (let t = d0.getTime() + 86_400_000; t < now; t += step * 86_400_000) {
    days.push(t)
  }
  const gap = failing && now - end > 60_000

  return (
    <div className="min-w-0">
      <button
        type="button"
        disabled={!onPick}
        aria-label="Pick a moment on the timeline to restore to"
        onClick={(e) => {
          if (!onPick) return
          const r = e.currentTarget.getBoundingClientRect()
          const t = start + ((e.clientX - r.left) / r.width) * span
          onPick(new Date(Math.min(t, end)))
        }}
        className={cn(
          "relative block h-10 w-full rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
          onPick && "cursor-crosshair",
        )}
      >
        <span
          className="absolute inset-y-0 start-0 rounded-lg bg-brand-soft"
          style={{ width: at(end) }}
        />
        {gap && (
          <span
            className="absolute inset-y-0 rounded-e-lg bg-[repeating-linear-gradient(135deg,var(--color-warning)_0_2px,transparent_2px_7px)] opacity-25"
            style={{ insetInlineStart: at(end), insetInlineEnd: 0 }}
            title="Not archived yet"
          />
        )}
        {days.map((t) => (
          <span
            key={t}
            className="absolute inset-y-1 w-px bg-border"
            style={{ insetInlineStart: at(t) }}
          />
        ))}
        {backups.map((b) => (
          <span
            key={b.label}
            title={`${backupTypeLabel[b.type]} backup · ${new Date(b.stop).toLocaleString()}`}
            className={cn(
              "absolute bottom-1 w-1 -translate-x-1/2 rounded-full rtl:translate-x-1/2",
              tickHeight[b.type],
              b.error ? "bg-warning" : "bg-brand",
            )}
            style={{ insetInlineStart: at(new Date(b.stop).getTime()) }}
          />
        ))}
        <span
          className="absolute inset-y-0 w-0.5 bg-success"
          style={{ insetInlineStart: `calc(${at(end)} - 1px)` }}
          title="Newest point"
        />
      </button>
      <div className="relative mt-1.5 h-4 text-caption text-ash">
        {days.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 whitespace-nowrap max-sm:hidden rtl:translate-x-1/2"
            style={{ insetInlineStart: at(t) }}
          >
            {day(t)}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
        {(["full", "diff", "incr"] as const)
          .filter((k) => backups.some((b) => b.type === k))
          .map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className={cn("w-1 rounded-full bg-brand", tickHeight[k])}
              />
              {backupTypeLabel[k]}
            </span>
          ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm bg-brand-soft ring-1 ring-brand/20" />
          Can restore to any second
        </span>
        {gap && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-warning/25" />
            Not in the storage yet
          </span>
        )}
      </div>
    </div>
  )
}
