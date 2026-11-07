import { Suspense } from "react"

import { NotesView } from "./components/notes-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function NotesPage() {
  return (
    <Suspense>
      <NotesView />
    </Suspense>
  )
}
