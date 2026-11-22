"use client"

import type { EditorView } from "@uiw/react-codemirror"
import {
  CircleAlert,
  CircleCheck,
  Keyboard,
  Lock,
  Play,
  Plus,
  Save,
  ShieldAlert,
  Square,
  TriangleAlert,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useDemo } from "@/components/demo/demo"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, fieldErrors } from "@/lib/api"
import type {
  DatabaseQueryResult,
  DatabaseQueryRun,
  DatabaseSavedQuery,
  QueryResult,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRunQuery, useSaveQuery } from "../../../api"
import { useDashboard } from "../parts"
import { benchHeight, DatabasePicker, useCurrentDb } from "./data-tab"
import { pickText, QueryEditor } from "./editor"
import {
  ExportMenu,
  PhoneRows,
  ResultFacts,
  ResultGrid,
  RowDetails,
} from "./grid"
import { Library, SaveDialog, type SaveTarget } from "./library"
import { modKey, placeholders, rowsText, sqlEngine } from "./meta"
import { type Draft, readDraft, writeDraft } from "./state"

const limits = [100, 500, 1000, 5000, 10000]

// The Query tab: an editor, what it gave back, and the saved queries and
// history beside it. Read only unless an Owner turns on Allow changes.
export function QueryTab() {
  const { database: d, phone, owner } = useDashboard()
  const demo = useDemo()
  const state = useCurrentDb()
  const [draft, setDraftState] = useState<Draft>(() => readDraft(d.id))
  const [change, setChange] = useState(false)
  const [limit, setLimit] = useState(500)
  const [picked, setPicked] = useState(0)
  const [row, setRow] = useState(0)
  const [rowOpen, setRowOpen] = useOpen("query-row")
  const [saveOpen, setSaveOpen] = useOpen("query-save")
  const [saveTarget, setSaveTarget] = useState<SaveTarget>({
    query: "",
    database: "",
  })
  const [confirmOpen, setConfirmOpen] = useOpen("query-confirm")
  const [newOpen, setNewOpen] = useOpen("query-new")
  const [confirmText, setConfirmText] = useState("")
  const [phoneView, setPhoneView] = useState<"editor" | "library">("editor")
  const [lastSent, setLastSent] = useState<{
    text: string
    change: boolean
  } | null>(null)
  const view = useRef<EditorView | null>(null)
  const run = useRunQuery(d.id)
  const save = useSaveQuery(d.id)
  const canChange = owner && !demo

  const setDraft = (next: Draft) => {
    setDraftState(next)
    writeDraft(d.id, next)
  }
  const dirty = !!draft.savedId && draft.text !== draft.savedText

  // Table names for the editor's completion.
  const schema: Record<string, string[]> = {}
  for (const o of state.overview?.objects ?? []) {
    schema[o.name] = []
    if (o.schema && o.schema !== "public" && o.schema !== "dbo") {
      schema[`${o.schema}.${o.name}`] = []
    }
  }

  const send = (text: string, asChange: boolean, confirm?: string) => {
    const query = text.trim()
    if (!query || run.isPending) return
    setPicked(0)
    setLastSent({ text: query, change: asChange })
    run.mutate(
      {
        change: asChange,
        body: {
          database: state.current || undefined,
          query,
          limit,
          saved_id:
            draft.savedId && query === draft.text.trim()
              ? draft.savedId
              : undefined,
          confirm,
        },
      },
      {
        onSuccess: () => setConfirmOpen(false),
        onError: (err) => {
          if (fieldErrors(err).confirm) {
            setConfirmText("")
            setConfirmOpen(true)
          }
        },
      },
    )
  }
  const runNow = () => send(pickText(view.current, draft.text), change)

  const openSave = (existing?: DatabaseSavedQuery) => {
    setSaveTarget({
      existing,
      query:
        existing && existing.id !== draft.savedId ? existing.query : draft.text,
      database:
        existing && existing.id !== draft.savedId
          ? existing.database
          : state.current,
    })
    setSaveOpen(true)
  }
  // Ctrl+S: an opened query of yours saves straight away; else ask a name.
  const quickSave = () => {
    if (!draft.text.trim()) return
    if (draft.savedId && draft.canEdit) {
      save.mutate(
        {
          queryId: draft.savedId,
          body: {
            title: draft.title ?? "Query",
            description: draft.description,
            database: state.current || undefined,
            query: draft.text,
            shared: draft.shared,
            pinned: draft.pinned,
            revision: draft.revision,
          },
        },
        {
          onSuccess: (s) => {
            adopt(s)
            toast.success("Changes saved")
          },
          onError: (e) => toast.error(e.message),
        },
      )
      return
    }
    openSave()
  }
  const adopt = (s: DatabaseSavedQuery, text = s.query) =>
    setDraft({
      text,
      savedId: s.id,
      savedText: s.query,
      revision: s.updated_at,
      title: s.title,
      description: s.description,
      shared: s.shared,
      pinned: s.pinned,
      canEdit: s.can_edit,
    })
  const openSaved = (s: DatabaseSavedQuery) => {
    adopt(s)
    if (s.database && s.database !== state.current) state.setDb(s.database)
    setPhoneView("editor")
  }
  const openRun = (r: DatabaseQueryRun) => {
    setDraft({ text: r.query })
    if (r.database && r.database !== state.current) state.setDb(r.database)
    setPhoneView("editor")
  }

  const result = run.data
  const failed = run.error && !fieldErrors(run.error).confirm ? run.error : null

  // A blank editor; text that isn't saved anywhere is asked about first.
  const startNew = () => {
    setDraft({ text: "" })
    run.reset()
    setPicked(0)
    setNewOpen(false)
    setTimeout(() => view.current?.focus(), 0)
  }
  const askNew = () =>
    draft.text.trim() && (!draft.savedId || dirty)
      ? setNewOpen(true)
      : startNew()

  const newButton = (
    <Button
      variant="outline"
      size={phone ? "icon" : "sm"}
      aria-label="New query"
      onClick={askNew}
      className={cn(phone && "size-11")}
    >
      <Plus />
      {!phone && "New"}
    </Button>
  )

  const toolbar = (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-3 py-2",
        change && "bg-warning/5",
        phone && "flex-wrap px-4",
      )}
    >
      {!phone && newButton}
      <DatabasePicker
        state={state}
        className={cn(phone ? "h-11 w-full" : "w-48")}
      />
      {draft.savedId && !phone && (
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm">
          <span className="truncate font-medium">{draft.title}</span>
          {dirty && (
            <span className="flex shrink-0 items-center gap-1 text-caption text-ash">
              <span className="size-1.5 rounded-full bg-warning" />
              edited
            </span>
          )}
        </span>
      )}
      <div className={cn("flex items-center gap-2", !phone && "ms-auto")}>
        {!phone && (
          <Select
            items={limits.map((n) => ({
              value: String(n),
              label: `Up to ${n.toLocaleString()} rows`,
            }))}
            value={String(limit)}
            onValueChange={(v) => v && setLimit(Number(v))}
          >
            <SelectTrigger aria-label="Rows kept" className="h-8 w-44 md:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limits.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Up to {n.toLocaleString()} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {canChange ? (
          <label
            htmlFor="query-allow-changes"
            className={cn(
              "flex h-8 items-center gap-2 rounded-lg px-2 text-body-sm whitespace-nowrap",
              change ? "text-warning" : "text-muted-foreground",
              phone && "h-11",
            )}
            title="Off: every statement runs read only. On: it may write, so check it first."
          >
            {change ? (
              <ShieldAlert className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            Allow changes
            <Switch
              id="query-allow-changes"
              checked={change}
              onCheckedChange={setChange}
            />
          </label>
        ) : (
          <span
            className="flex items-center gap-1.5 text-caption whitespace-nowrap text-ash"
            title={
              demo
                ? "The demo's databases can't be changed."
                : "Only an Owner of this database can run changes."
            }
          >
            <Lock className="size-3.5" />
            Read only
          </span>
        )}
      </div>
      <div className={cn("flex items-center gap-2", phone && "ms-auto")}>
        {phone && newButton}
        <Button
          variant="outline"
          size={phone ? "default" : "sm"}
          disabled={!draft.text.trim()}
          onClick={quickSave}
          aria-label="Save"
          className={cn(phone && "size-11 px-0")}
        >
          <Save />
          {!phone && (draft.savedId && draft.canEdit ? "Save" : "Save…")}
        </Button>
        {run.isPending ? (
          <Button
            variant="outline"
            size={phone ? "default" : "sm"}
            onClick={run.stop}
            className={cn(phone && "h-11")}
          >
            <Square className="fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            variant={change ? "destructive" : "default"}
            size={phone ? "default" : "sm"}
            disabled={!draft.text.trim()}
            onClick={runNow}
            className={cn(phone && "h-11")}
          >
            <Play className="fill-current" />
            {change ? "Run with changes" : "Run"}
            {!phone && (
              <Kbd className="ms-1 bg-white/15 text-current">{modKey()} ↵</Kbd>
            )}
          </Button>
        )}
      </div>
    </div>
  )

  const editor = (
    <QueryEditor
      engine={d.engine}
      value={draft.text}
      onChange={(text) => setDraft({ ...draft, text })}
      onRun={runNow}
      onSave={quickSave}
      schema={schema}
      viewRef={view}
      placeholder={placeholders[d.engine]}
      className="h-full"
    />
  )

  const results = (
    <Results
      pending={run.isPending}
      startedAt={run.submittedAt}
      result={result}
      error={failed}
      change={lastSent?.change ?? false}
      picked={picked}
      onPick={setPicked}
      onOpenRow={(i) => {
        setRow(i)
        setRowOpen(true)
      }}
      onStop={run.stop}
    />
  )

  const picks = result?.results[picked]

  const layers = (
    <>
      <ConfirmDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="Start a new query?"
        description={
          draft.savedId
            ? `Your edits to “${draft.title}” aren't saved and will be cleared.`
            : "The text in the editor isn't saved and will be cleared. Save it first to keep it."
        }
        confirmLabel="Clear and start new"
        onConfirm={startNew}
      />
      <SaveDialog
        target={saveTarget}
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSaved={(s) => {
          if (
            !saveTarget.existing ||
            saveTarget.existing.id === draft.savedId ||
            !draft.savedId
          ) {
            if (saveTarget.query === draft.text) adopt(s, draft.text)
          }
        }}
      />
      {picks && (
        <RowDetails
          result={picks}
          index={row}
          onIndex={setRow}
          open={rowOpen}
          onOpenChange={setRowOpen}
          phone={phone}
          title="Row"
        />
      )}
      <ResponsiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Run this change?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText.trim() !== d.name || run.isPending}
              onClick={() =>
                lastSent && send(lastSent.text, true, confirmText.trim())
              }
            >
              {run.isPending ? "Running…" : "Run it"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-body-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{fieldErrors(run.error).confirm}</p>
          </div>
          <label htmlFor="query-confirm" className="flex flex-col gap-1.5">
            <span className="text-body-sm">
              Type <span className="font-mono font-medium">{d.name}</span> to
              run it
            </span>
            <Input
              id="query-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
          </label>
          {sqlEngine(d.engine) &&
            d.engine !== "mysql" &&
            d.engine !== "clickhouse" && (
              <p className="text-caption text-muted-foreground">
                The whole script runs in one transaction: if a statement fails,
                nothing is kept.
              </p>
            )}
          {d.engine === "clickhouse" && (
            <p className="text-caption text-muted-foreground">
              ClickHouse has no transactions: statements that ran before a
              failing one stay done.
            </p>
          )}
        </div>
      </ResponsiveDialog>
    </>
  )

  if (phone) {
    return (
      <div className="flex flex-col">
        <div className="flex justify-center px-4 pt-3">
          <Segmented
            label="Show"
            value={phoneView}
            onChange={setPhoneView}
            items={[
              { value: "editor", label: "Query" },
              { value: "library", label: "Saved & history" },
            ]}
          />
        </div>
        {phoneView === "library" ? (
          <div className="mt-2 flex h-[calc(100svh-15rem)] flex-col">
            <Library
              onOpenSaved={openSaved}
              onOpenRun={openRun}
              onRunSaved={(s) => {
                openSaved(s)
                send(s.query, false)
              }}
              onEditSaved={openSave}
              activeId={draft.savedId}
            />
          </div>
        ) : (
          <>
            <div className="mt-3 border-y border-border">{toolbar}</div>
            <div className="h-56 border-b border-border">{editor}</div>
            {results}
          </>
        )}
        {layers}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[17rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border",
        benchHeight,
      )}
    >
      <aside className="flex min-h-0 flex-col border-e border-border bg-subtle/60">
        <Library
          onOpenSaved={openSaved}
          onOpenRun={openRun}
          onRunSaved={(s) => {
            openSaved(s)
            send(s.query, false)
          }}
          onEditSaved={openSave}
          activeId={draft.savedId}
        />
      </aside>
      <section className="flex min-h-0 min-w-0 flex-col">
        {toolbar}
        <Split top={editor} bottom={results} />
      </section>
      {layers}
    </div>
  )
}

// Editor above, results below; the line between them drags.
function Split({
  top,
  bottom,
}: {
  top: React.ReactNode
  bottom: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const [share, setShare] = useState(() => {
    try {
      return Number(localStorage.getItem("morche.databases.query.split")) || 38
    } catch {
      return 38
    }
  })
  const drag = (e: React.PointerEvent) => {
    const el = box.current
    if (!el) return
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      const pct = ((ev.clientY - rect.top) / rect.height) * 100
      setShare(Math.min(80, Math.max(15, pct)))
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setShare((s) => {
        try {
          localStorage.setItem(
            "morche.databases.query.split",
            String(Math.round(s)),
          )
        } catch {}
        return s
      })
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }
  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col">
      <div style={{ height: `${share}%` }} className="min-h-0 shrink-0">
        {top}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a drag handle, keyboard via arrows. */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the editor"
        aria-valuenow={Math.round(share)}
        tabIndex={0}
        onPointerDown={drag}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") setShare((s) => Math.max(15, s - 5))
          if (e.key === "ArrowDown") setShare((s) => Math.min(80, s + 5))
        }}
        className="group relative h-2 shrink-0 cursor-row-resize border-y border-border bg-subtle outline-none focus-visible:bg-brand-soft"
      >
        <span className="absolute inset-0 m-auto h-0.5 w-10 rounded-full bg-mist group-hover:bg-ash" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{bottom}</div>
    </div>
  )
}

function Results({
  pending,
  startedAt,
  result,
  error,
  change,
  picked,
  onPick,
  onOpenRow,
  onStop,
}: {
  pending: boolean
  startedAt: number
  result?: DatabaseQueryResult
  error: Error | null
  change: boolean
  picked: number
  onPick: (i: number) => void
  onOpenRow: (i: number) => void
  onStop: () => void
}) {
  const { database: d, phone } = useDashboard()
  const now = useNow(100, pending)

  if (pending) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-mist border-t-brand" />
        <p className="text-body-sm font-medium tabular-nums">
          Running… {((now - startedAt) / 1000).toFixed(1)} s
        </p>
        <Button variant="outline" size="sm" onClick={onStop}>
          <Square className="fill-current" />
          Stop it
        </Button>
      </div>
    )
  }
  if (error) {
    const stopped = error.name === "AbortError"
    return (
      <div className="p-4">
        <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-body-sm font-medium">
              {stopped ? "Stopped" : "It didn't run"}
            </p>
            {!stopped && (
              <p className="mt-1 font-mono text-caption break-words whitespace-pre-wrap text-muted-foreground">
                {error instanceof ApiError
                  ? error.message
                  : String(error.message)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  if (!result) return <StartHint />

  const list = result.results
  const current: QueryResult | undefined = list[picked]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {list.length > 1 && (
        <div className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-border px-3 py-1.5">
          {list.map((r, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: results are in order.
              key={i}
              type="button"
              aria-pressed={picked === i}
              onClick={() => onPick(i)}
              title={r.statement}
              className="flex h-9 max-w-64 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-caption text-muted-foreground hover:bg-muted aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:h-7"
            >
              <span className="text-ash tabular-nums">{i + 1}</span>
              <span className="truncate font-mono">{r.statement}</span>
            </button>
          ))}
        </div>
      )}
      {result.error && (
        <div className="flex gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-3">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-body-sm font-medium">
              {list.length > 0
                ? `Stopped at statement ${list.length + 1}`
                : "The database said no"}
              {change &&
                sqlEngine(d.engine) &&
                d.engine !== "mysql" &&
                d.engine !== "clickhouse" &&
                list.length > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · nothing was kept
                  </span>
                )}
            </p>
            <p className="mt-0.5 font-mono text-caption break-words whitespace-pre-wrap text-muted-foreground">
              {result.error}
            </p>
          </div>
        </div>
      )}
      {current &&
        (current.columns.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <CircleCheck className="size-6 text-success" />
            <p className="text-body font-medium">
              {current.message || "Done"}
              {current.affected != null &&
                ` · ${rowsText(current.affected)} changed`}
            </p>
            <p className="font-mono text-caption text-muted-foreground">
              {current.statement}
            </p>
          </div>
        ) : current.rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="text-body-sm font-medium">No rows</p>
            <p className="text-caption text-muted-foreground">
              It ran and gave back the columns{" "}
              {current.columns
                .slice(0, 4)
                .map((c) => c.name)
                .join(", ")}
              {current.columns.length > 4 ? "…" : ""}, but no rows.
            </p>
          </div>
        ) : phone ? (
          <div className="pb-4">
            <PhoneRows result={current} onOpenRow={onOpenRow} />
          </div>
        ) : (
          <ResultGrid
            result={current}
            onOpenRow={onOpenRow}
            className="flex-1"
          />
        ))}
      <div className="flex items-center gap-3 border-t border-border px-4 py-2">
        <ResultFacts>
          {current && current.columns.length > 0 && (
            <span className="text-foreground">
              {rowsText(current.rows.length)}
            </span>
          )}
          {current?.truncated && (
            <span className="text-warning">
              cut at the limit · raise it or add LIMIT/WHERE
            </span>
          )}
          {current && <span>{current.ms} ms</span>}
          {list.length > 1 && (
            <span>
              {list.length} statements · {result.ms} ms in all
            </span>
          )}
          {result.mode === "change" ? (
            <span className="flex items-center gap-1 text-warning">
              <ShieldAlert className="size-3" />
              ran with changes
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Lock className="size-3" />
              read only
            </span>
          )}
        </ResultFacts>
        {current && current.columns.length > 0 && (
          <div className="ms-auto">
            <ExportMenu
              result={current}
              name={`${d.name}-query`}
              compact={phone}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function StartHint() {
  const { database: d, phone } = useDashboard()
  const tips =
    d.engine === "mongodb"
      ? [
          'db.orders.find({ status: "open" }).sort({ _id: -1 }).limit(20)',
          'db.orders.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])',
          "db.orders.countDocuments({})",
        ]
      : d.engine === "redis"
        ? ["INFO memory", "SCAN 0 MATCH session:* COUNT 100", "HGETALL user:42"]
        : [
            "Run only part: select it, then Run",
            "Several statements: separate them with ;",
            "Saved queries can be shared with the team",
          ]
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
        <Keyboard className="size-5" />
      </span>
      <div>
        <p className="text-body font-medium">Write a query and run it</p>
        {!phone && (
          <p className="mt-1 text-body-sm text-muted-foreground">
            <Kbd>{modKey()}</Kbd> <Kbd>Enter</Kbd> runs it ·{" "}
            <Kbd>{modKey()}</Kbd> <Kbd>S</Kbd> saves it · results are read only
            unless an Owner allows changes
          </p>
        )}
      </div>
      <ul className="flex max-w-lg flex-col gap-1.5">
        {tips.map((t) => (
          <li
            key={t}
            className={cn(
              "rounded-lg bg-subtle px-3 py-1.5 text-caption text-muted-foreground",
              d.engine !== "postgres" &&
                d.engine !== "mysql" &&
                d.engine !== "mssql" &&
                d.engine !== "clickhouse" &&
                "font-mono",
            )}
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
