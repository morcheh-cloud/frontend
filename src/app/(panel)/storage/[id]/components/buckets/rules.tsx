"use client"

import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import type { BucketCORSRule, BucketLifecycleRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useBucketChange } from "../../../api"
import {
  Block,
  Callout,
  DaysInput,
  plural,
  SaveRow,
  type SectionProps,
  Unreadable,
} from "./parts"

const toastError = (err: Error) => toast.error(err.message)

// ---- Lifecycle ----

type Rule = BucketLifecycleRule & { key: number }

const blankRule: BucketLifecycleRule = {
  id: "",
  enabled: true,
  prefix: "",
  expire_days: 0,
  noncurrent_days: 0,
  abort_uploads_days: 0,
  delete_markers: false,
  transition_days: 0,
  transition_class: "",
  advanced: false,
}

const lifecyclePresets: {
  label: string
  rule: Partial<BucketLifecycleRule>
  versioned?: boolean
}[] = [
  {
    label: "Delete old versions after 30 days",
    rule: { noncurrent_days: 30, delete_markers: true },
    versioned: true,
  },
  { label: "Delete objects after 90 days", rule: { expire_days: 90 } },
  {
    label: "Clean unfinished uploads after 7 days",
    rule: { abort_uploads_days: 7 },
  },
  {
    label: "Move to a cheaper class after 30 days",
    rule: { transition_days: 30, transition_class: "STANDARD_IA" },
  },
]

// What a rule does, in a line.
function ruleSummary(r: BucketLifecycleRule) {
  const parts: string[] = []
  if (r.expire_days) parts.push(`delete after ${plural(r.expire_days, "day")}`)
  if (r.noncurrent_days)
    parts.push(`old versions after ${plural(r.noncurrent_days, "day")}`)
  if (r.transition_days)
    parts.push(
      `move to ${r.transition_class || "…"} after ${plural(r.transition_days, "day")}`,
    )
  if (r.abort_uploads_days)
    parts.push(
      `unfinished uploads after ${plural(r.abort_uploads_days, "day")}`,
    )
  if (r.delete_markers) parts.push("clean delete markers")
  if (r.advanced) parts.push("more set elsewhere")
  const text = parts.join(", ") || "Does nothing yet"
  return text[0].toUpperCase() + text.slice(1)
}

function ruleProblem(r: BucketLifecycleRule) {
  if (r.delete_markers && r.expire_days)
    return "Cleaning delete markers can't go with deleting objects after some days: pick one."
  if (r.transition_days && !r.transition_class.trim())
    return "Say which storage class to move objects to."
  if (
    !r.expire_days &&
    !r.noncurrent_days &&
    !r.abort_uploads_days &&
    !r.delete_markers &&
    !r.transition_days &&
    !r.advanced
  )
    return "Set at least one action."
  return null
}

let nextKey = 1
const withKeys = (rules: BucketLifecycleRule[]): Rule[] =>
  rules.map((r) => ({ ...r, key: nextKey++ }))

export function LifecycleSection({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const [draft, setDraft] = useState<Rule[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  // Keys stay put until the saved rules change.
  const saved = useMemo(() => withKeys(b.lifecycle), [b.lifecycle])
  const rules = draft ?? saved
  const problems = rules.map(ruleProblem)
  const invalid = problems.some(Boolean)

  const edit = (next: Rule[]) => setDraft(next)
  const update = (key: number, patch: Partial<BucketLifecycleRule>) =>
    edit(rules.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const add = (patch: Partial<BucketLifecycleRule>) => {
    const rule = { ...blankRule, ...patch, key: nextKey++ }
    edit([...rules, rule])
    setOpen(rule.key)
  }
  const reset = () => {
    setDraft(null)
    setOpen(null)
  }
  const save = () =>
    change.mutate(
      () =>
        api.storageBuckets.setStorageBucketLifecycle(storage.id, b.name, {
          rules: rules.map(({ key: _, ...r }) => ({
            ...r,
            prefix: r.prefix.trim(),
            transition_class: r.transition_days
              ? r.transition_class.trim().toUpperCase()
              : "",
          })),
        }),
      {
        onSuccess: () => {
          reset()
          toast.success("Lifecycle rules saved")
        },
        onError: toastError,
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <Block
        title="Lifecycle rules"
        description="The provider runs these by itself, about once a day: delete what's no longer needed, move old data to a cheaper class, clear leftovers."
      >
        <Unreadable text={b.problems.lifecycle} />
        {b.versioning !== "off" &&
          !rules.some((r) => r.noncurrent_days) &&
          !b.problems.lifecycle && (
            <Callout tone="warning">
              Versioning keeps every old version forever. Add a rule that
              deletes old versions after some days, or the bucket keeps growing.
            </Callout>
          )}
        {rules.length === 0 && !b.problems.lifecycle && (
          <p className="text-body-sm text-ash">No rules: nothing is removed.</p>
        )}
        <ul className="flex flex-col gap-2">
          {rules.map((r, i) => (
            <LifecycleCard
              key={r.key}
              rule={r}
              problem={problems[i]}
              open={open === r.key}
              disabled={!can.edit || change.isPending}
              versioned={b.versioning !== "off"}
              onToggle={() => setOpen(open === r.key ? null : r.key)}
              onChange={(patch) => update(r.key, patch)}
              onRemove={() => edit(rules.filter((x) => x.key !== r.key))}
            />
          ))}
        </ul>
        {can.edit && !b.problems.lifecycle && (
          <AddRow
            label="Add rule"
            disabled={rules.length >= 100 || change.isPending}
            onAdd={() => add({})}
            presets={lifecyclePresets
              .filter((p) => !p.versioned || b.versioning !== "off")
              .map((p) => ({ label: p.label, onClick: () => add(p.rule) }))}
          />
        )}
      </Block>
      <SaveRow
        dirty={draft !== null && !invalid}
        pending={change.isPending}
        onSave={save}
        onReset={reset}
      />
      {draft !== null && invalid && (
        <p className="text-end text-caption text-destructive">
          Fix the rules marked above to save.
        </p>
      )}
    </div>
  )
}

function LifecycleCard({
  rule: r,
  problem,
  open,
  disabled,
  versioned,
  onToggle,
  onChange,
  onRemove,
}: {
  rule: Rule
  problem: string | null
  open: boolean
  disabled: boolean
  versioned: boolean
  onToggle: () => void
  onChange: (patch: Partial<BucketLifecycleRule>) => void
  onRemove: () => void
}) {
  return (
    <li
      className={cn(
        "rounded-2xl border",
        problem ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-start outline-none focus-visible:underline"
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-ash transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-medium">
              {r.prefix ? (
                <span className="font-mono">{r.prefix}</span>
              ) : (
                "Whole bucket"
              )}
              {!r.enabled && (
                <span className="ms-2 font-normal text-ash">Off</span>
              )}
            </span>
            <span className="block text-caption text-muted-foreground">
              {ruleSummary(r)}
            </span>
          </span>
        </button>
        <Switch
          aria-label="Rule on"
          checked={r.enabled}
          disabled={disabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
        />
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          {r.advanced && (
            <Callout>
              This rule also has filters or dates set outside Morche (tags,
              object size…). They're kept when you save.
            </Callout>
          )}
          <Field
            label="Applies to"
            hint="Objects whose name starts with this, e.g. logs/. Empty = the whole bucket."
          >
            {(p) => (
              <Input
                {...p}
                value={r.prefix}
                disabled={disabled}
                placeholder="Whole bucket"
                onChange={(e) => onChange({ prefix: e.target.value })}
                className="font-mono text-caption max-md:text-base"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delete objects after">
              {(p) => (
                <DaysInput
                  {...p}
                  value={r.expire_days}
                  disabled={disabled}
                  onChange={(expire_days) => onChange({ expire_days })}
                />
              )}
            </Field>
            {versioned && (
              <Field label="Delete old versions after">
                {(p) => (
                  <DaysInput
                    {...p}
                    value={r.noncurrent_days}
                    disabled={disabled}
                    onChange={(noncurrent_days) =>
                      onChange({ noncurrent_days })
                    }
                  />
                )}
              </Field>
            )}
            <Field
              label="Drop unfinished uploads after"
              hint="MinIO clears these by itself and ignores this."
            >
              {(p) => (
                <DaysInput
                  {...p}
                  value={r.abort_uploads_days}
                  disabled={disabled}
                  onChange={(abort_uploads_days) =>
                    onChange({ abort_uploads_days })
                  }
                />
              )}
            </Field>
            <Field label="Move to another class after">
              {(p) => (
                <DaysInput
                  {...p}
                  value={r.transition_days}
                  disabled={disabled}
                  onChange={(transition_days) => onChange({ transition_days })}
                />
              )}
            </Field>
          </div>
          {r.transition_days > 0 && (
            <Field
              label="Storage class"
              hint="As the provider names it: STANDARD_IA, GLACIER, DEEP_ARCHIVE on AWS; a tier name on MinIO."
            >
              {(p) => (
                <Input
                  {...p}
                  value={r.transition_class}
                  disabled={disabled}
                  placeholder="STANDARD_IA"
                  onChange={(e) =>
                    onChange({ transition_class: e.target.value })
                  }
                  className="font-mono text-caption max-md:text-base"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </Field>
          )}
          {versioned && (
            <span className="flex min-h-11 items-center justify-between gap-3 text-body-sm">
              <span>
                <span className="block font-medium">Clean delete markers</span>
                <span className="block text-muted-foreground">
                  Remove the markers left once every old version is gone.
                </span>
              </span>
              <Switch
                aria-label="Clean delete markers"
                checked={r.delete_markers}
                disabled={disabled}
                onCheckedChange={(delete_markers) =>
                  onChange({ delete_markers })
                }
              />
            </span>
          )}
          {problem && (
            <p className="text-caption text-destructive">{problem}</p>
          )}
          {!disabled && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={onRemove}
              >
                <Trash2 />
                Remove rule
              </Button>
            </div>
          )}
        </div>
      )}
      {!open && problem && (
        <p className="px-4 pb-3 text-caption text-destructive">{problem}</p>
      )}
    </li>
  )
}

function AddRow({
  label,
  disabled,
  onAdd,
  presets,
}: {
  label: string
  disabled: boolean
  onAdd: () => void
  presets: { label: string; onClick: () => void }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="self-start"
        disabled={disabled}
        onClick={onAdd}
      >
        <Plus />
        {label}
      </Button>
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-ash">Quick add:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={disabled}
              onClick={p.onClick}
              className="min-h-8 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:bg-subtle hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 max-md:min-h-11"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- CORS ----

const methods = ["GET", "HEAD", "PUT", "POST", "DELETE"] as const

type CorsDraft = {
  key: number
  origins: string
  methods: string[]
  headers: string
  expose: string
  maxAge: number
}

const lines = (text: string) =>
  text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

const toDraft = (r: BucketCORSRule): CorsDraft => ({
  key: nextKey++,
  origins: r.origins.join("\n"),
  methods: r.methods,
  headers: r.headers.join("\n"),
  expose: r.expose_headers.join("\n"),
  maxAge: r.max_age_seconds,
})

const fromDraft = (d: CorsDraft): BucketCORSRule => ({
  origins: lines(d.origins),
  methods: d.methods,
  headers: lines(d.headers),
  expose_headers: lines(d.expose),
  max_age_seconds: d.maxAge,
})

const corsPresets: { label: string; rule: Omit<CorsDraft, "key"> }[] = [
  {
    label: "Uploads from a web app",
    rule: {
      origins: "https://app.example.com",
      methods: ["GET", "HEAD", "PUT", "POST"],
      headers: "*",
      expose: "ETag",
      maxAge: 3600,
    },
  },
  {
    label: "Downloads from any site",
    rule: {
      origins: "*",
      methods: ["GET", "HEAD"],
      headers: "",
      expose: "",
      maxAge: 3600,
    },
  },
]

function corsProblem(d: CorsDraft) {
  if (lines(d.origins).length === 0) return "Add at least one site."
  if (d.methods.length === 0) return "Pick at least one method."
  return null
}

export function CorsSection({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const [draft, setDraft] = useState<CorsDraft[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const saved = useMemo(() => b.cors.map(toDraft), [b.cors])
  const rules = draft ?? saved
  const problems = rules.map(corsProblem)
  const invalid = problems.some(Boolean)

  const edit = (fn: (rules: CorsDraft[]) => CorsDraft[]) => setDraft(fn(rules))
  const add = (rule: Omit<CorsDraft, "key">) => {
    const key = nextKey++
    edit((rs) => [...rs, { ...rule, key }])
    setOpen(key)
  }
  const reset = () => {
    setDraft(null)
    setOpen(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Block
        title="Cross-origin access (CORS)"
        description="Which websites may call this bucket from a browser, e.g. a web app uploading straight to it with a presigned link. Servers and tools don't need this."
      >
        <Unreadable text={b.problems.cors} />
        {rules.length === 0 && !b.problems.cors && (
          <p className="text-body-sm text-ash">
            No rules: browsers on other sites can't read the responses.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {rules.map((r, i) => (
            <CorsCard
              key={r.key}
              rule={r}
              problem={problems[i]}
              open={open === r.key}
              disabled={!can.edit || change.isPending}
              onToggle={() => setOpen(open === r.key ? null : r.key)}
              onChange={(patch) =>
                edit((rs) =>
                  rs.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                )
              }
              onRemove={() => edit((rs) => rs.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
        {can.edit && !b.problems.cors && (
          <AddRow
            label="Add rule"
            disabled={rules.length >= 100 || change.isPending}
            onAdd={() =>
              add({
                origins: "",
                methods: ["GET", "HEAD"],
                headers: "",
                expose: "",
                maxAge: 3600,
              })
            }
            presets={corsPresets.map((p) => ({
              label: p.label,
              onClick: () => add(p.rule),
            }))}
          />
        )}
      </Block>
      <SaveRow
        dirty={draft !== null && !invalid}
        pending={change.isPending}
        onReset={reset}
        onSave={() =>
          change.mutate(
            () =>
              api.storageBuckets.setStorageBucketCors(storage.id, b.name, {
                rules: rules.map(fromDraft),
              }),
            {
              onSuccess: () => {
                reset()
                toast.success("CORS rules saved")
              },
              onError: toastError,
            },
          )
        }
      />
    </div>
  )
}

function CorsCard({
  rule: r,
  problem,
  open,
  disabled,
  onToggle,
  onChange,
  onRemove,
}: {
  rule: CorsDraft
  problem: string | null
  open: boolean
  disabled: boolean
  onToggle: () => void
  onChange: (patch: Partial<CorsDraft>) => void
  onRemove: () => void
}) {
  const origins = lines(r.origins)
  return (
    <li
      className={cn(
        "rounded-2xl border",
        problem ? "border-destructive/40" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 p-3 text-start outline-none focus-visible:underline"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ash transition-transform",
            !open && "-rotate-90",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-caption font-medium">
            {origins.length === 0
              ? "No site yet"
              : origins.length === 1
                ? origins[0] === "*"
                  ? "Any site (*)"
                  : origins[0]
                : `${origins[0]} +${origins.length - 1}`}
          </span>
          <span className="block text-caption text-muted-foreground">
            {r.methods.join(", ") || "No method"}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <Field
            label="Sites"
            hint="One per line, with the scheme: https://app.example.com. * = any site; a * inside works too (https://*.example.com)."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={r.origins}
                disabled={disabled}
                onChange={(e) => onChange({ origins: e.target.value })}
                className="font-mono text-caption max-md:text-base"
                spellCheck={false}
              />
            )}
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-body-sm font-medium">Methods</legend>
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => {
                const on = r.methods.includes(m)
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        methods: on
                          ? r.methods.filter((x) => x !== m)
                          : methods.filter(
                              (x) => x === m || r.methods.includes(x),
                            ),
                      })
                    }
                    className={cn(
                      "min-h-8 rounded-full border px-3 font-mono text-caption outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 max-md:min-h-11",
                      on
                        ? "border-brand bg-brand-soft text-brand-strong"
                        : "border-border text-muted-foreground hover:bg-subtle",
                    )}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Allowed request headers"
              hint="One per line; * = any. Uploads usually need *."
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={2}
                  value={r.headers}
                  disabled={disabled}
                  onChange={(e) => onChange({ headers: e.target.value })}
                  className="font-mono text-caption max-md:text-base"
                  spellCheck={false}
                />
              )}
            </Field>
            <Field
              label="Headers the page may read"
              hint="E.g. ETag, needed by multipart uploads in the browser."
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={2}
                  value={r.expose}
                  disabled={disabled}
                  onChange={(e) => onChange({ expose: e.target.value })}
                  className="font-mono text-caption max-md:text-base"
                  spellCheck={false}
                />
              )}
            </Field>
          </div>
          <Field
            label="Cache the answer for"
            hint="How long a browser keeps the permission before asking again."
          >
            {(p) => (
              <div className="flex items-center gap-2">
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={86400}
                  value={r.maxAge || ""}
                  placeholder="0"
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    onChange({
                      maxAge:
                        Number.isFinite(n) && n > 0 ? Math.min(n, 86400) : 0,
                    })
                  }}
                  className="w-28 tabular-nums max-md:text-base"
                />
                <span className="text-body-sm text-muted-foreground">
                  seconds
                </span>
              </div>
            )}
          </Field>
          {problem && (
            <p className="text-caption text-destructive">{problem}</p>
          )}
          {!disabled && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={onRemove}
              >
                <Trash2 />
                Remove rule
              </Button>
            </div>
          )}
        </div>
      )}
      {!open && problem && (
        <p className="px-4 pb-3 text-caption text-destructive">{problem}</p>
      )}
    </li>
  )
}
