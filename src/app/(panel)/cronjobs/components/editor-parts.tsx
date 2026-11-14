"use client"

import { Pencil, Plus, X } from "lucide-react"
import type { ReactNode } from "react"

import { sectionId } from "@/components/editor-page"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { EndDraft } from "./end-picker"
import { EndIcon, endName } from "./meta"

// A titled block: a card on desktop, a plain full-width group on phones.
// On an `EditorPage` it shows in the "On this page" list.
export function Section({
  title,
  hint,
  phone,
  children,
  className,
}: {
  title: string
  hint?: string
  phone: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={sectionId(title)}
      data-editor-section={title}
      className={cn(
        "flex flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 2xl:grid-cols-[16rem_minmax(0,1fr)] 2xl:gap-10",
        className,
      )}
    >
      <div>
        <h2 className="text-body font-medium">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

export function EndRow({
  end,
  onChange,
  onRemove,
  label,
}: {
  end: EndDraft
  onChange: () => void
  onRemove?: () => void
  label: string
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-input ps-3">
      <button
        type="button"
        onClick={onChange}
        aria-label={`${label}: ${endName({ ...end, missing: !!end.missing })} ${end.path}`}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <EndIcon end={end} className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-body-sm font-medium",
              end.missing && "text-destructive",
            )}
          >
            {endName({ ...end, missing: !!end.missing })}
          </span>
          <span className="block truncate font-mono text-caption text-muted-foreground">
            {end.path}
          </span>
        </span>
        <Pencil className="size-4 shrink-0 text-ash" />
      </button>
      {onRemove ? (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Remove"
          className="shrink-0 md:size-9"
          onClick={onRemove}
        >
          <X />
        </Button>
      ) : (
        <span className="w-2" />
      )}
    </div>
  )
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      variant="outline"
      className="h-11 justify-start self-stretch border-dashed md:h-10 md:self-start"
      onClick={onClick}
    >
      <Plus />
      {children}
    </Button>
  )
}

export function FieldError({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p data-error className="text-caption text-destructive">
      {text}
    </p>
  )
}

export function Callout({
  icon,
  tone,
  children,
}: {
  icon: ReactNode
  tone?: "warning"
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0",
        tone === "warning" && "[&>svg]:text-warning",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// A switch with its label and a line under it.
export function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-body-sm font-medium">{label}</span>
        {hint && (
          <span className="block text-caption text-muted-foreground">
            {hint}
          </span>
        )}
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
