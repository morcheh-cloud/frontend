"use client"

import { usePathname } from "next/navigation"
import { type ReactNode, Suspense } from "react"

type Render = (pathname: string) => ReactNode

// With Cache Components, the pathname of a route with an unknown dynamic
// param (/servers/[id]) only exists at request time, so reading it suspends.
// The prerendered shell shows `children("")` (nav with nothing active) until
// the real pathname streams in.
export function WithPathname({ children }: { children: Render }) {
  return (
    <Suspense fallback={children("")}>
      <Read>{children}</Read>
    </Suspense>
  )
}

function Read({ children }: { children: Render }) {
  return children(usePathname())
}
