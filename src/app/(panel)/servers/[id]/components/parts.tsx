"use client"

import { Ellipsis, Info, Search, TriangleAlert, X } from "lucide-react"
import type { KeyboardEvent, ReactElement, ReactNode, Ref } from "react"

import { SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: readonly { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="flex shrink-0 rounded-lg bg-muted p-0.5">
      <legend className="sr-only">{label}</legend>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className="h-10 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-8"
        >
          {item.label}
        </button>
      ))}
    </fieldset>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className,
  inputRef,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
  inputRef?: Ref<HTMLInputElement>
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={cn("relative md:w-72", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.key === "Escape") {
            onChange("")
            e.currentTarget.blur()
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-11 w-full rounded-lg border border-input bg-card ps-9 pe-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute end-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ash hover:text-foreground md:size-7"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export function Empty({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: typeof Info
  title: string
  body: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center md:rounded-2xl md:border md:border-border",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-body font-medium">{title}</h3>
      <div className="mt-1 max-w-md text-body-sm text-muted-foreground">
        {body}
      </div>
      {action && <div className="mt-4 w-full max-w-sm md:w-auto">{action}</div>}
    </div>
  )
}

export type Note = {
  key: string
  title: string
  body?: ReactNode
  warn?: boolean
  action?: ReactNode
}

export function Notices({
  notes,
  className,
}: {
  notes: Note[]
  className?: string
}) {
  if (notes.length === 0) return null
  return (
    <div
      className={cn(
        "flex flex-col gap-2 max-md:mt-4 max-md:gap-0 max-md:divide-y max-md:divide-border max-md:border-y max-md:border-border",
        className,
      )}
    >
      {notes.map((n) => (
        <div
          key={n.key}
          className="flex gap-3 p-4 text-body-sm md:items-center md:rounded-2xl md:border md:border-border md:bg-subtle md:px-5 md:py-3"
        >
          {n.warn ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning md:mt-0" />
          ) : (
            <Info className="mt-0.5 size-4 shrink-0 text-ash md:mt-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="text-muted-foreground">{n.body}</p>}
          </div>
          {n.action && <div className="shrink-0">{n.action}</div>}
        </div>
      ))}
    </div>
  )
}

export function Loading({ phone }: { phone: boolean }) {
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <Skeleton className="h-11 rounded-lg" />
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }
  return (
    <>
      <Skeleton className="h-9 rounded-lg" />
      <Skeleton className="h-80 rounded-2xl" />
    </>
  )
}

// A status dot with its label: color backs up the text, never replaces it.
export function StateDot({
  tone,
  label,
}: {
  tone: "success" | "warning" | "muted"
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "muted" && "bg-mist",
        )}
      />
      {label}
    </span>
  )
}

// One action, shown as a dropdown item on desktop and a sheet row on phones.
export type Item = {
  key: string
  label: string
  icon: ReactNode
  destructive?: boolean
  disabled?: boolean
  // Runs inside the sheet instead of closing it first (toggles).
  stay?: boolean
  trailing?: ReactNode
  onSelect: () => void
}

export function ItemMenu({
  groups,
  label,
  trigger,
}: {
  groups: Item[][]
  label: string
  trigger?: ReactElement
}) {
  const shown = groups.filter((g) => g.length > 0)
  if (shown.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label={label} />
          )
        }
      >
        {trigger ? undefined : <Ellipsis />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {shown.map((group, i) => (
          <div key={group[0].key}>
            {i > 0 && <DropdownMenuSeparator />}
            {group.map((item) => (
              <DropdownMenuItem
                key={item.key}
                variant={item.destructive ? "destructive" : "default"}
                disabled={item.disabled}
                onClick={item.onSelect}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Sheet rows for the same actions. Closes the sheet first and acts once its
// history entry is gone, so a layer the action opens gets its own Back entry.
export function SheetItems({
  groups,
  onOpenChange,
}: {
  groups: Item[][]
  onOpenChange: (open: boolean) => void
}) {
  function select(item: Item) {
    if (item.stay) return item.onSelect()
    window.addEventListener("popstate", () => item.onSelect(), { once: true })
    onOpenChange(false)
  }
  return groups
    .filter((g) => g.length > 0)
    .map((group) => (
      <ul
        key={group[0].key}
        className="mb-2 divide-y divide-border border-b border-border last:border-b-0"
      >
        {group.map((item) => (
          <li key={item.key}>
            <SheetAction
              icon={item.icon}
              label={item.label}
              destructive={item.destructive}
              disabled={item.disabled}
              trailing={item.trailing}
              onClick={() => select(item)}
            />
          </li>
        ))}
      </ul>
    ))
}

// A label/value block for phone sheets.
export function Facts({
  items,
}: {
  items: { label: string; value: ReactNode; wide?: boolean; mono?: boolean }[]
}) {
  return (
    <dl className="mx-2 mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
      {items.map((f) => (
        <div key={f.label} className={cn("min-w-0", f.wide && "col-span-2")}>
          <dt className="text-caption text-ash">{f.label}</dt>
          <dd
            className={cn(
              "mt-0.5 break-words",
              f.mono
                ? "font-mono text-caption break-all whitespace-pre-line"
                : "font-medium",
            )}
          >
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// Close a phone sheet, then act once its history entry is gone, so a layer
// the action opens gets a Back entry of its own.
export function afterClose(close: (open: boolean) => void, act: () => void) {
  window.addEventListener("popstate", () => act(), { once: true })
  close(false)
}
