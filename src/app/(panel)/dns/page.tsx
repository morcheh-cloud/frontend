import type { Metadata } from "next"
import { Suspense } from "react"

import { DnsView } from "./components/dns-view"

export const metadata: Metadata = {
  title: "DNS",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function DnsPage() {
  return (
    <Suspense>
      <DnsView />
    </Suspense>
  )
}
