"use client"

import {
  ChartPie,
  Ellipsis,
  File,
  Folder,
  FolderOpen,
  HardDrive,
  HardDriveUpload,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQueryStates } from "nuqs"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  DiskUsageLayer,
  useDiskUsage,
} from "@/components/disk-usage/disk-usage"
import { FileBrowser } from "@/components/files/file-browser"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type {
  DockerFleetServer,
  DockerRef,
  DockerVolume,
  UsageEntry,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  ItemMenu,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useDockerVolumes, useVolumeBackups } from "../api"
import { useDockerActions, useVolumeMenu } from "./docker-actions"
import { EnvPage } from "./env-page"
import {
  containerHref,
  Dot,
  shortId,
  stateOf,
  type VolumeTab,
  volumeHref,
  volumeParsers,
} from "./meta"
import { Block, CopyButton, Pairs, Quiet } from "./parts"
import { type DockerCan, useDockerCan } from "./permissions"
import { projectHref } from "./project-actions"
import { VolumeBackups } from "./volume-backups"
import { useVolumeSource, useVolumeUsage } from "./volume-files"

const tabLabels: Record<VolumeTab, string> = {
  overview: "Overview",
  files: "Files",
  backups: "Backups",
}

// /containers/volumes/[name]: one volume of the environment, with its files.
export function VolumePage() {
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params.name)
  return (
    <EnvPage title={name} parent="/containers/volumes" anyState bleed>
      {(ctx) => <Volume {...ctx} name={name} />}
    </EnvPage>
  )
}

export function volumeTitle(v: Pick<DockerVolume, "name" | "anonymous">) {
  return v.anonymous ? shortId(v.name) : v.name
}

function Volume({
  env,
  phone,
  name,
}: {
  env: DockerFleetServer
  phone: boolean
  name: string
}) {
  const id = env.server_id
  const can = useDockerCan(id, env.workspace_id)
  const list = useDockerVolumes(id, false)
  const [{ tab }, setUrl] = useQueryStates(volumeParsers, {
    history: "replace",
  })
  const v = list.data?.find((x) => x.name === name)
  usePageCrumbs([
    { href: volumeHref(id, name), label: v ? volumeTitle(v) : name },
  ])

  if (!v) {
    if (list.isPending)
      return (
        <div className="flex flex-col gap-4 px-6 pt-5 max-md:px-4 max-md:pt-4">
          <Skeleton className="h-12 w-72 rounded-xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )
    return (
      <Empty
        icon={HardDrive}
        title={list.isError ? "Couldn't load the volume" : "Volume not found"}
        body={
          list.isError
            ? list.error.message
            : `No volume called ${name} on ${env.name}: it was removed, or it lives on another server.`
        }
        className="mt-6"
        action={
          <Button
            variant="outline"
            render={<Link href="/containers/volumes" />}
            nativeButton={false}
          >
            All volumes
          </Button>
        }
      />
    )
  }

  // Files are read and written as root: Engineer only, like the backend.
  const shown = (["overview", "files", "backups"] as const).filter(
    (t) => t !== "files" || can.manage,
  )
  const current: VolumeTab = shown.includes(tab) ? tab : "overview"
  const go = (t: VolumeTab, path?: string) =>
    setUrl({
      tab: t === "overview" ? null : t,
      path: t === "files" && path && path !== "/" ? path : null,
    })

  let body: ReactNode
  switch (current) {
    case "files":
      body = <FilesTab server={id} v={v} can={can} phone={phone} />
      break
    case "backups":
      body = (
        <div className={cn(phone && "px-4")}>
          <VolumeBackups server={id} volume={v.name} can={can} />
        </div>
      )
      break
    default:
      body = (
        <Overview
          server={id}
          v={v}
          can={can}
          phone={phone}
          onFiles={(path) => go("files", path)}
        />
      )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        phone ? "pt-4 pb-24" : "px-6 pt-5 pb-6",
        phone && current === "files" && "pb-0",
      )}
    >
      <Header
        server={id}
        envName={env.name}
        v={v}
        can={can}
        phone={phone}
        onFiles={current === "files"}
        tabs={
          <TabBar
            tabs={shown}
            current={current}
            onChange={(t) => go(t)}
            phone={phone}
          />
        }
      />
      {body}
    </div>
  )
}

function Header({
  server,
  envName,
  v,
  can,
  phone,
  onFiles,
  tabs,
}: {
  server: string
  envName: string
  v: DockerVolume
  can: DockerCan
  phone: boolean
  onFiles: boolean
  tabs: ReactNode
}) {
  const a = useDockerActions()
  const menu = useVolumeMenu(server, v, can, { onPage: true })
  const [sheet, setSheet] = useOpen("docker-volume-sheet")
  const used = v.used_by.length
  const running = v.used_by.filter((r) => r.state === "running").length
  const usedText =
    used === 0
      ? "Unused"
      : `Used by ${used} container${used === 1 ? "" : "s"}${running < used ? ` · ${running} running` : ""}`
  const tone = used === 0 ? "muted" : running > 0 ? "success" : "warning"

  if (phone)
    return (
      <div className="flex flex-col gap-3 px-4">
        <div className="text-center">
          {v.anonymous && (
            <p className="truncate font-mono text-caption text-ash">{v.name}</p>
          )}
          <p className="flex items-center justify-center gap-1.5 text-body-sm text-muted-foreground">
            <Dot tone={tone} />
            {usedText}
          </p>
        </div>
        <div className="flex gap-2">
          {can.manage && onFiles && (
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => a.backupVolume(server, v)}
            >
              <HardDriveUpload />
              Back up
            </Button>
          )}
          {can.manage && !onFiles && (
            <Button
              variant="outline"
              className="h-11 flex-1"
              render={<Link href={volumeHref(server, v.name, "files")} />}
              nativeButton={false}
            >
              <FolderOpen />
              Browse files
            </Button>
          )}
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={() => setSheet(true)}
          >
            <Ellipsis />
            Actions
          </Button>
        </div>
        {tabs}
        <BottomSheet
          open={sheet}
          onOpenChange={setSheet}
          title={volumeTitle(v)}
        >
          <SheetItems groups={menu} onOpenChange={setSheet} />
        </BottomSheet>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <HardDrive className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-subheading font-medium">
              {volumeTitle(v)}
            </span>
            {v.anonymous && (
              <span className="shrink-0 rounded-full bg-muted px-2 text-caption text-muted-foreground">
                Anonymous
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Dot tone={tone} />
              {usedText}
            </span>
            {v.project && (
              <Link
                href={projectHref(server, v.project)}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Layers className="size-3.5" />
                {v.project}
              </Link>
            )}
            <span>{v.driver} driver</span>
            {v.created && <span>made {timeAgo(v.created)}</span>}
            <span>on {envName}</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {can.manage && (
            <Button variant="outline" onClick={() => a.backupVolume(server, v)}>
              <HardDriveUpload />
              Back up
            </Button>
          )}
          <ItemMenu groups={menu} label="Volume actions" />
        </div>
      </div>
      {tabs}
    </div>
  )
}

// Underlined tabs on desktop, a scrolling chip row on phones.
function TabBar({
  tabs,
  current,
  onChange,
  phone,
}: {
  tabs: VolumeTab[]
  current: VolumeTab
  onChange: (t: VolumeTab) => void
  phone: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label="Volume section"
      className={cn(
        "flex [scrollbar-width:none] overflow-x-auto",
        phone ? "gap-1.5" : "gap-5 border-b border-border",
      )}
    >
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={current === t}
          onClick={() => onChange(t)}
          className={cn(
            "inline-flex shrink-0 items-center text-body-sm whitespace-nowrap outline-none",
            phone
              ? cn(
                  "h-9 rounded-full border px-3.5 focus-visible:ring-3 focus-visible:ring-ring/50",
                  current === t
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-border text-muted-foreground",
                )
              : cn(
                  "-mb-px h-10 border-b-2 focus-visible:text-brand",
                  current === t
                    ? "border-brand font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ),
          )}
        >
          {tabLabels[t]}
        </button>
      ))}
    </div>
  )
}

// --- Files -----------------------------------------------------------------

function FilesTab({
  server,
  v,
  can,
  phone,
}: {
  server: string
  v: DockerVolume
  can: DockerCan
  phone: boolean
}) {
  const source = useVolumeSource(server, v.name, can.manage)
  if (phone) return <FileBrowser source={source} phone />
  return (
    <div className="flex h-[calc(100svh-14rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border border-border">
      <FileBrowser source={source} phone={false} />
    </div>
  )
}

// --- Overview --------------------------------------------------------------

function Overview({
  server,
  v,
  can,
  phone,
  onFiles,
}: {
  server: string
  v: DockerVolume
  can: DockerCan
  phone: boolean
  onFiles: (path: string) => void
}) {
  const backups = useVolumeBackups(server, v.name)
  const stored = (backups.data?.items ?? []).filter((b) => b.state === "stored")
  const last = stored
    .map((b) => b.finished_at ?? b.created_at)
    .sort()
    .at(-1)

  return (
    <div
      className={cn(
        "grid gap-5",
        phone ? "px-4" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-5">
        {can.manage ? (
          <Space server={server} v={v} phone={phone} onFiles={onFiles} />
        ) : (
          <Card>
            <Block title="Size">
              <Quiet>
                {v.size >= 0
                  ? formatSize(v.size)
                  : "Measure it on the Volumes page. Looking inside a volume needs Engineer access."}
              </Quiet>
            </Block>
          </Card>
        )}
        <Card>
          <Block title={`Used by · ${v.used_by.length}`}>
            <UsedBy server={server} refs={v.used_by} />
          </Block>
        </Card>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <Block title="About">
            <Pairs
              rows={[
                { label: "Name", value: v.name, mono: true },
                { label: "Driver", value: v.driver },
                { label: "Scope", value: v.scope },
                {
                  label: "Compose project",
                  value: v.project && (
                    <Link
                      href={projectHref(server, v.project)}
                      className="text-brand hover:underline"
                    >
                      {v.project}
                    </Link>
                  ),
                },
                {
                  label: "Created",
                  value: v.created && timeAgo(v.created),
                },
                {
                  label: "Last copy",
                  value: backups.isPending
                    ? undefined
                    : last
                      ? `${timeAgo(last)} · ${stored.length} kept`
                      : "Never backed up",
                },
                {
                  label: "On the server",
                  value: (
                    <span className="flex items-start gap-1">
                      <span className="min-w-0 flex-1">{v.mountpoint}</span>
                      <CopyButton value={v.mountpoint} label="Copy path" />
                    </span>
                  ),
                  mono: true,
                },
              ]}
            />
          </Block>
        </Card>
        {Object.keys(v.labels).length > 0 && (
          <Card>
            <Block title="Labels">
              <KeyValues map={v.labels} />
            </Block>
          </Card>
        )}
        {Object.keys(v.options).length > 0 && (
          <Card>
            <Block title="Driver options">
              <KeyValues map={v.options} />
            </Block>
          </Card>
        )}
      </div>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border p-5 max-md:rounded-xl max-md:p-4">
      {children}
    </section>
  )
}

// The volume's size and its biggest entries (du of the top folder), each a
// way into the files.
function Space({
  server,
  v,
  phone,
  onFiles,
}: {
  server: string
  v: DockerVolume
  phone: boolean
  onFiles: (path: string) => void
}) {
  const [analysing, setAnalysing] = useOpen("docker-volume-usage")
  const source = useVolumeUsage(server, v.name, {
    write: true,
    reveal: (path, dir) =>
      onFiles(dir ? path : path.slice(0, path.lastIndexOf("/")) || "/"),
  })
  const usage = useDiskUsage(source, "/")
  const d = usage.data
  const top = (d?.entries ?? []).slice(0, 6)
  const biggest = Math.max(1, ...top.map((e) => e.size))
  const disk = d?.disk
  const share = disk && disk.size > 0 && d ? d.size / disk.size : 0

  return (
    <Card>
      <Block
        title="What takes the space"
        aside={
          <Button
            variant="ghost"
            size="sm"
            disabled={!d}
            onClick={() => setAnalysing(true)}
          >
            <ChartPie />
            Explore
          </Button>
        }
      >
        {usage.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : usage.isError ? (
          <Quiet>{usage.error.message}</Quiet>
        ) : d ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-heading font-light tabular-nums">
                {formatSize(d.size)}
              </span>
              {disk && (
                <span
                  className="text-body-sm text-muted-foreground"
                  title={`Mounted at ${disk.mount}`}
                >
                  {share >= 0.001
                    ? `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}% of the server's disk · `
                    : ""}
                  {formatSize(disk.available)} free on its disk
                </span>
              )}
            </div>
            {disk && disk.size > 0 && (
              <div
                role="img"
                aria-label={`The server's disk: ${formatSize(disk.used)} used of ${formatSize(disk.size)}, this volume ${formatSize(d.size)}`}
                className="flex h-2 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="h-full bg-brand"
                  style={{ width: `${Math.max(0.5, share * 100)}%` }}
                />
                <span
                  className="h-full bg-mist"
                  style={{
                    width: `${Math.max(0, ((disk.used - d.size) / disk.size) * 100)}%`,
                  }}
                />
              </div>
            )}
            {top.length === 0 ? (
              <Quiet>The volume is empty.</Quiet>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {top.map((e) => (
                  <UsageRow
                    key={e.path}
                    e={e}
                    max={biggest}
                    onOpen={() =>
                      onFiles(
                        e.type === "dir"
                          ? e.path
                          : e.path.slice(0, e.path.lastIndexOf("/")) || "/",
                      )
                    }
                  />
                ))}
                {d.more > 0 && (
                  <li className="px-2 pt-1 text-caption text-ash">
                    and {d.more} more · {formatSize(d.more_size)}
                  </li>
                )}
              </ul>
            )}
          </div>
        ) : null}
      </Block>
      <DiskUsageLayer
        source={source}
        path="/"
        open={analysing}
        onOpenChange={setAnalysing}
        phone={phone}
      />
    </Card>
  )
}

function UsageRow({
  e,
  max,
  onOpen,
}: {
  e: UsageEntry
  max: number
  onOpen: () => void
}) {
  const Icon = e.type === "dir" ? Folder : File
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        title={e.type === "dir" ? "Open the folder" : "Show in its folder"}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-start text-body-sm outline-none hover:bg-muted focus-visible:bg-muted md:min-h-10"
      >
        <Icon className="size-4 shrink-0 text-ash" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate">{e.name}</span>
          <span className="h-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-brand/70"
              style={{ width: `${Math.max(1, (e.size / max) * 100)}%` }}
            />
          </span>
        </span>
        <span className="w-20 shrink-0 text-end text-muted-foreground tabular-nums">
          {formatSize(e.size)}
        </span>
      </button>
    </li>
  )
}

function UsedBy({ server, refs }: { server: string; refs: DockerRef[] }) {
  if (refs.length === 0)
    return (
      <Quiet>
        No container uses it. Its data stays until you remove the volume.
      </Quiet>
    )
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {refs.map((r) => (
        <li key={r.id}>
          <Link
            href={containerHref(server, r.name || r.id)}
            className="flex min-h-11 items-center gap-2 px-3 py-2 text-body-sm hover:bg-muted md:min-h-10"
          >
            <Dot tone={stateOf(r).tone} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {r.name}
            </span>
            <span className="text-caption text-muted-foreground">
              {stateOf(r).label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function KeyValues({ map }: { map: Record<string, string> }) {
  const keys = Object.keys(map).sort()
  return (
    <dl className="divide-y divide-border rounded-xl border border-border font-mono text-caption">
      {keys.map((k) => (
        <div key={k} className="flex flex-col gap-0.5 px-3 py-2">
          <dt className="break-all text-muted-foreground">{k}</dt>
          <dd className="break-all">{map[k] || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}
