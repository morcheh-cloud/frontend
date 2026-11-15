import type { Metadata } from "next"
import { Suspense } from "react"

import { AnsibleView } from "../components/ansible-view"

export const metadata: Metadata = {
  title: "Ansible runs",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function AnsibleRunsPage() {
  return (
    <Suspense>
      <AnsibleView />
    </Suspense>
  )
}
