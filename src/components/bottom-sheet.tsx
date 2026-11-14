"use client"

import { Drawer } from "@base-ui/react/drawer"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// A native-style bottom sheet (phones): drag handle, swipe down to dismiss,
// safe-area padding. Pair `open`/`onOpenChange` with useOpen so Back closes it.
// `full` makes it a near-full-height page (forms) whose body scrolls between a
// fixed header and footer.
export function BottomSheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  header,
  footer,
  full = false,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Keep the title for screen readers only. */
  hideTitle?: boolean
  /** Replaces the default title row (e.g. Cancel · Title · Save). */
  header?: ReactNode
  footer?: ReactNode
  full?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Drawer.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-foreground opacity-[calc(0.2*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup
            className={cn(
              "-mb-12 flex w-full [transform:translateY(var(--drawer-swipe-movement-y))] flex-col rounded-t-3xl bg-card pt-3 pb-12 transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-swiping:select-none",
              full
                ? "h-[calc(100dvh-max(--spacing(3),env(safe-area-inset-top))+3rem)]"
                : "max-h-[calc(90dvh+3rem)]",
            )}
          >
            <div
              aria-hidden
              className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-mist"
            />
            <Drawer.Content className="flex min-h-0 flex-1 flex-col">
              {header ?? (
                <Drawer.Title
                  className={cn(
                    "px-6 pt-1 pb-2 text-subheading font-medium",
                    hideTitle && "sr-only",
                  )}
                >
                  {title}
                </Drawer.Title>
              )}
              {header && (
                <Drawer.Title className="sr-only">{title}</Drawer.Title>
              )}
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4",
                  !footer &&
                    "pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]",
                  className,
                )}
              >
                {children}
              </div>
              {footer && (
                <div className="shrink-0 border-t border-border px-4 pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))]">
                  {footer}
                </div>
              )}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// A full-width row for action and picker sheets: 56px tall, icon tile, label.
export function SheetAction({
  icon,
  label,
  description,
  trailing,
  destructive = false,
  disabled = false,
  onClick,
}: {
  icon?: ReactNode
  label: string
  description?: string
  trailing?: ReactNode
  destructive?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-4 px-2 text-start text-body font-medium outline-none active:bg-muted disabled:opacity-50",
        destructive && "text-destructive",
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-5",
            destructive && "bg-destructive/10",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {description && (
          <span className="block truncate text-body-sm font-normal text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {trailing}
    </button>
  )
}
