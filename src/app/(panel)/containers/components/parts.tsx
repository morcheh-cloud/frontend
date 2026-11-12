"use client"

import { Check, Copy } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import { cn } from "@/lib/utils"

// A details layer: a side sheet on desktop, a full bottom sheet on phones.
export function Layer({
  open,
  onOpenChange,
  title,
  subtitle,
  actions,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: ReactNode
  // Buttons under the header (desktop) or at the foot (phone).
  actions?: ReactNode
  children: ReactNode
}) {
  const phone = useIsPhone()
  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        footer={
          actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null
        }
      >
        {subtitle && (
          <p className="-mt-1 mb-3 px-2 text-body-sm break-all text-muted-foreground">
            {subtitle}
          </p>
        )}
        <div className="flex flex-col gap-5 px-2 pb-4">{children}</div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="pe-8 text-body break-all">{title}</SheetTitle>
          {subtitle && (
            <SheetDescription className="break-all">
              {subtitle}
            </SheetDescription>
          )}
          {actions && (
            <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
          )}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// A titled block inside a layer or a page card.
export function Block({
  title,
  aside,
  children,
  className,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <h3 className="text-body-sm font-medium">{title}</h3>
        {aside && <div className="ms-auto">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

// Label/value rows.
export function Pairs({
  rows,
  className,
}: {
  rows: { label: string; value: ReactNode; mono?: boolean }[]
  className?: string
}) {
  const shown = rows.filter(
    (r) => r.value !== undefined && r.value !== null && r.value !== "",
  )
  if (shown.length === 0) return null
  return (
    <dl
      className={cn(
        "divide-y divide-border rounded-xl border border-border text-body-sm",
        className,
      )}
    >
      {shown.map((r) => (
        <div key={r.label} className="flex gap-4 px-3 py-2">
          <dt className="w-32 shrink-0 text-muted-foreground">{r.label}</dt>
          <dd
            className={cn(
              "min-w-0 flex-1 break-words",
              r.mono && "font-mono text-caption break-all",
            )}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-body-sm text-muted-foreground">{children}</p>
}

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      className={className}
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setDone(true)
            window.setTimeout(() => setDone(false), 1200)
          })
          .catch(() => toast.error("Couldn't copy"))
      }}
    >
      {done ? <Check /> : <Copy />}
    </Button>
  )
}

// A stacked bar of parts of a whole (container states, disk use).
export function StackBar({
  parts,
  className,
  label,
}: {
  parts: { value: number; className: string; label: string }[]
  className?: string
  label: string
}) {
  const total = parts.reduce((n, p) => n + p.value, 0)
  return (
    <div
      role="img"
      aria-label={`${label}: ${parts
        .filter((p) => p.value > 0)
        .map((p) => `${p.value} ${p.label}`)
        .join(", ")}`}
      className={cn("flex h-2 gap-0.5 overflow-hidden rounded-full", className)}
    >
      {total === 0 ? (
        <span className="h-full flex-1 bg-muted" />
      ) : (
        parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span
              key={p.label}
              className={cn(
                "h-full first:rounded-s-full last:rounded-e-full",
                p.className,
              )}
              style={{ flexGrow: p.value, flexBasis: 0 }}
            />
          ))
      )}
    </div>
  )
}
