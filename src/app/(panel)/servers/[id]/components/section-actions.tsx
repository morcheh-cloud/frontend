"use client"

import type { ReactNode } from "react"

import { useServerPage } from "./server-page"

// A section's own actions, above its content. Sections carry no title or
// description: the tabs (desktop) and the app bar (phone) already name them.
export function SectionActions({ children }: { children: ReactNode }) {
  const { phone } = useServerPage()
  return (
    <div className={phone ? "flex gap-2 px-4 pt-4" : "flex justify-end gap-2"}>
      {children}
    </div>
  )
}
