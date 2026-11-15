import type { Metadata } from "next"
import { Suspense } from "react"

import { DnsView } from "../components/dns-view"

export const metadata: Metadata = {
  title: "DNS servers",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function DnsServersPage() {
  return (
    <Suspense>
      <DnsView />
    </Suspense>
  )
}
