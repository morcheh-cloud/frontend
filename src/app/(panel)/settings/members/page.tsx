import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminOnly } from "../components/no-access"
import { MembersActionsProvider } from "./components/members-actions"
import { MembersView } from "./components/members-view"

export const metadata: Metadata = { title: "Members" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function MembersPage() {
  return (
    <AdminOnly>
      <Suspense>
        <MembersActionsProvider>
          <MembersView />
        </MembersActionsProvider>
      </Suspense>
    </AdminOnly>
  )
}
