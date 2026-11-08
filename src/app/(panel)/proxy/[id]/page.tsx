import type { Metadata } from "next"
import { Suspense } from "react"

import { ProxyPageView } from "./components/proxy-page"

export const metadata: Metadata = {
  title: "Reverse proxy",
}

// Waits on the proxy loaded in the browser: skip instant-navigation checks.
export const instant = false

// The id is only known at request time, so reading it needs Suspense.
export default function ProxyPage() {
  return (
    <Suspense>
      <ProxyPageView />
    </Suspense>
  )
}
