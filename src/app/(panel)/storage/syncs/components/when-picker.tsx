"use client"

import {
  CloudUpload,
  FilePen,
  Hand,
  Hourglass,
  Info,
  type LucideIcon,
  Play,
  RefreshCw,
  Timer,
} from "lucide-react"
import { Fragment, type ReactNode } from "react"
import { ScheduleField } from "@/app/(panel)/cronjobs/components/schedule-field"
import {
  type Builder,
  fromBuilder,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { type Trigger, triggerMeta } from "./meta"

export type WhenPatch = Partial<{
  trigger: Trigger
  interval: string
  watchDelay: string
  watchCheck: string
  builder: Builder
  cron: string
  timezone: string
}>

const order: Trigger[] = ["watch", "interval", "schedule", "manual"]

const num = (v: string) => Number(v.trim() || "0")

function seconds(v: string) {
  const n = num(v)
  if (!Number.isFinite(n) || n <= 0) return "a few seconds"
  return n < 60 || n % 60 ? `${n} s` : `${n / 60} min`
}

function minutes(v: string) {
  const n = num(v)
  if (!Number.isFinite(n) || n <= 0) return "a while"
  if (n < 60) return `${n} min`
  if (n % 1440 === 0) return n === 1440 ? "1 day" : `${n / 1440} days`
  const h = Math.floor(n / 60)
  const m = n % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// The "When" of a sync: the four ways it can start, then the chosen one's
// settings in one panel, with a small picture of how it plays out.
export function WhenPicker({
  value,
  onChange,
  errors,
  phone,
  fromServer,
  server,
}: {
  value: {
    trigger: Trigger
    interval: string
    watchDelay: string
    watchCheck: string
    builder: Builder
    timezone: string
  }
  onChange: (patch: WhenPatch) => void
  errors: { interval?: string; watchDelay?: string; cron?: string }
  phone: boolean
  fromServer: boolean
  server?: string
}) {
  const t = value.trigger
  const check = num(value.watchCheck)

  let body: ReactNode = null
  if (t === "watch") {
    body = (
      <>
        <Steps
          phone={phone}
          steps={[
            { icon: FilePen, label: "A file changes" },
            {
              icon: Hourglass,
              label: `Quiet for ${seconds(value.watchDelay)}`,
            },
            { icon: CloudUpload, label: "The changes are copied", on: true },
          ]}
          note={
            <>
              <RefreshCw />
              {check > 0
                ? `Everything is compared every ${minutes(value.watchCheck)} and after each reconnect.`
                : "Everything is compared after each reconnect."}
            </>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Setting
            label="Copy after it's quiet for"
            hint="A burst of writes goes in one push. Busy folders still push every 30 s."
            error={errors.watchDelay}
            unit="seconds"
            min={1}
            max={600}
            value={value.watchDelay}
            onChange={(watchDelay) => onChange({ watchDelay })}
            presets={[2, 5, 15, 60].map((s) => ({
              value: s,
              label: s < 60 ? `${s} s` : "1 min",
            }))}
          />
          <Setting
            label="Compare everything every"
            hint="Catches anything a dropped connection missed."
            error={errors.interval}
            unit="minutes"
            min={0}
            max={10080}
            value={value.watchCheck}
            onChange={(watchCheck) => onChange({ watchCheck })}
            presets={[0, 60, 360, 1440].map((m) => ({
              value: m,
              label: m === 0 ? "Reconnect only" : minutes(String(m)),
            }))}
          />
        </div>
        <p className="flex gap-2 text-caption text-muted-foreground [&>svg]:mt-px [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-ash">
          <Info />
          <span>
            Needs <span className="font-mono">inotify-tools</span> on{" "}
            {server ?? "the server"}. If it&apos;s missing, the sync&apos;s page
            offers to install it.
          </span>
        </p>
      </>
    )
  } else if (t === "interval") {
    const wait = `Wait ${minutes(value.interval)}`
    body = (
      <>
        <Steps
          phone={phone}
          steps={[
            { icon: Play, label: "Run", on: true },
            { icon: Timer, label: wait },
            { icon: Play, label: "Run again", on: true },
            ...(phone ? [] : [{ icon: Timer, label: wait }]),
          ]}
          more
        />
        <Setting
          label="Wait between runs"
          hint="Counted from the end of the last run, so runs never pile up."
          error={errors.interval}
          unit="minutes"
          min={1}
          max={10080}
          value={value.interval}
          onChange={(interval) => onChange({ interval })}
          presets={[1, 5, 15, 60, 360, 1440].map((m) => ({
            value: m,
            label: minutes(String(m)),
          }))}
          className="sm:max-w-md"
        />
      </>
    )
  } else if (t === "schedule") {
    body = (
      <ScheduleField
        builder={value.builder}
        onChange={(builder) =>
          onChange({ builder, cron: fromBuilder(builder) })
        }
        timezone={value.timezone}
        onTimezone={(timezone) => onChange({ timezone })}
        error={errors.cron}
        phone={phone}
      />
    )
  } else {
    body = (
      <Steps
        phone={phone}
        steps={[
          { icon: Hand, label: "Someone presses Run" },
          { icon: CloudUpload, label: "It copies once", on: true },
        ]}
        note="Nothing starts on its own. Run it from the sync's page or its ⋯ menu."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="When"
        className={cn("grid gap-2", phone ? "grid-cols-2" : "grid-cols-4")}
      >
        {order.map((v) => {
          const m = triggerMeta[v]
          const Icon = m.icon
          const on = v === t
          const off = v === "watch" && !fromServer
          return (
            // biome-ignore lint/a11y/useSemanticElements: a tile, not a bare radio
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={off}
              title={off ? "Needs a server's folder as the source" : undefined}
              onClick={() => onChange({ trigger: v })}
              className={cn(
                "relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                on
                  ? "border-brand bg-brand-soft/60 ring-1 ring-brand"
                  : "border-border hover:bg-subtle active:bg-muted",
              )}
            >
              {v === "watch" && (
                <span
                  className={cn(
                    "absolute end-2 top-2 flex items-center gap-1 rounded-full px-1.5 py-px font-label text-[10px] tracking-label uppercase",
                    on
                      ? "bg-brand text-primary-foreground"
                      : "bg-brand-soft text-brand-strong",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  Live
                </span>
              )}
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-colors",
                  on
                    ? "bg-brand text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-[18px]" />
              </span>
              <span
                className={cn(
                  "text-body-sm leading-tight",
                  on ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {m.label}
              </span>
            </button>
          )
        })}
      </div>
      {!fromServer && (
        <p className="text-caption text-ash">
          {triggerMeta.watch.label} needs a server&apos;s folder as the source.
        </p>
      )}
      <div
        className={cn(
          "flex flex-col gap-5",
          !phone && "rounded-xl border border-border p-5",
          phone && "pt-1",
        )}
      >
        <p className="text-body-sm text-muted-foreground">
          {triggerMeta[t].text}
        </p>
        {body}
      </div>
    </div>
  )
}

// A row of steps joined by dashed lines: how the chosen way plays out.
function Steps({
  steps,
  note,
  more,
  phone,
}: {
  steps: { icon: LucideIcon; label: string; on?: boolean }[]
  note?: ReactNode
  more?: boolean
  phone: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-subtle px-4 py-3.5">
      <ol className="flex items-start">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list whose labels can repeat
            <Fragment key={i}>
              {i > 0 && <Joint />}
              <li
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1.5 text-center",
                  phone ? "w-20" : "w-28",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border",
                    s.on
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-caption leading-tight text-foreground">
                  {s.label}
                </span>
              </li>
            </Fragment>
          )
        })}
        {more && (
          <>
            <Joint />
            <li
              aria-hidden
              className="flex h-8 items-center text-caption text-ash"
            >
              …
            </li>
          </>
        )}
      </ol>
      {note && (
        <p className="flex items-start gap-2 border-t border-border pt-3 text-caption text-muted-foreground [&>svg]:mt-px [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-ash">
          {note}
        </p>
      )}
    </div>
  )
}

function Joint() {
  return (
    <li
      aria-hidden
      className="mx-1 mt-4 h-0 min-w-4 flex-1 border-t border-dashed border-mist"
    />
  )
}

// A number with its unit inside the box and quick picks under it.
function Setting({
  label,
  hint,
  error,
  unit,
  min,
  max,
  value,
  onChange,
  presets,
  className,
}: {
  label: string
  hint: string
  error?: string
  unit: string
  min: number
  max: number
  value: string
  onChange: (v: string) => void
  presets: { value: number; label: string }[]
  className?: string
}) {
  const n = num(value)
  return (
    <div className={cn("min-w-0", className)}>
      <Field label={label} hint={hint} error={error}>
        {(p) => (
          <>
            <div className="relative max-w-44">
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pe-20 tabular-nums"
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-body-sm text-ash">
                {unit}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {presets.map((pr) => (
                <Button
                  key={pr.value}
                  variant="outline"
                  size="sm"
                  aria-pressed={n === pr.value}
                  className="h-9 rounded-full px-3 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-7"
                  onClick={() => onChange(String(pr.value))}
                >
                  {pr.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </Field>
    </div>
  )
}
