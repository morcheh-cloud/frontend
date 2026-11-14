import type { Metadata } from "next"
import { Suspense } from "react"

import { NewMachine } from "../components/new-machine"

export const metadata: Metadata = {
  title: "New machine",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function NewMachinePage() {
  return (
    <Suspense>
      <NewMachine />
    </Suspense>
  )
}
