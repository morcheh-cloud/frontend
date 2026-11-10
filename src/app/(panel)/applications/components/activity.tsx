"use client"

import { Ellipsis, History, Square, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDeferredValue, useRef, useState } from "react"

import { duration, RunStateBadge } from "@/app/(panel)/ansible/components/meta"
import {
  Failed,
  Placeholder,
  Th,
} from "@/app/(panel)/scripts/components/scripts-view"
import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { SoftwareRun } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runFinished, type SoftwareRunsQuery, useSoftwareRuns } from "../api"
import { actionLabels, runHref } from "./meta"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

const PAGE = 30

export function serversText(r: Pick<SoftwareRun, "server_names">) {
  const n = r.server_names
  if (n.length === 0) return "—"
  if (n.length <= 2) return n.join(", ")
  return `${n[0]} and ${n.length - 1} more`
}

function useRunMenu(r: SoftwareRun): Item[][] {
  const a = useSoftwareActions()
  const can = useSoftwareCan(r.workspace_id)
  if (!can.recipes) return []
  return [
    !runFinished(r.state)
      ? [
          {
            key: "stop",
            label: "Stop",
            icon: <Square className="size-4" />,
            onSelect: () => a.cancelRun(r.id),
          },
        ]
      : [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 className="size-4" />,
            destructive: true,
            onSelect: () => a.removeRun(r.id),
          },
        ],
  ]
}

export function RunsPanel({
  phone,
  q = "",
  state = "all",
  serverId,
}: {
  phone: boolean
  q?: string
  state?: string
  serverId?: string
}) {
  const { workspace } = useWorkspace()
  const [pages, setPages] = useState(1)
  const query: SoftwareRunsQuery = {
    q: useDeferredValue(q.trim()) || undefined,
    state: state === "all" ? undefined : (state as SoftwareRunsQuery["state"]),
    server_id: serverId,
    limit: PAGE * pages,
  }
  const list = useSoftwareRuns(workspace?.id, query)
  const items = list.data?.items ?? []
  const more = (list.data?.total ?? 0) > items.length

  if (list.isPending) return <Placeholder phone={phone} />
  if (list.isError && !list.data)
    return <Failed error={list.error} onRetry={() => list.refetch()} />
  if (items.length === 0) {
    return (
      <Empty
        icon={History}
        title={q || state !== "all" ? "No run matches" : "No runs yet"}
        body="Every install, update, uninstall and system upgrade is kept here, with each server's output."
      />
    )
  }
  const loadMore = more && (
    <div className={cn("flex justify-center", phone ? "py-4" : "pt-2")}>
      <Button
        variant="outline"
        className="h-11 md:h-9"
        disabled={list.isFetching}
        onClick={() => setPages((n) => n + 1)}
      >
        {list.isFetching ? "Loading…" : "Show more"}
      </Button>
    </div>
  )
  return phone ? (
    <>
      <RunRows items={items} />
      {loadMore}
    </>
  ) : (
    <>
      <div className="@container overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              <Th>State</Th>
              <Th>What</Th>
              <Th>Servers</Th>
              <Th className="hidden @4xl:table-cell">Result</Th>
              <Th className="hidden @3xl:table-cell">Started by</Th>
              <Th>When</Th>
              <th scope="col" className="w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((r) => (
              <RunRow key={r.id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
      {loadMore}
    </>
  )
}

export function runTitle(r: Pick<SoftwareRun, "action" | "name">) {
  return r.action === "upgrade-system"
    ? "System upgrade"
    : `${actionLabels[r.action]} ${r.name}`
}

function ResultText({ r }: { r: SoftwareRun }) {
  const waiting = r.targets - r.succeeded - r.failed
  return (
    <span className="text-caption text-muted-foreground">
      {r.succeeded} ok
      {r.failed > 0 && (
        <>
          {" · "}
          <span className="text-destructive">{r.failed} failed</span>
        </>
      )}
      {waiting > 0 && ` · ${waiting} not done`}
    </span>
  )
}

function RunRow({ r }: { r: SoftwareRun }) {
  const router = useRouter()
  const menu = useRunMenu(r)
  const href = runHref(r.id)
  return (
    <tr
      className="h-14 cursor-pointer hover:bg-subtle"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,[role=menu]")) return
        router.push(href)
      }}
    >
      <td className="px-3 whitespace-nowrap">
        <RunStateBadge state={r.state} />
      </td>
      <td className="max-w-80 px-3">
        <Link
          href={href}
          className="block truncate font-medium outline-none hover:text-brand focus-visible:text-brand"
        >
          {runTitle(r)}
        </Link>
      </td>
      <td className="max-w-48 truncate px-3 text-muted-foreground">
        {serversText(r)}
      </td>
      <td className="hidden px-3 whitespace-nowrap @4xl:table-cell">
        <ResultText r={r} />
      </td>
      <td className="hidden max-w-40 truncate px-3 text-muted-foreground @3xl:table-cell">
        {r.created_by_name || "Schedule"}
      </td>
      <td className="px-3 whitespace-nowrap">
        <span className="block">{timeAgo(r.created_at)}</span>
        {r.started_at && (
          <span className="block text-caption text-ash">
            {duration(r.started_at, r.finished_at ?? undefined)}
          </span>
        )}
      </td>
      <td className="pe-2">
        <ItemMenu groups={menu} label="Run actions" />
      </td>
    </tr>
  )
}

function RunRows({ items }: { items: SoftwareRun[] }) {
  const [open, setOpen] = useOpen("software-run-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<SoftwareRun | null>(null)
  const current = items.find((r) => r.id === id) ?? last.current
  if (current) last.current = current
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((r) => (
          <RunItem
            key={r.id}
            r={r}
            onMenu={() => {
              setId(r.id)
              setOpen(true)
            }}
          />
        ))}
      </ul>
      {current && <RunSheet r={current} open={open} onOpenChange={setOpen} />}
    </>
  )
}

function RunItem({ r, onMenu }: { r: SoftwareRun; onMenu: () => void }) {
  const menu = useRunMenu(r)
  return (
    <li className="flex items-center">
      <Link
        href={runHref(r.id)}
        className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
      >
        <span className="truncate text-body font-medium">{runTitle(r)}</span>
        <span className="flex items-center gap-2">
          <RunStateBadge state={r.state} />
          <span className="truncate text-caption text-ash">
            {serversText(r)} · {timeAgo(r.created_at)}
          </span>
        </span>
      </Link>
      {menu.flat().length > 0 && (
        <button
          type="button"
          aria-label="Run actions"
          className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:bg-muted"
          onClick={onMenu}
        >
          <Ellipsis className="size-5" />
        </button>
      )}
    </li>
  )
}

function RunSheet({
  r,
  open,
  onOpenChange,
}: {
  r: SoftwareRun
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useRunMenu(r)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={runTitle(r)}>
      <div className="mx-2 mb-3 flex flex-col gap-1 rounded-2xl bg-subtle p-4">
        <RunStateBadge state={r.state} />
        <ResultText r={r} />
        <span className="text-caption text-ash">
          {r.created_by_name || "Schedule"} · {timeAgo(r.created_at)}
        </span>
      </div>
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
