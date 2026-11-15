import type { Metadata } from "next"
import { Suspense } from "react"

import { ChannelEditorFromRoute } from "../../../components/channel-editor"

export const metadata: Metadata = {
  title: "Edit alert channel",
}

export const instant = false

export default function EditAlertChannelPage() {
  return (
    <Suspense>
      <ChannelEditorFromRoute />
    </Suspense>
  )
}
