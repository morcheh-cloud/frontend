import type { Metadata } from "next"
import { Suspense } from "react"

import { ServerShell } from "./components/server-shell"

export const metadata: Metadata = {
  title: "Server",
}

// Every page of one server, framed by its header and section nav. The id is
// only known at request time, so reading it needs a Suspense boundary.
export default function ServerLayout({
  children,
}: LayoutProps<"/servers/[id]">) {
  return (
    <Suspense>
      <ServerShell>{children}</ServerShell>
    </Suspense>
  )
}
