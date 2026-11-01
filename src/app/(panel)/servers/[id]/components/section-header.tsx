"use client"

import type { ReactNode } from "react"

import { useServerPage } from "./server-page"

// The top of a section: its name, what it covers and its own actions. Phones
// show the name in the app bar instead, so only the actions remain.
export function SectionHeader({ actions }: { actions?: ReactNode }) {
  const { section, phone } = useServerPage()
  if (phone) {
    return actions ? (
      <div className="flex gap-2 px-4 pt-4">{actions}</div>
    ) : null
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-body font-medium">{section.label}</h2>
        <p className="text-body-sm text-muted-foreground">{section.summary}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
