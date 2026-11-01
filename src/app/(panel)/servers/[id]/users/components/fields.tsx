"use client"

import { Copy, Dices, Eye, EyeOff, Search, TriangleAlert } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useServerPage } from "../../components/server-page"
import { generatePassword } from "./meta"

type Option = { value: string; label: string }

// A single choice: Base UI select on desktop, the OS's own picker on phones.
export function Picker({
  id,
  items,
  value,
  onChange,
  disabled,
}: {
  id?: string
  items: Option[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { phone } = useServerPage()
  if (phone) {
    return (
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
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
      value={value}
      disabled={disabled}
      onValueChange={(v) => v !== null && onChange(v)}
    >
      <SelectTrigger id={id} className="h-10 w-full">
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

export type CheckItem = { value: string; label: string; hint?: string }

// Several choices from a long list (groups, members): a filter on top, the
// picked ones first, in the order they were when the list opened.
export function CheckList({
  label,
  items,
  value,
  onChange,
  empty,
  disabled,
}: {
  label: string
  items: CheckItem[]
  value: string[]
  onChange: (value: string[]) => void
  empty: string
  disabled?: boolean
}) {
  const [q, setQ] = useState("")
  const [first] = useState(() => new Set(value))
  const needle = q.trim().toLowerCase()
  const shown = [...items]
    .sort((a, b) => Number(first.has(b.value)) - Number(first.has(a.value)))
    .filter(
      (i) =>
        !needle ||
        i.label.toLowerCase().includes(needle) ||
        i.hint?.toLowerCase().includes(needle),
    )
  const picked = new Set(value)

  function toggle(v: string, on: boolean) {
    onChange(on ? [...value, v] : value.filter((x) => x !== v))
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input">
      {items.length > 8 && (
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              // Enter in the filter shouldn't submit the form.
              if (e.key === "Enter") e.preventDefault()
            }}
            placeholder={`Filter ${label.toLowerCase()}`}
            aria-label={`Filter ${label.toLowerCase()}`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 w-full bg-transparent ps-9 pe-3 text-base outline-none placeholder:text-muted-foreground md:h-9 md:text-sm"
          />
        </div>
      )}
      <ul className="max-h-60 overflow-y-auto overscroll-contain py-1">
        {shown.length === 0 && (
          <li className="p-3 text-body-sm text-muted-foreground">
            {items.length === 0 ? empty : "Nothing matches."}
          </li>
        )}
        {shown.map((i) => (
          <li key={i.value}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control */}
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 px-3 hover:bg-subtle md:min-h-9",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <Checkbox
                checked={picked.has(i.value)}
                disabled={disabled}
                onCheckedChange={(on) => toggle(i.value, on)}
              />
              <span className="min-w-0 flex-1 truncate text-body-sm">
                {i.label}
              </span>
              {i.hint && (
                <span className="shrink-0 truncate text-caption text-ash">
                  {i.hint}
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

// A password field with show/hide, generate and copy.
export function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
  placeholder?: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="pe-20 font-mono"
        />
        <div className="absolute end-1 top-1/2 flex -translate-y-1/2">
          {value && (
            <button
              type="button"
              aria-label="Copy password"
              onClick={() =>
                navigator.clipboard
                  .writeText(value)
                  .then(() => toast.success("Password copied"))
                  .catch(() => toast.error("Couldn't access the clipboard"))
              }
              className="flex size-9 items-center justify-center rounded-md text-ash hover:text-foreground md:size-8"
            >
              <Copy className="size-4" />
            </button>
          )}
          <button
            type="button"
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
            className="flex size-9 items-center justify-center rounded-md text-ash hover:text-foreground md:size-8"
          >
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-10"
        onClick={() => {
          onChange(generatePassword())
          setShown(true)
        }}
      >
        <Dices />
        Generate
      </Button>
    </div>
  )
}

// A setting that is on or off, with what it means under its name.
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  check,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
  // A checkbox in front instead of a switch at the end.
  check?: boolean
}) {
  if (check) {
    return (
      // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control
      <label
        className={cn(
          "flex min-h-11 cursor-pointer items-start gap-3 text-body-sm",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(on) => onChange(on)}
          className="mt-0.5"
        />
        <span>
          <span className="block font-medium">{label}</span>
          {hint && <span className="block text-muted-foreground">{hint}</span>}
        </span>
      </label>
    )
  }
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch inside is the control
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span>
        <span className="block text-body-sm font-medium">{label}</span>
        {hint && (
          <span className="block text-caption text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  )
}

// One choice out of a few, each with what it means: radio cards.
export function RadioCards<T extends string>({
  name,
  items,
  value,
  onChange,
  disabled,
}: {
  name: string
  items: readonly { value: T; label: string; hint: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {items.map((item) => (
        <label
          key={item.value}
          className={cn(
            "flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3 has-checked:border-brand has-checked:bg-brand-soft/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <input
            type="radio"
            name={name}
            value={item.value}
            checked={value === item.value}
            disabled={disabled}
            onChange={() => onChange(item.value)}
            className="mt-1 size-4 shrink-0 accent-brand"
          />
          <span className="min-w-0">
            <span className="block text-body-sm font-medium">{item.label}</span>
            <span className="block text-caption text-muted-foreground">
              {item.hint}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}

export function Problem({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border border-border bg-subtle p-4 text-body-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="min-w-0 break-words whitespace-pre-wrap">{children}</p>
    </div>
  )
}
