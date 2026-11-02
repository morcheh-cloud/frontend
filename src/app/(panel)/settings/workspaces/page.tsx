import type { Metadata } from "next"
import { Suspense } from "react"

import { WorkspacesActionsProvider } from "./components/workspaces-actions"
import { WorkspacesView } from "./components/workspaces-view"

export const metadata: Metadata = { title: "Workspaces" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function WorkspacesPage() {
  return (
    <Suspense>
      <WorkspacesActionsProvider>
        <WorkspacesView />
      </WorkspacesActionsProvider>
    </Suspense>
  )
}
