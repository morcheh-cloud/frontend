import type { Metadata } from "next"

import { GeneralSettings } from "./components/general"

export const metadata: Metadata = { title: "Settings" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function SettingsPage() {
  return <GeneralSettings />
}
