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

const IDLE_LIMIT = 2

// The player shortens pauses to IDLE_LIMIT seconds, so a moment of the
// recording (seconds from its start) sits earlier on the player's bar. Walk
// the events the way its limiter does (asciicast v2: absolute times).
export function playerTime(data: string, sec: number) {
  let prev = 0
  let shift = 0
  const lines = data.split("\n")
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("[")) continue
    const t = Number.parseFloat(line.slice(1))
    if (!Number.isFinite(t)) continue
    if (t > sec) break
    shift += Math.max(0, t - prev - IDLE_LIMIT)
    prev = t
  }
  return Math.max(0, prev - shift + Math.min(sec - prev, IDLE_LIMIT))
}

// Replays a recorded shell (asciinema-player, in our terminal colors). Long
// pauses are shortened to 2 s; the bar seeks, `space` pauses, arrows skip
// 5 seconds.
export function CastPlayer({
  id,
  version,
  phone,
  startMs,
  seek,
  className,
}: {
  id: string
  // Changes when a live recording should be loaded again.
  version: string
  phone: boolean
  // Where to start, in ms from the recording's start.
  startMs?: number
  // A jump asked for (ms from the start); `n` tells two asks apart.
  seek?: { ms: number; n: number }
  className?: string
}) {
  const cast = useCast(id, version)
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Player>(undefined)
  // Only the first player starts at `startMs`; later ones start over.
  const startRef = useRef(startMs)
  // The player reads its colors once, so a theme change makes a new one.
  const { resolved } = useTheme()

  // biome-ignore lint/correctness/useExhaustiveDependencies: `resolved` is the trigger, see above.
  useEffect(() => {
    const host = hostRef.current
    const data = cast.data
    if (!host || !data) return
    let player: Player | undefined
    let disposed = false
    const start = startRef.current
    startRef.current = undefined
    void import("asciinema-player").then(({ create }) => {
      if (disposed) return
      player = create({ data }, host, {
        theme: "morcheh",
        fit: phone ? "width" : "both",
        idleTimeLimit: IDLE_LIMIT,
        autoPlay: true,
        // On the recording's own timeline; the player maps it.
        startAt: start ? start / 1000 : undefined,
        controls: true,
        terminalFontFamily: font,
        terminalLineHeight: 1.2,
      })
      playerRef.current = player
    })
    return () => {
      disposed = true
      player?.dispose()
      if (playerRef.current === player) playerRef.current = undefined
    }
  }, [cast.data, phone, resolved])

  useEffect(() => {
    const player = playerRef.current
    if (!seek || !player || !cast.data) return
    void player
      .seek(playerTime(cast.data, seek.ms / 1000))
      .then(() => player.play())
  }, [seek, cast.data])

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
