import type { Metadata } from "next"
import { Suspense } from "react"

import { VolumePage } from "../../components/volume-page"

export const metadata: Metadata = {
  title: "Volume",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <VolumePage />
    </Suspense>
  )
}
