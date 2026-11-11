"use client"

import { Check, ChevronDown, type LucideIcon, X } from "lucide-react"
import { useState } from "react"

import { afterClose } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"

export type FilterOption = {
  value: string
  label: string
  hint?: string
  count?: number
  icon?: LucideIcon
}

// One filter of the toolbar: a menu on desktop, a chip + sheet on phones.
export type FilterSpec = {
  key: string
  // What the button says while nothing is picked ("Why", "Any result").
  label: string
  // The heading of the menu / sheet.
  title: string
  // The first choice of a single-pick filter, meaning "no filter".
  allLabel?: string
  icon?: LucideIcon
  options: FilterOption[]
  multi?: boolean
  value: string[]
  onChange: (value: string[]) => void
}

function buttonText(f: FilterSpec) {
  if (f.value.length === 0) return f.label
  const first = f.options.find((o) => o.value === f.value[0])?.label
  const name = first ?? f.value[0]
  return f.value.length > 1 ? `${name} +${f.value.length - 1}` : name
}

const ALL = "__all__"

export function FilterMenu({ f }: { f: FilterSpec }) {
  const on = f.value.length > 0
  const Icon = f.icon
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 max-w-56 gap-1.5 px-3",
              on && "border-brand/50 text-brand-strong",
            )}
          />
        }
      >
        {Icon && <Icon className="size-4" />}
        <span className="truncate">{buttonText(f)}</span>
        <ChevronDown className="size-3.5 text-ash" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(28rem,var(--available-height))] w-72"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{f.title}</DropdownMenuLabel>
          {f.multi ? (
            f.options.map((o) => (
              <DropdownMenuCheckboxItem
                key={o.value}
                checked={f.value.includes(o.value)}
                onCheckedChange={(checked) =>
                  f.onChange(
                    checked
                      ? [...f.value, o.value]
                      : f.value.filter((v) => v !== o.value),
                  )
                }
                className="items-start"
              >
                <OptionBody o={o} />
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <DropdownMenuRadioGroup
              value={f.value[0] ?? ALL}
              onValueChange={(v) => f.onChange(v === ALL ? [] : [v as string])}
            >
              <DropdownMenuRadioItem value={ALL}>
                {f.allLabel ?? "All"}
              </DropdownMenuRadioItem>
              {f.options.map((o) => (
                <DropdownMenuRadioItem
                  key={o.value}
                  value={o.value}
                  className="items-start"
                >
                  <OptionBody o={o} />
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          )}
        </DropdownMenuGroup>
        {f.multi && on && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => f.onChange([])}>
              <X />
              Show all
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function OptionBody({ o }: { o: FilterOption }) {
  const Icon = o.icon
  return (
    <>
      {Icon && <Icon className="mt-0.5 text-muted-foreground" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{o.label}</span>
        {o.hint && <span className="text-caption text-ash">{o.hint}</span>}
      </span>
      {o.count !== undefined && (
        <span className="text-caption text-ash tabular-nums">{o.count}</span>
      )}
    </>
  )
}

export const chipClass =
  "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-4 text-body-sm whitespace-nowrap text-muted-foreground aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"

// The phone version: a chip opening a bottom sheet of choices.
export function FilterChip({ f }: { f: FilterSpec }) {
  const [open, setOpen] = useOpen(`command-filter-${f.key}`)
  const [draft, setDraft] = useState<string[]>([])
  const on = f.value.length > 0

  // The URL is written once the sheet's history entry is gone.
  const apply = (v: string[]) => afterClose(setOpen, () => f.onChange(v))

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        className={chipClass}
        onClick={() => {
          setDraft(f.value)
          setOpen(true)
        }}
      >
        <span className="max-w-40 truncate">{buttonText(f)}</span>
        <ChevronDown className="size-4" />
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={f.title}
        footer={
          f.multi && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={draft.length === 0}
                onClick={() => setDraft([])}
              >
                Clear
              </Button>
              <Button className="h-11 flex-1" onClick={() => apply(draft)}>
                Show
              </Button>
            </div>
          )
        }
      >
        <div className="flex flex-col pb-2">
          {!f.multi && (
            <Row
              label={f.allLabel ?? "All"}
              picked={!on}
              onClick={() => apply([])}
            />
          )}
          {f.options.map((o) => {
            const picked = (f.multi ? draft : f.value).includes(o.value)
            return (
              <Row
                key={o.value}
                o={o}
                label={o.label}
                picked={picked}
                onClick={() =>
                  f.multi
                    ? setDraft((d) =>
                        picked
                          ? d.filter((v) => v !== o.value)
                          : [...d, o.value],
                      )
                    : apply([o.value])
                }
              />
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}

function Row({
  o,
  label,
  picked,
  onClick,
}: {
  o?: FilterOption
  label: string
  picked: boolean
  onClick: () => void
}) {
  const Icon = o?.icon
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-4 px-2 text-start outline-none active:bg-muted"
    >
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-5">
          <Icon />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">{label}</span>
        {o?.hint && (
          <span className="text-caption text-muted-foreground">{o.hint}</span>
        )}
      </span>
      {o?.count !== undefined && (
        <span className="text-body-sm text-ash tabular-nums">{o.count}</span>
      )}
      <Check
        className={cn("size-5 shrink-0 text-brand", !picked && "invisible")}
      />
    </button>
  )
}
