import type { Metadata } from "next"
import { Suspense } from "react"

import { AccountPageView } from "./components/account-page"

export const metadata: Metadata = {
  title: "Cloud account",
}

// Waits on the account loaded in the browser: skip instant-navigation checks.
export const instant = false

// The id is only known at request time, so reading it needs Suspense.
export default function CloudAccountPage() {
  return (
    <Suspense>
      <AccountPageView />
    </Suspense>
  )
}
