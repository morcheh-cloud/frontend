import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminOnly } from "../components/no-access"
import { GroupsView } from "./components/groups-view"

export const metadata: Metadata = { title: "Groups" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function GroupsPage() {
  return (
    <AdminOnly>
      <Suspense>
        <GroupsView />
      </Suspense>
    </AdminOnly>
  )
}
