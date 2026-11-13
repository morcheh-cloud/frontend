"use client"

import {
  Check,
  ChevronDown,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Segmented } from "../../servers/[id]/components/parts"
import {
  addSuggestion,
  applyKind,
  type Config,
  type Field,
  type FieldValue,
  type Group,
  groupLabels,
  isSet,
  matches,
  removeSuggestion,
  type Suggestion,
  suggestions,
  type Values,
} from "./daemon-catalog"

const order: Group[] = [
  "logs",
  "reliability",
  "network",
  "registries",
  "security",
  "performance",
  "storage",
]

// Useful daemon.json settings, each added to (or removed from) the editor's
// text with one click. Nothing reaches the server until the file is saved.
export function DaemonSuggestions({
  cfg,
  saved,
  canEdit,
  onChange,
  phone,
}: {
  // null = the editor's text isn't valid JSON.
  cfg: Config | null
  saved: Config
  canEdit: boolean
  onChange: (cfg: Config) => void
  phone: boolean
}) {
  const [open, setOpen] = useState<string | null>(null)
  const recommended = suggestions.filter((s) => s.recommended)
  const groups = order
    .map((g) => ({
      group: g,
      items: suggestions.filter((s) => s.group === g && !s.recommended),
    }))
    .filter((g) => g.items.length)
  const missing = cfg ? recommended.filter((s) => !isSet(s, cfg)) : []

  const card = (s: Suggestion) => (
    <SuggestionCard
      key={s.id}
      s={s}
      cfg={cfg}
      saved={saved}
      canEdit={canEdit}
      open={open === s.id}
      onToggle={() => setOpen(open === s.id ? null : s.id)}
      onChange={onChange}
      phone={phone}
    />
  )

  return (
    <section
      aria-label="Suggested settings"
      className={cn(
        "flex flex-col",
        !phone && "rounded-2xl border border-border bg-card",
      )}
    >
      <header
        className={cn(
          "flex items-start gap-3 border-b border-border",
          phone ? "px-4 py-3" : "px-5 py-4",
        )}
      >
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h2 className="text-body-sm font-medium">Suggested settings</h2>
          <p className="text-caption text-muted-foreground">
            Added to the file in the editor; the server changes only when you
            save.
          </p>
        </div>
        {canEdit && cfg && missing.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            className="max-md:h-11"
            onClick={() =>
              onChange(
                missing.reduce((c, s) => addSuggestion(c, s, s.read(c)), cfg),
              )
            }
          >
            <Plus />
            Add recommended
          </Button>
        )}
      </header>
      {!cfg && (
        <p className="flex gap-2 border-b border-border px-5 py-3 text-caption text-warning">
          <TriangleAlert className="size-4 shrink-0" />
          Fix the JSON in the editor first; suggestions need a valid file.
        </p>
      )}
      <GroupTitle phone={phone}>Recommended</GroupTitle>
      <div className="divide-y divide-border">{recommended.map(card)}</div>
      {groups.map((g) => (
        <div key={g.group}>
          <GroupTitle phone={phone}>{groupLabels[g.group]}</GroupTitle>
          <div className="divide-y divide-border">{g.items.map(card)}</div>
        </div>
      ))}
    </section>
  )
}

function GroupTitle({ phone, children }: { phone: boolean; children: string }) {
  return (
    <h3
      className={cn(
        "border-b border-border bg-subtle py-1.5 font-label text-[11px] tracking-label text-ash uppercase",
        phone ? "px-4" : "px-5",
      )}
    >
      {children}
    </h3>
  )
}

function SuggestionCard({
  s,
  cfg,
  saved,
  canEdit,
  open,
  onToggle,
  onChange,
  phone,
}: {
  s: Suggestion
  cfg: Config | null
  saved: Config
  canEdit: boolean
  open: boolean
  onToggle: () => void
  onChange: (cfg: Config) => void
  phone: boolean
}) {
  const [draft, setDraft] = useState<Values>({})
  const base = cfg ?? {}
  const values: Values = { ...s.read(base), ...draft }
  const set = cfg ? isSet(s, cfg) : false
  const unsaved = set && !isSet(s, saved)
  const problem = fieldProblem(s.fields ?? [], values) ?? s.check?.(values)
  const same = cfg ? matches(s, cfg, values) : false
  const kind = applyKind(s)
  const disabled = !canEdit || !cfg

  const add = () => {
    if (!cfg || problem) return
    onChange(addSuggestion(cfg, s, values))
    setDraft({})
  }
  const remove = () => {
    if (!cfg) return
    onChange(removeSuggestion(cfg, s))
    setDraft({})
  }

  return (
    <div className={cn(open && "bg-subtle/60")}>
      <div className="flex items-center gap-2 pe-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-2 py-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            phone ? "min-h-14 ps-4" : "ps-5",
          )}
        >
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-ash transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium">{s.title}</span>
            <span className="block text-caption text-muted-foreground">
              {s.summary}
            </span>
          </span>
        </button>
        {set ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption",
              unsaved
                ? "bg-brand-soft text-brand-strong"
                : "bg-success/10 text-success",
            )}
            title={
              unsaved ? "Added in the editor, not saved yet" : "In the file"
            }
          >
            <Check className="size-3.5" />
            {unsaved ? "Unsaved" : "Added"}
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 max-md:h-11"
            disabled={disabled || !!problem}
            onClick={add}
            aria-label={`Add: ${s.title}`}
          >
            <Plus />
            Add
          </Button>
        )}
      </div>

      {open && (
        <div
          className={cn(
            "flex flex-col gap-3 pb-4",
            phone ? "px-4" : "ps-11 pe-5",
          )}
        >
          <p className="text-caption text-muted-foreground">{s.why}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-caption text-ash">
            <span className="font-mono">{s.keys.join(", ")}</span>
            <span aria-hidden>·</span>
            <span>
              {kind === "reload"
                ? "Applies with a reload"
                : "Needs a Docker restart"}
            </span>
          </p>
          {s.fields?.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key]}
              disabled={disabled}
              onChange={(v) => setDraft({ ...draft, [f.key]: v })}
            />
          ))}
          {s.caution && (
            <p className="flex gap-2 text-caption text-warning">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {s.caution}
            </p>
          )}
          {problem && (
            <p className="text-caption text-destructive">{problem}</p>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {set ? (
                <>
                  {s.fields && (
                    <Button
                      size="sm"
                      className="max-md:h-11"
                      disabled={disabled || same || !!problem}
                      onClick={add}
                    >
                      <RefreshCw />
                      {same ? "Up to date" : "Update in the file"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="max-md:h-11"
                    disabled={disabled}
                    onClick={remove}
                  >
                    <Trash2 />
                    Remove from the file
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="max-md:h-11"
                  disabled={disabled || !!problem}
                  onClick={add}
                >
                  <Plus />
                  Add to the file
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function fieldProblem(fields: Field[], v: Values): string | null {
  for (const f of fields) {
    const value = v[f.key]
    if (f.kind === "number") {
      const n = Number(value)
      if (String(value).trim() === "" || !Number.isInteger(n))
        return `${f.label} must be a whole number.`
      if (f.min !== undefined && n < f.min)
        return `${f.label} must be at least ${f.min}.`
    }
    if (f.kind === "text" && String(value ?? "").trim() === "")
      return `Fill in ${f.label.toLowerCase()}.`
  }
  return null
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Field
  value: FieldValue | undefined
  disabled: boolean
  onChange: (v: FieldValue) => void
}) {
  const id = `daemon-${field.key}`
  if (field.kind === "list")
    return (
      <ListField
        field={field}
        value={Array.isArray(value) ? value : []}
        disabled={disabled}
        onChange={onChange}
      />
    )
  if (field.kind === "select")
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-medium">{field.label}</span>
        <div className="[scrollbar-width:none] overflow-x-auto">
          <Segmented
            label={field.label}
            items={field.options}
            value={String(value ?? "")}
            onChange={(v) => !disabled && onChange(v)}
          />
        </div>
        {field.hint && (
          <span className="text-caption text-ash">{field.hint}</span>
        )}
      </div>
    )
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium">
        {field.label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={String(value ?? "")}
          disabled={disabled}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          inputMode={field.kind === "number" ? "numeric" : undefined}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "bg-card md:h-8",
            field.kind === "number" ? "w-28" : "font-mono",
          )}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.kind === "number" && field.suffix && (
          <span className="text-caption text-muted-foreground">
            {field.suffix}
          </span>
        )}
      </div>
      {field.hint && (
        <span className="text-caption text-ash">{field.hint}</span>
      )}
    </div>
  )
}

function ListField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>
  value: string[]
  disabled: boolean
  onChange: (v: string[]) => void
}) {
  const [text, setText] = useState("")
  const add = (raw: string) => {
    const items = raw
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter((x) => x && !value.includes(x))
    if (items.length) onChange([...value, ...items])
    setText("")
  }
  const presets = field.presets?.filter((p) => !value.includes(p.value)) ?? []
  const id = `daemon-${field.key}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium">
        {field.label}
      </label>
      {value.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.map((v, i) => (
            <li
              key={v}
              className="flex items-center gap-2 rounded-lg border border-border bg-card ps-3 text-body-sm"
            >
              <span className="w-4 text-caption text-ash tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono">{v}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 max-md:size-11"
                disabled={disabled}
                aria-label={`Remove ${v}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={text}
          disabled={disabled}
          placeholder={field.placeholder}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="bg-card font-mono md:h-8"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(text)
            }
          }}
          onBlur={() => text.trim() && add(text)}
        />
        <Button
          size="sm"
          variant="outline"
          className="max-md:h-11"
          disabled={disabled || !text.trim()}
          onClick={() => add(text)}
        >
          Add
        </Button>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange([...value, p.value])}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 max-md:h-9"
              title={p.value}
            >
              <Plus className="size-3" />
              {p.label}
            </button>
          ))}
        </div>
      )}
      {field.hint && (
        <span className="text-caption text-ash">{field.hint}</span>
      )}
    </div>
  )
}
