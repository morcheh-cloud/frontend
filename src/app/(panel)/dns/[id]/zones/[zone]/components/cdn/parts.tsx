"use client"

import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { type FormEvent, type ReactNode, useId, useState } from "react"

import {
  type Item,
  ItemMenu,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// A titled block of settings: a card on desktop, a plain group on phones.
export function SettingCard({
  title,
  hint,
  phone,
  action,
  children,
  className,
}: {
  title: string
  hint?: ReactNode
  phone: boolean
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">{title}</h2>
          {hint && (
            <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 max-md:min-h-11">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-body-sm font-medium">
          {label}
        </label>
        {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5"
      />
    </div>
  )
}

// The changes made on top of what was read; `patch` holds only them.
export function useDraft<T extends object>(saved: T | undefined) {
  const [changes, setChanges] = useState<Partial<T>>({})
  const value = (saved ? { ...saved, ...changes } : undefined) as T | undefined
  const patch: Partial<T> = {}
  if (saved) {
    for (const [k, v] of Object.entries(changes) as [keyof T, T[keyof T]][]) {
      if (JSON.stringify(saved[k]) !== JSON.stringify(v)) patch[k] = v
    }
  }
  return {
    value,
    patch,
    dirty: Object.keys(patch).length > 0,
    set: (p: Partial<T>) => setChanges((c) => ({ ...c, ...p })),
    reset: () => setChanges({}),
  }
}

// Save / Discard, stuck to the bottom while there are changes.
export function SaveBar({
  dirty,
  pending,
  onSave,
  onDiscard,
  phone,
}: {
  dirty: boolean
  pending: boolean
  onSave: () => void
  onDiscard: () => void
  phone: boolean
}) {
  if (!dirty) return null
  return (
    <div
      className={cn(
        "sticky z-20 flex items-center gap-3 border border-border bg-background/95 px-4 py-3 shadow-md backdrop-blur-md",
        phone
          ? "bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] mx-0 rounded-none border-x-0"
          : "bottom-4 rounded-2xl",
      )}
    >
      <p className="min-w-0 flex-1 truncate text-body-sm">
        Unsaved changes
        <span className="text-muted-foreground max-md:hidden">
          {" "}
          · they go live at ArvanCloud when saved
        </span>
      </p>
      <Button variant="ghost" disabled={pending} onClick={onDiscard}>
        Discard
      </Button>
      <Button disabled={pending} onClick={onSave}>
        {pending && <Loader2 className="animate-spin" />}
        Save
      </Button>
    </div>
  )
}

// A small segmented choice inside settings.
export function Choices<T extends string>({
  value,
  onChange,
  items,
  disabled,
  label,
}: {
  value: T
  onChange: (v: T) => void
  items: readonly { value: T; label: string }[]
  disabled?: boolean
  label: string
}) {
  return (
    <fieldset
      disabled={disabled}
      className="flex w-fit max-w-full flex-wrap rounded-lg bg-muted p-0.5"
    >
      <legend className="sr-only">{label}</legend>
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          aria-pressed={value === i.value}
          onClick={() => onChange(i.value)}
          className="h-10 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-8"
        >
          {i.label}
        </button>
      ))}
    </fieldset>
  )
}

export function SettingsSkeleton({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone && "px-4 pt-4")}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-border bg-subtle"
        />
      ))}
    </div>
  )
}

// A form in a side sheet (desktop) or full bottom sheet (phone), with Save.
export function EditorSheet({
  open,
  onOpenChange,
  title,
  description,
  formId,
  pending,
  saveLabel,
  onSubmit,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  formId: string
  pending: boolean
  saveLabel: string
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  const isMobile = useIsMobile()
  const form = (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(e)
      }}
      noValidate
      className={cn(!isMobile && "flex min-h-0 flex-1 flex-col")}
    >
      {isMobile ? (
        <div className="flex flex-col gap-5">{children}</div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
            {children}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {saveLabel}
            </Button>
          </div>
        </>
      )}
    </form>
  )
  if (isMobile) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <span aria-hidden className="truncate text-body font-medium">
              {title}
            </span>
            <Button
              type="submit"
              form={formId}
              variant="ghost"
              disabled={pending}
              className="h-11 justify-self-end text-body text-brand"
            >
              Save
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {form}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {form}
      </SheetContent>
    </Sheet>
  )
}

// One rule in an ordered list: its place, an on/off switch, what it says,
// and its menu. Order buttons only where order matters and changes are on.
export function RuleRow({
  index,
  count,
  enabled,
  canEdit,
  title,
  detail,
  tag,
  onToggle,
  onOpen,
  onMove,
  menu,
}: {
  index: number
  count: number
  enabled: boolean
  canEdit: boolean
  title: ReactNode
  detail?: ReactNode
  tag?: ReactNode
  onToggle: (on: boolean) => void
  onOpen?: () => void
  onMove?: (dir: -1 | 1) => void
  menu: Item[][]
}) {
  return (
    <li
      className={cn(
        "flex min-h-14 items-center gap-3 px-3 py-2",
        !enabled && "text-ash",
      )}
    >
      <span className="w-6 shrink-0 text-center text-caption text-ash tabular-nums">
        {index + 1}
      </span>
      <Switch
        checked={enabled}
        disabled={!canEdit}
        onCheckedChange={onToggle}
        aria-label="Rule on"
      />
      <button
        type="button"
        disabled={!onOpen}
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
      >
        <span className="flex max-w-full min-w-0 items-center gap-2">
          <span className="truncate text-body-sm font-medium">{title}</span>
          {tag}
        </span>
        {detail && (
          <span className="max-w-full truncate font-mono text-caption text-muted-foreground">
            {detail}
          </span>
        )}
      </button>
      {canEdit && onMove && (
        <span className="flex shrink-0 max-md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown />
          </Button>
        </span>
      )}
      <ItemMenu
        groups={
          canEdit && onMove
            ? [
                ...menu,
                [
                  ...(index > 0
                    ? [
                        {
                          key: "up",
                          label: "Move up",
                          icon: <ArrowUp />,
                          onSelect: () => onMove(-1),
                        },
                      ]
                    : []),
                  ...(index < count - 1
                    ? [
                        {
                          key: "down",
                          label: "Move down",
                          icon: <ArrowDown />,
                          onSelect: () => onMove(1),
                        },
                      ]
                    : []),
                ],
              ]
            : menu
        }
        label="Rule actions"
      />
    </li>
  )
}

// Addresses and ranges, one per line or separated by spaces/commas.
export const splitSources = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean)
