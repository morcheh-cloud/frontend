import { Suspense } from "react"

import { HardwareTab } from "../components/hardware-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <HardwareTab />
    </Suspense>
  )
}
