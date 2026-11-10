"use client"

import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import { cn } from "@/lib/utils"

// A side sheet on desktop, a full bottom sheet on phones. The body brings its
// own scrolling area and footer (see LayerBody / LayerFooter).
export function Layer({
  open,
  onOpenChange,
  title,
  description,
  header,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  // Desktop: replaces the title row (an icon beside the title…).
  header?: ReactNode
  children: ReactNode
}) {
  const phone = useIsPhone()
  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {children}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          {header ?? <SheetTitle className="text-body">{title}</SheetTitle>}
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}

export function LayerBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:px-6 md:py-5",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function LayerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 md:px-6 md:py-4">
      {children}
    </div>
  )
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-body font-medium">{title}</h3>
        {aside && <span className="text-caption text-ash">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

// A labelled switch row: the whole row toggles it, ≥44px on phones.
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 py-1",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium">{label}</span>
        {hint && (
          <span className="block text-caption text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <Switch
        className="mt-1"
        checked={checked}
        onCheckedChange={(v) => onChange(v)}
        disabled={disabled}
      />
    </label>
  )
}

// Name/value pairs in two columns (one on phones).
export function Facts({
  items,
}: {
  items: { label: string; value: ReactNode }[]
}) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-body-sm">
      {items.map((f) => (
        <div key={f.label} className="contents">
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd className="min-w-0 break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
