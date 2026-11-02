import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminOnly } from "../../../components/no-access"
import { GroupAccessView } from "../../components/group-access"

export const metadata: Metadata = { title: "Group access" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function GroupAccessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <AdminOnly>
      <Suspense>
        <GroupAccessView params={params} />
      </Suspense>
    </AdminOnly>
  )
}
