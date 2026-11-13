import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminOnly } from "../../components/no-access"
import { DatasetView } from "../components/dataset-page"

export const metadata: Metadata = { title: "Logs & archives" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function LogDatasetPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  return (
    <AdminOnly>
      <Suspense>
        <DatasetView params={params} />
      </Suspense>
    </AdminOnly>
  )
}
