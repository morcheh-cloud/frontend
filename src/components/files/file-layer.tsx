"use client"

import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

// The frame the editor and the viewer open in: a large centred modal over a
// dimmed backdrop on desktop (a click outside dismisses it), full screen on
// phones. `className` styles the surface itself.
export function FileLayer({
  phone,
  label,
  hidden,
  onDismiss,
  onKeyDown,
  className,
  children,
}: {
  phone: boolean
  label: string
  hidden?: boolean
  onDismiss: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  className?: string
  children: ReactNode
}) {
  // A drag that starts inside (selecting text) and ends on the backdrop
  // still fires a click there: only a press that began outside dismisses.
  const pressedOutside = useRef(false)

  // The page behind stays visible on desktop, so keep it from scrolling.
  useEffect(() => {
    if (hidden) return
    const root = document.documentElement
    const before = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = before
    }
  }, [hidden])

  if (phone) {
    return (
      <div
        role="dialog"
        aria-modal
        aria-label={label}
        hidden={hidden}
        onKeyDown={onKeyDown}
        className={cn(
          "fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top)]",
          className,
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={label}
      hidden={hidden}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        pressedOutside.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedOutside.current && e.target === e.currentTarget) onDismiss()
        pressedOutside.current = false
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10 p-8 supports-backdrop-filter:backdrop-blur-xs"
    >
      <div
        className={cn(
          "flex size-full max-h-[60rem] max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-md",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
