import type { Metadata } from "next"
import { Suspense } from "react"

import { AccountView } from "./components/account-view"

export const metadata: Metadata = { title: "Account" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function AccountPage() {
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  )
}
