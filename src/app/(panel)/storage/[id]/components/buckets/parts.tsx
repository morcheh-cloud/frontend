"use client"

import { CircleAlert, Loader2 } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { BucketDetails, Storage } from "@/lib/services"
import { cn } from "@/lib/utils"

// What this person may change on a bucket (the backend checks again).
export type BucketCan = {
  // Versioning, lifecycle, tags, CORS, empty: Engineer.
  edit: boolean
  // Who can read it, encryption, retention: Owner.
  own: boolean
}

export type SectionProps = {
  storage: Storage
  bucket: BucketDetails
  can: BucketCan
}

// One titled part of a tab.
export function Block({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-medium">{title}</h3>
          {description && (
            <p className="mt-0.5 text-body-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// A setting the provider wouldn't show.
export function Unreadable({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p className="flex items-start gap-2 rounded-lg bg-subtle px-3 py-2.5 text-body-sm text-muted-foreground">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-ash" />
      <span>Couldn't read this setting: {text}</span>
    </p>
  )
}

export function Callout({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "warning" | "destructive"
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-body-sm",
        tone === "muted" && "border-border bg-subtle text-muted-foreground",
        tone === "warning" && "border-warning/25 bg-warning/5",
        tone === "destructive" && "border-destructive/20 bg-destructive/5",
      )}
    >
      {children}
    </div>
  )
}

// Save / Undo for a form that changed.
export function SaveRow({
  dirty,
  pending,
  onSave,
  onReset,
  label = "Save",
}: {
  dirty: boolean
  pending: boolean
  onSave: () => void
  onReset: () => void
  label?: string
}) {
  if (!dirty && !pending) return null
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" disabled={pending} onClick={onReset}>
        Undo
      </Button>
      <Button disabled={pending} onClick={onSave}>
        {pending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </div>
  )
}

// A radio list of cards: a label and a line saying what it means.
export function OptionCards<T extends string>({
  label,
  value,
  items,
  disabled,
  onChange,
}: {
  label: string
  value: T
  items: { value: T; label: string; hint: ReactNode; icon?: ReactNode }[]
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {items.map((item) => {
        const on = item.value === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: a card-sized radio
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2.5 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
              on
                ? "border-brand bg-brand-soft/50"
                : "border-border enabled:hover:bg-subtle",
              disabled && !on && "opacity-60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                on ? "border-brand" : "border-mist",
              )}
            >
              {on && <span className="size-2 rounded-full bg-brand" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-body-sm font-medium">
                {item.icon}
                {item.label}
              </span>
              <span className="block text-body-sm text-muted-foreground">
                {item.hint}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// A whole number of days; empty = 0 (off).
export function DaysInput({
  id,
  value,
  onChange,
  disabled,
  ...aria
}: {
  id: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  "aria-invalid"?: true
  "aria-describedby"?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={36500}
        value={value || ""}
        placeholder="Off"
        disabled={disabled}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10)
          onChange(Number.isFinite(n) && n > 0 ? Math.min(n, 36500) : 0)
        }}
        className="h-9 w-28 rounded-lg border border-input bg-card px-3 text-body-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 max-md:h-11 max-md:text-base"
        {...aria}
      />
      <span className="text-body-sm text-muted-foreground">days</span>
    </div>
  )
}

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`

// A public object's address: path style (MinIO…) or virtual host (AWS).
export function publicUrl(s: Storage, bucket: string) {
  const host = /^https?:\/\//.test(s.host) ? s.host : `https://${s.host}`
  try {
    const u = new URL(host)
    if (s.path_style || !s.host) return `${u.origin}/${bucket}/`
    return `${u.protocol}//${bucket}.${u.host}/`
  } catch {
    return `${host}/${bucket}/`
  }
}
