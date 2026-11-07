"use client"

import "asciinema-player/dist/bundle/asciinema-player.css"

import { useQuery } from "@tanstack/react-query"
import type { Player } from "asciinema-player"
import { useEffect, useRef } from "react"

import { useTheme } from "@/components/theme"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { castUrl } from "../api"

const font =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

// The asciicast text. A finished recording never changes; a live one is
// what was saved so far, refreshed on demand (`version`).
function useCast(id: string, version: string) {
  return useQuery({
    queryKey: ["terminal-recordings", "cast", id, version],
    queryFn: async ({ signal }) => {
      const res = await fetch(castUrl(id), { credentials: "include", signal })
      if (!res.ok) {
        let detail = "Couldn't load the recording."
        try {
          detail = ((await res.json()) as { detail?: string }).detail || detail
        } catch {}
        throw new ApiError(res.status, detail)
      }
      return res.text()
    },
    staleTime: Number.POSITIVE_INFINITY,
    // Can be tens of MB: don't keep it once the page is left.
    gcTime: 30_000,
    retry: false,
  })
}

// Replays a recorded shell (asciinema-player, in our terminal colors). Long
// pauses are shortened to 2 s; the bar seeks, `space` pauses, arrows skip
// 5 seconds.
export function CastPlayer({
  id,
  version,
  phone,
  className,
}: {
  id: string
  // Changes when a live recording should be loaded again.
  version: string
  phone: boolean
  className?: string
}) {
  const cast = useCast(id, version)
  const hostRef = useRef<HTMLDivElement>(null)
  // The player reads its colors once, so a theme change makes a new one.
  const { resolved } = useTheme()

  // biome-ignore lint/correctness/useExhaustiveDependencies: `resolved` is the trigger, see above.
  useEffect(() => {
    const host = hostRef.current
    const data = cast.data
    if (!host || !data) return
    let player: Player | undefined
    let disposed = false
    void import("asciinema-player").then(({ create }) => {
      if (disposed) return
      player = create({ data }, host, {
        theme: "morcheh",
        fit: phone ? "width" : "both",
        idleTimeLimit: 2,
        autoPlay: true,
        controls: true,
        terminalFontFamily: font,
        terminalLineHeight: 1.2,
      })
    })
    return () => {
      disposed = true
      player?.dispose()
    }
  }, [cast.data, phone, resolved])

  if (cast.isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-6 text-center text-body-sm text-muted-foreground",
          className,
        )}
      >
        {cast.error.message}
      </div>
    )
  }
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {cast.isPending && <Skeleton className="absolute inset-0 rounded-none" />}
      <div ref={hostRef} className="size-full" />
    </div>
  )
}
