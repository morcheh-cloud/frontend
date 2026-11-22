import type { Metadata } from "next"
import { Suspense } from "react"

import { WebhooksView } from "./components/webhooks-view"

export const metadata: Metadata = {
  title: "Webhooks",
}

export const instant = false

export default function WebhooksPage() {
  return (
    <Suspense>
      <WebhooksView />
    </Suspense>
  )
}
