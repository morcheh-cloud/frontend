import type { Metadata } from "next"
import { Suspense } from "react"

import { EditDatabaseFromRoute } from "../../components/database-editor"

export const metadata: Metadata = {
  title: "Edit database",
}

export const instant = false

export default function EditDatabasePage() {
  return (
    <Suspense>
      <EditDatabaseFromRoute />
    </Suspense>
  )
}
