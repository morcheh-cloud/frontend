"use client"

import { Download, Loader2, Radio, RefreshCw, ScrollText } from "lucide-react"
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import type { LogEntry, Service } from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox, Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { Picker } from "../../users/components/fields"
import { type LogQuery, useLogStream, useServiceLogs } from "../api"
import { priorities, shortName, sinces } from "./meta"

type Priority = (typeof priorities)[number]["value"]

const MAX_LINES = 5000

// A unit's journal: the latest lines, filtered by level and time, and new
// ones as they're written while Live is on.
export function ServiceLogs({
  service: s,
  active,
}: {
  service: Service
  active: boolean
}) {
  const { server, phone } = useServerPage()
  const [priority, setPriority] = useState<Priority>("7")
  const [since, setSince] = useState<LogQuery["since"]>("")
  const [lines, setLines] = useState(300)
  const [follow, setFollow] = useState(false)
  const [filter, setFilter] = useState("")
  const q: LogQuery = { lines, priority: Number(priority), since }
  const query = useServiceLogs(server.id, s.name, q, active)
  const logs = query.data
  const loaded = logs?.entries
  const after = loaded?.at(-1)?.cursor ?? ""
  const stream = useLogStream(
    server.id,
    s.name,
    after,
    q.priority,
    follow &&
      active &&
      logs?.source === "journal" &&
      !query.isPlaceholderData &&
      !query.isFetching,
  )

  const all = useMemo(
    () => [...(loaded ?? []), ...stream.entries],
    [loaded, stream.entries],
  )
  const needle = filter.trim().toLowerCase()
  const shown = needle
    ? all.filter(
        (e) =>
          e.message.toLowerCase().includes(needle) ||
          e.ident?.toLowerCase().includes(needle),
      )
    : all

  // Keep the newest line in view, unless the reader scrolled up.
  const box = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the lines change
  useLayoutEffect(() => {
    const el = box.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [shown.length, loaded])

  // A new query starts at the bottom again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on filter change
  useEffect(() => {
    stick.current = true
  }, [priority, since])

  const more = loaded && loaded.length >= lines && lines < MAX_LINES
  const busy = query.isFetching

  function download() {
    const text = all.map((e) => `${e.time} ${lineHead(e)}${e.message}`)
    const blob = new Blob([`${text.join("\n")}\n`], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${shortName(s.name)}-${new Date().toISOString().slice(0, 19)}.log`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const level = (
    <Segmented
      label="Level"
      items={priorities}
      value={priority}
      onChange={setPriority}
    />
  )
  const time = (
    <div className="w-36 shrink-0">
      <Picker
        items={[...sinces]}
        value={since}
        onChange={(v) => {
          setSince(v as LogQuery["since"])
          setLines(300)
        }}
      />
    </div>
  )
  const live = (
    <Button
      variant="outline"
      aria-pressed={follow}
      className="aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-11 md:h-9"
      disabled={logs?.source === "none"}
      onClick={() => {
        stick.current = true
        setFollow((f) => !f)
      }}
      title="Show new lines as they're written"
    >
      {follow && stream.live ? (
        <span className="size-2 rounded-full bg-success" aria-hidden />
      ) : (
        <Radio />
      )}
      Live
    </Button>
  )
  const actions = (
    <>
      <Button
        variant="outline"
        size="icon"
        className="max-md:size-11 md:size-9"
        aria-label="Download"
        title="Download what's shown"
        disabled={all.length === 0}
        onClick={download}
      >
        <Download />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="max-md:size-11 md:size-9"
        aria-label="Refresh"
        title="Refresh"
        disabled={busy}
        onClick={() => query.refetch()}
      >
        <RefreshCw className={cn(busy && "animate-spin")} />
      </Button>
    </>
  )
  const search = (
    <SearchBox
      value={filter}
      onChange={setFilter}
      placeholder="Filter lines"
      label="Filter log lines"
      className="min-w-0 flex-1 md:w-auto md:max-w-60"
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {phone ? (
        <div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {search}
            {actions}
          </div>
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            {live}
            {level}
            {time}
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-6 py-3">
          {level}
          {time}
          {search}
          <span className="flex-1" />
          {live}
          {actions}
        </div>
      )}

      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
        className="min-h-0 flex-1 overflow-auto bg-subtle py-2 font-mono text-caption leading-relaxed"
      >
        {!logs ? (
          <Placeholder>
            {query.error ? (
              <span role="alert">{query.error.message}</span>
            ) : (
              <>
                <Loader2 className="size-4 animate-spin" />
                Reading the journal…
              </>
            )}
          </Placeholder>
        ) : logs.source === "none" ? (
          <Placeholder>
            <ScrollText className="size-4" />
            {logs.note || "This server keeps no journal for it."}
          </Placeholder>
        ) : (
          <>
            {more && (
              <div className="px-4 pb-2 md:px-6">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    stick.current = false
                    setLines((n) => Math.min(MAX_LINES, n + 1000))
                  }}
                >
                  Load older lines
                </Button>
              </div>
            )}
            {shown.length === 0 ? (
              <Placeholder>
                {needle
                  ? "No line matches the filter."
                  : since
                    ? "Nothing logged in that time."
                    : "Nothing logged yet."}
              </Placeholder>
            ) : (
              <ol>
                {shown.map((e) => (
                  <Line key={e.cursor || `${e.time}-${e.message}`} entry={e} />
                ))}
              </ol>
            )}
            {stream.problem && (
              <p className="px-4 pt-2 text-destructive md:px-6">
                Live stopped: {stream.problem.detail}
              </p>
            )}
          </>
        )}
      </div>
      {logs?.note && logs.source === "journal" && (
        <p className="shrink-0 border-t border-border px-4 py-2 text-caption text-ash md:px-6">
          {logs.note}
        </p>
      )}
    </div>
  )
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-16 text-center font-sans text-body-sm text-muted-foreground">
      {children}
    </div>
  )
}

function lineHead(e: LogEntry) {
  return e.ident ? `${e.ident}${e.pid ? `[${e.pid}]` : ""}: ` : ""
}

const today = () => new Date().toDateString()

function stamp(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const time = d.toLocaleTimeString("en-GB", { hour12: false })
  return d.toDateString() === today()
    ? time
    : `${d.toLocaleDateString("en", { month: "short", day: "numeric" })} ${time}`
}

function Line({ entry: e }: { entry: LogEntry }) {
  return (
    <li
      className={cn(
        "flex gap-3 px-4 hover:bg-muted md:px-6",
        e.priority <= 3 && "text-destructive",
        e.priority === 4 && "text-warning",
        e.priority === 7 && "text-muted-foreground",
      )}
    >
      <time
        dateTime={e.time}
        title={new Date(e.time).toLocaleString()}
        className="shrink-0 text-ash tabular-nums select-none"
      >
        {stamp(e.time)}
      </time>
      <span className="min-w-0 break-words whitespace-pre-wrap">
        {e.ident && <span className="text-ash">{lineHead(e)}</span>}
        {e.message}
      </span>
    </li>
  )
}
