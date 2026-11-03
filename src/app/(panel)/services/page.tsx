import type { Metadata } from "next"
import { Suspense } from "react"

import { AppsView } from "./components/apps-view"

export const metadata: Metadata = {
  title: "Services",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServicesPage() {
  return (
    <Suspense>
      <AppsView />
    </Suspense>
  )
}
