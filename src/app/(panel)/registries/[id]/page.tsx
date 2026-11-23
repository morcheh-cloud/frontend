import type { Metadata } from "next"
import { Suspense } from "react"

import { RegistryFromRoute } from "../components/registry-page"

export const metadata: Metadata = { title: "Package registry" }

export const instant = false

export default function RegistryRoutePage() {
  return (
    <Suspense>
      <RegistryFromRoute />
    </Suspense>
  )
}
