"use client"

import {
  ChevronRight,
  FileCode,
  History,
  Plus,
  RefreshCw,
  SquareTerminal,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"

import { duration, RunStateBadge } from "@/app/(panel)/ansible/components/meta"
import {
  runFinished,
  useServerScriptRuns,
  useServerScripts,
} from "@/app/(panel)/scripts/api"
import { exitText } from "@/app/(panel)/scripts/components/meta"
import { useServerScriptsCan } from "@/app/(panel)/scripts/components/permissions"
import {
  ScriptsActionsProvider,
  useScriptsActions,
} from "@/app/(panel)/scripts/components/scripts-actions"
import {
  Failed,
  filterScripts,
  Placeholder,
  ScriptRows,
  ScriptTable,
  Th,
} from "@/app/(panel)/scripts/components/scripts-view"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import type { ServerScriptRun } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, SearchBox, Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"

const filters = {
  tab: parseAsStringLiteral(["scripts", "runs"] as const).withDefault(
    "scripts",
  ),
  q: parseAsString.withDefault(""),
}

const useFilters = () => useQueryStates(filters, { history: "replace" })

// A server's Scripts tab: its workspace's saved scripts, run here in a tap,
// and what ran on this server.
export function ServerScriptsView() {
  return (
    <ScriptsActionsProvider>
      <Content />
    </ScriptsActionsProvider>
  )
}

const RUN_PAGE = 50

function Content() {
  const { server, phone } = useServerPage()
  const can = useServerScriptsCan(server)
  const a = useScriptsActions()
  const router = useRouter()
  const [{ tab: wanted, q }, setFilters] = useFilters()
  const tab = wanted === "runs" && can.runs ? "runs" : "scripts"
  const [pages, setPages] = useState(1)
  const scripts = useServerScripts(server.id)
  // Only fetched by those who may read the history.
  const runs = useServerScriptRuns(
    server.id,
    { limit: RUN_PAGE * pages },
    can.runs,
  )
  const here = { id: server.id, name: server.name }

  const refreshing = tab === "runs" ? runs.isFetching : scripts.isFetching
  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={refreshing}
      onClick={() => (tab === "runs" ? runs.refetch() : scripts.refetch())}
    >
      <RefreshCw className={cn(refreshing && "animate-spin")} />
    </Button>
  )
  const command = can.run && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="Run a command here"
      onClick={() => a.command({ servers: [here] })}
    >
      <SquareTerminal />
      {!phone && "Run a command"}
    </Button>
  )
  const total = runs.data?.total
  const tabSwitch = can.runs && (
    <Segmented
      label="Show"
      items={[
        {
          value: "scripts" as const,
          label: scripts.data ? `Scripts · ${scripts.data.length}` : "Scripts",
        },
        {
          value: "runs" as const,
          label: total !== undefined ? `Ran here · ${total}` : "Ran here",
        },
      ]}
      value={tab}
      onChange={(t) => setFilters({ tab: t === "scripts" ? null : t })}
    />
  )
  const search = tab === "scripts" && (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search scripts"
      label="Search scripts"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const caption = (
    <span className="text-caption text-ash">
      {can.run
        ? "Runs use this server's login; root ones go through sudo."
        : "Running here needs Engineer access to this server."}
    </span>
  )

  const bar = phone ? (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
      <div className="flex items-center gap-2">
        {search || <span className="flex-1" />}
        {refresh}
        {command}
      </div>
      {tabSwitch && (
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabSwitch}
        </div>
      )}
    </div>
  ) : (
    <div className="@container flex flex-wrap items-center gap-2">
      {tabSwitch}
      {tabSwitch && search && <span className="mx-1 h-5 w-px bg-border" />}
      {search}
      <span className="ms-auto hidden @3xl:inline">{caption}</span>
      {refresh}
      {command}
    </div>
  )

  let body: ReactNode
  if (tab === "runs") {
    const items = runs.data?.items ?? []
    if (runs.isPending) body = <Placeholder phone={phone} />
    else if (runs.isError && !runs.data)
      body = <Failed error={runs.error} onRetry={() => runs.refetch()} />
    else if (items.length === 0)
      body = (
        <Empty
          icon={History}
          title="Nothing ran here yet"
          body="Each script or command run on this server is kept here with its output and exit code."
        />
      )
    else {
      const more = (runs.data?.total ?? 0) > items.length && (
        <div className={cn("flex justify-center", phone ? "py-4" : "pt-2")}>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            disabled={runs.isFetching}
            onClick={() => setPages((n) => n + 1)}
          >
            {runs.isFetching ? "Loading…" : "Show more"}
          </Button>
        </div>
      )
      body = (
        <>
          {phone ? <RunRows items={items} /> : <RunTable items={items} />}
          {more}
        </>
      )
    }
  } else {
    const all = scripts.data ?? []
    const items = filterScripts(all, q)
    if (scripts.isPending) body = <Placeholder phone={phone} />
    else if (scripts.isError && !scripts.data)
      body = <Failed error={scripts.error} onRetry={() => scripts.refetch()} />
    else if (all.length === 0)
      body = (
        <Empty
          icon={FileCode}
          title="No saved scripts yet"
          body="Scripts are saved for the whole workspace, then run here or on many servers at once. For a one-off, run a command."
          action={
            can.edit && (
              <Button
                className="h-11 w-full md:h-9 md:w-auto"
                onClick={() => router.push("/scripts/new")}
              >
                <Plus />
                New script
              </Button>
            )
          }
        />
      )
    else if (items.length === 0)
      body = (
        <Empty
          icon={FileCode}
          title="No matching scripts"
          body="Try another search."
          action={
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setFilters({ q: null })}
            >
              Clear search
            </Button>
          }
        />
      )
    else
      body = phone ? (
        <ScriptRows items={items} server={here} />
      ) : (
        <ScriptTable items={items} server={here} />
      )
  }

  return (
    <div className={cn("flex flex-col", phone ? "pb-6" : "gap-4")}>
      {bar}
      {body}
    </div>
  )
}

function resultText(r: ServerScriptRun) {
  if (r.state === "canceled" && !r.started_at) return "Didn't start"
  if (!runFinished(r.state)) return r.started_at ? duration(r.started_at) : ""
  return exitText(r.exit_code, r.timed_out)
}

function RunTable({ items }: { items: ServerScriptRun[] }) {
  const router = useRouter()
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>State here</Th>
            <Th>Script</Th>
            <Th>Result</Th>
            <Th className="hidden @3xl:table-cell">Started by</Th>
            <Th>When</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((r) => {
            const href = `/scripts/runs/${r.run_id}`
            return (
              <tr
                key={r.run_id}
                className="h-14 cursor-pointer hover:bg-subtle"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) return
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
                  {r.servers > 1 && (
                    <span className="text-caption text-ash">
                      With {r.servers - 1} other{" "}
                      {r.servers === 2 ? "server" : "servers"}
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    "px-3 whitespace-nowrap",
                    r.exit_code || r.timed_out || r.error
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {resultText(r) || r.error}
                </td>
                <td className="hidden max-w-40 truncate px-3 text-muted-foreground @3xl:table-cell">
                  {r.created_by_name}
                </td>
                <td className="px-3 whitespace-nowrap">
                  {timeAgo(r.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RunRows({ items }: { items: ServerScriptRun[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((r) => (
        <li key={r.run_id}>
          <Link
            href={`/scripts/runs/${r.run_id}`}
            className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none active:bg-muted"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body font-medium">{r.name}</span>
              <span className="flex min-w-0 items-center gap-2">
                <RunStateBadge state={r.state} />
                <span className="truncate text-caption text-ash">
                  {[resultText(r), timeAgo(r.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ash" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
