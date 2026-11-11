import type { Metadata } from "next"

import { SecuritySettingsPage } from "../components/security"

export const metadata: Metadata = { title: "Security" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function SecurityPage() {
  return <SecuritySettingsPage />
}
