"use client"

import { json } from "@codemirror/lang-json"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import {
  ChevronLeft,
  CircleStop,
  Container as ContainerIcon,
  Download,
  Ellipsis,
  Play,
  RotateCw,
  SquareTerminal,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { type ReactNode, useEffect } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { useCodeTheme } from "@/components/code-theme"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { DockerContainerDetails, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  ItemMenu,
  type Note,
  Notices,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { useServer } from "../../servers/api"
import { timeAgo } from "../../servers/components/meta"
import { useDockerContainer, useDockerInspect } from "../api"
import { setDockerEnv } from "../env"
import { ContainerLogs } from "./container-logs"
import { ContainerStats } from "./container-stats"
import { useContainerMenu, useDockerActions } from "./docker-actions"
import {
  ContainerState,
  type ContainerTab,
  containerHref,
  containerTabs,
  dockerHref,
  healthMeta,
  imageName,
  portText,
  shortId,
  useContainerTab,
} from "./meta"
import { Block, CopyButton, Pairs, Quiet } from "./parts"
import { type DockerCan, useDockerCan } from "./permissions"

const tabLabels: Record<ContainerTab, string> = {
  overview: "Overview",
  logs: "Logs",
  stats: "Live stats",
  inspect: "Inspect",
}

// Same tabs as a server page's.
const tabClass =
  "relative flex h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground hover:after:bg-mist focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:bg-brand"

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

type Ctx = {
  server: Server
  c: DockerContainerDetails
  can: DockerCan
  phone: boolean
}

// /containers/[server]/[container]: one container, by name (or ID).
export function ContainerPage() {
  const params = useParams<{ server: string; container: string }>()
  const name = decodeURIComponent(params.container)
  const server = useServer(params.server)
  const query = useDockerContainer(params.server, name)
  const phone = useIsPhone()
  const s = server.data
  const c = query.data

  usePageCrumbs(
    s
      ? [
          { href: dockerHref(s.id), label: s.name },
          { href: containerHref(s.id, name), label: name },
        ]
      : [],
  )
  useFollowWorkspace(s?.workspace_id)
  // The sidebar's environment follows the container being looked at.
  const sid = s?.id
  useEffect(() => {
    if (sid) setDockerEnv(sid)
  }, [sid])

  if (phone === null) return null
  const error = server.error ?? (c ? null : query.error)
  if (error) {
    const gone = error instanceof ApiError && error.status === 404
    return (
      <Empty
        icon={ContainerIcon}
        title={gone ? "Container not found" : "Couldn't load the container"}
        body={
          gone
            ? "It was removed or renamed, or you don't have access to it."
            : error.message
        }
        className="mt-10"
        action={
          <Button
            variant="outline"
            render={<Link href={dockerHref(params.server)} />}
            nativeButton={false}
          >
            Back to the containers
          </Button>
        }
      />
    )
  }
  if (!s || !c) {
    return (
      <div className="flex flex-col gap-4 px-6 pt-5 max-md:px-4">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }
  return <Page server={s} c={c} phone={phone} />
}

function Page({
  server,
  c,
  phone,
}: {
  server: Server
  c: DockerContainerDetails
  phone: boolean
}) {
  const can = useDockerCan(server.id, server.workspace_id)
  const ctx: Ctx = { server, c, can, phone }
  return phone ? <PhonePage ctx={ctx} /> : <DesktopPage ctx={ctx} />
}

function title(c: DockerContainerDetails) {
  return c.name
}

function useTabs(can: DockerCan) {
  const [{ tab }, set] = useContainerTab()
  // As the backend: logs need Operator, inspect Engineer (it carries the
  // environment values); everyone sees the overview and live numbers.
  const shown = containerTabs.filter(
    (t) => (t !== "logs" || can.operate) && (t !== "inspect" || can.manage),
  )
  const current = shown.includes(tab) ? tab : "overview"
  return {
    shown,
    current,
    setTab: (t: ContainerTab) => set({ tab: t === "overview" ? null : t }),
  }
}

function QuickActions({ ctx }: { ctx: Ctx }) {
  const { server, c, can } = ctx
  const a = useDockerActions()
  if (!can.operate) return null
  const busy = a.busy.has(c.id)
  const running = c.state === "running"
  return (
    <>
      {running ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => a.run(server.id, c, "stop")}
        >
          <CircleStop />
          Stop
        </Button>
      ) : c.state !== "paused" ? (
        <Button disabled={busy} onClick={() => a.run(server.id, c, "start")}>
          <Play />
          Start
        </Button>
      ) : null}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => a.run(server.id, c, "restart")}
      >
        <RotateCw className={cn(busy && "animate-spin")} />
        Restart
      </Button>
    </>
  )
}

function DesktopPage({ ctx }: { ctx: Ctx }) {
  const { server, c, can } = ctx
  const menu = useContainerMenu(server.id, c, can, { details: false })
  const tabs = useTabs(can)
  return (
    <div className="flex flex-col pb-24">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <ContainerIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">{title(c)}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <ContainerState c={c} className="text-foreground" />
            <span className="truncate">{imageName(c.image)}</span>
            {c.project && (
              <span>
                {c.project}
                {c.service && ` › ${c.service}`}
              </span>
            )}
            <span>on {server.name}</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <QuickActions ctx={ctx} />
          {can.manage && c.state === "running" && (
            <ShellButton server={server} c={c} />
          )}
          <ItemMenu groups={menu} label="Container actions" />
        </div>
      </div>
      <nav
        aria-label="Container sections"
        className="sticky top-[calc(3rem+1px)] z-20 flex items-center gap-1 border-b border-border bg-background/90 px-4 backdrop-blur-md"
      >
        {tabs.shown.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={tabs.current === t ? "page" : undefined}
            onClick={() => tabs.setTab(t)}
            className={tabClass}
          >
            {tabLabels[t]}
          </button>
        ))}
      </nav>
      <div className="@container px-6 pt-5">
        <TabBody ctx={ctx} tab={tabs.current} />
      </div>
    </div>
  )
}

// No shell into a container yet: the server's terminal, with the command to
// copy.
function ShellButton({
  server,
  c,
}: {
  server: Server
  c: DockerContainerDetails
}) {
  const cmd = `docker exec -it ${c.name} sh`
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Open the server's terminal"
      title={`Open the server's terminal (then: ${cmd})`}
      render={<Link href={`/servers/${server.id}/terminal`} />}
      nativeButton={false}
      onClick={() => navigator.clipboard?.writeText(cmd).catch(() => {})}
    >
      <SquareTerminal />
    </Button>
  )
}

function PhonePage({ ctx }: { ctx: Ctx }) {
  const { server, c, can } = ctx
  const back = useBack("/containers/list")
  const [open, setOpen] = useOpen("container-page-sheet")
  const menu = useContainerMenu(server.id, c, can, {
    details: false,
    terminal: `/servers/${server.id}/terminal`,
  })
  const tabs = useTabs(can)
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-12 items-center gap-1 px-1">
          <div className="flex w-22 shrink-0">
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className={barButton}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" />
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-body font-medium">{title(c)}</h1>
            <p className="flex items-center justify-center truncate text-caption text-muted-foreground">
              <ContainerState c={c} />
            </p>
          </div>
          <HelpButton href={guideHref("containers")} label="Containers guide" />
          <button
            type="button"
            aria-label="Container actions"
            onClick={() => setOpen(true)}
            className={barButton}
          >
            <Ellipsis className="size-5" />
          </button>
        </div>
        <nav
          aria-label="Container sections"
          className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-2.5"
        >
          {tabs.shown.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={tabs.current === t ? "page" : undefined}
              onClick={() => tabs.setTab(t)}
              className="flex h-9 shrink-0 items-center rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-medium aria-[current=page]:text-background"
            >
              {tabLabels[t]}
            </button>
          ))}
        </nav>
      </header>
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <TabBody ctx={ctx} tab={tabs.current} />
      </div>
      <BottomSheet open={open} onOpenChange={setOpen} title={c.name}>
        <SheetItems groups={menu} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

function TabBody({ ctx, tab }: { ctx: Ctx; tab: ContainerTab }) {
  switch (tab) {
    case "logs":
      return <ContainerLogs server={ctx.server} c={ctx.c} phone={ctx.phone} />
    case "stats":
      return <ContainerStats server={ctx.server} c={ctx.c} phone={ctx.phone} />
    case "inspect":
      return <InspectTab ctx={ctx} />
    default:
      return <OverviewTab ctx={ctx} />
  }
}

// --- Overview --------------------------------------------------------------

function list(xs: string[]) {
  return xs.length ? xs.join(" ") : ""
}

function OverviewTab({ ctx }: { ctx: Ctx }) {
  const { server, c, phone } = ctx
  const notes: Note[] = []
  if (c.oom_killed)
    notes.push({
      key: "oom",
      title: "It ran out of memory",
      body: "The kernel stopped it for using more memory than it may. Raise its memory limit, or find what grows.",
      warn: true,
    })
  if (c.error)
    notes.push({
      key: "error",
      title: "Docker says",
      body: c.error,
      warn: true,
    })
  if (c.health === "unhealthy")
    notes.push({
      key: "health",
      title: `Its health check fails${c.health_failing ? ` (${c.health_failing} in a row)` : ""}`,
      body: c.health_log.at(-1)?.output.trim() || undefined,
      warn: true,
    })
  if (c.restart_count > 3 && c.state !== "running")
    notes.push({
      key: "restarts",
      title: `Restarted ${c.restart_count} times`,
      body: "It keeps stopping. Its logs usually say why.",
      warn: true,
    })

  const published = c.ports.filter((p) => p.public)
  return (
    <div className={cn("flex flex-col gap-6", phone && "px-4 pt-4")}>
      <Notices notes={notes} className="max-md:mt-0" />
      <div className="grid grid-cols-1 gap-6 @5xl:grid-cols-2">
        <Block title="About">
          <Pairs
            rows={[
              { label: "Image", value: c.image, mono: true },
              {
                label: "ID",
                value: (
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-caption">
                      {shortId(c.id)}
                    </span>
                    <CopyButton value={c.id} label="Copy the ID" />
                  </span>
                ),
              },
              { label: "Status", value: c.status },
              { label: "Created", value: timeAgo(c.created) },
              {
                label: "Started",
                value:
                  c.started_at && !c.started_at.startsWith("0001")
                    ? timeAgo(c.started_at)
                    : "",
              },
              {
                label: "Restart policy",
                value: c.restart_policy
                  ? `${c.restart_policy}${c.restart_max ? ` (max ${c.restart_max})` : ""}`
                  : "",
              },
              {
                label: "Restarts",
                value: c.restart_count ? String(c.restart_count) : "",
              },
              {
                label: "Project",
                value: c.project
                  ? `${c.project}${c.service ? ` › ${c.service}` : ""}`
                  : "",
              },
              { label: "Compose folder", value: c.compose_dir, mono: true },
              { label: "Command", value: list(c.command), mono: true },
              { label: "Entrypoint", value: list(c.entrypoint), mono: true },
              { label: "Working folder", value: c.working_dir, mono: true },
              { label: "User", value: c.user },
              { label: "Hostname", value: c.hostname },
              { label: "PID", value: c.pid ? String(c.pid) : "" },
              {
                label: "Disk",
                value: c.size_rw
                  ? `${formatSize(c.size_rw)} written (${formatSize(c.size_root_fs)} with the image)`
                  : "",
              },
            ]}
          />
        </Block>
        <div className="flex flex-col gap-6">
          <Block title="Ports">
            {published.length === 0 ? (
              <Quiet>
                {c.ports.length
                  ? `Not published to the server: ${c.ports.map(portText).join(", ")}`
                  : "No ports."}
              </Quiet>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border text-body-sm">
                {published.map((p) => {
                  const href =
                    p.protocol === "tcp"
                      ? `${p.public === 443 ? "https" : "http"}://${server.host}:${p.public}`
                      : null
                  return (
                    <li
                      key={`${p.ip}-${p.public}-${p.protocol}`}
                      className="flex min-h-11 items-center gap-3 px-3 py-2"
                    >
                      <span className="font-mono text-caption">
                        {portText(p)}
                      </span>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="ms-auto text-caption text-brand hover:underline"
                        >
                          Open
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Block>
          <Block title="Networks">
            {c.endpoints.length === 0 ? (
              <Quiet>
                {c.network_mode
                  ? `Network mode: ${c.network_mode}`
                  : "Not on a network."}
              </Quiet>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border text-body-sm">
                {c.endpoints.map((e) => (
                  <li key={e.network_id} className="flex flex-col px-3 py-2">
                    <span className="font-medium">{e.network}</span>
                    <span className="font-mono text-caption text-muted-foreground">
                      {[
                        e.ip &&
                          `${e.ip}${e.prefix_len ? `/${e.prefix_len}` : ""}`,
                        e.gateway && `via ${e.gateway}`,
                        e.aliases.length > 0 && `as ${e.aliases.join(", ")}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <Block title="Storage">
            {c.mounts.length === 0 ? (
              <Quiet>Nothing mounted: its files go when it's removed.</Quiet>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border text-body-sm">
                {c.mounts.map((m) => (
                  <li key={m.destination} className="flex flex-col px-3 py-2">
                    <span className="font-mono text-caption">
                      {m.destination}
                      {!m.rw && (
                        <span className="ms-2 font-sans text-ash">
                          read-only
                        </span>
                      )}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {m.type === "volume"
                        ? `Volume ${m.name ?? ""}`
                        : `${m.type} ${m.source ?? ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
        <Block title="Limits">
          <Pairs
            rows={[
              { label: "CPUs", value: c.cpus ? String(c.cpus) : "No limit" },
              { label: "CPU set", value: c.cpuset },
              {
                label: "Memory",
                value: c.memory_limit ? formatSize(c.memory_limit) : "No limit",
              },
              {
                label: "Reserved",
                value: c.memory_reservation
                  ? formatSize(c.memory_reservation)
                  : "",
              },
              {
                label: "Processes",
                value: c.pids_limit > 0 ? String(c.pids_limit) : "",
              },
              { label: "Privileged", value: c.privileged ? "Yes" : "" },
              { label: "Read-only root", value: c.read_only ? "Yes" : "" },
              { label: "Added rights", value: c.cap_add.join(", ") },
              { label: "Dropped rights", value: c.cap_drop.join(", ") },
              {
                label: "Devices",
                value: c.devices
                  .map((d) => `${d.host} → ${d.container}`)
                  .join(", "),
              },
              {
                label: "Logging",
                value: [
                  c.log_driver,
                  ...Object.entries(c.log_options).map(([k, v]) => `${k}=${v}`),
                ]
                  .filter(Boolean)
                  .join(" · "),
              },
            ]}
          />
        </Block>
        <EnvBlock c={c} />
        {(c.health || c.health_test.length > 0) && <HealthBlock c={c} />}
        {Object.keys(c.labels).length > 0 && (
          <Block title={`Labels · ${Object.keys(c.labels).length}`}>
            <Pairs
              rows={Object.entries(c.labels)
                .sort(([x], [y]) => x.localeCompare(y))
                .map(([k, v]) => ({ label: k, value: v, mono: true }))}
              className="[&_dt]:w-auto [&_dt]:max-w-[45%] [&_dt]:font-mono [&_dt]:text-caption [&_dt]:break-all"
            />
          </Block>
        )}
      </div>
    </div>
  )
}

function EnvBlock({ c }: { c: DockerContainerDetails }) {
  return (
    <Block title={`Environment${c.env.length ? ` · ${c.env.length}` : ""}`}>
      {c.env_hidden ? (
        <Quiet>
          Values are hidden: reading them needs Engineer access to the server.
        </Quiet>
      ) : c.env.length === 0 ? (
        <Quiet>No variables.</Quiet>
      ) : (
        <Pairs
          rows={c.env.map((e) => ({
            label: e.name,
            value: e.value,
            mono: true,
          }))}
          className="[&_dt]:w-auto [&_dt]:max-w-[45%] [&_dt]:font-mono [&_dt]:text-caption [&_dt]:break-all"
        />
      )}
    </Block>
  )
}

function HealthBlock({ c }: { c: DockerContainerDetails }) {
  const meta = c.health ? healthMeta[c.health] : null
  return (
    <Block
      title="Health check"
      aside={
        meta && (
          <span className="text-caption text-muted-foreground">
            {meta.label}
          </span>
        )
      }
    >
      {c.health_test.length > 0 && (
        <p className="rounded-xl border border-border px-3 py-2 font-mono text-caption break-all">
          {c.health_test.join(" ")}
        </p>
      )}
      {c.health_log.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border text-body-sm">
          {[...c.health_log].reverse().map((h) => (
            <li key={h.start} className="flex flex-col gap-0.5 px-3 py-2">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium",
                    h.exit_code === 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {h.exit_code === 0 ? "Passed" : `Failed (${h.exit_code})`}
                </span>
                <span className="text-caption text-ash">
                  {timeAgo(h.start)}
                </span>
              </span>
              {h.output.trim() && (
                <pre className="max-h-24 overflow-auto font-mono text-caption whitespace-pre-wrap text-muted-foreground">
                  {h.output.trim()}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}

// --- Inspect ---------------------------------------------------------------

const inspectExtensions = [json(), EditorView.lineWrapping]

function InspectTab({ ctx }: { ctx: Ctx }) {
  const { server, c, phone } = ctx
  const q = useDockerInspect(server.id, c.id, true)
  const theme = useCodeTheme()
  const text = q.data ? JSON.stringify(q.data, null, 2) : ""

  function download() {
    const blob = new Blob([text], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${c.name}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  let body: ReactNode
  if (q.isPending) body = <Skeleton className="h-96 rounded-2xl" />
  else if (q.isError) body = <Quiet>{q.error.message}</Quiet>
  else
    body = (
      <div className="overflow-hidden rounded-2xl border border-border [contain:inline-size]">
        <CodeMirror
          value={text}
          readOnly
          editable={false}
          theme={theme}
          extensions={inspectExtensions}
          basicSetup={{ foldGutter: true, highlightActiveLine: false }}
          className="text-caption"
        />
      </div>
    )
  return (
    <div className={cn("flex flex-col gap-3", phone && "px-4 pt-4")}>
      <div className="flex items-center gap-2">
        <p className="text-caption text-muted-foreground">
          What <span className="font-mono">docker inspect</span> says
          {c.env_hidden && ", environment values left out"}.
        </p>
        <div className="ms-auto flex gap-1">
          <CopyButton value={text} label="Copy" />
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Download"
            title="Download"
            disabled={!text}
            onClick={download}
          >
            <Download />
          </Button>
        </div>
      </div>
      {body}
    </div>
  )
}
