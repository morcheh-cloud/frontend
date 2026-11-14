"use client"

import {
  Check,
  ChevronDown,
  Ellipsis,
  RefreshCw,
  SearchX,
  X,
} from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "../../servers/[id]/components/parts"

// Building blocks shared by the Containers pages: one toolbar row (stacked
// on phones), tables with a menu per row, phone rows with an action sheet.

export function PageBar({
  phone,
  tabs,
  search,
  filters,
  caption,
  refresh,
  primary,
  aside,
  more,
}: {
  phone: boolean
  tabs?: ReactNode
  search?: ReactNode
  filters?: ReactNode
  caption?: ReactNode
  refresh: { busy: boolean; run: () => void }
  primary?: { label: string; icon: ReactNode; run: () => void }
  aside?: ReactNode
  // Less used page actions behind a ⋯ button (desktop menu, phone sheet).
  more?: Item[][]
}) {
  const moreButton = more?.some((g) => g.length > 0) ? (
    phone ? (
      <MoreSheet groups={more} />
    ) : (
      <ItemMenu
        groups={more}
        label="More actions"
        trigger={
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="More actions"
            title="More actions"
          >
            <Ellipsis />
          </Button>
        }
      />
    )
  ) : null
  const refreshButton = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={refresh.busy}
      onClick={refresh.run}
    >
      <RefreshCw className={cn(refresh.busy && "animate-spin")} />
    </Button>
  )
  const primaryButton = primary && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label={primary.label}
      onClick={primary.run}
    >
      {primary.icon}
      {!phone && primary.label}
    </Button>
  )
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search ?? <span className="flex-1" />}
          {refreshButton}
          {moreButton}
          {primaryButton}
        </div>
        {(tabs || filters) && (
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            {tabs}
            {filters}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="@container flex items-center gap-2">
      {tabs}
      {tabs && (search || filters) && (
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      )}
      {filters}
      {search}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        {caption && (
          <span className="me-2 hidden text-caption whitespace-nowrap text-muted-foreground @5xl:inline">
            {caption}
          </span>
        )}
        {refreshButton}
        {aside}
        {moreButton}
        {primaryButton}
      </div>
    </div>
  )
}

function MoreSheet({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("docker-page-more")
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="More actions"
        onClick={() => setOpen(true)}
      >
        <Ellipsis />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="More actions">
        <SheetItems groups={groups} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

export function NoMatch({
  onReset,
  text,
}: {
  onReset: () => void
  text?: string
}) {
  return (
    <Empty
      icon={SearchX}
      title="Nothing matches"
      body={text ?? "Try another search or filter."}
      className="max-md:mt-4"
      action={
        <Button variant="outline" onClick={onReset}>
          Show all
        </Button>
      }
    />
  )
}

export function Table({
  head,
  children,
  selectAll,
}: {
  head: { label: string; className?: string }[]
  children: ReactNode
  // A tick column in front, with a select-everything box in the head.
  selectAll?: {
    checked: boolean
    indeterminate: boolean
    onChange: (on: boolean) => void
    label: string
  }
}) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border [contain:inline-size]">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              {selectAll && (
                <th scope="col" className="w-10 ps-4">
                  <Checkbox
                    aria-label={selectAll.label}
                    checked={selectAll.checked}
                    indeterminate={selectAll.indeterminate}
                    onCheckedChange={(on) => selectAll.onChange(Boolean(on))}
                  />
                </th>
              )}
              {head.map((h, i) => (
                <th
                  key={h.label}
                  scope="col"
                  className={cn(
                    "h-10 px-3 text-start font-medium",
                    i === 0 && !selectAll && "ps-4",
                    h.className,
                  )}
                >
                  {h.label}
                </th>
              ))}
              <th scope="col" className="w-12 pe-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

// A desktop row whose first cell opens the item's details.
export function Tr({
  onOpen,
  menu,
  label,
  cells,
  select,
}: {
  onOpen: () => void
  menu: Item[][]
  label: string
  cells: { node: ReactNode; className?: string }[]
  // With a Table's selectAll: this row's tick.
  select?: { checked: boolean; onChange: (on: boolean) => void }
}) {
  return (
    <tr
      className={cn(
        "hover:bg-subtle/60",
        select?.checked && "bg-brand-soft/40 hover:bg-brand-soft/50",
      )}
    >
      {select && (
        <td className="w-10 ps-4">
          <Checkbox
            aria-label={`Select ${label}`}
            checked={select.checked}
            onCheckedChange={(on) => select.onChange(Boolean(on))}
          />
        </td>
      )}
      {cells.map((c, i) => (
        <td
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
          key={i}
          className={cn(
            "px-3 py-2.5",
            i === 0 && "max-w-80",
            i === 0 && !select && "ps-4",
            c.className,
          )}
        >
          {i === 0 ? (
            <button
              type="button"
              onClick={onOpen}
              className="block max-w-full text-start outline-none hover:underline focus-visible:underline"
            >
              {c.node}
            </button>
          ) : (
            c.node
          )}
        </td>
      ))}
      <td className="pe-2 text-end">
        <ItemMenu groups={menu} label={`${label} actions`} />
      </td>
    </tr>
  )
}

export function PhoneRow({
  title,
  sub,
  onOpen,
  menu,
  id,
  aside,
  lead,
}: {
  title: ReactNode
  sub: ReactNode
  onOpen: () => void
  menu: Item[][]
  id: string
  // Something small at the end of the row (a mini chart).
  aside?: ReactNode
  // An icon or logo in front of the title.
  lead?: ReactNode
}) {
  const [open, setOpen] = useOpen(`docker-item-${id}`)
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 ps-4 text-start active:bg-muted"
      >
        {lead}
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-body font-medium">{title}</span>
          <span className="truncate text-caption text-muted-foreground">
            {sub}
          </span>
        </span>
      </button>
      {aside && <div className="shrink-0 ps-2">{aside}</div>}
      <Button
        variant="ghost"
        size="icon-lg"
        className="me-1"
        aria-label="Actions"
        onClick={() => setOpen(true)}
      >
        <Ellipsis />
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={typeof title === "string" ? title : "Actions"}
      >
        <SheetItems groups={menu} onOpenChange={setOpen} />
      </BottomSheet>
    </li>
  )
}

export function Rows({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {children}
    </ul>
  )
}

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: "muted" | "warning" | "brand"
}) {
  return (
    <span
      className={cn(
        "ms-2 inline-block shrink-0 rounded-full px-2 py-0.5 align-middle font-label text-[10px] tracking-label uppercase",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "brand" && "bg-brand-soft text-brand-strong",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

export function BulkBar({
  count,
  onClear,
  actions,
}: {
  count: number
  onClear: () => void
  actions: {
    label: string
    icon: ReactNode
    destructive?: boolean
    run: () => void
  }[]
}) {
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-md">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear the selection"
        onClick={onClear}
      >
        <X />
      </Button>
      <span className="px-2 text-body-sm font-medium whitespace-nowrap">
        {count} selected
      </span>
      <span className="mx-1 h-5 w-px bg-border" />
      {actions.map((x) => (
        <Button
          key={x.label}
          variant="ghost"
          size="sm"
          className={cn(x.destructive && "text-destructive")}
          onClick={x.run}
        >
          {x.icon}
          {x.label}
        </Button>
      ))}
    </div>
  )
}

// A filter as a chip: a radio menu on desktop, a bottom sheet on phones.
export function ChoiceChip<T extends string>({
  phone,
  label,
  value,
  options,
  onChange,
  icon,
}: {
  phone: boolean
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
  icon?: ReactNode
}) {
  const [open, setOpen] = useOpen(`chip-${label}`)
  const current = options.find((o) => o.value === value) ?? options[0]
  const chip = (
    <Button
      variant="outline"
      className={cn(
        "shrink-0 gap-1.5",
        phone ? "h-9 rounded-full px-3.5" : "h-9",
      )}
      aria-label={`${label}: ${current.label}`}
      onClick={phone ? () => setOpen(true) : undefined}
    >
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{current.label}</span>
      <ChevronDown className="size-3.5 text-ash" />
    </Button>
  )
  if (phone) {
    return (
      <>
        {chip}
        <BottomSheet open={open} onOpenChange={setOpen} title={label}>
          <ul className="divide-y divide-border">
            {options.map((o) => (
              <li key={o.value}>
                <SheetAction
                  icon={
                    <Check className={cn(o.value !== value && "invisible")} />
                  }
                  label={o.label}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                />
              </li>
            ))}
          </ul>
        </BottomSheet>
      </>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={chip} />
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as T)}
        >
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
