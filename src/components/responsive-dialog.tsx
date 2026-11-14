"use client"

import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// A centred dialog on desktop, a bottom sheet on phones. Drive `open` with
// useOpen so Back closes it.
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  footer?: ReactNode
  // Desktop dialog only, e.g. a wider `sm:max-w-lg`.
  className?: string
  children: ReactNode
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        footer={footer}
      >
        {description && (
          <p className="-mt-1 mb-4 px-2 text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="px-2">{children}</div>
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      {/* Never taller than the window: the header (and footer) stay put and
          the body scrolls, so a long form keeps its buttons in reach. */}
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-4rem)] flex-col gap-5 p-6 sm:max-w-md",
          className,
        )}
      >
        <DialogHeader className="shrink-0 pe-6">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* minmax(0,1fr): a grid column defaults to min-content, so one
            long nowrap line (a truncated name) would widen the body and
            scroll it sideways. Nothing in a dialog scrolls sideways. */}
        <div
          data-slot="dialog-body"
          className="-mx-6 -my-1 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-5 overflow-x-hidden overflow-y-auto px-6 py-1"
        >
          {children}
        </div>
        {footer && (
          <DialogFooter className="-mx-6 -mb-6 shrink-0 px-6">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Ask before something destructive. Desktop: an alert dialog. Phone: an
// action sheet with the action on top and Cancel under it.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = true,
  pending = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
}) {
  const isMobile = useIsMobile()
  const variant = destructive ? "destructive" : "default"

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
        {description && (
          <div className="-mt-1 mb-5 px-2 text-body-sm text-muted-foreground">
            {description}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant={variant}
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button size="lg" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AlertDialogContent className="p-6">
        {/* min-w-0: grid items default to min-width auto, so a long
            nowrap line (a truncated command) would widen the dialog */}
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription render={<div />} className="w-full min-w-0">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-6 -mb-6 px-6">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant={variant} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
