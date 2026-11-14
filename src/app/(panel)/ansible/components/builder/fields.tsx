"use client"

import { Braces, X } from "lucide-react"
import { type KeyboardEvent, useId, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ModuleOption } from "@/lib/services"
import { cn } from "@/lib/utils"
import { DocText } from "../modules/meta"
import { typeLabel, valueText } from "../modules/module-details"
import { readYaml, showYaml } from "./model"

type Kind =
  | "bool"
  | "choice"
  | "number"
  | "text"
  | "multiline"
  | "list"
  | "yaml"
  | "expr"

const scalar = (v: unknown) =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean"

const isExpr = (v: unknown) => typeof v === "string" && v.includes("{{")

// Options whose text usually spans lines.
const longText = new Set([
  "content",
  "block",
  "msg",
  "cmd",
  "script",
  "data",
  "body",
  "line",
  "that",
  "fail_msg",
  "success_msg",
  "prompt",
])

const listTypes = (o: ModuleOption) =>
  o.type === "list" &&
  (!o.elements || ["str", "path", "int", "raw"].includes(o.elements))

function kindOf(o: ModuleOption, v: unknown): Kind {
  const hasChoices = !!o.choices && o.choices.length > 0
  if (o.type === "bool") {
    return v === undefined || typeof v === "boolean" ? "bool" : "expr"
  }
  if (
    hasChoices &&
    (v === undefined || o.choices?.some((c) => valueText(c) === valueText(v)))
  ) {
    return "choice"
  }
  if (hasChoices && scalar(v)) return "expr"
  if (o.type === "int" || o.type === "float") {
    return v === undefined || typeof v === "number" ? "number" : "expr"
  }
  if (listTypes(o)) {
    if (v === undefined || (Array.isArray(v) && v.every(scalar))) return "list"
    // One value is fine as a list of one; Ansible splits "a,b" too.
    return scalar(v) ? "expr" : "yaml"
  }
  if (
    o.type === "dict" ||
    o.type === "list" ||
    o.type === "jsonarg" ||
    o.type === "json"
  ) {
    return isExpr(v) ? "expr" : "yaml"
  }
  if (v !== undefined && !scalar(v)) return "yaml"
  return longText.has(o.name) || (typeof v === "string" && v.includes("\n"))
    ? "multiline"
    : "text"
}

// Fields that need the whole row (long text, YAML).
export const wideField = (o: ModuleOption, v: unknown) => {
  const k = kindOf(o, v)
  return k === "multiline" || k === "yaml"
}

// One option of a module (or one task keyword), with its label, help and the
// control its type calls for. undefined = not set (Ansible's default).
export function OptionField({
  option: o,
  value,
  onChange,
  label,
}: {
  option: ModuleOption
  value: unknown
  onChange: (value: unknown) => void
  /** Shown instead of the option's name (task keywords). */
  label?: string
}) {
  const id = useId()
  const kind = kindOf(o, value)
  const set = value !== undefined
  const hasDefault = o.default !== undefined && o.default !== null
  // A variable fits any field: `{{ … }}` turns it into a text box.
  const canExpr = ["bool", "choice", "number", "list"].includes(kind)
  const [help, setHelp] = useState(false)
  const first = o.description[0]

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-h-5 items-center gap-2">
        <label
          htmlFor={id}
          className={cn(
            "truncate text-body-sm font-medium",
            !label && "font-mono",
          )}
        >
          {label ?? o.name}
          {o.required && (
            <>
              <span className="ms-0.5 text-destructive" aria-hidden>
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        <span className="truncate text-caption text-ash">{typeLabel(o)}</span>
        <span className="ms-auto flex shrink-0 items-center">
          {canExpr && (
            <FieldButton
              label="Use a variable"
              onClick={() => onChange("{{  }}")}
            >
              <Braces />
            </FieldButton>
          )}
          {set && !o.required && (
            <FieldButton
              label={`Clear ${o.name}`}
              onClick={() => onChange(undefined)}
            >
              <X />
            </FieldButton>
          )}
        </span>
      </div>

      {kind === "bool" && (
        <BoolField
          id={id}
          value={value as boolean | undefined}
          onChange={onChange}
          fallback={hasDefault ? valueText(o.default) : undefined}
        />
      )}
      {kind === "choice" && (
        <ChoiceField id={id} option={o} value={value} onChange={onChange} />
      )}
      {kind === "number" && (
        <Input
          id={id}
          inputMode="decimal"
          value={value === undefined ? "" : String(value)}
          placeholder={hasDefault ? `Default ${valueText(o.default)}` : ""}
          onChange={(e) => {
            const t = e.target.value
            if (t === "") onChange(undefined)
            else if (/^-?\d+(\.\d+)?$/.test(t)) onChange(Number(t))
            else onChange(t)
          }}
          className="font-mono"
        />
      )}
      {(kind === "text" || kind === "expr") && (
        <Input
          id={id}
          value={value === undefined ? "" : String(value)}
          placeholder={
            hasDefault
              ? `Default ${valueText(o.default)}`
              : kind === "expr"
                ? "{{ variable }}"
                : ""
          }
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : e.target.value)
          }
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn((o.type === "path" || kind === "expr") && "font-mono")}
        />
      )}
      {kind === "multiline" && (
        <Textarea
          id={id}
          value={value === undefined ? "" : String(value)}
          placeholder={hasDefault ? `Default ${valueText(o.default)}` : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : e.target.value)
          }
          rows={Math.min(
            12,
            Math.max(2, String(value ?? "").split("\n").length),
          )}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono text-caption md:text-caption"
        />
      )}
      {kind === "list" && (
        <ListField
          id={id}
          value={(value as unknown[] | undefined) ?? []}
          onChange={(list) => onChange(list.length ? list : undefined)}
          numeric={o.elements === "int"}
        />
      )}
      {kind === "yaml" && (
        <YamlField
          id={id}
          value={value}
          onChange={onChange}
          placeholder={yamlHint(o)}
        />
      )}

      {first && (
        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          className={cn(
            "text-start text-caption text-muted-foreground outline-none focus-visible:underline",
            !help && "line-clamp-2",
          )}
        >
          {(help ? o.description : [first]).map((p) => (
            <span key={p} className="block">
              <DocText text={p} />
            </span>
          ))}
        </button>
      )}
    </div>
  )
}

function FieldButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-md text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:size-6 [&_svg]:size-3.5"
    >
      {children}
    </button>
  )
}

function yamlHint(o: ModuleOption) {
  const keys = o.suboptions?.map((s) => s.name) ?? []
  if (o.type === "list" && o.elements === "dict") {
    return keys.length
      ? `- ${keys
          .slice(0, 2)
          .map((k) => `${k}: …`)
          .join("\n  ")}`
      : "- key: value"
  }
  if (keys.length)
    return keys
      .slice(0, 3)
      .map((k) => `${k}: …`)
      .join("\n")
  if (o.type === "list") return "- one\n- two"
  return "key: value"
}

function BoolField({
  id,
  value,
  onChange,
  fallback,
}: {
  id: string
  value: boolean | undefined
  onChange: (v: boolean | undefined) => void
  fallback?: string
}) {
  const choice = (v: boolean, label: string) => (
    <button
      type="button"
      id={v ? id : undefined}
      aria-pressed={value === v}
      // Pressing the chosen one again goes back to the default.
      onClick={() => onChange(value === v ? undefined : v)}
      className="h-10 min-w-16 rounded-md px-3 text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-8"
    >
      {label}
    </button>
  )
  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-lg bg-muted p-0.5">
        {choice(true, "Yes")}
        {choice(false, "No")}
      </div>
      {value === undefined && (
        <span className="text-caption text-ash">
          {fallback !== undefined
            ? `Default: ${["true", "yes"].includes(fallback) ? "yes" : ["false", "no"].includes(fallback) ? "no" : fallback}`
            : "Not set"}
        </span>
      )}
    </div>
  )
}

const UNSET = "\u0000unset"

function ChoiceField({
  id,
  option: o,
  value,
  onChange,
}: {
  id: string
  option: ModuleOption
  value: unknown
  onChange: (v: unknown) => void
}) {
  const choices = o.choices ?? []
  const hasDefault = o.default !== undefined && o.default !== null
  const items = [
    {
      value: UNSET,
      label: hasDefault ? `Default (${valueText(o.default)})` : "Not set",
    },
    ...choices.map((c) => ({ value: valueText(c), label: valueText(c) })),
  ]
  return (
    <Select
      items={items}
      value={value === undefined ? UNSET : valueText(value)}
      onValueChange={(v) => {
        if (v === null || v === UNSET) onChange(undefined)
        else onChange(choices.find((c) => valueText(c) === v) ?? v)
      }}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "h-11 w-full md:h-10",
          value === undefined && "text-muted-foreground",
        )}
      >
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

// Items as chips; Enter (or leaving the field) adds what's typed. A pasted
// block of lines adds one item per line.
export function ListField({
  id,
  value,
  onChange,
  numeric,
  placeholder = "Type and press Enter",
}: {
  id: string
  value: unknown[]
  onChange: (v: unknown[]) => void
  numeric?: boolean
  placeholder?: string
}) {
  const [text, setText] = useState("")
  const add = (raw: string) => {
    const parts = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    onChange([
      ...value,
      ...parts.map((p) => (numeric && /^-?\d+$/.test(p) ? Number(p) : p)),
    ])
    setText("")
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      add(text)
    } else if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-9 md:py-1">
      {value.map((item, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: items can repeat
          key={i}
          className="flex h-8 max-w-full items-center gap-1 rounded-md bg-muted ps-2 font-mono text-caption md:h-6"
        >
          <span className="truncate">{String(item)}</span>
          <button
            type="button"
            aria-label={`Remove ${String(item)}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="flex size-8 items-center justify-center rounded-md text-ash hover:text-foreground md:size-6"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(text)}
        onPaste={(e) => {
          const t = e.clipboardData.getData("text")
          if (t.includes("\n")) {
            e.preventDefault()
            add(t)
          }
        }}
        placeholder={value.length ? "" : placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className="h-8 min-w-24 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:h-6 md:text-sm"
      />
    </div>
  )
}

// Any value as YAML. Keeps what's typed while it doesn't parse yet.
export function YamlField({
  id,
  value,
  onChange,
  placeholder,
  rows,
}: {
  id?: string
  value: unknown
  onChange: (v: unknown) => void
  placeholder?: string
  rows?: number
}) {
  const [text, setText] = useState(() => showYaml(value))
  const [error, setError] = useState("")
  // Changed from outside (another field, a reload): show the new value.
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    const parsed = readYaml(text)
    if (!parsed.ok || JSON.stringify(parsed.value) !== JSON.stringify(value)) {
      setText(showYaml(value))
      setError("")
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const t = e.target.value
          setText(t)
          const parsed = readYaml(t)
          if (parsed.ok) {
            setError("")
            onChange(parsed.value)
          } else {
            setError(parsed.error)
          }
        }}
        rows={rows ?? Math.min(14, Math.max(3, text.split("\n").length + 1))}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={!!error || undefined}
        className="font-mono text-caption md:text-caption"
      />
      {error && (
        <p role="alert" className="text-caption text-destructive">
          {error.split("\n")[0]}
        </p>
      )}
    </div>
  )
}
