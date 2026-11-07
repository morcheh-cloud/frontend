import type { Metadata } from "next"
import { Suspense } from "react"

import { ServerPageView } from "./components/server-page"

export const metadata: Metadata = {
  title: "DNS server",
}

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

// The id is only known at request time, so reading it needs Suspense.
export default function DnsServerPage() {
  return (
    <Suspense>
      <ServerPageView />
    </Suspense>
  )
}
