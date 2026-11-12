import type { Metadata } from "next"
import { Suspense } from "react"

import { NewProjectPage } from "../../components/project-new"

export const metadata: Metadata = {
  title: "New project",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <NewProjectPage />
    </Suspense>
  )
}
