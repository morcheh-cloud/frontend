"use client"

import {
  Ellipsis,
  FileCode,
  History,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Square,
  SquareTerminal,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useDeferredValue, useRef, useState } from "react"

import { duration, RunStateBadge } from "@/app/(panel)/ansible/components/meta"
import {
  Empty,
  type Item,
  ItemMenu,
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
import type { Script, ScriptRun } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runFinished, serversText, useScriptRuns, useScripts } from "../api"
import {
  interpreterLabels,
  runAsLabels,
  timeoutText,
  useScriptsFilters,
} from "./meta"
import { useScriptsCan } from "./permissions"
import { useScriptsActions } from "./scripts-actions"

export function ScriptsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

function View({ phone }: { phone: boolean }) {
  const can = useScriptsCan()
  const a = useScriptsActions()
  const router = useRouter()
  const [{ tab }] = useScriptsFilters()
  const newScript = () => router.push("/scripts/new")

  const header = phone ? (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Scripts</h1>
      <HelpButton
        href={guideHref("scripts")}
        label="Scripts guide"
        className="ms-auto"
      />
      {can.run && (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Run a command"
          onClick={() => a.command()}
        >
          <SquareTerminal className="size-5" />
        </Button>
      )}
      {can.edit && (
        <Button
          size="icon-lg"
          aria-label="New script"
          className="rounded-full"
          onClick={newScript}
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
        <Bar
          phone={phone}
          action={
            (can.run || can.edit) && (
              <>
                {can.run && (
                  <Button variant="outline" onClick={() => a.command()}>
                    <SquareTerminal />
                    Run a command
                  </Button>
                )}
                {can.edit && (
                  <Button onClick={newScript}>
                    <Plus />
                    New script
                  </Button>
                )}
              </>
            )
          }
        />
        {tab === "runs" && can.runs ? (
          <RunsPanel phone={phone} />
        ) : (
          <ScriptsPanel
            phone={phone}
            onNew={can.edit ? newScript : undefined}
          />
        )}
      </div>
    </>
  )
}

function Bar({ phone, action }: { phone: boolean; action?: ReactNode }) {
  const can = useScriptsCan()
  const [{ tab, q, show }, setFilters] = useScriptsFilters()
  const tabSwitch = can.runs && (
    <Segmented
      label="Show"
      items={[
        { value: "scripts" as const, label: "Scripts" },
        { value: "runs" as const, label: "Runs" },
      ]}
      value={tab}
      onChange={(t) =>
        setFilters({ tab: t === "scripts" ? null : t, show: null })
      }
    />
  )
  const searchLabel = tab === "runs" ? "Search runs" : "Search scripts"
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

// ---- Scripts ----

export function useScriptMenu(
  s: Script,
  opts?: { server?: { id: string; name: string } },
): Item[][] {
  const can = useScriptsCan()
  const a = useScriptsActions()
  const router = useRouter()
  const preset = opts?.server ? { servers: [opts.server] } : undefined
  return [
    can.run
      ? [
          {
            key: "run",
            label: opts?.server ? "Run here…" : "Run…",
            icon: <Play />,
            onSelect: () => a.runScript(s, preset),
          },
        ]
      : [],
    [
      {
        key: "edit",
        label: can.edit ? "Edit" : "Open",
        icon: can.edit ? <Pencil /> : <FileCode />,
        onSelect: () => router.push(`/scripts/${s.id}`),
      },
      ...(s.last_run && can.runs
        ? [
            {
              key: "last",
              label: "Last run",
              icon: <History />,
              onSelect: () =>
                router.push(`/scripts/runs/${s.last_run?.run_id}`),
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
            onSelect: () => a.removeScript(s),
          },
        ]
      : [],
  ]
}

export function scriptMeta(s: Script) {
  return `${interpreterLabels[s.interpreter]} · ${runAsLabels[s.run_as]} · ${timeoutText(s.timeout_seconds)}`
}

function filterScripts(all: Script[], q: string) {
  const needle = q.trim().toLowerCase()
  return all
    .filter(
      (s) =>
        !needle ||
        s.name.toLowerCase().includes(needle) ||
        s.description.toLowerCase().includes(needle) ||
        s.content.toLowerCase().includes(needle),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

function ScriptsPanel({
  phone,
  onNew,
}: {
  phone: boolean
  onNew?: () => void
}) {
  const { workspace } = useWorkspace()
  const list = useScripts(workspace?.id)
  const [{ q }] = useScriptsFilters()
  const needle = useDeferredValue(q)
  const all = list.data ?? []
  const items = filterScripts(all, needle)

  if (list.isPending) return <Placeholder phone={phone} />
  if (list.isError && !list.data) {
    return <Failed error={list.error} onRetry={() => list.refetch()} />
  }
  if (all.length === 0) {
    return (
      <Empty
        icon={FileCode}
        title="No scripts yet"
        body="Save a script once (a cleanup, a health check, a restart) and run it on any number of servers in a few taps, with each server's output kept."
        action={
          onNew && (
            <Button className="h-11 w-full md:h-9 md:w-auto" onClick={onNew}>
              <Plus />
              New script
            </Button>
          )
        }
      />
    )
  }
  if (items.length === 0) return <NoMatch phone={phone} what="script" />
  return phone ? <ScriptRows items={items} /> : <ScriptTable items={items} />
}

export function ScriptTable({
  items,
  server,
}: {
  items: Script[]
  server?: { id: string; name: string }
}) {
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th className="hidden @3xl:table-cell">Runs with</Th>
            <Th>{server ? "Last run here" : "Last run"}</Th>
            <Th className="hidden @4xl:table-cell">Changed</Th>
            <th scope="col" className="w-28">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((s) => (
            <ScriptRow key={s.id} s={s} server={server} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScriptRow({
  s,
  server,
}: {
  s: Script
  server?: { id: string; name: string }
}) {
  const can = useScriptsCan()
  const a = useScriptsActions()
  const menu = useScriptMenu(s, { server })
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-96 px-3">
        <Link
          href={`/scripts/${s.id}`}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileCode className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{s.name}</span>
            {s.description && (
              <span className="block truncate text-caption text-ash">
                {s.description}
              </span>
            )}
          </span>
        </Link>
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @3xl:table-cell">
        {scriptMeta(s)}
      </td>
      <td className="px-3 whitespace-nowrap">
        <LastRun s={s} link={can.runs} />
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
        {timeAgo(s.updated_at)}
      </td>
      <td className="pe-2">
        <div className="flex items-center justify-end gap-1">
          {can.run && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                a.runScript(s, server ? { servers: [server] } : undefined)
              }
            >
              <Play />
              {server ? "Run here" : "Run"}
            </Button>
          )}
          <ItemMenu groups={menu} label={`${s.name} actions`} />
        </div>
      </td>
    </tr>
  )
}

function LastRun({ s, link }: { s: Script; link: boolean }) {
  if (!s.last_run) return <span className="text-ash">Never run</span>
  const body = (
    <span className="flex items-center gap-2">
      <RunStateBadge state={s.last_run.state} />
      <span className="text-caption text-ash">{timeAgo(s.last_run.at)}</span>
    </span>
  )
  return link ? (
    <Link
      href={`/scripts/runs/${s.last_run.run_id}`}
      className="hover:underline"
    >
      {body}
    </Link>
  ) : (
    body
  )
}

export function ScriptRows({
  items,
  server,
}: {
  items: Script[]
  server?: { id: string; name: string }
}) {
  const [open, setOpen] = useOpen("script-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<Script | null>(null)
  const current = items.find((s) => s.id === id) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((s) => (
          <li key={s.id} className="flex items-center">
            <Link
              href={`/scripts/${s.id}`}
              className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileCode className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">
                  {s.name}
                </span>
                <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
                  {s.last_run ? (
                    <>
                      <RunStateBadge state={s.last_run.state} />
                      <span className="truncate text-caption text-ash">
                        {timeAgo(s.last_run.at)}
                      </span>
                    </>
                  ) : (
                    <span className="truncate">
                      {s.description || "Never run"}
                    </span>
                  )}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={`${s.name} actions`}
              className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:bg-muted"
              onClick={() => {
                setId(s.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <ScriptSheet
          s={current}
          server={server}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}

function ScriptSheet({
  s,
  server,
  open,
  onOpenChange,
}: {
  s: Script
  server?: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useScriptMenu(s, { server })
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={s.name}>
      <div className="mx-2 mb-3 flex flex-col gap-1">
        {s.description && (
          <p className="text-body-sm text-muted-foreground">{s.description}</p>
        )}
        <p className="text-caption text-ash">{scriptMeta(s)}</p>
      </div>
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// ---- Runs ----

function useRunMenu(r: ScriptRun): Item[][] {
  const can = useScriptsCan()
  const a = useScriptsActions()
  const router = useRouter()
  const active = !runFinished(r.state)
  return [
    [
      {
        key: "open",
        label: "Open",
        icon: <FileCode />,
        onSelect: () => router.push(`/scripts/runs/${r.id}`),
      },
    ],
    can.edit
      ? active
        ? [
            {
              key: "stop",
              label: "Stop",
              icon: <Square />,
              destructive: true,
              onSelect: () => a.cancelRun(r.id),
            },
          ]
        : [
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.removeRun(r.id),
            },
          ]
      : [],
  ]
}

const RUN_PAGE = 50

function RunsPanel({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const [{ q, show }] = useScriptsFilters()
  const [pages, setPages] = useState(1)
  const query = {
    q: useDeferredValue(q.trim()) || undefined,
    state: show === "all" ? undefined : show,
    limit: RUN_PAGE * pages,
  }
  const list = useScriptRuns(workspace?.id, query)
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
        body="Every time a script or a command runs, each server's output and exit code are kept here."
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
              <Th>Script</Th>
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

export function ResultText({
  r,
  className,
}: {
  r: Pick<ScriptRun, "succeeded" | "failed" | "servers">
  className?: string
}) {
  const waiting = r.servers - r.succeeded - r.failed
  return (
    <span className={cn("text-caption text-muted-foreground", className)}>
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

function RunRow({ r }: { r: ScriptRun }) {
  const router = useRouter()
  const menu = useRunMenu(r)
  const href = `/scripts/runs/${r.id}`
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
          {r.name}
        </Link>
        {!r.script_id && (
          <span className="text-caption text-ash">Not a saved script</span>
        )}
      </td>
      <td className="max-w-48 truncate px-3 text-muted-foreground">
        {serversText(r)}
      </td>
      <td className="hidden px-3 whitespace-nowrap @4xl:table-cell">
        <ResultText r={r} />
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

function RunRows({ items }: { items: ScriptRun[] }) {
  const [open, setOpen] = useOpen("script-run-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<ScriptRun | null>(null)
  const current = items.find((r) => r.id === id) ?? last.current
  if (current) last.current = current
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((r) => (
          <li key={r.id} className="flex items-center">
            <Link
              href={`/scripts/runs/${r.id}`}
              className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span className="truncate text-body font-medium">{r.name}</span>
              <span className="flex items-center gap-2">
                <RunStateBadge state={r.state} />
                <span className="truncate text-caption text-ash">
                  {serversText(r)} · {timeAgo(r.created_at)}
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
  r: ScriptRun
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useRunMenu(r)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={r.name}>
      <div className="mx-2 mb-3 flex flex-col gap-1 rounded-2xl bg-subtle p-4">
        <RunStateBadge state={r.state} />
        <ResultText r={r} />
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

export function Placeholder({ phone }: { phone: boolean }) {
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
  const [, setFilters] = useScriptsFilters()
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

export function Failed({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center md:rounded-2xl md:border md:border-border">
      <p className="text-body-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" className="h-11 md:h-9" onClick={onRetry}>
        <RefreshCw />
        Try again
      </Button>
    </div>
  )
}

export { filterScripts }
