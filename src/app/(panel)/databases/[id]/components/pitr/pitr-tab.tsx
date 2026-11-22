"use client"

import {
  ArchiveRestore,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Clock,
  DatabaseBackup,
  Ellipsis,
  ExternalLink,
  HardDrive,
  History,
  KeyRound,
  LoaderCircle,
  Power,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import {
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { useDemo } from "@/components/demo/demo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { PitrBackup, PitrRun, PitrStatus } from "@/lib/services"
import { cn } from "@/lib/utils"
import { usePitr, usePitrRuns, useRefreshPitr } from "../../../api"
import { Blank, Panel, Rows, Tag, useDashboard } from "../parts"
import {
  ago,
  backupTypeHint,
  backupTypeLabel,
  pitrSetupHref,
  runActive,
  runKindLabel,
  spanText,
} from "./meta"
import { fmtTime, PitrActionsProvider, usePitrActions } from "./pitr-actions"
import { Timeline } from "./timeline"

// The dashboard, with `owner` off in the public demo: setting up, restarts,
// restores, turning off and the passphrase are refused there.
function usePitrDashboard() {
  const dash = useDashboard()
  const demo = !!useDemo()
  return { ...dash, owner: dash.owner && !demo }
}

// The database's "Point in time" list: continuous backup with pgBackRest.
export function PitrTab() {
  const { database: d, phone } = usePitrDashboard()
  const status = usePitr(d.id)

  if (status.isPending) {
    return (
      <div className={cn("flex flex-col gap-4", phone && "px-4 pt-4")}>
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  if (status.isError) {
    return (
      <Blank
        title="Couldn't load it"
        body={status.error.message}
        action={
          <Button variant="outline" onClick={() => void status.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  const s = status.data
  if (!s.supported) {
    return <Blank title="Not for this database" body={s.note} />
  }
  if (!s.configured) return <Intro status={s} />
  return (
    <PitrActionsProvider database={d} status={s}>
      <Configured status={s} />
    </PitrActionsProvider>
  )
}

// ---- Not set up yet ----

function Intro({ status }: { status: PitrStatus }) {
  const { database: d, phone, owner } = usePitrDashboard()
  const points: [ReactNode, string, string][] = [
    [
      <RotateCcw key="i" />,
      "Back to any second",
      "Every change reaches the storage within a minute as WAL. A wrong DELETE at 14:32? Restore to 14:31:59.",
    ],
    [
      <Clock key="i" />,
      "Fast restores of big databases",
      "A restore copies files instead of replaying SQL and rebuilding every index, so 150 GB takes minutes to an hour, not most of a day.",
    ],
    [
      <HardDrive key="i" />,
      "Small backups after the first",
      "A weekly full backup, then only what changed. Compressed with zstd, encrypted, straight from the server to an S3 or SFTP storage.",
    ],
  ]
  return (
    <div className={cn("flex flex-col gap-6", phone && "px-4 pt-4 pb-6")}>
      <section
        className={cn(
          "flex flex-col gap-6 overflow-hidden",
          !phone && "rounded-3xl border border-border bg-subtle p-8",
        )}
      >
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <History className="size-6" />
          </span>
          <div className="min-w-0">
            <span className="font-label text-caption tracking-label text-ash uppercase">
              pgBackRest
            </span>
            <h2 className="text-subheading font-light">
              Continuous backup: go back to any moment
            </h2>
            <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
              Dumps from the Backups tab are snapshots of a moment, taken once a
              night. Continuous backup keeps every change since the last full
              backup, so a mistake costs seconds, not a day.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {points.map(([icon, title, body]) => (
            <div
              key={title}
              className="flex gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4">
                {icon}
              </span>
              <span className="min-w-0">
                <span className="block text-body-sm font-medium">{title}</span>
                <span className="mt-0.5 block text-caption text-muted-foreground">
                  {body}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {status.shared_with ? (
            <p className="text-body-sm text-muted-foreground">
              This PostgreSQL already has it, set up through{" "}
              <Link
                href={`/databases/${status.shared_with.id}?tab=backups&list=pitr`}
                className="text-brand hover:underline"
              >
                {status.shared_with.name}
              </Link>
              . One setup covers every database on it.
            </p>
          ) : owner ? (
            <Button
              className="h-11 md:h-10"
              render={<Link href={pitrSetupHref(d.id)} />}
              nativeButton={false}
            >
              <ShieldCheck />
              Set it up
            </Button>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              An Owner of {d.name} (with Engineer access to its server) can set
              it up.
            </p>
          )}
          <p className="text-caption text-muted-foreground">
            Morche installs pgBackRest on {status.server_name || "the server"}{" "}
            and turns WAL archiving on. That needs one PostgreSQL restart, at a
            time you choose.{" "}
            <Link
              href="/help/databases#pitr"
              className="text-brand hover:underline"
            >
              How it works
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

// ---- Set up ----

function Configured({ status: s }: { status: PitrStatus }) {
  const { phone } = usePitrDashboard()
  return (
    <div className={cn("flex flex-col gap-4", phone && "pb-6")}>
      <Bar status={s} />
      <Notices status={s} />
      <Hero status={s} />
      {phone ? (
        <>
          <Copies status={s} />
          <BackupList status={s} />
          <Activity />
        </>
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-2">
            <Copies status={s} />
            <BackupList status={s} />
          </div>
          <div className="flex min-w-0 flex-col gap-4 xl:flex-1">
            <Activity />
          </div>
        </div>
      )}
    </div>
  )
}

const stateText = (s: PitrStatus) => {
  if (s.active) return `${runKindLabel(s.active)}…`
  switch (s.state) {
    case "setting_up":
      return "Setting up…"
    case "needs_restart":
      return "Waiting for a PostgreSQL restart"
    case "broken":
      return "Needs a look"
    case "removing":
      return "Turning off…"
  }
  if (s.archiver?.last_archived_time) {
    return `Archiving · last WAL ${ago(s.archiver.last_archived_time)}`
  }
  return "Archiving"
}

function stateTone(s: PitrStatus): "success" | "warning" | "muted" {
  if (s.problems.length || s.state === "broken") return "warning"
  if (s.state === "ready") return "success"
  return "muted"
}

function useMenu(s: PitrStatus): Item[][] {
  const { owner, operator, database: d } = usePitrDashboard()
  const router = useRouter()
  const a = usePitrActions()
  const ready = s.state === "ready" || s.state === "broken"
  return [
    operator && ready
      ? [
          {
            key: "check",
            label: "Check archiving now",
            icon: <ShieldCheck />,
            disabled: a.busy,
            onSelect: a.check,
          },
        ]
      : [],
    owner
      ? [
          {
            key: "settings",
            label: "Settings",
            icon: <Settings2 />,
            onSelect: () => router.push(pitrSetupHref(d.id)),
          },
          {
            key: "resetup",
            label: "Set up again on the server",
            icon: <Wrench />,
            disabled: a.busy,
            onSelect: a.resetup,
          },
          ...(s.settings?.encrypted
            ? [
                {
                  key: "pass",
                  label: "Encryption passphrase",
                  icon: <KeyRound />,
                  onSelect: a.passphrase,
                },
              ]
            : []),
        ]
      : [],
    owner
      ? [
          {
            key: "remove",
            label: "Turn off",
            icon: <Power />,
            destructive: true,
            disabled: a.busy,
            onSelect: a.remove,
          },
        ]
      : [],
  ]
}

function Bar({ status: s }: { status: PitrStatus }) {
  const { database: d, phone, owner, operator } = usePitrDashboard()
  const a = usePitrActions()
  const refresh = useRefreshPitr(d.id)
  const menu = useMenu(s)
  const [sheet, setSheet] = useOpen("pitr-sheet")
  const ready = s.state === "ready" || s.state === "broken"
  const canRestore = owner && ready && !!s.window_from

  const refreshButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Read it again"
      title="Read it again"
      disabled={refresh.isPending}
      onClick={() =>
        refresh.mutate(undefined, { onError: (e) => toast.error(e.message) })
      }
      className={cn(phone && "size-11")}
    >
      <RefreshCw className={cn(refresh.isPending && "animate-spin")} />
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex items-center gap-2">
          <Dot tone={stateTone(s)} />
          <span className="min-w-0 flex-1 truncate text-body-sm">
            {stateText(s)}
          </span>
          {refreshButton}
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="More"
            onClick={() => setSheet(true)}
          >
            <Ellipsis />
          </Button>
        </div>
        {canRestore && (
          <Button
            className="h-11"
            disabled={a.busy}
            onClick={() => a.restore()}
          >
            <ArchiveRestore />
            Restore to a point in time
          </Button>
        )}
        <BottomSheet open={sheet} onOpenChange={setSheet} title="Point in time">
          <SheetItems
            onOpenChange={setSheet}
            groups={[
              operator && ready
                ? (["full", "diff", "incr"] as const).map((t) => ({
                    key: `b-${t}`,
                    label: `${backupTypeLabel[t]} backup now`,
                    icon: <DatabaseBackup />,
                    disabled: a.busy,
                    onSelect: () => a.backup(t),
                  }))
                : [],
              ...menu,
            ]}
          />
        </BottomSheet>
      </div>
    )
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2">
      <Dot tone={stateTone(s)} />
      <span className="text-body-sm">{stateText(s)}</span>
      {s.checked_at && (
        <span className="text-caption text-ash">
          · read {ago(s.checked_at)}
        </span>
      )}
      <div className="ms-auto flex items-center gap-1.5">
        {refreshButton}
        {operator && ready && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="h-9" disabled={a.busy} />
              }
            >
              <DatabaseBackup />
              Back up now
              <ChevronDown className="text-ash" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64">
              {(["full", "diff", "incr"] as const).map((t) => (
                <DropdownMenuItem key={t} onClick={() => a.backup(t)}>
                  <DatabaseBackup />
                  <span className="flex flex-col">
                    <span>{backupTypeLabel[t]}</span>
                    <span className="text-caption text-muted-foreground">
                      {backupTypeHint[t]}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canRestore && (
          <Button className="h-9" disabled={a.busy} onClick={() => a.restore()}>
            <ArchiveRestore />
            Restore to a point in time
          </Button>
        )}
        <ItemMenu groups={menu} label="More actions" />
      </div>
    </div>
  )
}

function Notices({ status: s }: { status: PitrStatus }) {
  const { phone, owner } = usePitrDashboard()
  const a = usePitrActions()
  const items: ReactNode[] = []
  if (s.active) {
    items.push(
      <Notice key="active" icon={<LoaderCircle className="animate-spin" />}>
        {runKindLabel(s.active)} is{" "}
        {s.active.state === "queued" ? "waiting its turn" : "running"}
        {s.active.started_at ? `, started ${ago(s.active.started_at)}` : ""}.
        Its progress is in Tasks.
      </Notice>,
    )
  }
  if (s.state === "needs_restart") {
    items.push(
      <Notice
        key="restart"
        tone="warning"
        icon={<CalendarClock />}
        action={
          owner &&
          (s.restart_at ? (
            <Button variant="outline" className="h-9" onClick={a.cancelRestart}>
              Call it off
            </Button>
          ) : (
            <Button className="h-9" disabled={a.busy} onClick={a.restart}>
              Restart PostgreSQL…
            </Button>
          ))
        }
      >
        {s.restart_at
          ? `PostgreSQL restarts at ${fmtTime(s.restart_at)}. Archiving and the first backup start right after.`
          : "pgBackRest is in place. PostgreSQL needs one restart to turn archive_mode on; until then nothing can be restored."}
      </Notice>,
    )
  }
  for (const p of s.problems) {
    if (p.kind === "restart") continue
    // The server's side may have changed under it: setting up again
    // rewrites pgBackRest's config and archive_command.
    const repair = owner && (p.kind === "unreachable" || p.kind === "repo")
    items.push(
      <Notice
        key={p.kind + p.message}
        tone="warning"
        icon={<CircleAlert />}
        action={
          repair && (
            <Button
              variant="outline"
              className="h-9"
              disabled={a.busy}
              onClick={a.resetup}
            >
              <Wrench />
              Set up again
            </Button>
          )
        }
      >
        {p.message}
      </Notice>,
    )
  }
  if (!items.length) return null
  return (
    <div className={cn("flex flex-col gap-2", phone && "px-4")}>{items}</div>
  )
}

function Notice({
  icon,
  tone,
  action,
  children,
}: {
  icon: ReactNode
  tone?: "warning"
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-center",
        tone === "warning"
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-subtle",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-2.5 text-body-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
        {icon}
        <span
          className={cn("min-w-0", tone === "warning" && "[&]:text-foreground")}
        >
          {children}
        </span>
      </div>
      {action}
    </div>
  )
}

function Hero({ status: s }: { status: PitrStatus }) {
  const { phone, owner } = usePitrDashboard()
  const a = usePitrActions()
  const failing = !!s.problems.find((p) => p.kind === "archive_failing")
  const latest = [...s.backups].sort((x, y) => y.stop.localeCompare(x.stop))[0]
  const fulls = s.backups.filter((b) => b.type === "full").length
  const spanMs = s.window_from
    ? Date.now() - new Date(s.window_from).getTime()
    : 0

  const tiles: [string, ReactNode, ReactNode][] = [
    [
      "Can go back",
      s.window_from ? spanText(spanMs) : "—",
      s.window_from
        ? `since ${fmtTime(s.window_from)}`
        : "after the first backup",
    ],
    [
      "Newest backup",
      latest ? ago(latest.stop) : "None yet",
      latest
        ? `${backupTypeLabel[latest.type].toLowerCase()} · ${formatSize(latest.repo_delta)} in the storage`
        : "",
    ],
    [
      "Last WAL archived",
      s.archiver?.last_archived_time ? ago(s.archiver.last_archived_time) : "—",
      failing ? (
        <span key="failing" className="text-warning">
          archiving fails
        </span>
      ) : s.settings ? (
        `at least every ${s.settings.archive_timeout ? `${s.settings.archive_timeout} s` : "16 MB"}`
      ) : (
        ""
      ),
    ],
    [
      "In the storage",
      formatSize(s.repo_bytes),
      `${fulls} full · ${s.backups.length - fulls} smaller${s.settings?.encrypted ? " · encrypted" : ""}`,
    ],
  ]

  const body = (
    <>
      {s.window_from && s.window_to ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <h2
              className={cn(
                "font-light",
                phone ? "text-subheading" : "text-heading",
              )}
            >
              Any second since{" "}
              {new Date(s.window_from).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </h2>
            <span className="pb-1 text-body-sm text-muted-foreground">
              {s.settings?.storage_name ? `on ${s.settings.storage_name}` : ""}
            </span>
          </div>
          <Timeline
            from={s.window_from}
            to={s.window_to}
            failing={failing}
            backups={s.backups}
            onPick={owner ? (at) => a.restore(at) : undefined}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
          <History className="size-5 shrink-0" />
          {s.state === "needs_restart"
            ? "The timeline starts with the first full backup, right after PostgreSQL's restart."
            : "The timeline starts with the first full backup."}
        </div>
      )}
      <div
        className={cn(
          "grid gap-3",
          phone ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {tiles.map(([label, value, sub]) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl border border-border bg-card p-4"
          >
            <div className="text-caption text-ash">{label}</div>
            <div className="mt-1 truncate text-subheading font-light">
              {value}
            </div>
            <div className="truncate text-caption text-muted-foreground">
              {sub}
            </div>
          </div>
        ))}
      </div>
    </>
  )
  if (phone) {
    return (
      <section className="flex flex-col gap-4 border-y border-border bg-subtle px-4 py-5">
        {body}
      </section>
    )
  }
  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-border bg-subtle p-6">
      {body}
    </section>
  )
}

function Copies({ status: s }: { status: PitrStatus }) {
  const { owner, phone } = usePitrDashboard()
  const a = usePitrActions()
  if (!s.copies.length) return null
  return (
    <Panel
      title="Restored copies"
      caption={`${s.copies.length} running on ${s.server_name}`}
    >
      <div className={cn("grid gap-3", !phone && "md:grid-cols-2")}>
        {s.copies.map((c) => (
          <div
            key={c.id}
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                <ArchiveRestore className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-body-sm font-medium">
                  {c.target_time
                    ? `As of ${fmtTime(c.target_time)}`
                    : "As of the newest point"}
                </div>
                <div className="truncate text-caption text-muted-foreground">
                  Port {c.restore_port} on localhost · made{" "}
                  {ago(c.finished_at ?? c.created_at)}
                </div>
                <div
                  className="truncate font-mono text-caption text-ash"
                  title={c.restore_dir}
                >
                  {c.restore_dir}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.copy_database_id && (
                <Button
                  variant="outline"
                  className="h-11 md:h-9"
                  render={
                    <Link href={`/databases/${c.copy_database_id}?tab=data`} />
                  }
                  nativeButton={false}
                >
                  <ExternalLink />
                  Open in Morche
                </Button>
              )}
              {owner && (
                <Button
                  variant="ghost"
                  className="h-11 text-destructive md:h-9"
                  disabled={a.busy}
                  onClick={() => a.teardown(c)}
                >
                  <Trash2 />
                  Take down
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function BackupList({ status: s }: { status: PitrStatus }) {
  const { owner } = usePitrDashboard()
  const a = usePitrActions()
  const rows = [...s.backups].sort((x, y) => y.stop.localeCompare(x.stop))
  const took = (b: PitrBackup) =>
    spanText(new Date(b.stop).getTime() - new Date(b.start).getTime())
  return (
    <Panel
      title="Backups"
      caption={rows.length ? `${rows.length} in the storage` : undefined}
      flush
    >
      <Rows
        label="Backups"
        rows={rows}
        rowKey={(b) => b.label}
        empty="No backup yet. The first full one is taken right after setup (or the restart)."
        cols={[
          {
            key: "type",
            label: "Kind",
            cell: (b) => (
              <span className="flex items-center gap-2">
                <Tag tone={b.type === "full" ? "brand" : undefined}>
                  {backupTypeLabel[b.type]}
                </Tag>
                {b.error && <Tag tone="warning">Problem</Tag>}
              </span>
            ),
          },
          {
            key: "when",
            label: "Finished",
            cell: (b) => (
              <span className="whitespace-nowrap" title={fmtTime(b.stop)}>
                {shortTime(b.stop)}
              </span>
            ),
          },
          {
            key: "took",
            label: "Took",
            cell: (b) => <span className="whitespace-nowrap">{took(b)}</span>,
            className: "max-2xl:hidden",
          },
          {
            key: "data",
            label: "Database",
            cell: (b) => formatSize(b.size),
            end: true,
            className: "max-[100rem]:hidden",
          },
          {
            key: "repo",
            label: "In the storage",
            cell: (b) => formatSize(b.repo_delta),
            end: true,
          },
          {
            key: "act",
            label: "",
            end: true,
            cell: (b) =>
              owner ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={a.busy}
                  onClick={() => a.restore(new Date(b.stop))}
                  title="Restore to the moment this backup ended"
                >
                  Restore to here
                </Button>
              ) : null,
          },
        ]}
        phone={(b) => ({
          title: (
            <span className="flex items-center gap-2">
              {backupTypeLabel[b.type]}
              {b.error && <Tag tone="warning">Problem</Tag>}
            </span>
          ),
          sub: `${fmtTime(b.stop)} · took ${took(b)}`,
          end: formatSize(b.repo_delta),
        })}
        onOpen={owner ? (b) => a.restore(new Date(b.stop)) : undefined}
      />
    </Panel>
  )
}

function Activity() {
  const { database: d } = usePitrDashboard()
  const runs = usePitrRuns(d.id)
  const items = runs.data?.items ?? []
  return (
    <Panel
      title="Activity"
      caption={runs.data ? `${runs.data.total} in all` : undefined}
      flush
    >
      {runs.isPending ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-6 text-body-sm text-muted-foreground">
          Nothing yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 15).map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </ul>
      )}
    </Panel>
  )
}

function RunRow({ run: r }: { run: PitrRun }) {
  const [open, setOpen] = useState(false)
  const tone =
    r.state === "succeeded"
      ? "success"
      : runActive(r)
        ? "muted"
        : r.state === "skipped"
          ? "muted"
          : "warning"
  return (
    <li className="px-4 py-3 md:px-5">
      <button
        type="button"
        className="flex w-full min-w-0 items-start gap-3 text-start"
        onClick={() => r.error && setOpen((v) => !v)}
      >
        <span className="mt-1.5">
          {runActive(r) ? (
            <LoaderCircle className="size-3.5 animate-spin text-brand" />
          ) : (
            <Dot tone={tone} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-body-sm">{runKindLabel(r)}</span>
            {r.trigger === "schedule" && <Tag>Scheduled</Tag>}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {r.state === "failed"
              ? "Failed"
              : r.state === "succeeded"
                ? "Done"
                : r.state}
            {" · "}
            {ago(r.finished_at ?? r.started_at ?? r.created_at)}
            {r.created_by_name ? ` · ${r.created_by_name}` : ""}
            {r.kind === "restore" && r.target_time
              ? ` · to ${fmtTime(r.target_time)}`
              : ""}
          </span>
          {r.error && (
            <span
              className={cn(
                "mt-1 block text-caption text-destructive",
                !open && "line-clamp-2",
              )}
            >
              {r.error}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

function Dot({ tone }: { tone: "success" | "warning" | "muted" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "success" && "bg-success",
        tone === "warning" && "bg-warning",
        tone === "muted" && "bg-mist",
      )}
    />
  )
}

// "Nov 22, 12:26": enough to tell backups apart in a table.
const shortTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
