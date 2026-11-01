"use client"

import { RotateCcw } from "lucide-react"
import { useId } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  backends,
  duration,
  type Inherited,
  type SettingMeta,
  seconds,
  truthy,
} from "./meta"

const durationPresets = [
  { value: "10m", label: "10 min" },
  { value: "1h", label: "1 h" },
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
  { value: "-1", label: "Forever" },
]

// What a setting's value must look like before it's sent; fail2ban checks
// the rest when it reloads.
export function settingError(meta: SettingMeta, value: string) {
  const v = value.trim()
  if (!v) return undefined
  if (meta.kind === "number" && !/^-?\d+(\.\d+)?$/.test(v)) {
    return "A number"
  }
  if (meta.kind === "duration" && seconds(v) === null) {
    return "A time like 600, 10m, 1h or 1d"
  }
  return undefined
}

// One fail2ban setting: what jail.local says (empty = not set there), with
// the value that applies otherwise as the placeholder and where it's from.
export function SettingField({
  meta,
  value,
  inherited,
  onChange,
  error,
  suggestions,
}: {
  meta: SettingMeta
  value: string
  inherited: Inherited
  onChange: (value: string) => void
  error?: string
  suggestions?: string[]
}) {
  const id = useId()
  const listId = `${id}-list`
  const noteId = `${id}-note`
  const set = value.trim() !== ""
  const shown = set ? value : (inherited?.value ?? "")

  let note: string
  if (error) note = error
  else if (set) {
    note =
      meta.kind === "duration"
        ? `${duration(value)} · set in jail.local`
        : "Set in jail.local"
  } else if (inherited) {
    const v =
      meta.kind === "duration" ? duration(inherited.value) : inherited.value
    note =
      meta.kind === "list" || meta.kind === "bool"
        ? `From ${inherited.from}`
        : `${v.split("\n")[0]} from ${inherited.from}`
  } else note = "Not set: fail2ban's built-in default applies"

  const field = {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": noteId,
  }

  let control: React.ReactNode
  if (meta.kind === "bool") {
    control = (
      <Switch
        {...field}
        checked={truthy(shown)}
        onCheckedChange={(on) => onChange(on ? "true" : "false")}
      />
    )
  } else if (meta.kind === "list") {
    control = (
      <Textarea
        {...field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={inherited?.value}
        rows={Math.min(
          6,
          Math.max(2, (value || inherited?.value || "").split("\n").length),
        )}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="font-mono text-body-sm"
      />
    )
  } else {
    const list =
      meta.kind === "backend"
        ? backends
        : suggestions?.length
          ? suggestions
          : null
    control = (
      <>
        <Input
          {...field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inherited?.value.split("\n")[0]}
          list={list ? listId : undefined}
          inputMode={meta.kind === "number" ? "decimal" : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          className={cn(meta.kind !== "number" && "font-mono md:text-body-sm")}
        />
        {list && (
          <datalist id={listId}>
            {list.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          meta.kind === "bool" && "min-h-11 md:min-h-9",
        )}
      >
        <label htmlFor={id} className="text-body-sm font-medium">
          {meta.label}
        </label>
        <span className="flex items-center gap-2">
          {set && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="-my-2 flex h-9 items-center gap-1 rounded-md px-2 text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <RotateCcw className="size-3.5" />
              Inherit
            </button>
          )}
          {meta.kind === "bool" && control}
        </span>
      </div>
      {meta.kind !== "bool" && control}
      {meta.kind === "duration" && (
        <div className="flex flex-wrap gap-1.5">
          {durationPresets.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={value.trim() === p.value}
              onClick={() => onChange(p.value)}
              className="inline-flex h-8 items-center rounded-full border border-border px-2.5 text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-7"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <p
        id={noteId}
        className={cn(
          "text-caption",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <span className={cn(!error && "text-foreground/80")}>{note}</span>
        {!error && <span className="block text-ash">{meta.hint}</span>}
      </p>
    </div>
  )
}

// Which keys to write and which to drop, from a form's values against what
// jail.local had.
export function diffSettings(
  initial: Record<string, string>,
  values: Record<string, string>,
) {
  const set: Record<string, string> = {}
  const unset: string[] = []
  for (const [k, raw] of Object.entries(values)) {
    const v = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n")
    const was = initial[k] ?? ""
    if (v === was) continue
    if (v) set[k] = v
    else if (was) unset.push(k)
  }
  return { set, unset, changed: Object.keys(set).length + unset.length > 0 }
}
