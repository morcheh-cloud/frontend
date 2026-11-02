import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminOnly } from "../../../components/no-access"
import { MemberAccessView } from "../../components/member-access"

export const metadata: Metadata = { title: "Member access" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function MemberAccessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <AdminOnly>
      <Suspense>
        <MemberAccessView params={params} />
      </Suspense>
    </AdminOnly>
  )
}
