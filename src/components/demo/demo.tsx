"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUpRight, FlaskConical } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { authStateKey } from "@/components/auth/keys"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/useNow"
import { api } from "@/lib/api"
import type { DemoState } from "@/lib/services"

/** Where someone goes to install their own copy. */
export const getMorcheHref = "https://github.com/morcheh-cloud/morche"

/**
 * The public demo's state (`DEMO_MODE` on the backend), or undefined on a real
 * panel. Shares the sign-in page's query.
 */
export function useDemo(): DemoState | undefined {
  const state = useQuery({
    queryKey: authStateKey,
    queryFn: () => api.auth.getAuthState(),
    staleTime: 5 * 60_000,
  })
  return state.data?.demo
}

/** "23 min", "under a minute"… until the demo's next reset. */
export function untilReset(resetAt: string, now: number) {
  const ms = new Date(resetAt).getTime() - now
  if (ms <= 60_000) return "under a minute"
  const min = Math.ceil(ms / 60_000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

// A slim strip under the panel header on the public demo: says it's a
// sandbox, when it resets, and where to get Morche.
export function DemoBanner() {
  const demo = useDemo()
  const now = useNow(15_000, !!demo)
  const resetAt = demo ? new Date(demo.reset_at).getTime() : 0
  const passed = !!demo && now >= resetAt

  // After a reset the session is gone: the next request lands on the sign-in
  // page, which enters the demo again. Read the next reset time meanwhile.
  const queryClient = useQueryClient()
  useEffect(() => {
    if (passed) void queryClient.invalidateQueries({ queryKey: authStateKey })
  }, [passed, queryClient])

  if (!demo) return null
  const soon = resetAt - now < 5 * 60_000

  return (
    <div className="border-b border-brand/20 bg-brand-soft px-4 py-2 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <FlaskConical className="size-4 shrink-0 text-brand-strong" />
        <p className="min-w-0 flex-1 text-body-sm text-brand-strong">
          <span className="font-medium">Live demo.</span>{" "}
          <span className="max-md:hidden">
            Try anything: the servers are throwaway, and everything goes back to
            how it was{" "}
          </span>
          <span className="md:hidden">Resets </span>
          {passed ? (
            "right now."
          ) : (
            <>
              in{" "}
              <span className={soon ? "font-medium" : undefined}>
                {untilReset(demo.reset_at, now)}
              </span>
              .
            </>
          )}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-brand-strong hover:bg-brand/10 hover:text-brand-strong"
          nativeButton={false}
          render={
            <Link href={getMorcheHref} target="_blank" rel="noopener">
              <span className="max-md:hidden">Install your own</span>
              <span className="md:hidden">Install</span>
              <ArrowUpRight />
            </Link>
          }
        />
      </div>
    </div>
  )
}
