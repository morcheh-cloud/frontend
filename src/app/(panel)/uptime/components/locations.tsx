"use client"

import { Info } from "lucide-react"
import { useState } from "react"

import { SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { Checklist } from "@/app/(panel)/servers/components/server-checklist"
import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import type { LocationRule } from "@/lib/services"
import { Callout } from "../../cronjobs/components/editor-parts"
import { Segmented } from "../../servers/[id]/components/parts"
import {
  type Draft,
  type Errors,
  locationsOf,
  MORCHEH,
  ruleText,
  toRule,
} from "./draft"

export type LocationOption = {
  id: string
  name: string
  host?: string
  status?: string
}

// Ticks the places a monitor is checked from: Morche itself and any server
// the person can manage. Ticked ones that aren't offered (no access any
// more, or a removed server) stay listed so they can be unticked.
export function LocationsPicker({
  value,
  onChange,
  options,
  names,
  outboundIp,
  loading,
  phone,
}: {
  value: string[]
  onChange: (locations: string[]) => void
  options: LocationOption[]
  // Names of saved locations, for ones not in options.
  names: Record<string, string>
  outboundIp?: string
  loading: boolean
  phone: boolean
}) {
  const [q, setQ] = useState("")
  const extra: LocationOption[] = value
    .filter((l) => l !== MORCHEH && !options.some((o) => o.id === l))
    .map((id) => ({ id, name: names[id] ?? "A removed server" }))
  const servers = [...extra, ...options]
  const words = q.trim().toLowerCase()
  const shown = words
    ? servers.filter((s) =>
        `${s.name} ${s.host ?? ""}`.toLowerCase().includes(words),
      )
    : servers
  const items = [
    ...(!words || "morcheh".includes(words)
      ? [
          {
            id: MORCHEH,
            label: "Morche",
            meta: outboundIp
              ? `From Morche's own network · ${outboundIp}`
              : "From Morche's own network",
          },
        ]
      : []),
    ...shown.map((s) => ({
      id: s.id,
      label: s.name,
      meta: s.host,
      status: s.status,
    })),
  ]
  const toggle = (id: string, on: boolean) => {
    const next = value.filter((l) => l !== id)
    if (on) next.push(id)
    // Morche first, then the order they were ticked in.
    next.sort((a, b) => Number(b === MORCHEH) - Number(a === MORCHEH))
    onChange(next)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {servers.length > 6 && (
        <div className="border-b border-border p-2">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search servers"
            label="Search servers"
            className="w-full md:w-full"
          />
        </div>
      )}
      <Checklist
        items={items}
        checked={(id) => value.includes(id)}
        onToggle={toggle}
        empty="No server matches."
        loading={loading && !options.length}
        tall={!phone}
      />
    </div>
  )
}

const downChoices: { value: LocationRule["down"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "majority", label: "Most" },
  { value: "all", label: "All" },
  { value: "count", label: "At least…" },
]

const degradedChoices: { value: LocationRule["degraded"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "majority", label: "Most" },
  { value: "count", label: "At least…" },
  { value: "never", label: "Never" },
]

// How several locations' answers make one status.
export function RuleFields({
  d,
  set,
  errors,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
}) {
  const n = locationsOf(d).length
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-subtle p-4">
      <div>
        <p className="text-body-sm font-medium">When the locations disagree</p>
        <p className="text-caption text-muted-foreground">
          Every round checks from all {n} at once; this decides the one status
          that alerts go by.
        </p>
      </div>
      <RuleRow
        label="Down when this many fail"
        choices={downChoices}
        value={d.ruleDown}
        onChange={(ruleDown) => set({ ruleDown })}
        count={d.ruleDownCount}
        onCount={(ruleDownCount) => set({ ruleDownCount })}
        error={errors["rule.down_count"]}
        n={n}
      />
      <RuleRow
        label="Otherwise degraded when this many have trouble"
        hint="Trouble = down or slow there."
        choices={degradedChoices}
        value={d.ruleDegraded}
        onChange={(ruleDegraded) => set({ ruleDegraded })}
        count={d.ruleDegradedCount}
        onCount={(ruleDegradedCount) => set({ ruleDegradedCount })}
        error={errors["rule.degraded_count"]}
        n={n}
      />
      <Callout icon={<Info />}>
        <span className="text-foreground">{ruleText(toRule(d), n)}</span> A
        location whose server can't be reached doesn't vote.
      </Callout>
    </div>
  )
}

function RuleRow<T extends string>({
  label,
  hint,
  choices,
  value,
  onChange,
  count,
  onCount,
  error,
  n,
}: {
  label: string
  hint?: string
  choices: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  count: string
  onCount: (v: string) => void
  error?: string
  n: number
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <div className="flex flex-wrap items-center gap-2">
          <div className="max-w-full [scrollbar-width:none] overflow-x-auto">
            <Segmented
              label={label}
              items={choices}
              value={value}
              onChange={onChange}
            />
          </div>
          {value === "count" && (
            <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Input
                {...p}
                value={count}
                onChange={(e) => onCount(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="w-16 tabular-nums"
              />
              of {n}
            </span>
          )}
        </div>
      )}
    </Field>
  )
}
