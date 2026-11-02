"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { Database, DatabaseCheckInfo, DatabaseLimit } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDatabaseChecks, useUpdateMonitoring } from "../../api"
import { areaLabels } from "../../components/meta"

const GB = 1024 ** 3

// What a limit is typed in: a share as %, bytes as GB, the rest as is.
const units: Record<string, { label: string; scale: number }> = {
  ratio: { label: "%", scale: 100 },
  bytes: { label: "GB", scale: 1 / GB },
  seconds: { label: "s", scale: 1 },
  hours: { label: "h", scale: 1 },
  ms: { label: "ms", scale: 1 },
  count: { label: "", scale: 1 },
}
const unitOf = (c: DatabaseCheckInfo) => units[c.unit ?? "count"] ?? units.count
const shown = (v: number, c: DatabaseCheckInfo) =>
  String(Math.round(v * unitOf(c).scale * 100) / 100)

type Draft = {
  muted: Set<string>
  values: Record<string, { warn: string; crit: string }>
}

function draftOf(d: Database, checks: DatabaseCheckInfo[]): Draft {
  const values: Draft["values"] = {}
  for (const c of checks) {
    const t = d.thresholds[c.id]
    values[c.id] = t
      ? { warn: shown(t.warn, c), crit: shown(t.crit, c) }
      : { warn: "", crit: "" }
  }
  return { muted: new Set(d.muted_checks), values }
}

// A typed pair back in the API's unit, with the default filling a blank
// side; null when both are blank (= use the defaults), a string when wrong.
function limitOf(
  c: DatabaseCheckInfo,
  v: { warn: string; crit: string },
): DatabaseLimit | null | string {
  if (!c.limit || (!v.warn.trim() && !v.crit.trim())) return null
  const { scale } = unitOf(c)
  const read = (s: string, fallback: number) => {
    if (!s.trim()) return fallback
    const n = Number(s)
    return Number.isFinite(n) && n >= 0 ? n / scale : Number.NaN
  }
  const warn = read(v.warn, c.limit.warn)
  const crit = read(v.crit, c.limit.crit)
  if (Number.isNaN(warn) || Number.isNaN(crit))
    return "Enter a number, 0 or more."
  if (c.unit === "ratio" && (warn > 1 || crit > 1)) return "At most 100%."
  if (c.lower ? crit > warn : crit < warn) {
    return c.lower
      ? "Critical has to be at or below Warning (lower is worse here)."
      : "Critical has to be at or above Warning."
  }
  return { warn, crit }
}

const areaOrder = Object.keys(areaLabels)

// Which checks speak up and where they draw the line. Blank limits follow
// the defaults; a muted check still runs and shows, but doesn't count.
export function MonitoringDialog({
  database: d,
  focus,
  open,
  onOpenChange,
}: {
  database: Database
  // A check to scroll to, when opened from its own menu.
  focus?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const catalog = useDatabaseChecks()
  const update = useUpdateMonitoring()
  // The checks this database has; all of them before its first check.
  const present = new Set(d.checks.map((c) => c.id))
  const checks = (catalog.data?.items ?? [])
    .filter((c) => present.size === 0 || present.has(c.id))
    .sort(
      (a, b) =>
        areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area) ||
        Number(!b.limit) - Number(!a.limit),
    )
  const [draft, setDraft] = useState<Draft | null>(null)
  const ready = catalog.data != null

  // Fresh from the saved settings every time it opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on open
  useEffect(() => {
    if (open && ready) setDraft(draftOf(d, catalog.data?.items ?? []))
    if (!open) setDraft(null)
  }, [open, ready])

  useEffect(() => {
    if (!draft || !focus) return
    document
      .getElementById(`limit-${focus}`)
      ?.scrollIntoView({ block: "center" })
  }, [draft, focus])

  const errors: Record<string, string> = {}
  const thresholds: Record<string, DatabaseLimit> = {}
  if (draft) {
    for (const c of checks) {
      const v = draft.values[c.id]
      if (!v) continue
      const r = limitOf(c, v)
      if (typeof r === "string") errors[c.id] = r
      else if (r) thresholds[c.id] = r
    }
  }
  const valid = Object.keys(errors).length === 0

  function save() {
    if (!draft || !valid) return
    update.mutate(
      {
        id: d.id,
        body: {
          // Alerts aren't set here; keep whatever is saved.
          alerts_enabled: d.alerts_enabled,
          muted_checks: [...draft.muted],
          thresholds,
        },
      },
      {
        onSuccess: () => {
          toast.success("Monitoring settings saved")
          onOpenChange(false)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  const set = (id: string, side: "warn" | "crit", value: string) =>
    setDraft(
      (p) =>
        p && {
          ...p,
          values: { ...p.values, [id]: { ...p.values[id], [side]: value } },
        },
    )
  const mute = (id: string, on: boolean) =>
    setDraft((p) => {
      if (!p) return p
      const muted = new Set(p.muted)
      if (on) muted.add(id)
      else muted.delete(id)
      return { ...p, muted }
    })

  let lastArea = ""
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Monitoring settings"
      description="When each check turns Warning or Critical. Blank = the default."
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!draft || !valid || update.isPending}
            onClick={save}
          >
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {!draft ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">
          {catalog.error ? catalog.error.message : "Loading…"}
        </p>
      ) : (
        <div className="-mx-6 max-h-[60svh] overflow-y-auto px-6 max-md:mx-0 max-md:max-h-none max-md:px-0">
          <ul className="flex flex-col">
            {checks.map((c) => {
              const head = c.area !== lastArea
              lastArea = c.area
              const v = draft.values[c.id] ?? { warn: "", crit: "" }
              const muted = draft.muted.has(c.id)
              const unit = unitOf(c).label
              return (
                <li
                  key={c.id}
                  id={`limit-${c.id}`}
                  className={cn(
                    "scroll-mt-4 border-border py-3",
                    !head && "border-t",
                    focus === c.id && "rounded-lg bg-brand-soft/50 px-2",
                  )}
                >
                  {head && (
                    <p className="py-2 font-label text-caption tracking-label text-ash uppercase">
                      {areaLabels[c.area as keyof typeof areaLabels] ?? c.area}
                    </p>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-body-sm font-medium",
                          muted && "text-muted-foreground",
                        )}
                      >
                        {c.title}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {c.about}
                      </p>
                    </div>
                    <label
                      htmlFor={`mute-${c.id}`}
                      className="flex shrink-0 items-center gap-2 text-caption text-muted-foreground max-md:min-h-11"
                    >
                      Mute
                      <Switch
                        id={`mute-${c.id}`}
                        checked={muted}
                        onCheckedChange={(on) => mute(c.id, on)}
                        aria-label={`Mute ${c.title}`}
                      />
                    </label>
                  </div>
                  {c.limit && (
                    <div className="mt-2 grid grid-cols-2 gap-3 md:max-w-sm">
                      {(["warn", "crit"] as const).map((side) => (
                        <label
                          key={side}
                          htmlFor={`limit-${c.id}-${side}`}
                          className="flex flex-col gap-1"
                        >
                          <span className="text-caption text-muted-foreground">
                            {side === "warn" ? "Warning" : "Critical"}
                            {c.lower ? " below" : " at"}
                            {unit && ` (${unit})`}
                          </span>
                          <Input
                            id={`limit-${c.id}-${side}`}
                            inputMode="decimal"
                            value={v[side]}
                            onChange={(e) => set(c.id, side, e.target.value)}
                            placeholder={c.limit ? shown(c.limit[side], c) : ""}
                            aria-invalid={errors[c.id] ? true : undefined}
                            className="tabular-nums"
                          />
                        </label>
                      ))}
                      {errors[c.id] && (
                        <p
                          role="alert"
                          className="col-span-2 text-caption text-destructive"
                        >
                          {errors[c.id]}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </ResponsiveDialog>
  )
}
