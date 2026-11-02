import type { Metadata } from "next"
import { Suspense } from "react"

import { WorkspaceDetailView } from "../components/workspace-detail"
import { WorkspacesActionsProvider } from "../components/workspaces-actions"

export const metadata: Metadata = { title: "Workspace" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense>
      <WorkspacesActionsProvider>
        <WorkspaceDetailView params={params} />
      </WorkspacesActionsProvider>
    </Suspense>
  )
}
