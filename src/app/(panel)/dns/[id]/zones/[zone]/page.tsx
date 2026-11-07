import type { Metadata } from "next"
import { Suspense } from "react"

import { ZonePageView } from "./components/zone-page"

export const metadata: Metadata = {
  title: "DNS zone",
}

// Waits on the records loaded in the browser: skip instant-navigation checks.
export const instant = false

// The id and zone are only known at request time: read them under Suspense.
export default function DnsZonePage() {
  return (
    <Suspense>
      <ZonePageView />
    </Suspense>
  )
}
