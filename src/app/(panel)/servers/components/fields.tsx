"use client"

import { X } from "lucide-react"
import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { type FolderNode, flatten } from "./folder-tree"

export { Field } from "@/components/field"

const ROOT = "__root__"

// Folder picker: Base UI select on desktop, the OS's own picker on phones.
export function FolderSelect({
  id,
  roots,
  value,
  onChange,
  skip,
  rootLabel = "No folder",
}: {
  id?: string
  roots: FolderNode[]
  value: string | null
  onChange: (value: string | null) => void
  skip?: Set<string>
  rootLabel?: string
}) {
  const isMobile = useIsMobile()
  const options = flatten(roots, skip)
  const items = [
    { value: ROOT, label: rootLabel, depth: 0 },
    ...options.map((f) => ({ value: f.id, label: f.name, depth: f.depth })),
  ]
  const change = (v: string | null) => onChange(!v || v === ROOT ? null : v)

  if (isMobile) {
    return (
      <select
        id={id}
        value={value ?? ROOT}
        onChange={(e) => change(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {" ".repeat(item.depth)}
            {item.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <Select items={items} value={value ?? ROOT} onValueChange={change}>
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            style={{ paddingInlineStart: `${0.375 + item.depth * 1}rem` }}
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const TAG_RE = /^[a-z0-9][a-z0-9._:/-]{0,31}$/

export function normalizeTag(raw: string) {
  const tag = raw.trim().toLowerCase().replace(/\s+/g, "-")
  return TAG_RE.test(tag) ? tag : null
}

// Chips plus a free-text input: Enter, comma or Tab adds a tag; Backspace in
// an empty input removes the last one.
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
  invalid,
}: {
  id?: string
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  invalid?: boolean
}) {
  const [text, setText] = useState("")
  const [bad, setBad] = useState(false)

  function add(raw: string) {
    if (!raw.trim()) return true
    const tag = normalizeTag(raw)
    if (!tag) {
      setBad(true)
      return false
    }
    if (!value.includes(tag)) onChange([...value, tag])
    setText("")
    setBad(false)
    return true
  }

  const open = suggestions.filter(
    (s) => !value.includes(s) && (!text || s.includes(text.toLowerCase())),
  )

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-10",
          (invalid || bad) &&
            "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 text-body-sm"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="flex size-5 items-center justify-center rounded-full text-ash hover:bg-mist hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setBad(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              add(text)
            } else if (e.key === "Tab" && text) {
              if (!add(text)) e.preventDefault()
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? undefined : placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
      </div>
      {bad && (
        <p className="text-caption text-destructive">
          Tags use lowercase letters, digits and . _ : / - (up to 32).
        </p>
      )}
      {open.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {open.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-8 items-center rounded-full border border-dashed border-mist px-2.5 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground md:h-7"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Two-option switch (e.g. Password | Private key), 44px on phones.
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: a segmented control; radio inputs can't be styled as one
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 rounded-md text-body-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
            o.value === value && "bg-card text-foreground shadow-sm",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
