import type { Metadata } from "next"
import { Suspense } from "react"

import { ContainerPage } from "../../components/container-page"

export const metadata: Metadata = {
  title: "Container",
}

// Waits on the container loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ContainerDetailPage() {
  return (
    <Suspense>
      <ContainerPage />
    </Suspense>
  )
}
