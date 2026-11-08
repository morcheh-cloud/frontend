import type { Metadata } from "next"
import { Suspense } from "react"

import { ProxyView } from "./components/proxy-view"

export const metadata: Metadata = {
  title: "Reverse proxy",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ProxyPage() {
  return (
    <Suspense>
      <ProxyView />
    </Suspense>
  )
}
