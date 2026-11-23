import type { Metadata } from "next"
import { Suspense } from "react"

import { RegistriesView } from "./components/registries-view"

export const metadata: Metadata = { title: "Package registries" }

export const instant = false

export default function RegistriesPage() {
  return (
    <Suspense>
      <RegistriesView />
    </Suspense>
  )
}
