import type { Metadata } from "next"
import { Suspense } from "react"

import { GuestShellFromRoute } from "./components/guest-page"

export const metadata: Metadata = {
  title: "Virtual machine",
}

// Every tab of one machine, framed by its header and tab bar. The ids are only
// known at request time, so reading them needs a Suspense boundary.
export default function GuestLayout({
  children,
}: LayoutProps<"/vms/[cluster]/[vmid]">) {
  return (
    <Suspense>
      <GuestShellFromRoute>{children}</GuestShellFromRoute>
    </Suspense>
  )
}
