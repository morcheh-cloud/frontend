"use client"

import type { ReactNode } from "react"

import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { assetsItem } from "@/components/panel/nav"
import { SectionLinks } from "@/components/panel/section-links"
import { cn } from "@/lib/utils"

// The frame every Assets page shares: a native app bar with the section's
// pages on phones, the plain body on desktop (the sidebar names the page).
export function AssetsShell({
  phone,
  title,
  actions,
  section,
  children,
  className,
}: {
  phone: boolean
  title: string
  actions?: ReactNode
  section?: string
  children: ReactNode
  className?: string
}) {
  if (phone) {
    return (
      <div className="flex flex-col pb-24">
        <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
          <h1 className="min-w-0 flex-1 truncate text-heading font-light">
            {title}
          </h1>
          <HelpButton
            href={guideHref("assets", section)}
            label="Assets guide"
          />
          {actions}
        </header>
        <SectionLinks item={assetsItem} className="mt-3" />
        <div className={cn("flex flex-col pt-3", className)}>{children}</div>
      </div>
    )
  }
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-4 px-6 pt-5 pb-24", className)}
    >
      {children}
    </div>
  )
}
