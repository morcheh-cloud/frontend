import type { Metadata } from "next"
import { Suspense } from "react"

import { WebhookFromRoute } from "../components/webhook-page"

export const metadata: Metadata = {
  title: "Webhook",
}

export const instant = false

export default function WebhookDetailPage() {
  return (
    <Suspense>
      <WebhookFromRoute />
    </Suspense>
  )
}
