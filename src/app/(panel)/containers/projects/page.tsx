import type { Metadata } from "next"
import { Suspense } from "react"

import { ProjectsPage } from "../components/projects-view"

export const metadata: Metadata = {
  title: "Projects",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <ProjectsPage />
    </Suspense>
  )
}
