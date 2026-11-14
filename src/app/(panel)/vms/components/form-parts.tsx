"use client"

import type { ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export type PickItem<T extends string> = {
  value: T
  label: string
  detail?: string
  disabled?: boolean
}

// A select: Base UI's on desktop, the phone's own wheel on phones.
export function Pick<T extends string>({
  id,
  value,
  onChange,
  items,
  placeholder,
  className,
}: {
  id?: string
  value: T
  onChange: (v: T) => void
  items: PickItem<T>[]
  placeholder?: string
  className?: string
}) {
  const phone = useIsMobile()
  if (phone) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.detail ? `${o.label} · ${o.detail}` : o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v != null && onChange(v as T)}
    >
      <SelectTrigger id={id} className={cn("h-10 w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            <span className="truncate">{o.label}</span>
            {o.detail && (
              <span className="ms-auto truncate text-caption text-ash">
                {o.detail}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// A tick with a title and a line under it.
export function CheckRow({
  checked,
  onChange,
  label,
  text,
  disabled,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  text?: ReactNode
  disabled?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside
    <label
      className={cn(
        "flex items-start gap-2.5 text-body-sm max-md:min-h-11",
        disabled && "opacity-60",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(on) => onChange(on)}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium">{label}</span>
        {text && (
          <span className="block text-caption text-muted-foreground">
            {text}
          </span>
        )}
      </span>
    </label>
  )
}

// A quiet callout inside a dialog.
export function Callout({
  tone = "muted",
  icon,
  children,
}: {
  tone?: "muted" | "warning" | "destructive"
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-3 text-body-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        tone === "muted" && "bg-subtle text-muted-foreground",
        tone === "warning" && "border-warning/40 bg-warning/5",
        tone === "destructive" &&
          "border-destructive/40 bg-destructive/5 text-foreground",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
