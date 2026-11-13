"use client"

import { Plus, RefreshCcwDot } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import type { DockerAutoUpdate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { cronText } from "../../cronjobs/components/meta"
import {
  Empty,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useAutoUpdates } from "../api"
import { usePolicyActions } from "./auto-update-actions"
import { ActivityFilters, AutoUpdateEvents } from "./auto-update-events"
import {
  autoUpdateHref,
  coverText,
  lastStateMeta,
  listParsers,
  newAutoUpdateHref,
} from "./auto-update-meta"
import { type WsCtx, WsPage } from "./env-page"
import { NoMatch, PageBar, PhoneRow, Rows, Table, Tag, Tr } from "./kit"
import { Dot } from "./meta"

export function AutoUpdatePage() {
  return (
    <WsPage title="Auto-update" bleed>
      {(ctx) => <AutoUpdateView {...ctx} />}
    </WsPage>
  )
}

// /containers/auto-update: the workspace's policies that keep containers on
// the newest image of their tag (like Watchtower), and what they did.
function AutoUpdateView({ ws, phone }: WsCtx) {
  const router = useRouter()
  const [f, setF] = useQueryStates(listParsers, { history: "replace" })
  const query = useAutoUpdates(ws.id)
  const a = usePolicyActions(ws.id)
  const items = [...(query.data?.items ?? [])].sort((x, y) =>
    x.name.localeCompare(y.name),
  )
  const needle = f.q.trim().toLowerCase()
  const shown = needle
    ? items.filter((p) =>
        [p.name, ...p.servers.map((s) => s.name), ...p.include].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    : items
  const open = (p: DockerAutoUpdate) => router.push(autoUpdateHref(p.id))
  const create = () => router.push(newAutoUpdateHref({}))
  const activity = f.tab === "activity"

  const tabs = (
    <Segmented
      label="Show"
      value={f.tab}
      onChange={(tab) => setF({ tab: tab === "policies" ? null : tab })}
      items={[
        {
          value: "policies",
          label: items.length > 0 ? `Policies ${items.length}` : "Policies",
        },
        { value: "activity", label: "Activity" },
      ]}
    />
  )

  let body: React.ReactNode
  if (activity) {
    body = <AutoUpdateEvents ws={ws.id} phone={phone} />
  } else if (query.isPending) {
    body = <Skeleton className="h-60 rounded-2xl max-md:mx-4" />
  } else if (query.isError) {
    body = (
      <Empty
        icon={RefreshCcwDot}
        title="Couldn't read the auto-update policies"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={RefreshCcwDot}
        title="Keep containers up to date by themselves"
        body="A policy looks for a newer image of each container's tag on a schedule (or when your CI calls its webhook), pulls it and recreates the container with the same settings. Rolls back if the new one fails, cleans up old images and tells you what changed. Or have it only tell you."
        className="max-md:mt-4"
        action={
          a.can.edit && (
            <Button onClick={create}>
              <Plus />
              New policy
            </Button>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body = <NoMatch onReset={() => setF({ q: null })} />
  } else if (phone) {
    body = (
      <Rows>
        {shown.map((p) => {
          const last = lastStateMeta(p)
          return (
            <PhoneRow
              key={p.id}
              id={p.id}
              title={p.name}
              sub={
                <span className="inline-flex items-center gap-1.5">
                  <Dot tone={p.enabled ? last.tone : "muted"} />
                  {p.enabled ? last.label : "Paused"} · {coverText(p)}
                </span>
              }
              lead={<PolicyIcon p={p} />}
              onOpen={() => open(p)}
              menu={a.menu(p)}
            />
          )
        })}
      </Rows>
    )
  } else {
    body = (
      <Table
        head={[
          { label: "Policy" },
          { label: "Does" },
          { label: "Runs" },
          { label: "Last run" },
          { label: "Last 30 days", className: "hidden @4xl:table-cell" },
          { label: "On", className: "w-16" },
        ]}
      >
        {shown.map((p) => {
          const last = lastStateMeta(p)
          return (
            <Tr
              key={p.id}
              label={p.name}
              onOpen={() => open(p)}
              menu={a.menu(p)}
              cells={[
                {
                  node: (
                    <span className="flex items-center gap-3">
                      <PolicyIcon p={p} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {p.name}
                        </span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {coverText(p)}
                        </span>
                      </span>
                    </span>
                  ),
                },
                {
                  node:
                    p.mode === "monitor" ? (
                      <Tag tone="brand">Only tells</Tag>
                    ) : (
                      <span className="text-muted-foreground">Updates</span>
                    ),
                  className: "[&>span]:ms-0",
                },
                {
                  node: (
                    <span className="block">
                      <span className="block">
                        {p.cron ? cronText(p.cron) : "By hand or webhook"}
                      </span>
                      {p.enabled && p.next_run_at && (
                        <span className="block text-caption text-ash">
                          Next {timeAgo(p.next_run_at)}
                        </span>
                      )}
                    </span>
                  ),
                  className: "text-muted-foreground",
                },
                {
                  node: (
                    <span className="block">
                      <span className="flex items-center gap-1.5">
                        <Dot tone={last.tone} />
                        {last.label}
                      </span>
                      {p.last_run_at && (
                        <span className="block text-caption text-ash">
                          {timeAgo(p.last_run_at)}
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  node: <MonthCounts p={p} />,
                  className: "hidden @4xl:table-cell",
                },
                {
                  node: a.can.edit ? (
                    <Switch
                      aria-label={p.enabled ? "Pause" : "Turn on"}
                      checked={p.enabled}
                      disabled={a.toggling}
                      onCheckedChange={(on) => a.setEnabled(p, on)}
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {p.enabled ? "On" : "Paused"}
                    </span>
                  ),
                },
              ]}
            />
          )
        })}
      </Table>
    )
  }

  const running = items.filter((p) => p.running).length
  const failing = items.filter(
    (p) => p.enabled && p.last_state === "failed",
  ).length
  const caption =
    running > 0
      ? `${running} running now`
      : failing > 0
        ? `${failing} failed on the last run`
        : items.length > 0
          ? `${items.filter((p) => p.enabled).length} of ${items.length} on`
          : undefined

  return (
    <>
      <PageBar
        phone={phone}
        tabs={tabs}
        search={
          !activity && items.length > 0 ? (
            <SearchBox
              value={f.q}
              onChange={(q) => setF({ q: q || null })}
              placeholder="Search policies"
              label="Search policies"
              className="md:max-w-64"
            />
          ) : undefined
        }
        filters={
          activity ? (
            <ActivityFilters phone={phone} policies={items} />
          ) : undefined
        }
        caption={caption}
        refresh={{
          busy: query.isFetching,
          run: () => query.refetch(),
        }}
        primary={
          a.can.edit
            ? { label: "New policy", icon: <Plus />, run: create }
            : undefined
        }
      />
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>
      {a.dialogs}
    </>
  )
}

export function PolicyIcon({ p }: { p: DockerAutoUpdate }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        p.enabled
          ? "bg-brand-soft text-brand-strong"
          : "bg-muted text-muted-foreground",
      )}
    >
      <RefreshCcwDot className={cn("size-4", p.running && "animate-spin")} />
    </span>
  )
}

export function MonthCounts({ p }: { p: DockerAutoUpdate }) {
  const c = p.last_30_days
  const parts = [
    c.updated > 0 && { n: c.updated, label: "updated", tone: "" },
    c.available > 0 && { n: c.available, label: "found", tone: "" },
    c.rolled_back > 0 && {
      n: c.rolled_back,
      label: "rolled back",
      tone: "text-warning",
    },
    c.failed > 0 && { n: c.failed, label: "failed", tone: "text-destructive" },
  ].filter(Boolean) as { n: number; label: string; tone: string }[]
  if (parts.length === 0) return <span className="text-ash">Nothing</span>
  return (
    <span className="text-caption text-muted-foreground">
      {parts.map((x, i) => (
        <span key={x.label} className={x.tone}>
          {i > 0 && " · "}
          <span className="font-medium tabular-nums">{x.n}</span> {x.label}
        </span>
      ))}
    </span>
  )
}
