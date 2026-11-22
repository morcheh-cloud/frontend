import type { Metadata } from "next"
import { Suspense } from "react"

import { NewWebhook } from "../components/webhook-editor"

export const metadata: Metadata = {
  title: "New webhook",
}

export const instant = false

export default function NewWebhookPage() {
  return (
    <Suspense>
      <NewWebhook />
    </Suspense>
  )
}
