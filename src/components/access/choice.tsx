"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsPhone } from "@/hooks/useIsPhone"
import { cn } from "@/lib/utils"

export type ChoiceItem = { value: string; label: string }

// A single choice: the phone's own picker there, a menu on desktop.
export function Choice({
  id,
  label,
  value,
  items,
  disabled,
  placeholder,
  onChange,
  className,
}: {
  id?: string
  label?: string
  value: string
  items: ChoiceItem[]
  disabled?: boolean
  placeholder?: string
  onChange: (value: string) => void
  className?: string
}) {
  const phone = useIsPhone()

  if (phone) {
    return (
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          className,
        )}
      >
        {placeholder && !value && <option value="">{placeholder}</option>}
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <Select
      items={items}
      value={value || null}
      disabled={disabled}
      onValueChange={(next) => next && onChange(next)}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
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
