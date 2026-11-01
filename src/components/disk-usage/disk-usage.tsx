"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowUp,
  ChartPie,
  ChevronRight,
  ClipboardCopy,
  Ellipsis,
  File,
  Folder,
  FolderOpen,
  FolderSearch,
  HardDrive,
  Link2,
  type LucideIcon,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { Fragment, type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { DiskUsage, UsageEntry } from "@/lib/services"
import { cn } from "@/lib/utils"

// Where the analyser reads sizes, plus what it may do with an entry. Only
// `key` and `load` are required, so any page that knows a server can show it.
export type UsageSource = {
  // Query key prefix; every scanned folder is cached under it.
  key: readonly unknown[]
  load: (path: string, signal: AbortSignal) => Promise<DiskUsage>
  // Turns on Delete (after a confirm). Should invalidate `key` itself.
  remove?: (paths: string[]) => Promise<unknown>
  // Turns on "Show in Files": open the file manager at path.
  reveal?: (path: string, dir: boolean) => void
}

const usageKey = (source: UsageSource, path: string) =>
  [...source.key, path] as const

// One folder's breakdown. du walks the whole tree, so a result is kept for
// a while and never refetched behind the user's back.
export function useDiskUsage(source: UsageSource, path: string | null) {
  return useQuery<DiskUsage, ApiError>({
    queryKey: usageKey(source, path ?? ""),
    queryFn: ({ signal }) => source.load(path ?? "", signal),
    enabled: path !== null,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

// Kernel and in-memory filesystems: nothing on them takes disk space.
const PSEUDO =
  /^(proc|sysfs|devpts|cgroup2?|securityfs|debugfs|tracefs|pstore|bpf|mqueue|hugetlbfs|configfs|fusectl|binfmt_misc|autofs|efivarfs|nsfs|rpc_pipefs)$/

const browsable = (e: UsageEntry) =>
  e.type === "dir" && !(e.mount && PSEUDO.test(e.mount))

const percent = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : 0

function formatPercent(p: number) {
  if (p === 0) return "0%"
  if (p < 0.1) return "<0.1%"
  return p < 10 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`
}

function segments(path: string) {
  const parts = path.split("/").filter(Boolean)
  return [
    { name: "/", path: "/" },
    ...parts.map((name, i) => ({
      name,
      path: `/${parts.slice(0, i + 1).join("/")}`,
    })),
  ]
}

const dirname = (p: string) => p.slice(0, p.lastIndexOf("/")) || "/"

// Close the layer, then act once its history entry is gone (a URL write made
// while it is open would be undone by the Back that closes it).
function afterClose(close: () => void, act: () => void) {
  window.addEventListener("popstate", () => act(), { once: true })
  close()
}

// The analyser as a layer: a wide side sheet on desktop, a full-height bottom
// sheet on phones. It starts at `path` each time it opens and lets the user
// walk down into folders and back up. Drive `open` with useOpen.
export function DiskUsageLayer({
  source,
  path,
  open,
  onOpenChange,
  phone,
}: {
  source: UsageSource
  path: string
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
}) {
  const [dir, setDir] = useState(path)
  // Reset while rendering, not in an effect: an effect would first scan the
  // previous folder (often a whole disk) for one render.
  const [opened, setOpened] = useState({ open, path })
  if (opened.open !== open || opened.path !== path) {
    setOpened({ open, path })
    if (open) setDir(path)
  }

  const close = () => onOpenChange(false)
  const reveal = source.reveal
  const layerSource: UsageSource = {
    ...source,
    reveal: reveal && ((p, d) => afterClose(close, () => reveal(p, d))),
  }
  const usage = useDiskUsage(source, open ? dir : null)
  const parent = dir === "/" ? null : dirname(dir)

  if (phone)
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Disk usage"
        full
        className="px-0"
        header={
          <div className="flex items-center gap-1 border-b border-border px-2 pb-2">
            <button
              type="button"
              aria-label="Up one folder"
              disabled={!parent}
              onClick={() => parent && setDir(parent)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted disabled:opacity-30 [&_svg]:size-5"
            >
              <ArrowUp />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-body font-medium">Disk usage</p>
              <p className="truncate font-mono text-caption text-muted-foreground">
                {dir}
              </p>
            </div>
            <RefreshButton source={source} path={dir} phone />
          </div>
        }
      >
        <DiskUsageExplorer
          source={layerSource}
          path={dir}
          onPath={setDir}
          usage={usage}
          phone
        />
      </BottomSheet>
    )

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">Disk usage</SheetTitle>
          <SheetDescription>
            What takes the space, folder by folder. Click a folder to look
            inside.
          </SheetDescription>
        </SheetHeader>
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Up one folder"
            title="Up one folder"
            disabled={!parent}
            onClick={() => parent && setDir(parent)}
          >
            <ArrowUp />
          </Button>
          <Crumbs path={dir} onPath={setDir} />
          <RefreshButton source={source} path={dir} phone={false} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DiskUsageExplorer
            source={layerSource}
            path={dir}
            onPath={setDir}
            usage={usage}
            phone={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function RefreshButton({
  source,
  path,
  phone,
}: {
  source: UsageSource
  path: string
  phone: boolean
}) {
  const queryClient = useQueryClient()
  const key = usageKey(source, path)
  const fetching = queryClient.isFetching({ queryKey: key }) > 0
  // A rescan of this folder makes every cached folder above it stale too.
  const rescan = () => {
    queryClient.invalidateQueries({ queryKey: source.key, refetchType: "none" })
    queryClient.refetchQueries({ queryKey: key, exact: true })
  }
  const icon = <RefreshCw className={cn(fetching && "animate-spin")} />
  if (phone)
    return (
      <button
        type="button"
        aria-label="Scan again"
        disabled={fetching}
        onClick={rescan}
        className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted disabled:opacity-50 [&_svg]:size-5"
      >
        {icon}
      </button>
    )
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Scan again"
      title="Scan again"
      disabled={fetching}
      onClick={rescan}
    >
      {icon}
    </Button>
  )
}

function Crumbs({
  path,
  onPath,
}: {
  path: string
  onPath: (path: string) => void
}) {
  const parts = segments(path)
  return (
    <nav
      aria-label="Folder"
      className="flex min-w-0 flex-1 items-center overflow-x-auto font-mono text-body-sm"
    >
      {parts.map((s, i) => (
        <Fragment key={s.path}>
          {i > 1 && <ChevronRight className="size-3.5 shrink-0 text-ash" />}
          <button
            type="button"
            onClick={() => onPath(s.path)}
            aria-current={i === parts.length - 1 ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              i === parts.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {s.name}
          </button>
        </Fragment>
      ))}
    </nav>
  )
}

// The analyser's body without any frame: summary, then every entry of
// `path` biggest first. Embed it anywhere that has a source.
export function DiskUsageExplorer({
  source,
  path,
  onPath,
  usage,
  phone,
}: {
  source: UsageSource
  path: string
  onPath: (path: string) => void
  usage: ReturnType<typeof useDiskUsage>
  phone: boolean
}) {
  const [deleting, setDeleting] = useState<UsageEntry | null>(null)
  const [confirmOpen, setConfirmOpen] = useOpen("disk-usage-delete")
  const [pending, setPending] = useState(false)
  const [menuEntry, setMenuEntry] = useState<UsageEntry | null>(null)
  const [menuOpen, setMenuOpen] = useOpen("disk-usage-entry")

  const { data, error, isPending, refetch } = usage

  if (isPending) return <Scanning key={path} path={path} phone={phone} />
  if (error)
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div>
          <p className="font-medium">
            {error.status === 504 ? "Scanning took too long" : "Can't scan"}
          </p>
          <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
          {path !== "/" && (
            <Button variant="ghost" onClick={() => onPath(dirname(path))}>
              Up one folder
            </Button>
          )}
        </div>
      </div>
    )

  const ask = (e: UsageEntry) => {
    setDeleting(e)
    setConfirmOpen(true)
  }

  const actions = (e: UsageEntry): Action[][] => {
    const open: Action[] = []
    if (browsable(e))
      open.push({
        key: "open",
        label: "Look inside",
        icon: FolderSearch,
        onSelect: () => onPath(e.path),
      })
    if (source.reveal) {
      const reveal = source.reveal
      open.push({
        key: "reveal",
        label: "Show in Files",
        icon: FolderOpen,
        onSelect: () => reveal(e.path, e.type === "dir"),
      })
    }
    open.push({
      key: "copy",
      label: "Copy path",
      icon: ClipboardCopy,
      onSelect: () =>
        navigator.clipboard
          .writeText(e.path)
          .then(() => toast.success("Path copied")),
    })
    const danger: Action[] =
      source.remove && !e.mount
        ? [
            {
              key: "delete",
              label: "Delete",
              icon: Trash2,
              destructive: true,
              onSelect: () => ask(e),
            },
          ]
        : []
    return [open, danger]
  }

  const remove = source.remove
  return (
    <>
      <Summary usage={data} phone={phone} />
      <Notes usage={data} phone={phone} />
      {data.entries.length === 0 ? (
        <p className="px-6 py-12 text-center text-body-sm text-muted-foreground">
          This folder is empty.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {data.entries.map((e) => (
            <Row
              key={e.path}
              entry={e}
              total={data.size}
              disk={data.disk?.size ?? 0}
              phone={phone}
              onOpen={() => onPath(e.path)}
              onMenu={() => {
                setMenuEntry(e)
                setMenuOpen(true)
              }}
              menu={actions(e)}
            />
          ))}
          {data.more > 0 && (
            <li
              className={cn(
                "flex items-center gap-3 text-body-sm text-muted-foreground",
                phone ? "min-h-14 px-4" : "h-11 px-6",
              )}
            >
              <Ellipsis className="size-4 shrink-0 text-ash" />
              <span className="flex-1">
                {data.more.toLocaleString()} smaller items
              </span>
              <span className="tabular-nums">{formatSize(data.more_size)}</span>
            </li>
          )}
        </ul>
      )}

      {phone && (
        <BottomSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title={menuEntry?.name ?? ""}
        >
          {menuEntry &&
            actions(menuEntry)
              .filter((g) => g.length)
              .map((group, i) => (
                <ul
                  key={group[0].key}
                  className={cn(
                    "divide-y divide-border",
                    i > 0 && "-mx-4 mt-2 border-t-8 border-subtle px-4",
                  )}
                >
                  {group.map((a) => (
                    <li key={a.key}>
                      <SheetAction
                        icon={<a.icon />}
                        label={a.label}
                        destructive={a.destructive}
                        onClick={() =>
                          afterClose(() => setMenuOpen(false), a.onSelect)
                        }
                      />
                    </li>
                  ))}
                </ul>
              ))}
        </BottomSheet>
      )}

      {remove && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Delete ${deleting?.name ?? ""}?`}
          description={
            deleting && (
              <>
                {deleting.type === "dir" &&
                  "The folder is deleted with everything inside it. "}
                This frees about {formatSize(deleting.size)} and can't be
                undone.
              </>
            )
          }
          confirmLabel="Delete"
          pending={pending}
          onConfirm={() => {
            if (!deleting) return
            setPending(true)
            remove([deleting.path])
              .then(() => {
                toast.success(`Deleted ${deleting.name}`)
                setConfirmOpen(false)
              })
              .catch((err: ApiError) => toast.error(err.message))
              .finally(() => setPending(false))
          }}
        />
      )}
    </>
  )
}

type Action = {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
}

// How full the disk is and how much of it this folder holds: one bar with
// this folder, everything else, and free space.
function Summary({ usage, phone }: { usage: DiskUsage; phone: boolean }) {
  const disk = usage.disk
  const others = disk ? Math.max(0, disk.used - usage.size) : 0
  const full = disk ? percent(disk.used, disk.size) : 0
  const tone = full >= 90 ? "critical" : full >= 80 ? "high" : "ok"
  return (
    <div className={cn("flex flex-col gap-4", phone ? "px-4 py-5" : "p-6")}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="font-label text-caption tracking-label text-ash uppercase">
            This folder
          </p>
          <p className="text-heading font-light tabular-nums">
            {formatSize(usage.size)}
          </p>
        </div>
        {disk && (
          <p className="text-body-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatPercent(percent(usage.size, disk.size))}
            </span>{" "}
            of the disk
          </p>
        )}
      </div>
      {disk && (
        <>
          {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> can't show three parts */}
          <div
            role="meter"
            aria-label={`Disk ${Math.round(full)}% used`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(full)}
            className="flex h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-brand transition-[width] duration-500"
              style={{ width: `${percent(usage.size, disk.size)}%` }}
            />
            <div
              className={cn(
                "h-full transition-[width] duration-500",
                tone === "critical"
                  ? "bg-destructive/40"
                  : tone === "high"
                    ? "bg-warning/40"
                    : "bg-brand/30",
              )}
              style={{ width: `${percent(others, disk.size)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-body-sm">
            <Legend className="bg-brand" label="This folder">
              {formatSize(usage.size)}
            </Legend>
            <Legend
              className={cn(
                tone === "critical"
                  ? "bg-destructive/40"
                  : tone === "high"
                    ? "bg-warning/40"
                    : "bg-brand/30",
              )}
              label="Rest of the disk"
            >
              {formatSize(others)}
            </Legend>
            <Legend className="bg-muted ring-1 ring-mist" label="Free">
              {formatSize(disk.available)}
            </Legend>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ash">
            <HardDrive className="size-3.5" />
            <span>
              {formatSize(disk.size)} disk at{" "}
              <span className="font-mono">{disk.mount}</span>
              {disk.type && ` · ${disk.type}`}
              {disk.device && disk.device !== disk.type && ` · ${disk.device}`}
            </span>
            <span
              className={cn(
                "font-medium",
                tone === "critical"
                  ? "text-destructive"
                  : tone === "high"
                    ? "text-warning"
                    : "text-muted-foreground",
              )}
            >
              · {Math.round(full)}% full
            </span>
          </p>
        </>
      )}
    </div>
  )
}

function Legend({
  className,
  label,
  children,
}: {
  className: string
  label: string
  children: ReactNode
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", className)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{children}</span>
    </span>
  )
}

function Notes({ usage, phone }: { usage: DiskUsage; phone: boolean }) {
  const notes: string[] = []
  if (usage.unreadable > 0)
    notes.push(
      `${usage.unreadable} ${usage.unreadable === 1 ? "folder" : "folders"} couldn't be read, so the real total is higher.`,
    )
  if (usage.access === "user")
    notes.push(
      "Scanned as the login user: folders it can't open are missing. Give it passwordless sudo for exact numbers.",
    )
  if (!notes.length) return null
  return (
    <div
      className={cn(
        "mb-4 flex gap-3 rounded-2xl border border-border bg-subtle p-4 text-body-sm text-muted-foreground",
        phone ? "mx-4" : "mx-6",
      )}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="flex flex-col gap-1">
        {notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </div>
  )
}

function Row({
  entry: e,
  total,
  disk,
  phone,
  onOpen,
  onMenu,
  menu,
}: {
  entry: UsageEntry
  total: number
  disk: number
  phone: boolean
  onOpen: () => void
  onMenu: () => void
  menu: Action[][]
}) {
  const share = percent(e.size, total)
  const canOpen = browsable(e)
  const Icon = e.mount
    ? HardDrive
    : e.type === "dir"
      ? Folder
      : e.type === "symlink"
        ? Link2
        : File

  const name = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{e.name}</span>
      {e.mount && (
        <span className="truncate text-caption text-ash">
          Separate filesystem · {e.mount}
          {canOpen && " · open to scan it"}
        </span>
      )}
    </span>
  )
  const bar = !e.mount && (
    <span className="h-1.5 overflow-hidden rounded-full bg-muted">
      <span
        className="block h-full rounded-full bg-brand"
        style={{ width: `${Math.max(share, share > 0 ? 1 : 0)}%` }}
      />
    </span>
  )
  const size = e.mount ? "—" : formatSize(e.size)
  const title = disk
    ? `${formatSize(e.size)} · ${formatPercent(share)} of this folder · ${formatPercent(percent(e.size, disk))} of the disk`
    : undefined

  if (phone)
    return (
      <li className="flex items-center">
        <button
          type="button"
          onClick={canOpen ? onOpen : onMenu}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 ps-4 text-start text-body outline-none active:bg-muted"
        >
          <Icon
            className={cn(
              "size-5 shrink-0",
              e.type === "dir" ? "text-brand" : "text-ash",
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex items-baseline gap-2">
              {name}
              <span className="shrink-0 text-body-sm tabular-nums">{size}</span>
            </span>
            {bar && (
              <span className="flex items-center gap-2">
                <span className="flex-1 [&>span]:block">{bar}</span>
                <span className="w-11 shrink-0 text-end text-caption text-ash tabular-nums">
                  {formatPercent(share)}
                </span>
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${e.name} actions`}
          onClick={onMenu}
          className="flex size-11 shrink-0 items-center justify-center text-ash outline-none active:bg-muted"
        >
          <Ellipsis className="size-5" />
        </button>
      </li>
    )

  return (
    <li
      title={title}
      className={cn(
        "group flex h-11 items-center gap-3 ps-6 pe-3 text-body-sm",
        canOpen && "cursor-pointer hover:bg-subtle",
      )}
    >
      {/* The row is a button only for folders; files have just the menu. */}
      <button
        type="button"
        disabled={!canOpen}
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-start outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            e.type === "dir" ? "text-brand" : "text-ash",
          )}
        />
        {name}
        <span className="hidden w-32 shrink-0 sm:block [&>span]:block">
          {bar}
        </span>
        <span className="w-12 shrink-0 text-end text-caption text-muted-foreground tabular-nums">
          {e.mount ? "" : formatPercent(share)}
        </span>
        <span className="w-20 shrink-0 text-end tabular-nums">{size}</span>
      </button>
      <RowMenu name={e.name} groups={menu} />
    </li>
  )
}

function RowMenu({ name, groups }: { name: string; groups: Action[][] }) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${name} actions`}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent align="end" className="w-48">
          {groups
            .filter((g) => g.length)
            .map((group, i) => (
              <Fragment key={group[0].key}>
                {i > 0 && <DropdownMenuSeparator />}
                {group.map((a) => (
                  <DropdownMenuItem
                    key={a.key}
                    variant={a.destructive ? "destructive" : "default"}
                    onClick={a.onSelect}
                  >
                    <a.icon />
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </Fragment>
            ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

// du can take a while on a big tree: say so, and how long it has been.
function Scanning({ path, phone }: { path: string; phone: boolean }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div aria-busy>
      <div className={cn("flex flex-col gap-3", phone ? "px-4 py-5" : "p-6")}>
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <ChartPie className="size-4 animate-pulse text-brand" />
          Scanning <span className="truncate font-mono">{path}</span>
          {seconds >= 2 && <span className="tabular-nums">· {seconds}s</span>}
        </p>
        <Skeleton className="h-3 w-full rounded-full" />
        {seconds >= 5 && (
          <p className="text-caption text-ash">
            Every file under this folder is counted, so big folders can take a
            minute.
          </p>
        )}
      </div>
      <div className="divide-y divide-border border-t border-border">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={i}
            className={cn(
              "flex items-center gap-3",
              phone ? "h-14 px-4" : "h-11 px-6",
            )}
          >
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ms-auto h-1.5 w-32 rounded-full" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}
