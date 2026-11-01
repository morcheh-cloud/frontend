import { Suspense } from "react"

import { TerminalWorkspace } from "./components/terminal-workspace"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function TerminalPage() {
  return (
    <Suspense>
      <TerminalWorkspace />
    </Suspense>
  )
}
