"use client"

import {
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Play,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, useQueryStates } from "nuqs"
import { type ReactNode, useEffect, useRef, useState } from "react"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import { cronText, formatInZone } from "@/app/(panel)/cronjobs/components/meta"
import { Failed } from "@/app/(panel)/scripts/components/scripts-view"
import {
  ItemMenu,
  SheetItems,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { basename } from "@/components/files/meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { Backup, BackupPlan, BackupRestore } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  BACKUP_PAGE,
  restoreActive,
  useBackupPlans,
  useBackups,
  useRestores,
} from "../../../api"
import { Blank, type Col, Rows, useDashboard } from "../parts"
import { PitrTab } from "../pitr/pitr-tab"
import { syncsHref } from "../syncs/meta"
import {
  BackupActionsProvider,
  newPlanHref,
  planHref,
  useBackupActions,
  useBackupCan,
  useBackupMenu,
  usePlanMenu,
} from "./backup-actions"
import {
  type BackupList,
  backupListParsers,
  backupLists,
  methodText,
  retentionText,
  selectionText,
  stateLabel,
  stateTone,
  storedOn,
  whatText,
  when,
} from "./meta"

const listLabels: Record<BackupList, string> = {
  plans: "Plans",
  backups: "Backups",
  restores: "Restores",
  pitr: "Point in time",
}

// Phones: four segments share the width.
const shortLabels: Record<BackupList, string> = { ...listLabels, pitr: "PITR" }

export function BackupsTab() {
  return (
    <BackupActionsProvider>
      <OldSyncsLink />
      <Backups />
    </BackupActionsProvider>
  )
}

// Syncs used to be a list here (`?tab=backups&list=syncs`): send old links
// to their own tab.
function OldSyncsLink() {
  const { database: d } = useDashboard()
  const router = useRouter()
  const [{ list, run }] = useQueryStates({
    list: parseAsString,
    run: parseAsString,
  })
  useEffect(() => {
    if (list === "syncs") router.replace(syncsHref(d.id, run ?? undefined))
  }, [list, run, d.id, router])
  return null
}

const pagesOf = (total: number) => Math.max(1, Math.ceil(total / BACKUP_PAGE))

function Backups() {
  const { database: d, phone, owner } = useDashboard()
  const fromFile = owner && fileRestores(d.engine)
  const [{ list, page: rawPage }, setView] = useQueryStates(backupListParsers, {
    history: "replace",
  })
  const page = Math.max(1, rawPage)
  const top = useRef<HTMLDivElement>(null)
  // Each list keeps page 1 for the counts when another one is showing.
  const plans = useBackupPlans(d.id)
  const backups = useBackups(d.id, list === "backups" ? page : 1)
  const restores = useRestores(d.id, list === "restores" ? page : 1)

  const total = {
    plans: plans.data?.length ?? 0,
    backups: backups.data?.total ?? 0,
    restores: restores.data?.total ?? 0,
  }
  const pages = list === "pitr" ? 1 : pagesOf(total[list])
  const settled =
    list === "pitr" || list === "plans"
      ? plans.isSuccess
      : list === "backups"
        ? backups.isSuccess && !backups.isPlaceholderData
        : restores.isSuccess && !restores.isPlaceholderData

  // Past the end (the last page's rows were deleted): step back.
  useEffect(() => {
    if (settled && page > pages) void setView({ page: pages })
  }, [settled, page, pages, setView])

  if (plans.isPending || backups.isPending || restores.isPending) {
    return (
      <div className={cn("flex flex-col gap-4", phone && "px-4 pt-4")}>
        <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  const failed = [plans, backups, restores].find((q) => q.isError)
  if (failed) {
    return (
      <Failed
        error={failed.error ?? new Error("Couldn't load")}
        onRetry={() => {
          void plans.refetch()
          void backups.refetch()
          void restores.refetch()
        }}
      />
    )
  }

  // Nothing anywhere yet: the tabs stay, the list area explains what a plan
  // is.
  const empty = total.plans + total.backups + total.restores === 0
  const blank = (
    <div className={cn(phone && "px-4 pt-6")}>
      <Blank
        title="No backups yet"
        body={
          <>
            {owner
              ? "A plan says which databases to copy, to which storages, when, and how long to keep them. A database can have several plans."
              : "No plan has been set up for this database. An Owner can add one."}
            {d.engine === "postgres" && (
              <>
                {" "}
                For a big or busy PostgreSQL, see{" "}
                <button
                  type="button"
                  className="text-brand hover:underline"
                  onClick={() => void setView({ list: "pitr", page: 1 })}
                >
                  Point in time
                </button>
                : every change kept, restore to any second.
              </>
            )}
          </>
        }
        action={
          owner ? (
            <div className="flex flex-wrap justify-center gap-2 max-md:w-full max-md:flex-col">
              {owner && (
                <Button
                  className="max-md:h-11"
                  render={<Link href={newPlanHref(d.id)} />}
                  nativeButton={false}
                >
                  <Plus />
                  New plan
                </Button>
              )}
              {owner && fromFile && <RestoreFileButton />}
            </div>
          ) : undefined
        }
      />
    </div>
  )

  const onPage = (next: number) => {
    void setView({ page: next })
    // The pager sits under the rows: go back to the top of the new page.
    const bar = top.current
    if (bar && bar.getBoundingClientRect().top < 0) bar.scrollIntoView()
  }
  const planRows = plans.data ?? []
  const broken = planRows.filter((p) => p.problem)
  const pitr = d.engine === "postgres"
  const pager = (
    <Pager
      page={page}
      pages={pages}
      total={list === "pitr" ? 0 : total[list]}
      onPage={onPage}
    />
  )

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div
        ref={top}
        className={cn(
          "flex scroll-mt-28 items-center gap-2",
          phone && "flex-col items-stretch px-4 pt-3",
        )}
      >
        <ListTabs
          value={list}
          counts={total}
          lists={pitr ? backupLists : backupLists.filter((l) => l !== "pitr")}
          warn={broken.length > 0}
          onChange={(next) => void setView({ list: next, page: 1 })}
        />
        {list !== "pitr" && fromFile && !phone && (
          <RestoreFileButton size="sm" className="ms-auto" />
        )}
        {list !== "pitr" && owner && !phone && (
          <Button
            size="sm"
            className={cn(!fromFile && "ms-auto")}
            render={<Link href={newPlanHref(d.id)} />}
            nativeButton={false}
          >
            <Plus />
            New plan
          </Button>
        )}
      </div>
      {list === "pitr" && pitr && <PitrTab />}
      {empty && list !== "pitr" && blank}
      {!empty && list === "plans" && (
        <>
          <PlanProblems plans={broken} />
          <Plans
            plans={planRows.slice((page - 1) * BACKUP_PAGE, page * BACKUP_PAGE)}
            all={planRows}
            pager={pager}
          />
        </>
      )}
      {!empty && list === "backups" && (
        <History items={backups.data?.items ?? []} pager={pager} />
      )}
      {!empty && list === "restores" && (
        <Restores items={restores.data?.items ?? []} pager={pager} />
      )}
    </div>
  )
}

// Plans that can't run, one notice per reason: a removed person can stop
// every plan they saved, and the list must stay in reach.
function PlanProblems({ plans }: { plans: BackupPlan[] }) {
  const { phone } = useDashboard()
  if (plans.length === 0) return null
  const reasons = new Map<string, BackupPlan[]>()
  for (const p of plans) {
    const problem = p.problem ?? ""
    reasons.set(problem, [...(reasons.get(problem) ?? []), p])
  }
  return (
    <div className={cn("flex flex-col gap-2", phone && "px-4")}>
      {[...reasons].map(([problem, same]) => (
        <Callout
          key={problem}
          warn
          title={
            same.length === 1
              ? `${same[0].name} can't run`
              : `${same.length} plans can't run`
          }
        >
          {problem}
        </Callout>
      ))}
    </div>
  )
}

// The three lists: tabs with their counts inside, in the toolbar row.
function ListTabs({
  value,
  counts,
  lists,
  warn,
  onChange,
}: {
  value: BackupList
  counts: Record<Exclude<BackupList, "pitr">, number>
  lists: readonly BackupList[]
  warn: boolean
  onChange: (list: BackupList) => void
}) {
  const phone = useDashboard().phone
  return (
    <fieldset className="flex shrink-0 rounded-lg bg-muted p-0.5">
      <legend className="sr-only">Show</legend>
      {lists.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={value === l}
          onClick={() => onChange(l)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm max-md:flex-1 md:h-8"
        >
          {phone ? shortLabels[l] : listLabels[l]}
          {l !== "pitr" && (
            <span className="text-caption font-normal text-ash tabular-nums">
              {counts[l]}
            </span>
          )}
          {l === "plans" && warn && (
            <span
              role="img"
              aria-label="A plan can't run"
              className="size-1.5 rounded-full bg-warning"
            />
          )}
        </button>
      ))}
    </fieldset>
  )
}

// A list's frame: a card on desktop, edge to edge on phones. The pager sits
// under the rows, and only when there's more than one page.
function ListCard({
  pager,
  children,
}: {
  pager: ReactNode
  children: ReactNode
}) {
  const { phone } = useDashboard()
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col border-border",
        phone ? "border-y" : "rounded-2xl border",
      )}
    >
      {children}
      {pager}
    </section>
  )
}

function Pager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}) {
  if (total <= BACKUP_PAGE) return null
  const from = (page - 1) * BACKUP_PAGE + 1
  const to = Math.min(page * BACKUP_PAGE, total)
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-end gap-3 border-t border-border px-4 py-2 text-body-sm max-md:justify-between"
    >
      <span className="text-muted-foreground tabular-nums">
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          className="max-md:size-11"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="max-md:size-11"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </nav>
  )
}

function Schedule({ p }: { p: BackupPlan }) {
  if (!p.cron) return <span className="text-muted-foreground">By hand</span>
  return (
    <>
      <span className="block">{cronText(p.cron)}</span>
      <span className="block text-caption text-ash">
        {p.enabled
          ? `Next ${formatInZone(p.next_run_at, p.timezone)}`
          : "Paused"}
      </span>
    </>
  )
}

function LastRun({ p }: { p: BackupPlan }) {
  if (p.running) return <StateDot tone="muted" label="Running" />
  if (!p.last) return <span className="text-muted-foreground">Not yet</span>
  return (
    <>
      <StateDot
        tone={stateTone(p.last.state)}
        label={`${stateLabel(p.last.state)} · ${timeAgo(p.last.at)}`}
      />
      {p.last_good_at && p.last.state !== "succeeded" && (
        <span className="block text-caption text-ash">
          Last good {timeAgo(p.last_good_at)}
        </span>
      )}
    </>
  )
}

function PlanRowActions({ p }: { p: BackupPlan }) {
  const { operator } = useDashboard()
  const a = useBackupActions()
  const menu = usePlanMenu(p)
  return (
    <span className="inline-flex items-center gap-1">
      {operator && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Back up now: ${p.name}`}
          title={p.problem || "Back up now"}
          disabled={p.running || !!p.problem}
          onClick={() => a.run(p.id)}
        >
          <Play />
        </Button>
      )}
      {menu.length > 0 && <ItemMenu groups={menu} label="Plan actions" />}
    </span>
  )
}

const storagesText = (p: BackupPlan) =>
  p.storages.length ? p.storages.map((s) => s.name).join(", ") : "No storage"

const planCols = (
  engine: BackupPlanEngine,
  owner: boolean,
): Col<BackupPlan>[] => [
  {
    key: "name",
    label: "Plan",
    cell: (p) => (
      <>
        {owner ? (
          <Link
            href={planHref(p)}
            className="block rounded-sm font-medium outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {p.name}
          </Link>
        ) : (
          <span className="block font-medium">{p.name}</span>
        )}
        <span className="block text-caption text-ash">
          {selectionText(p, engine)} · {methodText(p)}
        </span>
      </>
    ),
  },
  {
    key: "where",
    label: "Goes to",
    cell: (p) => (
      <>
        <span className="block">{storagesText(p)}</span>
        <span className="block font-mono text-caption break-all text-ash">
          {p.folder}
        </span>
      </>
    ),
  },
  { key: "when", label: "When", cell: (p) => <Schedule p={p} /> },
  {
    key: "keep",
    label: "Keeps",
    className: "hidden @3xl:table-cell",
    cell: (p) => retentionText(p),
  },
  { key: "last", label: "Last run", cell: (p) => <LastRun p={p} /> },
  {
    key: "actions",
    label: "",
    end: true,
    cell: (p) => <PlanRowActions p={p} />,
  },
]

type BackupPlanEngine = Parameters<typeof whatText>[1]

function Plans({
  plans,
  all,
  pager,
}: {
  plans: BackupPlan[]
  // Every plan, so the sheet still finds its plan after a page change.
  all: BackupPlan[]
  pager: ReactNode
}) {
  const { database: d, phone, owner } = useDashboard()
  const [sheetOpen, setSheetOpen] = useOpen("backup-plan-sheet")
  const [id, setId] = useState<string>()
  return (
    <>
      {phone && owner && (
        <div className="px-4">
          <Button
            variant="outline"
            className="h-11 w-full"
            render={<Link href={newPlanHref(d.id)} />}
            nativeButton={false}
          >
            <Plus />
            New plan
          </Button>
        </div>
      )}
      <ListCard pager={pager}>
        <Rows
          rows={plans}
          limit={plans.length}
          label="Backup plans"
          rowKey={(p) => p.id}
          cols={planCols(d.engine, owner)}
          empty="No plans. Backups already made stay until they're deleted."
          onOpen={
            phone
              ? (p) => {
                  setId(p.id)
                  setSheetOpen(true)
                }
              : undefined
          }
          phone={(p) => ({
            title: p.name,
            sub: [
              p.cron ? (p.enabled ? cronText(p.cron) : "Paused") : "By hand",
              storagesText(p),
            ].join(" · "),
            end: p.running
              ? "Running"
              : p.last
                ? stateLabel(p.last.state)
                : undefined,
          })}
        />
      </ListCard>
      {phone && (
        <PlanSheet
          plan={all.find((p) => p.id === id)}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

function PlanSheet({
  plan,
  open,
  onOpenChange,
}: {
  plan?: BackupPlan
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Keep showing it while the sheet closes.
  const last = useRef(plan)
  if (plan) last.current = plan
  const p = last.current
  if (!p) return null
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={p.name}>
      <PlanSheetBody p={p} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

function PlanSheetBody({
  p,
  onOpenChange,
}: {
  p: BackupPlan
  onOpenChange: (open: boolean) => void
}) {
  const { database: d } = useDashboard()
  const menu = usePlanMenu(p)
  return (
    <>
      <div className="mx-2 mb-3 flex flex-col gap-1 rounded-2xl bg-subtle p-4 text-body-sm">
        <span className="font-medium">
          {selectionText(p, d.engine)} · {methodText(p)}
        </span>
        <span className="text-muted-foreground">
          {storagesText(p)}{" "}
          <span className="font-mono text-caption">{p.folder}</span>
        </span>
        <span className="text-muted-foreground">
          <Schedule p={p} />
        </span>
        <span className="text-muted-foreground">Keeps {retentionText(p)}</span>
        <span className="text-muted-foreground">
          <LastRun p={p} />
        </span>
      </div>
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </>
  )
}

function Check({ b }: { b: Backup }) {
  if (b.verify_error) return <StateDot tone="warning" label="Failed" />
  if (b.verified_at) {
    return <StateDot tone="success" label={`OK · ${timeAgo(b.verified_at)}`} />
  }
  return <span className="text-ash">—</span>
}

function BackupRowActions({ b }: { b: Backup }) {
  const a = useBackupActions()
  const can = useBackupCan(b)
  const menu = useBackupMenu(b)
  return (
    <span className="inline-flex items-center gap-1">
      {can.restore && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Restore"
          title="Restore"
          onClick={() => a.restore(b)}
        >
          <ArchiveRestore />
        </Button>
      )}
      <ItemMenu groups={menu} label="Backup actions" />
    </span>
  )
}

function Kind({ b }: { b: Backup }) {
  if (b.trigger === "restore") return <>Before a restore</>
  return b.kind === "incremental" ? <>Incremental</> : <>Full</>
}

const copiesText = (b: Backup) => {
  const on = storedOn(b).map((c) => c.storage_name)
  if (on.length) return on.join(", ")
  return b.state === "succeeded" ? "Nowhere now" : "—"
}

const historyCols = (
  engine: BackupPlanEngine,
  open: (b: Backup) => void,
): Col<Backup>[] => [
  {
    key: "at",
    label: "When",
    cell: (b) => (
      <button
        type="button"
        onClick={() => open(b)}
        className="rounded-sm text-start whitespace-nowrap outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {when.format(new Date(b.created_at))}
      </button>
    ),
  },
  {
    key: "plan",
    label: "Plan",
    className: "hidden @5xl:table-cell",
    cell: (b) => b.plan_name || <span className="text-ash">Deleted</span>,
  },
  {
    key: "what",
    label: "Database",
    cell: (b) => whatText(b.target, engine),
  },
  {
    key: "kind",
    label: "Type",
    className: "hidden @3xl:table-cell",
    cell: (b) => <Kind b={b} />,
  },
  {
    key: "copies",
    label: "Stored on",
    className: "hidden @4xl:table-cell",
    cell: (b) => {
      const failed = b.copies.filter((c) => c.state === "failed").length
      return (
        <>
          <span className="block">{copiesText(b)}</span>
          {failed > 0 && b.state === "succeeded" && (
            <span className="block text-caption text-warning">
              {failed} upload{failed === 1 ? "" : "s"} failed
            </span>
          )}
        </>
      )
    },
  },
  {
    key: "state",
    label: "State",
    cell: (b) => (
      <StateDot tone={stateTone(b.state)} label={stateLabel(b.state)} />
    ),
  },
  {
    key: "size",
    label: "Size",
    end: true,
    cell: (b) => (b.bytes ? formatSize(b.bytes) : "—"),
  },
  { key: "check", label: "Check", cell: (b) => <Check b={b} /> },
  {
    key: "actions",
    label: "",
    end: true,
    cell: (b) => <BackupRowActions b={b} />,
  },
]

function History({ items, pager }: { items: Backup[]; pager: ReactNode }) {
  const { database: d, phone } = useDashboard()
  const a = useBackupActions()
  return (
    <ListCard pager={pager}>
      <Rows
        rows={items}
        limit={items.length}
        label="Backups"
        rowKey={(b) => b.id}
        cols={historyCols(d.engine, a.show)}
        empty="Nothing yet. Press the play button on a plan to make the first one."
        onOpen={phone ? a.show : undefined}
        phone={(b) => ({
          title: `${whatText(b.target, d.engine)} · ${when.format(new Date(b.created_at))}`,
          sub: [
            b.kind === "incremental" ? "Incremental" : "Full",
            copiesText(b),
            b.bytes ? formatSize(b.bytes) : "",
          ]
            .filter(Boolean)
            .join(" · "),
          end: b.verify_error ? "Check failed" : stateLabel(b.state),
        })}
      />
    </ListCard>
  )
}

const restoreCols = (open: (id: string) => void): Col<BackupRestore>[] => [
  {
    key: "at",
    label: "When",
    cell: (r) => (
      <span className="whitespace-nowrap">
        {when.format(new Date(r.created_at))}
      </span>
    ),
  },
  {
    key: "what",
    label: "What",
    cell: (r) => (
      <>
        <span className="block">
          {r.mode === "replace" ? "Replaced " : "New database "}
          <span className="font-mono">{r.target_name}</span>
        </span>
        <span
          className="block max-w-md truncate text-caption text-ash"
          title={r.source}
        >
          {sourceText(r)}
        </span>
      </>
    ),
  },
  {
    key: "who",
    label: "By",
    className: "hidden @3xl:table-cell",
    cell: (r) => r.created_by_name || "—",
  },
  {
    key: "state",
    label: "State",
    cell: (r) => (
      <>
        <StateDot tone={stateTone(r.state)} label={stateLabel(r.state)} />
        {r.error && (
          <span className="block max-w-xs text-caption break-words text-muted-foreground">
            {r.error}
          </span>
        )}
      </>
    ),
  },
  {
    key: "safety",
    label: "Backed up first",
    className: "hidden @3xl:table-cell",
    cell: (r) =>
      r.safety_backup_id ? (
        <button
          type="button"
          onClick={() => open(r.safety_backup_id ?? "")}
          className="rounded-sm text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Open
        </button>
      ) : r.want_safety ? (
        restoreActive(r) ? (
          "Pending"
        ) : (
          <span className="text-warning">No</span>
        )
      ) : (
        <span className="text-ash">—</span>
      ),
  },
]

function Restores({
  items,
  pager,
}: {
  items: BackupRestore[]
  pager: ReactNode
}) {
  const { database: d, phone, owner } = useDashboard()
  const a = useBackupActions()
  const open = (id: string) => a.show({ id })
  const fromFile = owner && fileRestores(d.engine)
  return (
    <>
      {phone && fromFile && (
        <div className="px-4">
          <RestoreFileButton variant="outline" className="h-11 w-full" />
        </div>
      )}
      <ListCard pager={pager}>
        <Rows
          rows={items}
          limit={items.length}
          label="Restores"
          rowKey={(r) => r.id}
          cols={restoreCols(open)}
          empty={
            fromFile
              ? "No restores yet. Use the restore button on a backup, or Restore from a file."
              : "No restores yet. Use the restore button on a backup to start one."
          }
          onOpen={
            phone
              ? (r) => {
                  const id = r.backup_id ?? r.safety_backup_id
                  if (id) open(id)
                }
              : undefined
          }
          phone={(r) => ({
            title: `${r.mode === "replace" ? "Replaced" : "New"} ${r.target_name}`,
            sub: [
              when.format(new Date(r.created_at)),
              r.from_file ? `File ${basename(r.source)}` : "",
              r.error || (r.safety_backup_id ? "Backed up first" : ""),
            ]
              .filter(Boolean)
              .join(" · "),
            end: stateLabel(r.state),
          })}
        />
      </ListCard>
    </>
  )
}

// Redis keeps one dump file for the whole server: the backend can't load an
// outside one through a connection, so there's no file restore for it.
const fileRestores = (engine: string) => engine !== "redis"

function RestoreFileButton({
  size,
  variant = "outline",
  className,
}: {
  size?: "sm"
  variant?: "outline" | "default"
  className?: string
}) {
  const a = useBackupActions()
  return (
    <Button
      size={size}
      variant={variant}
      className={cn("max-md:h-11", className)}
      onClick={a.restoreFile}
    >
      <FileUp />
      Restore from a file
    </Button>
  )
}

// What an outside file was, briefly (formatLabels describe Morche's own).
const fileKinds: Record<string, string> = {
  pg_custom: "pg_dump archive",
  pg_dir: "pg_dump parallel archive",
  pg_sql: "SQL dump",
  mysql_sql: "SQL dump",
  mysql_db: "SQL dump",
  mongo_arch: "mongodump archive",
  mssql_bak: "SQL Server .bak",
}

function sourceText(r: BackupRestore) {
  if (!r.from_file) return `From ${r.source} · ${r.storage_name}`
  const where = r.storage_name || r.server_name
  const kind = fileKinds[r.format]
  return [`File ${basename(r.source)}`, where, kind].filter(Boolean).join(" · ")
}
