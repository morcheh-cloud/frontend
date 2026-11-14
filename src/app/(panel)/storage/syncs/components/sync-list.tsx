"use client"

import {
  CalendarClock,
  CloudOff,
  Ellipsis,
  Hourglass,
  ShieldCheck,
  Timer,
  Trash2,
  TriangleAlert,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useRef, useState } from "react"

import { RunStateBadge } from "@/app/(panel)/cronjobs/components/meta"
import {
  Facts,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { StorageSync } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useStorageSyncs } from "../api"
import { Flow, LiveProgress } from "./flow"
import {
  engineMeta,
  isReplication,
  isRunning,
  kindMeta,
  modeMeta,
  newSyncHref,
  nextRunText,
  StateLabel,
  type SyncKind,
  syncHref,
  syncState,
  timingText,
  triggerText,
} from "./meta"
import { useSyncCan } from "./permissions"
import { useSyncMenu } from "./sync-actions"

const rank = { problem: 0, warning: 1, running: 2, ok: 3, idle: 4, paused: 5 }

// Worst first, then by name.
const sorted = (items: StorageSync[]) =>
  [...items].sort(
    (a, b) =>
      rank[syncState(a).tone] - rank[syncState(b).tone] ||
      a.name.localeCompare(b.name),
  )

// How many of each kind, for the tab labels.
export function useSyncCounts() {
  const { workspace } = useWorkspace()
  const list = useStorageSyncs(workspace?.id)
  const items = list.data ?? []
  return {
    sync: items.filter((s) => s.kind === "sync").length,
    migrate: items.filter((s) => s.kind === "migrate").length,
  }
}

export function SyncList({ kind, phone }: { kind: SyncKind; phone: boolean }) {
  const { workspace } = useWorkspace()
  const list = useStorageSyncs(workspace?.id)
  const can = useSyncCan()
  const items = sorted((list.data ?? []).filter((s) => s.kind === kind))

  if (list.isPending) return <Placeholder phone={phone} />
  if (list.isError && !list.data) {
    return (
      <Blank
        phone={phone}
        icon={<CloudOff />}
        title={`Couldn't load ${kindMeta[kind].plural.toLowerCase()}`}
        text={list.error.message || "The server didn't answer. Try again."}
        action={
          <Button variant="outline" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  if (items.length === 0)
    return <NoSyncs kind={kind} phone={phone} can={can.edit} />
  if (phone) return <SyncRows items={items} />
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,28rem),1fr))] gap-4">
      {items.map((s) => (
        <SyncCard key={s.id} sync={s} />
      ))}
    </div>
  )
}

function SyncCard({ sync: s }: { sync: StorageSync }) {
  const menu = useSyncMenu(s)
  const Kind = kindMeta[s.kind].icon
  const running = isRunning(s)
  const timing = timingText(s)
  return (
    <article className="group/card relative flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50">
      <header className="flex items-start gap-3 px-5 pt-5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isReplication(s)
              ? "bg-brand text-primary-foreground"
              : "bg-brand-soft text-brand-strong",
          )}
        >
          <Kind className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-medium">
            <Link
              href={syncHref(s.id)}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {s.name}
            </Link>
          </h3>
          <StateLabel sync={s} className="text-caption" />
        </div>
        <div className="relative z-10 -me-2 -mt-1">
          <ItemMenu groups={menu} label={`${s.name} actions`} />
        </div>
      </header>

      <Flow sync={s} className="px-5 pt-5" />

      <div className="flex flex-wrap gap-1.5 px-5 pt-4">
        <Chip icon={engineMeta[s.engine].icon}>
          {engineMeta[s.engine].label}
        </Chip>
        {!isReplication(s) && (
          <Chip icon={triggerIcon[s.trigger]}>{triggerText(s)}</Chip>
        )}
        {s.kind === "sync" && s.mode === "mirror" && (
          <Chip>{modeMeta.mirror.label}</Chip>
        )}
        {s.kind === "migrate" && s.options.verify && (
          <Chip icon={ShieldCheck}>Checks every file</Chip>
        )}
        {s.kind === "migrate" && s.options.delete_source && (
          <Chip icon={Trash2} tone="warning">
            Empties the source
          </Chip>
        )}
        {!!s.options.settle_minutes && (
          <Chip icon={Hourglass}>
            Waits {s.options.settle_minutes} min for new files
          </Chip>
        )}
        {!!s.held_count && (
          <Chip icon={Hourglass} tone="warning">
            {s.held_count} {s.held_count === 1 ? "deletion" : "deletions"}{" "}
            waiting
          </Chip>
        )}
      </div>

      {s.problem && (
        <p className="mx-5 mt-4 flex gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-caption text-destructive">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-2">{s.problem}</span>
        </p>
      )}

      <div className="mt-auto pt-4">
        {running && s.last_run?.id ? (
          <div className="border-t border-border px-5 py-3.5">
            <LiveProgress runId={s.last_run.id} />
          </div>
        ) : (
          <footer className="flex min-h-12 items-center gap-3 border-t border-border px-5 py-3 text-caption text-muted-foreground">
            {s.last_run?.id && !isReplication(s) ? (
              <RunStateBadge
                state={s.last_run.state}
                dryRun={s.last_run.dry_run}
                className="text-caption"
              />
            ) : null}
            <span
              className="ms-auto truncate"
              title={nextRunText(s) ? `Next run: ${nextRunText(s)}` : undefined}
            >
              {timing}
            </span>
          </footer>
        )}
      </div>
    </article>
  )
}

const triggerIcon = {
  manual: undefined,
  schedule: CalendarClock,
  interval: Timer,
}

function Chip({
  icon: Icon,
  tone,
  children,
}: {
  icon?: typeof Zap
  tone?: "warning"
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2.5 text-caption whitespace-nowrap text-muted-foreground",
        tone === "warning" && "bg-warning/10 text-warning",
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  )
}

function SyncRows({ items }: { items: StorageSync[] }) {
  const [sheetOpen, setSheetOpen] = useOpen("sync-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  // Keep the last tapped one so the sheet can animate out.
  const last = useRef<StorageSync | null>(null)
  const current = items.find((s) => s.id === sheetId) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((s) => {
          const Kind = kindMeta[s.kind].icon
          const st = syncState(s)
          return (
            <li key={s.id} className="flex items-center">
              <Link
                href={syncHref(s.id)}
                className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <Kind className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-body font-medium">
                      {s.name}
                    </span>
                  </span>
                  <span className="block truncate text-body-sm text-muted-foreground">
                    {s.source.name} → {s.dest.name}
                  </span>
                  {isRunning(s) && s.last_run?.id ? (
                    <span className="mt-1.5 block">
                      <LiveProgress runId={s.last_run.id} compact />
                    </span>
                  ) : (
                    <span className="mt-0.5 flex items-center gap-1.5 text-caption">
                      <StateLabel sync={s} className="text-caption" />
                      {st.tone !== "problem" && timingText(s) && (
                        <span className="truncate text-ash">
                          · {timingText(s)}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </Link>
              <button
                type="button"
                aria-label={`${s.name} actions`}
                onClick={() => {
                  setSheetId(s.id)
                  setSheetOpen(true)
                }}
                className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
              >
                <Ellipsis className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>
      {current && (
        <SyncSheet
          sync={current}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

function SyncSheet({
  sync: s,
  open,
  onOpenChange,
}: {
  sync: StorageSync
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useSyncMenu(s)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={s.name}>
      {s.problem && (
        <p className="mx-2 mb-3 flex gap-2 rounded-2xl bg-subtle p-4 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          {s.problem}
        </p>
      )}
      <Facts
        items={[
          { label: "From", value: `${s.source.name} ${s.source.path}` },
          { label: "To", value: `${s.dest.name} ${s.dest.path}` },
          { label: "How", value: engineMeta[s.engine].label },
          {
            label: "When",
            value: isReplication(s) ? "Each change, live" : triggerText(s),
          },
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

function NoSyncs({
  kind,
  phone,
  can,
}: {
  kind: SyncKind
  phone: boolean
  can: boolean
}) {
  const Kind = kindMeta[kind].icon
  const ways =
    kind === "sync"
      ? [
          {
            icon: Timer,
            title: "In the background",
            text: "Every few minutes, after the last run ends.",
          },
          {
            icon: CalendarClock,
            title: "On a schedule",
            text: "Nightly, hourly, or any cron time.",
          },
          {
            icon: Zap,
            title: "MinIO replication",
            text: "Between two MinIOs, live, without Morche.",
          },
        ]
      : [
          {
            icon: Kind,
            title: "Copy everything",
            text: "Any storage to any storage, folders kept.",
          },
          {
            icon: ShieldCheck,
            title: "Check it arrived",
            text: "Every file compared on the destination.",
          },
          {
            icon: Trash2,
            title: "Empty the old one",
            text: "Only after the check passes, if you want.",
          },
        ]
  return (
    <Blank
      phone={phone}
      icon={<Kind />}
      title={
        kind === "sync"
          ? "Keep two storages in step"
          : "Move a storage somewhere else"
      }
      text={kindMeta[kind].text}
      action={
        can ? (
          <Button
            render={<Link href={newSyncHref({ kind })} />}
            nativeButton={false}
          >
            {kind === "sync" ? "New sync" : "New migration"}
          </Button>
        ) : undefined
      }
    >
      <div
        className={cn(
          "mt-8 grid w-full max-w-2xl gap-3 text-start",
          phone ? "grid-cols-1" : "grid-cols-3",
        )}
      >
        {ways.map((w) => (
          <div
            key={w.title}
            className="flex gap-3 rounded-2xl border border-border p-4"
          >
            <w.icon className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              <span className="block text-body-sm font-medium">{w.title}</span>
              <span className="block text-caption text-muted-foreground">
                {w.text}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Blank>
  )
}

function Blank({
  phone,
  icon,
  title,
  text,
  action,
  children,
}: {
  phone: boolean
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center md:py-20",
        !phone && "rounded-2xl border border-border",
      )}
    >
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="text-body font-medium">{title}</h2>
      <p className="mt-1 max-w-md text-body-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
      {children}
    </div>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  if (phone) {
    return (
      <ul className="divide-y divide-border border-y border-border">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <li key={i} className="flex h-[4.5rem] items-center gap-3 px-4">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,28rem),1fr))] gap-4">
      {Array.from({ length: 2 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-56 flex-col gap-5 rounded-2xl border border-border p-5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ))}
    </div>
  )
}
