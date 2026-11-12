import type { Metadata } from "next"
import { Suspense } from "react"

import { RegistriesPage } from "../components/registries-view"

export const metadata: Metadata = {
  title: "Registries",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <RegistriesPage />
    </Suspense>
  )
}
