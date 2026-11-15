"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { type ReactNode, Suspense } from "react"

type Render = (pathname: string, search: URLSearchParams) => ReactNode

const noSearch = new URLSearchParams()

// With Cache Components, the pathname of a route with an unknown dynamic
// param (/servers/[id]) only exists at request time, so reading it suspends.
// The prerendered shell shows `children("")` (nav with nothing active) until
// the real pathname streams in. The query comes along for nav entries whose
// `also` paths carry one.
export function WithPathname({ children }: { children: Render }) {
  return (
    <Suspense fallback={children("", noSearch)}>
      <Read>{children}</Read>
    </Suspense>
  )
}

function Read({ children }: { children: Render }) {
  const search = useSearchParams()
  return children(usePathname(), new URLSearchParams(search.toString()))
}
