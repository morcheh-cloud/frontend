"use client"

import {
  ArrowDown,
  Clock,
  Copy,
  Download,
  Pause,
  Play,
  RefreshCw,
  WrapText,
} from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

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
import type { DockerProjectLogLine } from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox, Segmented } from "../../servers/[id]/components/parts"
import { useProjectLogFollow, useProjectLogs } from "../api"
import { clock, useStoredFlag } from "./container-logs"
import { Quiet } from "./parts"

const tails = [200, 500, 1000, 2000, 5000] as const
type Stream = "all" | "stdout" | "stderr"

// Every container of a project in one log, merged by time: the last N lines,
// then live ones. `service` = show only that service ("" = all of them).
export function ProjectLogs({
  serverId,
  project,
  services,
  service,
  onService,
  phone,
}: {
  serverId: string
  project: string
  services: string[]
  service: string
  onService: (s: string) => void
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
  const backlog = useProjectLogs(serverId, project, tail)
  const since = backlog.data?.lines.at(-1)?.time
  const live = useProjectLogFollow(
    serverId,
    project,
    since,
    follow && !!backlog.data && !backlog.isPlaceholderData,
  )

  const all: DockerProjectLogLine[] = (backlog.data?.lines ?? []).concat(
    live.lines,
  )
  // Services that printed something, plus the compose file's own list.
  const names = Array.from(
    new Set([...services, ...all.map((l) => l.service)].filter(Boolean)),
  ).sort()
  const counts = new Map<string, number>()
  for (const l of all) counts.set(l.service, (counts.get(l.service) ?? 0) + 1)
  const needle = q.trim().toLowerCase()
  const scoped = service ? all.filter((l) => l.service === service) : all
  const shown = scoped.filter(
    (l) =>
      (stream === "all" || l.stream === stream) &&
      (!needle ||
        stripAnsi(l.text).toLowerCase().includes(needle) ||
        l.container.toLowerCase().includes(needle)),
  )
  const errors = scoped.filter((l) => l.stream === "stderr").length
  const width = Math.min(18, Math.max(4, ...names.map((n) => n.length)))

  // Stick to the bottom while the person is there.
  const box = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const count = shown.length
  useEffect(() => {
    if (count >= 0 && atBottom && box.current)
      box.current.scrollTop = box.current.scrollHeight
  }, [count, atBottom])

  const plain = (lines: DockerProjectLogLine[]) =>
    lines
      .map(
        (l) =>
          `${l.time ? `${l.time} ` : ""}${l.service || l.container} | ${stripAnsi(l.text)}`,
      )
      .join("\n")

  function download() {
    const url = URL.createObjectURL(
      new Blob([plain(shown)], { type: "text/plain" }),
    )
    const a = document.createElement("a")
    a.href = url
    a.download = `${project}${service ? `-${service}` : ""}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copy() {
    navigator.clipboard
      ?.writeText(plain(shown))
      .then(() => toast.success(`Copied ${shown.length} lines`))
      .catch(() => toast.error("Couldn't copy"))
  }

  const state = !follow
    ? "Paused"
    : live.end
      ? live.end.reason === "stopped"
        ? "Every container stopped · waiting for new ones"
        : (live.end.detail ?? "Stream ended · trying again")
      : live.live
        ? "Live"
        : backlog.data
          ? "Connecting…"
          : ""

  const tailMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={phone ? "default" : "sm"}
            className={cn(phone && "h-11")}
          >
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

  const icon = (
    on: boolean,
    label: string,
    run: () => void,
    node: ReactNode,
    disabled = false,
  ) => (
    <Button
      variant={on ? "secondary" : "ghost"}
      size="icon"
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={run}
      className={cn(phone && "size-11")}
    >
      {node}
    </Button>
  )

  const toggles = (
    <>
      {icon(
        follow,
        follow ? "Pause the live lines" : "Follow new lines",
        () => setFollow(!follow),
        follow ? <Pause /> : <Play />,
      )}
      {icon(wrap, "Wrap long lines", () => setWrap(!wrap), <WrapText />)}
      {icon(times, "Show times", () => setTimes(!times), <Clock />)}
      {icon(
        false,
        "Reload",
        () => backlog.refetch(),
        <RefreshCw className={cn(backlog.isFetching && "animate-spin")} />,
      )}
      {icon(false, "Copy the lines shown", copy, <Copy />, shown.length === 0)}
      {icon(
        false,
        "Download the lines shown",
        download,
        <Download />,
        shown.length === 0,
      )}
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

  // One chip per service; the count = its lines loaded.
  const chips = names.length > 1 && (
    <div
      className={cn(
        "flex [scrollbar-width:none] items-center gap-1.5 overflow-x-auto",
        phone ? "px-4" : "flex-wrap",
      )}
    >
      {["", ...names].map((n) => (
        <button
          key={n || "all"}
          type="button"
          aria-pressed={service === n}
          onClick={() => onService(n)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-body-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            phone ? "h-9" : "h-7",
            service === n
              ? "border-brand bg-brand-soft text-brand-strong"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {n || "Every service"}
          <span className="text-caption tabular-nums opacity-70">
            {n ? (counts.get(n) ?? 0) : all.length}
          </span>
        </button>
      ))}
    </div>
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
              ? "h-[calc(100dvh-18rem-env(safe-area-inset-bottom))] min-h-80 border-y border-border"
              : "h-[calc(100dvh-19rem)] min-h-96 rounded-2xl border border-border",
          )}
        >
          {shown.length === 0 ? (
            <p className="text-muted-foreground">
              {all.length === 0
                ? "Nothing printed yet."
                : scoped.length === 0
                  ? `${service} hasn't printed anything in these lines.`
                  : "No lines match."}
            </p>
          ) : (
            shown.map((l, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity, only order
                key={i}
                className={cn(
                  "flex gap-3 leading-5",
                  wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre",
                )}
              >
                {times && (
                  <span className="shrink-0 text-ash select-none">
                    {clock(l.time)}
                  </span>
                )}
                {!service && (
                  <button
                    type="button"
                    title={`${l.container}: show only ${l.service}`}
                    onClick={() => onService(l.service)}
                    style={{ width: `${width}ch` }}
                    className="shrink-0 truncate text-start text-muted-foreground outline-none select-none hover:text-brand hover:underline focus-visible:text-brand"
                  >
                    {l.service || l.container}
                  </button>
                )}
                <span
                  className={cn(
                    "min-w-0",
                    l.stream === "stderr" && "text-destructive",
                  )}
                >
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
      {(backlog.data?.containers.length ?? 0) > 0 && (
        <span>
          · {backlog.data?.containers.length}{" "}
          {backlog.data?.containers.length === 1 ? "container" : "containers"}
        </span>
      )}
    </span>
  )

  if (phone)
    return (
      <div className="-mx-4 flex flex-col gap-3">
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
        {chips}
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
      {chips}
      {body}
    </div>
  )
}
