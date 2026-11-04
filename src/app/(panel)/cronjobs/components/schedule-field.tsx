"use client"

import type { ReactNode } from "react"

import {
  modes as allModes,
  type Builder,
  fromBuilder,
  type Mode,
  minuteSteps,
  weekdays,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { usePreview } from "../api"
import { cronText, formatInZone, zones } from "./meta"

// Morcheh runs these, so there's no "at boot".
const modes = allModes.filter((m) => m.value !== "reboot")

const presets = [
  { label: "Every 15 minutes", schedule: "*/15 * * * *" },
  { label: "Hourly", schedule: "@hourly" },
  { label: "Every 6 hours", schedule: "@every 6h" },
  { label: "Daily at 03:00", schedule: "0 3 * * *" },
  { label: "Weekdays at 20:00", schedule: "0 20 * * 1-5" },
  { label: "Sundays at 02:00", schedule: "0 2 * * 0" },
  { label: "1st of the month", schedule: "0 1 1 * *" },
]

let zoneItems: { value: string; label: string }[] | null = null
const zoneList = () => {
  zoneItems ??= zones().map((z) => ({ value: z, label: z.replace(/_/g, " ") }))
  return zoneItems
}

// A native picker on phones, Base UI's select on desktop.
export function Choice({
  id,
  phone,
  value,
  onChange,
  items,
}: {
  id?: string
  phone: boolean
  value: string
  onChange: (value: string) => void
  items: { value: string; label: string }[]
}) {
  if (phone) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v !== null && onChange(v)}
    >
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const pad = (n: number) => String(n).padStart(2, "0")

function TimeInput({
  b,
  onChange,
}: {
  b: Builder
  onChange: (b: Builder) => void
}) {
  return (
    <Field label="At" className="w-36">
      {(p) => (
        <Input
          {...p}
          type="time"
          value={`${pad(b.hour)}:${pad(b.minute)}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number)
            if (Number.isFinite(h) && Number.isFinite(m)) {
              onChange({ ...b, hour: h, minute: m })
            }
          }}
          className="tabular-nums"
        />
      )}
    </Field>
  )
}

const clamp = (v: string, min: number, max: number) =>
  Math.min(max, Math.max(min, Number(v) || min))

export function ScheduleField({
  builder: b,
  onChange,
  timezone,
  onTimezone,
  error,
  phone,
}: {
  builder: Builder
  onChange: (b: Builder) => void
  timezone: string
  onTimezone: (tz: string) => void
  // From the last save (422 on cron or timezone).
  error?: string
  phone: boolean
}) {
  const schedule = fromBuilder(b)
  const preview = usePreview(schedule, timezone)
  const problem =
    error ??
    (!schedule.trim()
      ? "Enter a schedule"
      : preview.isError
        ? preview.error.message
        : null)

  function setMode(mode: Mode) {
    // Switching to Custom starts from what the builder showed.
    onChange({ ...b, mode, custom: mode === "custom" ? schedule : b.custom })
  }

  let controls: ReactNode = null
  switch (b.mode) {
    case "minutes":
      controls = (
        <Field label="Every" className="w-44">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={String(b.every)}
              onChange={(v) => onChange({ ...b, every: Number(v) })}
              items={minuteSteps.map((n) => ({
                value: String(n),
                label: n === 1 ? "minute" : `${n} minutes`,
              }))}
            />
          )}
        </Field>
      )
      break
    case "hourly":
      controls = (
        <Field label="At minute" className="w-36">
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={b.minute}
              onChange={(e) =>
                onChange({ ...b, minute: clamp(e.target.value, 0, 59) })
              }
              className="tabular-nums"
            />
          )}
        </Field>
      )
      break
    case "daily":
      controls = <TimeInput b={b} onChange={onChange} />
      break
    case "weekly":
      controls = (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">On</span>
            <div className="grid grid-cols-7 gap-1 md:flex">
              {weekdays.map((d, i) => {
                const on = b.days.includes(i)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const days = on
                        ? b.days.filter((x) => x !== i)
                        : [...b.days, i]
                      if (days.length > 0) onChange({ ...b, days })
                    }}
                    className="h-11 rounded-lg border border-input text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-brand-soft aria-pressed:font-medium aria-pressed:text-brand-strong md:h-9 md:w-12"
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
          <TimeInput b={b} onChange={onChange} />
        </div>
      )
      break
    case "monthly":
      controls = (
        <div className="flex gap-3">
          <Field label="On day" className="w-28">
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={b.dom}
                onChange={(e) =>
                  onChange({ ...b, dom: clamp(e.target.value, 1, 31) })
                }
                className="tabular-nums"
              />
            )}
          </Field>
          <TimeInput b={b} onChange={onChange} />
        </div>
      )
      break
    case "custom":
      controls = (
        <div className="flex flex-col gap-3">
          <Field
            label="Expression"
            hint="minute · hour · day of month · month · day of week, or @daily, @every 2h…"
          >
            {(p) => (
              <Input
                {...p}
                value={b.custom}
                onChange={(e) => onChange({ ...b, custom: e.target.value })}
                placeholder="*/15 * * * *"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.schedule}
                type="button"
                onClick={() => onChange({ ...b, custom: p.schedule })}
                className="h-9 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )
      break
  }

  const next = problem ? [] : (preview.data?.next ?? [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Repeat">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={b.mode}
              onChange={(v) => setMode(v as Mode)}
              items={modes}
            />
          )}
        </Field>
        <Field label="Time zone" hint="The times above are read in this zone.">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={timezone}
              onChange={onTimezone}
              items={zoneList()}
            />
          )}
        </Field>
      </div>
      {controls}
      <div
        className={cn(
          "rounded-2xl border border-border bg-subtle px-4 py-3",
          problem && "border-destructive/40",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <code className="font-mono text-body-sm font-medium">
            {schedule || "—"}
          </code>
          <span className="truncate text-caption text-ash">{timezone}</span>
        </div>
        {problem ? (
          <p className="mt-1 text-caption text-destructive">{problem}</p>
        ) : (
          <>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {cronText(schedule)}
            </p>
            {next.length > 0 && (
              <ul className="mt-2 flex flex-col gap-0.5 text-caption text-muted-foreground tabular-nums">
                {next.map((d, i) => (
                  <li key={d}>
                    <span className="text-ash">
                      {i === 0 ? "Next" : "Then"}
                    </span>{" "}
                    {formatInZone(d, timezone)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
