"use client"

import { useQuery } from "@tanstack/react-query"
import { BellOff, X } from "lucide-react"
import { type KeyboardEvent, useState } from "react"

import { useCronjobs } from "@/app/(panel)/cronjobs/api"
import {
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  Checklist,
  ServerChecklist,
} from "@/app/(panel)/servers/components/server-checklist"
import { useEventCatalog } from "@/components/events/catalog"
import { EventPicker } from "@/components/events/event-picker"
import { Field } from "@/components/field"
import { databasesQuery, monitorsQuery } from "@/components/panel/problems"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Draft, Errors } from "./draft"
import { severities, type TriggerKind, triggerMeta } from "./meta"

const kinds: TriggerKind[] = ["event", "webhook", "manual"]

// What starts it: three tiles.
export function TriggerTiles({
  value,
  onChange,
}: {
  value: TriggerKind
  onChange: (k: TriggerKind) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="What starts it"
      className="grid gap-2 @3xl:grid-cols-3"
    >
      {kinds.map((k) => {
        const m = triggerMeta[k]
        const Icon = m.icon
        const on = value === k
        return (
          // biome-ignore lint/a11y/useSemanticElements: a card-like radio
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(k)}
            className={cn(
              "flex min-h-14 items-start gap-3 rounded-xl border p-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "border-brand/50 bg-brand-soft/50 ring-1 ring-brand/30"
                : "border-border hover:bg-subtle",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                on
                  ? "bg-brand text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-body-sm font-medium">{m.label}</span>
              <span className="block text-caption text-muted-foreground">
                {m.hint}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function EventsField({
  d,
  set,
  errors,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
}) {
  const catalog = useEventCatalog()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-sm font-medium">Events</span>
        <span className="text-caption text-ash tabular-nums">
          {d.events.length ? `${d.events.length} chosen` : "Choose one or more"}
        </span>
      </div>
      {catalog.data ? (
        <EventPicker
          catalog={catalog.data}
          value={d.events}
          onChange={(events) => set({ events })}
          invalid={!!errors["trigger.events"]}
          use="automations"
        />
      ) : catalog.isError ? (
        <p className="text-caption text-destructive">{catalog.error.message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}
      <FieldError text={errors["trigger.events"]} />
      <p className="text-caption text-muted-foreground">
        Events an automation caused never start automations, so they can't loop.
      </p>
    </div>
  )
}

// Narrowing which events of the chosen types start it; every filter given
// must match.
export function FilterFields({
  d,
  set,
  errors,
  phone,
  names,
  onNames,
  ws,
}: {
  ws: string
  d: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
  names: Map<string, string>
  onNames: (names: Map<string, string>) => void
}) {
  const catalog = useEventCatalog()
  const chosen = (catalog.data ?? []).filter((t) => d.events.includes(t.name))
  const subjectKinds = new Set(
    chosen.flatMap((t) => t.subject_kind.split(",").map((k) => k.trim())),
  )
  const alerts = d.events.some((e) => e.startsWith("alert."))
  const [someServers, setSomeServers] = useState(d.servers.length > 0)
  const [someSubjects, setSomeSubjects] = useState(d.subjects.length > 0)
  const subjectsShown = ["monitor", "database", "cronjob"].some((k) =>
    subjectKinds.has(k),
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 @2xl:grid-cols-2">
        <Field
          label="Title contains"
          hint="Any case. An alert's title is its rule's name and the server, e.g. “Disk almost full on web-1”."
          error={errors["trigger.filter.match"]}
        >
          {(f) => (
            <Input
              {...f}
              value={d.match}
              onChange={(e) => set({ match: e.target.value })}
              placeholder="Anything"
              maxLength={200}
              className="placeholder:text-ash"
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Severity</span>
          <div className="flex flex-wrap gap-1.5">
            {severities.map((sv) => {
              const on = d.severity.includes(sv)
              return (
                <button
                  key={sv}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      severity: severities.filter((x) =>
                        x === sv ? !on : d.severity.includes(x),
                      ),
                    })
                  }
                  className="h-10 rounded-full border border-border px-3.5 text-body-sm text-muted-foreground capitalize outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand/40 aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-11 md:h-9"
                >
                  {sv}
                </button>
              )
            })}
          </div>
          <p className="text-caption text-muted-foreground">
            {d.severity.length ? "Only these." : "None picked = any severity."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body-sm font-medium">Servers</span>
          <Segmented
            label="Servers"
            items={[
              { value: "any", label: "Any server" },
              { value: "some", label: "Chosen servers" },
            ]}
            value={someServers ? "some" : "any"}
            onChange={(v) => {
              setSomeServers(v === "some")
              if (v === "any") set({ servers: [] })
            }}
          />
        </div>
        {someServers && (
          <div className="overflow-hidden rounded-xl border border-border">
            <ServerChecklist
              value={new Map(d.servers.map((id) => [id, names.get(id) ?? ""]))}
              onChange={(m) => {
                const next = new Map(names)
                for (const [id, name] of m) if (name) next.set(id, name)
                onNames(next)
                set({ servers: [...m.keys()] })
              }}
              phone={phone}
            />
          </div>
        )}
        <FieldError text={errors["trigger.filter.servers"]} />
        <TagsInput value={d.tags} onChange={(tags) => set({ tags })} />
        <p className="text-caption text-muted-foreground">
          Events not on a server (a monitor, an incoming URL) never pass a
          server or tag filter.
        </p>
      </div>

      {subjectsShown && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-sm font-medium">About</span>
            <Segmented
              label="Subjects"
              items={[
                { value: "any", label: "Anything" },
                { value: "some", label: "Chosen ones" },
              ]}
              value={someSubjects ? "some" : "any"}
              onChange={(v) => {
                setSomeSubjects(v === "some")
                if (v === "any") set({ subjects: [] })
              }}
            />
          </div>
          {someSubjects && (
            <SubjectPicker
              ws={ws}
              kinds={subjectKinds}
              value={d.subjects}
              onChange={(subjects) => set({ subjects })}
            />
          )}
        </div>
      )}

      {alerts && (
        <ToggleRow
          id="automation-muted"
          label="Also react to muted alerts"
          hint={
            <span className="inline-flex items-start gap-1">
              <BellOff className="mt-0.5 size-3.5 shrink-0" />
              Alerts fire under a mute too (it only stops the messages). Off,
              they don't start this.
            </span>
          }
          checked={d.includeMuted}
          onChange={(includeMuted) => set({ includeMuted })}
        />
      )}
    </div>
  )
}

function TagsInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [text, setText] = useState("")
  const add = () => {
    const t = text.trim().replace(/,$/, "")
    if (t && !value.some((x) => x.toLowerCase() === t.toLowerCase()))
      onChange([...value, t])
    setText("")
  }
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add()
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="automation-tags"
        className="text-caption text-muted-foreground"
      >
        Or on servers tagged
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-10">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 text-caption"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="flex size-5 items-center justify-center rounded-full text-ash hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="automation-tags"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={keys}
          onBlur={add}
          placeholder={value.length ? "" : "Any tag: type and press Enter"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="h-8 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-ash md:text-sm"
        />
      </div>
    </div>
  )
}

// Monitors, databases and cron jobs the chosen events can be about.
function SubjectPicker({
  ws,
  kinds,
  value,
  onChange,
}: {
  ws: string
  kinds: Set<string>
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const monitors = useQuery({
    ...monitorsQuery(ws),
    enabled: !!ws && kinds.has("monitor"),
  })
  const databases = useQuery({
    ...databasesQuery,
    enabled: kinds.has("database"),
  })
  const cronjobs = useCronjobs(kinds.has("cronjob") ? ws : undefined)
  const items = [
    ...(kinds.has("monitor")
      ? (monitors.data ?? []).map((m) => ({
          id: m.id,
          label: m.name,
          meta: "Monitor",
        }))
      : []),
    ...(kinds.has("database")
      ? (databases.data?.items ?? []).map((x) => ({
          id: x.id,
          label: x.name,
          meta: "Database",
        }))
      : []),
    ...(kinds.has("cronjob")
      ? (cronjobs.data ?? []).map((x) => ({
          id: x.id,
          label: x.name,
          meta: "Cron job",
        }))
      : []),
  ]
  const on = new Set(value)
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Checklist
        items={items}
        checked={(id) => on.has(id)}
        onToggle={(id, add) =>
          onChange(add ? [...value, id] : value.filter((x) => x !== id))
        }
        empty="Nothing to choose from yet."
        loading={
          (kinds.has("monitor") && monitors.isPending) ||
          (kinds.has("database") && databases.isPending) ||
          (kinds.has("cronjob") && cronjobs.isPending)
        }
        tall
      />
    </div>
  )
}
