import type { Metadata } from "next"
import { Suspense } from "react"

import { TunnelPageFromRoute } from "../components/tunnel-page"

export const metadata: Metadata = { title: "Tunnel" }

export const instant = false

export default function TunnelPage() {
  return (
    <Suspense>
      <TunnelPageFromRoute />
    </Suspense>
  )
}
