"use client"

import dynamic from "next/dynamic"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { CronOverview, CronTable } from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { useEditTable } from "../api"
import { JobEditor, type JobEditorMode } from "./job-editor"
import { type JobRow, jobTitle, tableLabel } from "./meta"
import { RunDialog, type RunRequest } from "./run-dialog"
import type { ServerClock } from "./schedule"

// CodeMirror is only needed once someone edits a table as text.
const TableEditor = dynamic(
  () => import("./table-editor").then((m) => m.TableEditor),
  { ssr: false },
)

type CronActions = {
  overview: CronOverview
  clock: ServerClock
  newJob: (table?: string) => void
  editJob: (row: JobRow) => void
  duplicateJob: (row: JobRow) => void
  run: (req: RunRequest) => void
  runJob: (row: JobRow) => void
  deleteJobs: (rows: JobRow[], onDone?: () => void) => void
  setEnabled: (rows: JobRow[], enabled: boolean, onDone?: () => void) => void
  editTable: (table: CronTable) => void
  copyCommand: (row: JobRow) => void
  pending: boolean
}

const Ctx = createContext<CronActions | null>(null)

export function useCronActions() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useCronActions outside CronActionsProvider")
  return ctx
}

// Groups rows by table, so each table changes in one request.
function byTable(rows: JobRow[]) {
  const map = new Map<string, { table: CronTable; lines: number[] }>()
  for (const r of rows) {
    const g = map.get(r.table.id) ?? { table: r.table, lines: [] }
    g.lines.push(r.line)
    map.set(r.table.id, g)
  }
  return [...map.values()]
}

export function CronActionsProvider({
  overview,
  clock,
  children,
}: {
  overview: CronOverview
  clock: ServerClock
  children: ReactNode
}) {
  const { server } = useServerPage()
  const edit = useEditTable(server.id)

  const [editorOpen, setEditorOpen] = useOpen("cron-job-editor")
  const [editor, setEditor] = useState<JobEditorMode>({ kind: "new" })
  const [editorRound, setEditorRound] = useState(0)

  const [runOpen, setRunOpen] = useOpen("cron-run")
  const [runReq, setRunReq] = useState<RunRequest | null>(null)
  const [runRound, setRunRound] = useState(0)

  const [deleteOpen, setDeleteOpen] = useOpen("cron-delete")
  const [toDelete, setToDelete] = useState<{
    rows: JobRow[]
    onDone?: () => void
  }>({ rows: [] })

  const [tableOpen, setTableOpen] = useOpen("cron-table-editor")
  const [tableId, setTableId] = useState<string | null>(null)
  const editingTable = overview.tables.find((t) => t.id === tableId) ?? null

  const openEditor = useCallback(
    (mode: JobEditorMode) => {
      setEditor(mode)
      setEditorRound((r) => r + 1)
      setEditorOpen(true)
    },
    [setEditorOpen],
  )

  const run = useCallback(
    (req: RunRequest) => {
      setRunReq(req)
      setRunRound((r) => r + 1)
      setRunOpen(true)
    },
    [setRunOpen],
  )

  const runTable = useCallback(
    (rows: JobRow[], enabled: boolean, onDone?: () => void) => {
      const groups = byTable(rows)
      Promise.all(
        groups.map((g) =>
          edit.mutateAsync({
            kind: "enable",
            table: g.table.id,
            revision: g.table.revision,
            lines: g.lines,
            enabled,
          }),
        ),
      )
        .then(() => {
          const what =
            rows.length === 1 ? `“${jobTitle(rows[0])}”` : `${rows.length} jobs`
          toast.success(`${what} turned ${enabled ? "on" : "off"}`)
          onDone?.()
        })
        .catch((e: Error) => toast.error(e.message))
    },
    [edit],
  )

  function confirmDelete() {
    const { rows, onDone } = toDelete
    Promise.all(
      byTable(rows).map((g) =>
        edit.mutateAsync({
          kind: "delete",
          table: g.table.id,
          revision: g.table.revision,
          lines: g.lines,
        }),
      ),
    )
      .then(() => {
        setDeleteOpen(false)
        toast.success(
          rows.length === 1
            ? `Deleted “${jobTitle(rows[0])}”`
            : `Deleted ${rows.length} jobs`,
        )
        onDone?.()
      })
      .catch((e: Error) => {
        setDeleteOpen(false)
        toast.error(e.message)
      })
  }

  const value = useMemo<CronActions>(
    () => ({
      overview,
      clock,
      pending: edit.isPending,
      newJob: (table) => openEditor({ kind: "new", table }),
      editJob: (row) => openEditor({ kind: "edit", row }),
      duplicateJob: (row) => openEditor({ kind: "duplicate", row }),
      run,
      runJob: (row) =>
        run({
          title: jobTitle(row),
          command: row.command,
          user: row.user,
          table: row.table.id,
        }),
      deleteJobs: (rows, onDone) => {
        setToDelete({ rows, onDone })
        setDeleteOpen(true)
      },
      setEnabled: runTable,
      editTable: (table) => {
        setTableId(table.id)
        setTableOpen(true)
      },
      copyCommand: (row) => {
        navigator.clipboard
          .writeText(row.command)
          .then(() => toast.success("Command copied"))
          .catch(() => toast.error("Couldn't copy"))
      },
    }),
    [
      overview,
      clock,
      edit.isPending,
      openEditor,
      run,
      runTable,
      setDeleteOpen,
      setTableOpen,
    ],
  )

  const n = toDelete.rows.length
  const one = toDelete.rows[0]
  return (
    <Ctx.Provider value={value}>
      {children}
      <JobEditor
        round={editorRound}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editor}
        onRun={run}
      />
      <RunDialog
        round={runRound}
        open={runOpen}
        onOpenChange={setRunOpen}
        request={runReq}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={n === 1 ? "Delete this job?" : `Delete ${n} jobs?`}
        description={
          n === 1 && one ? (
            <>
              <span className="block">
                It will be removed from {tableLabel(one.table)}. To keep it
                without running it, turn it off instead.
              </span>
              <code className="mt-2 block truncate rounded-lg bg-muted px-2 py-1 font-mono text-caption text-foreground">
                {one.schedule} {one.command}
              </code>
            </>
          ) : (
            "They will be removed from their crontabs. To keep them without running them, turn them off instead."
          )
        }
        confirmLabel="Delete"
        pending={edit.isPending}
        onConfirm={confirmDelete}
      />
      {editingTable && (
        <TableEditor
          key={editingTable.id}
          open={tableOpen}
          onOpenChange={setTableOpen}
          table={editingTable}
        />
      )}
    </Ctx.Provider>
  )
}
