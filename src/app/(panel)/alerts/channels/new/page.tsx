import type { Metadata } from "next"
import { Suspense } from "react"

import { ChannelEditor } from "../../components/channel-editor"

export const metadata: Metadata = {
  title: "New alert channel",
}

export const instant = false

export default function NewAlertChannelPage() {
  return (
    <Suspense>
      <ChannelEditor />
    </Suspense>
  )
}
