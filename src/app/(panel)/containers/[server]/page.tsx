import type { Metadata } from "next"
import { Suspense } from "react"

import { ServerRedirect } from "../components/server-redirect"

export const metadata: Metadata = {
  title: "Containers",
}

// Reads the server from the URL in the browser.
export const instant = false

export default function ContainersServerPage() {
  return (
    <Suspense>
      <ServerRedirect />
    </Suspense>
  )
}
