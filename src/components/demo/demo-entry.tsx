"use client"

import { useMutation } from "@tanstack/react-query"
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api"
import type { PanelUser } from "@/lib/services"

// The sign-in page's one button on the public demo: signs in as the shared
// demo account. `auto` presses it on arrival.
export function DemoEntry({
  auto,
  onDone,
}: {
  auto: boolean
  onDone: (user: PanelUser) => void
}) {
  const enter = useMutation({
    mutationFn: () => api.auth.authDemo(),
    onSuccess: onDone,
  })

  const tried = useRef(false)
  useEffect(() => {
    if (!auto || tried.current) return
    tried.current = true
    enter.mutate()
  }, [auto, enter])

  const error = enter.error
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-body-sm text-foreground"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          {error instanceof ApiError
            ? error.message
            : "Couldn't reach the demo. Check your connection and try again."}
        </p>
      )}
      <Button
        size="lg"
        className="w-full"
        disabled={enter.isPending || enter.isSuccess}
        onClick={() => enter.mutate()}
      >
        {enter.isPending || enter.isSuccess ? (
          <LoaderCircle className="animate-spin" />
        ) : null}
        Enter the live demo
        {!enter.isPending && !enter.isSuccess && <ArrowRight />}
      </Button>
    </div>
  )
}
