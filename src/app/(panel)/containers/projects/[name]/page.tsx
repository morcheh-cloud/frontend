import type { Metadata } from "next"
import { Suspense } from "react"

import { ProjectPage } from "../../components/project-page"

export const metadata: Metadata = {
  title: "Project",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <ProjectPage />
    </Suspense>
  )
}
