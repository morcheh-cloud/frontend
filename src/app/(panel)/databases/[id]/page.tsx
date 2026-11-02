import type { Metadata } from "next"
import { Suspense } from "react"

import { DatabasePageView } from "./components/database-page"

export const metadata: Metadata = {
  title: "Database",
}

// Waits on the database loaded in the browser: skip instant-navigation checks.
export const instant = false

// The id is only known at request time, so reading it needs a Suspense
// boundary; the open tab lives in the URL too.
export default function DatabaseDetailPage() {
  return (
    <Suspense>
      <DatabasePageView />
    </Suspense>
  )
}
