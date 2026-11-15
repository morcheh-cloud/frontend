import type { Metadata } from "next"
import { Suspense } from "react"

import { NewDatabase } from "../components/database-editor"

export const metadata: Metadata = {
  title: "Add database",
}

export const instant = false

export default function NewDatabasePage() {
  return (
    <Suspense>
      <NewDatabase />
    </Suspense>
  )
}
