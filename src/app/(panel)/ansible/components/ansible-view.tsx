"use client"

import {
  Ellipsis,
  FileCode2,
  History,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useDeferredValue, useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  Notices,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { AnsibleRun, Playbook } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runFinished, useAnsibleStatus, usePlaybooks, useRuns } from "../api"
import { useAnsibleActions } from "./ansible-actions"
import { duration, RecapText, RunStateBadge, useAnsibleFilters } from "./meta"
import { ModulesPanel } from "./modules/modules-panel"
import { useAnsibleCan } from "./permissions"

export function AnsibleView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

function View({ phone }: { phone: boolean }) {
  const can = useAnsibleCan()
  const router = useRouter()
  const status = useAnsibleStatus()
  const [{ tab }] = useAnsibleFilters()
  const newPlaybook = () => router.push("/ansible/playbooks/new")

  const notes = []
  if (status.data && !status.data.installed) {
    notes.push({
      key: "missing",
      warn: true,
      title: "Ansible isn't installed on the Morche host",
      body: "Playbooks can be written and saved, but not run, until ansible-core is installed there. See the guide.",
    })
  } else if (status.data && !status.data.can_run && status.data.problem) {
    notes.push({
      key: "blocked",
      warn: true,
      title: "Playbooks can't be run here",
      body: status.data.problem,
    })
  }

  const header = phone ? (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Ansible</h1>
      <HelpButton
        href={guideHref("ansible")}
        label="Ansible guide"
        className="ms-auto"
      />
      {can.edit && (
        <Button
          size="icon-lg"
          aria-label="New playbook"
          className="rounded-full"
          onClick={newPlaybook}
        >
          <Plus className="size-5" />
        </Button>
      )}
    </header>
  ) : null

  return (
    <>
      {header}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        <Notices notes={notes} />
        <Bar
          phone={phone}
          action={
            can.edit && (
              <Button onClick={newPlaybook}>
                <Plus />
                New playbook
              </Button>
            )
          }
        />
        {tab === "runs" && can.runs ? (
          <RunsPanel phone={phone} />
        ) : tab === "modules" ? (
          <ModulesPanel phone={phone} />
        ) : (
          <PlaybooksPanel
            phone={phone}
            onNew={can.edit ? newPlaybook : undefined}
          />
        )}
      </div>
    </>
  )
}

function Bar({ phone, action }: { phone: boolean; action?: ReactNode }) {
  const can = useAnsibleCan()
  const [{ tab, q, show }, setFilters] = useAnsibleFilters()
  const tabs = [
    { value: "playbooks" as const, label: "Playbooks" },
    { value: "modules" as const, label: "Modules" },
    ...(can.runs ? [{ value: "runs" as const, label: "Runs" }] : []),
  ]
  const tabSwitch = tabs.length > 1 && (
    <Segmented
      label="Show"
      items={tabs}
      value={tab}
      onChange={(t) =>
        setFilters({
          tab: t === "playbooks" ? null : t,
          show: null,
          cat: null,
        })
      }
    />
  )
  const searchLabel =
    tab === "runs"
      ? "Search runs"
      : tab === "modules"
        ? "Search modules: apt, copy, docker…"
        : "Search playbooks"
  const search = (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder={searchLabel}
      label={searchLabel}
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const showSwitch = tab === "runs" && (
    <Segmented
      label="State"
      items={[
        { value: "all", label: "All" },
        { value: "running", label: "Running" },
        { value: "failed", label: "Failed" },
        { value: "succeeded", label: "Succeeded" },
      ]}
      value={show}
      onChange={(s) => setFilters({ show: s === "all" ? null : s })}
    />
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-3">
        {search}
        {(tabSwitch || showSwitch) && (
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            {tabSwitch}
            {showSwitch}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabSwitch}
      {tabSwitch && <span className="mx-1 h-5 w-px bg-border" />}
      {search}
      {showSwitch}
      {action && <div className="ms-auto flex gap-2">{action}</div>}
    </div>
  )
}

// ---- Playbooks ----

function usePlaybookMenu(p: Playbook): Item[][] {
  const can = useAnsibleCan()
  const a = useAnsibleActions()
  const router = useRouter()
  return [
    can.run
      ? [
          {
            key: "run",
            label: "Run…",
            icon: <Play />,
            onSelect: () => a.run({ playbookId: p.id, name: p.name }),
          },
        ]
      : [],
    [
      {
        key: "edit",
        label: can.edit ? "Edit" : "Open",
        icon: can.edit ? <Pencil /> : <FileCode2 />,
        onSelect: () => router.push(`/ansible/playbooks/${p.id}`),
      },
      ...(p.last_run_id && can.runs
        ? [
            {
              key: "last",
              label: "Last run",
              icon: <History />,
              onSelect: () => router.push(`/ansible/runs/${p.last_run_id}`),
            },
          ]
        : []),
    ],
    can.edit
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.removePlaybook(p),
          },
        ]
      : [],
  ]
}

function PlaybooksPanel({
  phone,
  onNew,
}: {
  phone: boolean
  onNew?: () => void
}) {
  const { workspace } = useWorkspace()
  const list = usePlaybooks(workspace?.id)
  const [{ q }] = useAnsibleFilters()
  const needle = useDeferredValue(q.trim().toLowerCase())
  const all = list.data ?? []
  const items = all
    .filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  if (list.isPending) return <Placeholder phone={phone} />
  if (list.isError && !list.data) {
    return <Failed error={list.error} onRetry={() => list.refetch()} />
  }
  if (all.length === 0) {
    return (
      <Empty
        icon={FileCode2}
        title="No playbooks yet"
        body="A playbook lists what to do on your servers, in YAML. Start from a template: updating packages, adding a user, gathering facts…"
        action={
          onNew && (
            <Button className="h-11 w-full md:h-9 md:w-auto" onClick={onNew}>
              <Plus />
              New playbook
            </Button>
          )
        }
      />
    )
  }
  if (items.length === 0) {
    return <NoMatch phone={phone} what="playbook" />
  }
  return phone ? (
    <PlaybookRows items={items} />
  ) : (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th>Last run</Th>
            <Th className="hidden @3xl:table-cell">Changed</Th>
            <th scope="col" className="w-28">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((p) => (
            <PlaybookRow key={p.id} p={p} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlaybookRow({ p }: { p: Playbook }) {
  const can = useAnsibleCan()
  const a = useAnsibleActions()
  const menu = usePlaybookMenu(p)
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-96 px-3">
        <Link
          href={`/ansible/playbooks/${p.id}`}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileCode2 className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.name}</span>
            {p.description && (
              <span className="block truncate text-caption text-ash">
                {p.description}
              </span>
            )}
          </span>
        </Link>
      </td>
      <td className="px-3 whitespace-nowrap">
        {p.last_run_at && p.last_run_state ? (
          <LastRun p={p} link={can.runs} />
        ) : (
          <span className="text-ash">Never run</span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @3xl:table-cell">
        {timeAgo(p.updated_at)}
      </td>
      <td className="pe-2">
        <div className="flex items-center justify-end gap-1">
          {can.run && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => a.run({ playbookId: p.id, name: p.name })}
            >
              <Play />
              Run
            </Button>
          )}
          <ItemMenu groups={menu} label={`${p.name} actions`} />
        </div>
      </td>
    </tr>
  )
}

function LastRun({ p, link }: { p: Playbook; link: boolean }) {
  const body = (
    <span className="flex items-center gap-2">
      <RunStateBadge state={p.last_run_state ?? ""} />
      <span className="text-caption text-ash">
        {timeAgo(p.last_run_at ?? null)}
      </span>
    </span>
  )
  return link ? (
    <Link href={`/ansible/runs/${p.last_run_id}`} className="hover:underline">
      {body}
    </Link>
  ) : (
    body
  )
}

function PlaybookRows({ items }: { items: Playbook[] }) {
  const [open, setOpen] = useOpen("ansible-playbook-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<Playbook | null>(null)
  const current = items.find((p) => p.id === id) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((p) => (
          <li key={p.id} className="flex items-center">
            <Link
              href={`/ansible/playbooks/${p.id}`}
              className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileCode2 className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">
                  {p.name}
                </span>
                <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
                  {p.last_run_state ? (
                    <>
                      <RunStateBadge state={p.last_run_state} />
                      <span className="truncate text-caption text-ash">
                        {timeAgo(p.last_run_at ?? null)}
                      </span>
                    </>
                  ) : (
                    <span className="truncate">
                      {p.description || "Never run"}
                    </span>
                  )}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={`${p.name} actions`}
              className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:bg-muted"
              onClick={() => {
                setId(p.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <PlaybookSheet p={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function PlaybookSheet({
  p,
  open,
  onOpenChange,
}: {
  p: Playbook
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = usePlaybookMenu(p)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={p.name}>
      {p.description && (
        <p className="mx-2 mb-3 text-body-sm text-muted-foreground">
          {p.description}
        </p>
      )}
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// ---- Runs ----

function useRunMenu(r: AnsibleRun): Item[][] {
  const can = useAnsibleCan()
  const a = useAnsibleActions()
  const router = useRouter()
  const active = !runFinished(r.state)
  return [
    [
      {
        key: "open",
        label: "Open",
        icon: <FileCode2 />,
        onSelect: () => router.push(`/ansible/runs/${r.id}`),
      },
      ...(can.run
        ? [
            {
              key: "again",
              label: "Run again…",
              icon: <RefreshCw />,
              onSelect: () =>
                a.run(
                  { playbookId: r.playbook_id, name: r.playbook_name },
                  {
                    servers: r.hosts.map((h) => ({
                      id: h.server_id,
                      name: h.name,
                    })),
                    options: r.options,
                  },
                ),
            },
          ]
        : []),
    ],
    can.manageRuns
      ? active
        ? [
            {
              key: "stop",
              label: "Stop",
              icon: <Square />,
              destructive: true,
              onSelect: () => a.cancelRun(r),
            },
          ]
        : [
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.removeRun(r),
            },
          ]
      : [],
  ]
}

const RUN_PAGE = 50

function RunsPanel({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const [{ q, show }] = useAnsibleFilters()
  const [pages, setPages] = useState(1)
  const query = {
    q: useDeferredValue(q.trim()) || undefined,
    state: show === "all" ? undefined : show,
    limit: RUN_PAGE * pages,
  }
  const list = useRuns(workspace?.id, query)
  const items = list.data?.items ?? []
  const more = (list.data?.total ?? 0) > items.length

  if (list.isPending) return <Placeholder phone={phone} />
  if (list.isError && !list.data) {
    return <Failed error={list.error} onRetry={() => list.refetch()} />
  }
  if (items.length === 0) {
    return q || show !== "all" ? (
      <NoMatch phone={phone} what="run" />
    ) : (
      <Empty
        icon={History}
        title="No runs yet"
        body="Every time a playbook runs, its output and the result on each server are kept here."
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
              <Th>Playbook</Th>
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

function hostsText(r: AnsibleRun) {
  const n = r.hosts.length
  if (n === 1) return r.hosts[0].name
  return `${n} servers`
}

function RunRow({ r }: { r: AnsibleRun }) {
  const router = useRouter()
  const menu = useRunMenu(r)
  const href = `/ansible/runs/${r.id}`
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
          {r.playbook_name}
        </Link>
        {r.options.check && (
          <span className="text-caption text-ash">Dry run</span>
        )}
      </td>
      <td className="max-w-48 truncate px-3 text-muted-foreground">
        {hostsText(r)}
      </td>
      <td className="hidden px-3 whitespace-nowrap @4xl:table-cell">
        <RecapText recap={r.recap} />
      </td>
      <td className="hidden max-w-40 truncate px-3 text-muted-foreground @3xl:table-cell">
        {r.created_by_name}
      </td>
      <td className="px-3 whitespace-nowrap">
        <span className="block">{timeAgo(r.created_at)}</span>
        {r.started_at && (
          <span className="block text-caption text-ash">
            {duration(r.started_at, r.finished_at)}
          </span>
        )}
      </td>
      <td className="pe-2">
        <ItemMenu groups={menu} label="Run actions" />
      </td>
    </tr>
  )
}

function RunRows({ items }: { items: AnsibleRun[] }) {
  const [open, setOpen] = useOpen("ansible-run-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<AnsibleRun | null>(null)
  const current = items.find((r) => r.id === id) ?? last.current
  if (current) last.current = current
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((r) => (
          <li key={r.id} className="flex items-center">
            <Link
              href={`/ansible/runs/${r.id}`}
              className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span className="flex items-center gap-2">
                <span className="truncate text-body font-medium">
                  {r.playbook_name}
                </span>
                {r.options.check && (
                  <span className="shrink-0 text-caption text-ash">
                    Dry run
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <RunStateBadge state={r.state} />
                <span className="truncate text-caption text-ash">
                  {hostsText(r)} · {timeAgo(r.created_at)}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="Run actions"
              className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:bg-muted"
              onClick={() => {
                setId(r.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && <RunSheet r={current} open={open} onOpenChange={setOpen} />}
    </>
  )
}

function RunSheet({
  r,
  open,
  onOpenChange,
}: {
  r: AnsibleRun
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useRunMenu(r)
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={r.playbook_name}
    >
      <div className="mx-2 mb-3 flex flex-col gap-1 rounded-2xl bg-subtle p-4">
        <RunStateBadge state={r.state} />
        <RecapText recap={r.recap} />
        <span className="text-caption text-ash">
          {r.created_by_name} · {timeAgo(r.created_at)}
        </span>
      </div>
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// ---- Shared bits ----

export function Th({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {children}
    </th>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden border-border",
        phone ? "border-y" : "rounded-2xl border",
      )}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

function NoMatch({ phone, what }: { phone: boolean; what: string }) {
  const [, setFilters] = useAnsibleFilters()
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-12 text-center text-body-sm text-muted-foreground",
        !phone && "rounded-2xl border border-border",
      )}
    >
      No {what} matches.
      <Button
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => setFilters({ q: null, show: null })}
      >
        Clear filters
      </Button>
    </div>
  )
}

function Failed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center md:rounded-2xl md:border md:border-border">
      <p className="text-body-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" className="h-11 md:h-9" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
