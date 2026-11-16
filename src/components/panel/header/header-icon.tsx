"use client"

import type { ReactElement, ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// The look of an icon-only button in the panel header.
export const headerIconClass = cn(
  buttonVariants({ variant: "ghost", size: "icon-sm" }),
  "relative text-muted-foreground hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground",
)

// An icon-only header button named by a tooltip. `render` is the trigger
// (a menu or popover trigger, or a link) and should carry `headerIconClass`.
export function HeaderIcon({
  label,
  render,
  children,
}: {
  label: string
  render: ReactElement
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={render} aria-label={label}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
