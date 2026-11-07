"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type Choice<T extends string> = {
  value: T
  label: string
  detail?: string
}

export function ChoiceSelect<T extends string>({
  id,
  value,
  onChange,
  items,
}: {
  id?: string
  value: T
  onChange: (value: T) => void
  items: Choice<T>[]
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v !== null && onChange(v as T)}
    >
      <SelectTrigger id={id} className="h-11 w-full md:h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <span className="truncate">{item.label}</span>
            {item.detail && (
              <span className="ms-auto truncate font-mono text-caption text-ash">
                {item.detail}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Addresses, one per line (commas and spaces work too).
export const splitList = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean)

export function ListInput({
  value,
  onChange,
  placeholder,
  ...props
}: {
  id?: string
  "aria-invalid"?: true
  "aria-describedby"?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <Textarea
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      className="font-mono text-body-sm"
    />
  )
}

// Huma reports a bad list entry at `field[2]`: show it on the field.
export function listErrors(fields: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const [key, message] of Object.entries(fields)) {
    out[key.replace(/\[\d+\]$/, "")] ??= message
  }
  return out
}
