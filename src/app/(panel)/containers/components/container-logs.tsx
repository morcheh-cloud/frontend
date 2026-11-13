"use client"

import {
  ArrowDown,
  Clock,
  Download,
  Pause,
  Play,
  RefreshCw,
  WrapText,
} from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"

import { AnsiText, stripAnsi } from "@/components/ansi"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  DockerContainerDetails,
  DockerLogLine,
  Server,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox, Segmented } from "../../servers/[id]/components/parts"
import { useDockerLogs, useLogFollow } from "../api"
import { Quiet } from "./parts"

const tails = [100, 500, 1000, 5000] as const
const streams = ["all", "stdout", "stderr"] as const
type Stream = (typeof streams)[number]

function readStored(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === "1"
  } catch {
    return fallback
  }
}

export function useStoredFlag(key: string, fallback: boolean) {
  const [on, setOn] = useState(fallback)
  useEffect(() => setOn(readStored(key, fallback)), [key, fallback])
  return [
    on,
    (v: boolean) => {
      setOn(v)
      try {
        localStorage.setItem(key, v ? "1" : "0")
      } catch {}
    },
  ] as const
}

export function clock(t?: string) {
  if (!t) return ""
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

// The container's output: the last N lines, then live ones while following.
export function ContainerLogs({
  server,
  c,
  phone,
}: {
  server: Server
  c: DockerContainerDetails
  phone: boolean
}) {
  const [tail, setTail] = useState<number>(500)
  const [q, setQ] = useState("")
  const [stream, setStream] = useState<Stream>("all")
  const [follow, setFollow] = useState(true)
  const [wrap, setWrap] = useStoredFlag("morcheh.containers.logs.wrap", true)
  const [times, setTimes] = useStoredFlag(
    "morcheh.containers.logs.times",
    false,
  )
  const backlog = useDockerLogs(server.id, c.id, tail)
  const since = backlog.data?.lines.at(-1)?.time
  // Follow only once the backlog is in, starting after its last line.
  const live = useLogFollow(
    server.id,
    c.id,
    since,
    follow && !!backlog.data && !backlog.isPlaceholderData,
  )

  const all: DockerLogLine[] = (backlog.data?.lines ?? []).concat(live.lines)
  const needle = q.trim().toLowerCase()
  const shown = all.filter(
    (l) =>
      (stream === "all" || l.stream === stream) &&
      (!needle || stripAnsi(l.text).toLowerCase().includes(needle)),
  )
  const errors = all.filter((l) => l.stream === "stderr").length

  // Stick to the bottom while the person is there.
  const box = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const count = shown.length
  useEffect(() => {
    if (count >= 0 && atBottom && box.current)
      box.current.scrollTop = box.current.scrollHeight
  }, [count, atBottom])

  function download() {
    const text = all
      .map((l) => `${l.time ? `${l.time} ` : ""}${stripAnsi(l.text)}`)
      .join("\n")
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${c.name}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  const state = !follow
    ? "Paused"
    : live.end
      ? live.end.reason === "stopped"
        ? "Container stopped"
        : (live.end.detail ?? "Stream ended")
      : live.live
        ? "Live"
        : backlog.data
          ? "Connecting…"
          : ""

  const tailMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size={phone ? "default" : "sm"}>
            Last {tail.toLocaleString()}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={String(tail)}
          onValueChange={(v) => setTail(Number(v))}
        >
          {tails.map((t) => (
            <DropdownMenuRadioItem key={t} value={String(t)}>
              Last {t.toLocaleString()} lines
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const toggles = (
    <>
      <Button
        variant={follow ? "secondary" : "ghost"}
        size="icon"
        aria-label={follow ? "Pause" : "Follow"}
        title={follow ? "Pause the live lines" : "Follow new lines"}
        onClick={() => setFollow(!follow)}
      >
        {follow ? <Pause /> : <Play />}
      </Button>
      <Button
        variant={wrap ? "secondary" : "ghost"}
        size="icon"
        aria-pressed={wrap}
        aria-label="Wrap long lines"
        title="Wrap long lines"
        onClick={() => setWrap(!wrap)}
      >
        <WrapText />
      </Button>
      <Button
        variant={times ? "secondary" : "ghost"}
        size="icon"
        aria-pressed={times}
        aria-label="Show times"
        title="Show times"
        onClick={() => setTimes(!times)}
      >
        <Clock />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reload"
        title="Reload"
        onClick={() => backlog.refetch()}
      >
        <RefreshCw className={cn(backlog.isFetching && "animate-spin")} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Download"
        title="Download what's loaded"
        disabled={all.length === 0}
        onClick={download}
      >
        <Download />
      </Button>
    </>
  )

  const streamPicker = (
    <Segmented
      label="Output"
      items={[
        { value: "all", label: "All" },
        { value: "stdout", label: "Output" },
        {
          value: "stderr",
          label: (
            <>
              Errors
              {errors > 0 && (
                <span className="ms-1 text-muted-foreground tabular-nums">
                  {errors}
                </span>
              )}
            </>
          ),
        },
      ]}
      value={stream}
      onChange={setStream}
    />
  )

  let body: ReactNode
  if (backlog.isPending)
    body = <Skeleton className="h-[60vh] rounded-2xl max-md:rounded-none" />
  else if (backlog.isError)
    body = (
      <div className="p-4">
        <Quiet>{backlog.error.message}</Quiet>
      </div>
    )
  else
    body = (
      <div className="relative">
        <div
          ref={box}
          onScroll={(e) => {
            const el = e.currentTarget
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
          }}
          className={cn(
            "overflow-auto bg-subtle p-3 font-mono text-caption [contain:inline-size]",
            phone
              ? "h-[calc(100dvh-13rem-env(safe-area-inset-bottom))] border-y border-border"
              : "h-[calc(100dvh-15rem)] min-h-80 rounded-2xl border border-border",
          )}
        >
          {shown.length === 0 ? (
            <p className="text-muted-foreground">
              {all.length === 0 ? "Nothing printed yet." : "No lines match."}
            </p>
          ) : (
            shown.map((l, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity, only order
                key={i}
                className={cn(
                  "flex gap-3 leading-5",
                  wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre",
                  l.stream === "stderr" && "text-destructive",
                )}
              >
                {times && (
                  <span className="shrink-0 text-ash select-none">
                    {clock(l.time)}
                  </span>
                )}
                <span className="min-w-0">
                  <AnsiText text={l.text} />
                </span>
              </div>
            ))
          )}
        </div>
        {!atBottom && shown.length > 0 && (
          <Button
            size="sm"
            className="absolute end-4 bottom-4 shadow-md"
            onClick={() => setAtBottom(true)}
          >
            <ArrowDown />
            Latest
          </Button>
        )}
      </div>
    )

  const caption = (
    <span className="flex items-center gap-1.5 text-caption whitespace-nowrap text-muted-foreground">
      {follow && live.live && (
        <span className="size-1.5 animate-pulse rounded-full bg-success" />
      )}
      {state}
      {backlog.data?.truncated && <span>· older lines left out</span>}
    </span>
  )

  if (phone)
    return (
      <div className="flex flex-col gap-3 pt-3">
        <div className="flex items-center gap-2 px-4">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search the lines"
            label="Search the lines"
            className="min-w-0 flex-1"
          />
          {tailMenu}
        </div>
        <div className="flex [scrollbar-width:none] items-center gap-1 overflow-x-auto px-4">
          {streamPicker}
          {toggles}
        </div>
        <div className="px-4">{caption}</div>
        {body}
      </div>
    )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search the lines"
          label="Search the lines"
          className="w-64"
        />
        {streamPicker}
        {tailMenu}
        <span className="ms-auto">{caption}</span>
        <div className="flex items-center gap-0.5">{toggles}</div>
      </div>
      {body}
    </div>
  )
}
