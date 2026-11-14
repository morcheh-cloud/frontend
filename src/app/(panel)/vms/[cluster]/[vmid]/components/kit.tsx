"use client"

import { ChevronRight, Ellipsis } from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"

import {
  type Item,
  ItemMenu,
  SheetItems,
} from "../../../../servers/[id]/components/parts"

// The tab's body: padded on desktop, edge to edge on phones.
export function TabBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 p-6 max-md:gap-0 max-md:p-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

// One toolbar row on desktop; on phones it stacks under the app bar.
export function TabBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3",
        className,
      )}
    >
      {children}
    </div>
  )
}

// A titled block: a card on desktop, a plain grouped section on phones.
export function Panel({
  title,
  aside,
  children,
  className,
  flush,
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
  // No inner padding (tables, lists).
  flush?: boolean
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card max-md:rounded-none max-md:border-x-0 max-md:border-t-0",
        className,
      )}
    >
      {(title || aside) && (
        <header className="flex min-h-12 items-center gap-2 px-5 pt-4 max-md:px-4 max-md:pt-5">
          {title && (
            <h2 className="text-body-sm font-medium max-md:font-label max-md:text-caption max-md:tracking-label max-md:text-ash max-md:uppercase">
              {title}
            </h2>
          )}
          {aside && (
            <div className="ms-auto flex items-center gap-2 text-caption text-muted-foreground">
              {aside}
            </div>
          )}
        </header>
      )}
      <div className={cn(!flush && "px-5 pt-2 pb-5 max-md:px-4 max-md:pb-4")}>
        {children}
      </div>
    </section>
  )
}

// Label / value rows.
export function Pairs({
  items,
  className,
}: {
  items: (
    | { label: string; value: ReactNode; mono?: boolean; hide?: boolean }
    | false
    | null
    | undefined
  )[]
  className?: string
}) {
  const shown = items.filter(
    (i): i is Exclude<typeof i, false | null | undefined> =>
      !!i && !i.hide && i.value !== "" && i.value != null,
  )
  return (
    <dl className={cn("divide-y divide-border text-body-sm", className)}>
      {shown.map((i) => (
        <div
          key={i.label}
          className="flex min-h-10 items-baseline gap-4 py-2 max-md:min-h-11"
        >
          <dt className="w-36 shrink-0 text-muted-foreground">{i.label}</dt>
          <dd
            className={cn(
              "min-w-0 flex-1 break-words",
              i.mono && "font-mono text-caption",
            )}
          >
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: "muted" | "brand" | "warning" | "destructive" | "success"
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-caption whitespace-nowrap",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "brand" && "bg-brand-soft text-brand-strong",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-success/15 text-success",
      )}
    >
      {children}
    </span>
  )
}

// A list row with its actions: a ⋯ menu on desktop, a tap that opens a
// sheet of them on phones.
export function MenuRow({
  id,
  phone,
  icon,
  title,
  sub,
  aside,
  groups,
  label,
}: {
  // Unique per row: the phone sheet's history id.
  id: string
  phone: boolean
  icon: ReactNode
  title: ReactNode
  sub?: ReactNode
  aside?: ReactNode
  groups: Item[][]
  label: string
}) {
  const [open, setOpen] = useOpen(`vm-row-${id}`)
  const any = groups.some((g) => g.length > 0)
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body-sm font-medium">
          {title}
        </span>
        {sub && (
          <span className="mt-0.5 block truncate text-caption text-muted-foreground">
            {sub}
          </span>
        )}
      </span>
      {aside && (
        <span className="shrink-0 text-body-sm text-muted-foreground tabular-nums">
          {aside}
        </span>
      )}
    </>
  )
  if (phone) {
    return (
      <>
        <button
          type="button"
          disabled={!any}
          onClick={() => setOpen(true)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start active:bg-muted disabled:opacity-100"
        >
          {body}
          {any && (
            <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
          )}
        </button>
        {any && (
          <BottomSheet open={open} onOpenChange={setOpen} title={label}>
            <SheetItems groups={groups} onOpenChange={setOpen} />
          </BottomSheet>
        )}
      </>
    )
  }
  return (
    <div className="flex min-h-14 items-center gap-3 px-5 py-2">
      {body}
      {any ? (
        <ItemMenu
          label={label}
          groups={groups}
          trigger={
            <button
              type="button"
              aria-label={label}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Ellipsis className="size-4" />
            </button>
          }
        />
      ) : (
        <span className="size-8 shrink-0" />
      )}
    </div>
  )
}
