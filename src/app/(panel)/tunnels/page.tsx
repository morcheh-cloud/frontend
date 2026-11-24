import type { Metadata } from "next"
import { Suspense } from "react"

import { TunnelsView } from "./components/tunnels-view"

export const metadata: Metadata = { title: "VPN & tunnels" }

export const instant = false

export default function TunnelsPage() {
  return (
    <Suspense>
      <TunnelsView />
    </Suspense>
  )
}
