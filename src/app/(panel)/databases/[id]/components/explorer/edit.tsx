"use client"

import { json } from "@codemirror/lang-json"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { KeyRound, TriangleAlert } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { BottomSheet } from "@/components/bottom-sheet"
import { useCodeTheme } from "@/components/code-theme"
import { useDemo } from "@/components/demo/demo"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import type {
  ObjectColumn,
  ObjectInfo,
  QueryResult,
  RowChange,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useEditRows } from "../../../api"
import { documentEngine } from "../../../components/meta"
import { useDashboard } from "../parts"
import { pretty } from "./meta"
import { CodeBlock } from "./structure"

type Target = { database: string; schema: string; table: string }
type Grid = Pick<QueryResult, "columns" | "rows" | "documents">

// One field of the form: its text, or NULL, or (new rows) the default.
type FieldState = { value: string; isNull: boolean; useDefault: boolean }

// What an Owner may change here: tables with a key (MongoDB: collections).
export function useCanEditRows(info?: ObjectInfo) {
  const { database: d, owner } = useDashboard()
  const demo = useDemo()
  if (!owner || demo || !info) return { insert: false, change: false, why: "" }
  // The backend's own reason (ClickHouse: engines that can't be changed).
  if (info.read_only)
    return { insert: false, change: false, why: info.read_only }
  const mongo = d.engine === "mongodb"
  const table =
    info.kind === "table" || info.kind === "collection" || info.kind === "index"
  const keyed = mongo || info.key.length > 0
  return {
    insert: table,
    change: table && keyed,
    why: !table
      ? "A view can't be changed here."
      : keyed
        ? ""
        : "This table has no primary key, so rows can only be added. Change them with a query.",
  }
}

// The row's key as the backend wants it.
function keyOf(
  engine: string,
  info: ObjectInfo,
  result: Grid,
  index: number,
): Record<string, string | null> | null {
  if (engine === "mongodb") {
    const doc = result.documents?.[index]
    if (!doc) return null
    try {
      return { _id: JSON.stringify(JSON.parse(doc)._id) }
    } catch {
      return null
    }
  }
  const out: Record<string, string | null> = {}
  for (const k of info.key) {
    const i = result.columns.findIndex((c) => c.name === k)
    if (i < 0) return null
    out[k] = result.rows[index][i]
  }
  return out
}

type Pending = {
  changes: RowChange[]
  statements: string[]
  title: string
  destructive: boolean
}

// Everything to add, change and remove rows: the editor, then a preview of
// the statements, then running them. Render `layers` once.
export function useRowEditing({
  target,
  info,
  result,
  onDone,
}: {
  target: Target
  info?: ObjectInfo
  result?: Grid
  onDone?: () => void
}) {
  const { database: d } = useDashboard()
  const can = useCanEditRows(info)
  const edit = useEditRows(d.id)
  const [editorOpen, setEditorOpen] = useOpen("row-editor")
  const [previewOpen, setPreviewOpen] = useOpen("row-change-preview")
  const [editing, setEditing] = useState<{
    index: number | null
    nonce: number
  }>({ index: null, nonce: 0 })
  const [pending, setPending] = useState<Pending | null>(null)

  const body = (changes: RowChange[], preview: boolean) => ({
    database: target.database || undefined,
    schema: target.schema || undefined,
    table: target.table,
    changes,
    preview,
  })

  const review = (changes: RowChange[], title: string, destructive: boolean) =>
    edit.mutate(body(changes, true), {
      onSuccess: (res) => {
        if (res.statements.length === 0) {
          toast("Nothing changed")
          return
        }
        setPending({ changes, statements: res.statements, title, destructive })
        setPreviewOpen(true)
      },
      onError: (e) => toast.error(e.message),
    })

  const run = () =>
    pending &&
    edit.mutate(body(pending.changes, false), {
      onSuccess: (res) => {
        toast.success(
          `Saved · ${res.affected.toLocaleString()} ${res.affected === 1 ? "row" : "rows"}`,
        )
        setPreviewOpen(false)
        setEditorOpen(false)
        onDone?.()
      },
      onError: (e) => toast.error(e.message, { duration: 8000 }),
    })

  const remove = (indexes: number[]) => {
    if (!info || !result) return
    const changes: RowChange[] = []
    for (const i of indexes) {
      const key = keyOf(d.engine, info, result, i)
      if (!key) {
        toast.error("Couldn't tell which row that is.")
        return
      }
      changes.push({ op: "delete", key })
    }
    review(
      changes,
      indexes.length === 1
        ? "Delete this row?"
        : `Delete ${indexes.length} rows?`,
      true,
    )
  }

  const layers = info ? (
    <>
      <RowEditor
        key={editing.nonce}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        info={info}
        result={result}
        index={editing.index}
        busy={edit.isPending}
        onSubmit={(change) =>
          review(
            [change],
            change.op === "insert" ? "Add this row?" : "Save these changes?",
            false,
          )
        }
      />
      <ResponsiveDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={pending?.title ?? "Save?"}
        description="This is exactly what runs, all together: if one fails, nothing is saved."
        className="sm:max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Back
            </Button>
            <Button
              variant={pending?.destructive ? "destructive" : "default"}
              disabled={edit.isPending}
              onClick={run}
            >
              {edit.isPending
                ? "Saving…"
                : pending?.destructive
                  ? "Delete"
                  : "Save"}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="flex flex-col gap-3">
            {pending.destructive && (
              <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-body-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p>
                  The row is removed from the database for good. Only a backup
                  brings it back.
                </p>
              </div>
            )}
            <CodeBlock text={pending.statements.join("\n")} engine={d.engine} />
          </div>
        )}
      </ResponsiveDialog>
    </>
  ) : null

  return {
    can,
    busy: edit.isPending,
    add: () => {
      setEditing((e) => ({ index: null, nonce: e.nonce + 1 }))
      setEditorOpen(true)
    },
    edit: (index: number) => {
      setEditing((e) => ({ index, nonce: e.nonce + 1 }))
      setEditorOpen(true)
    },
    remove,
    layers,
  }
}

// Kinds whose values run long or span lines (plain text only when it does).
const longType = (c: ObjectColumn) =>
  /json|xml|array|\[\]|object|blob|clob/i.test(c.type)

function RowEditor({
  open,
  onOpenChange,
  info,
  result,
  index,
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: ObjectInfo
  result?: Grid
  index: number | null
  busy: boolean
  onSubmit: (change: RowChange) => void
}) {
  const { database: d, phone } = useDashboard()
  // Documents are edited whole, as JSON.
  const mongo = documentEngine(d.engine)
  const inserting = index == null
  const row = index != null ? result?.rows[index] : undefined
  const cellOf = (name: string) => {
    const i = result?.columns.findIndex((c) => c.name === name) ?? -1
    return i >= 0 && row ? row[i] : null
  }
  const [initial] = useState<Record<string, FieldState>>(() =>
    Object.fromEntries(
      info.columns.map((c) => {
        const v = inserting ? null : cellOf(c.name)
        return [
          c.name,
          {
            value: v ?? "",
            isNull: !inserting && v == null,
            useDefault: inserting,
          },
        ]
      }),
    ),
  )
  const [fields, setFields] = useState(initial)
  const [doc, setDoc] = useState(() =>
    inserting ? "{\n  \n}" : pretty(result?.documents?.[index] ?? "{}"),
  )
  const [docError, setDocError] = useState("")

  const changed = info.columns.filter((c) => {
    const a = fields[c.name]
    const b = initial[c.name]
    return (
      a.value !== b.value ||
      a.isNull !== b.isNull ||
      a.useDefault !== b.useDefault
    )
  })

  const set = (name: string, patch: Partial<FieldState>) =>
    setFields((f) => ({ ...f, [name]: { ...f[name], ...patch } }))

  const submit = () => {
    if (mongo) {
      try {
        JSON.parse(doc)
      } catch {
        // The shell's looser spelling is fine too; the backend reads it.
        if (!/^\s*\{[\s\S]*\}\s*$/.test(doc)) {
          setDocError("That isn't a document: write it as { … }.")
          return
        }
      }
      setDocError("")
      if (inserting) {
        onSubmit({ op: "insert", document: doc })
        return
      }
      const key =
        result && index != null ? keyOf(d.engine, info, result, index) : null
      if (key) onSubmit({ op: "update", key, document: doc })
      return
    }
    const values: Record<string, string | null> = {}
    for (const c of inserting ? info.columns : changed) {
      const f = fields[c.name]
      if (inserting && f.useDefault) continue
      values[c.name] = f.isNull ? null : f.value
    }
    if (inserting) {
      onSubmit({ op: "insert", values })
      return
    }
    const key =
      result && index != null ? keyOf(d.engine, info, result, index) : null
    if (key) onSubmit({ op: "update", key, values })
  }

  const ready = mongo || inserting || changed.length > 0
  const title = inserting ? "Add a row" : "Edit the row"
  const description = inserting
    ? mongo
      ? d.engine === "meilisearch"
        ? `Write the new document as JSON, with its ${info.key[0] ?? "primary key"} field.`
        : d.engine === "elasticsearch"
          ? "Write the new document as JSON. Elasticsearch gives it an _id."
          : "Write the new document as JSON. An _id is made for it when it has none."
      : "Fill in what you want; fields left on Default get the table's default value."
    : mongo
      ? "Change the document as JSON; it replaces the stored one."
      : "Only the fields you change are saved."

  const form = mongo ? (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4 md:px-6">
      <JsonEditor value={doc} onChange={setDoc} />
      {docError && <p className="text-caption text-destructive">{docError}</p>}
    </div>
  ) : (
    <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      {info.columns.map((c) => (
        <FieldRow
          key={c.name}
          column={c}
          state={fields[c.name]}
          inserting={inserting}
          changed={!inserting && changed.includes(c)}
          onChange={(patch) => set(c.name, patch)}
        />
      ))}
    </div>
  )

  const footer = (
    <>
      <span className="me-auto text-caption text-muted-foreground">
        {!mongo &&
          !inserting &&
          (changed.length === 0
            ? "Nothing changed yet"
            : `${changed.length} changed`)}
      </span>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={!ready || busy} onClick={submit}>
        {busy ? "Checking…" : "Review and save"}
      </Button>
    </>
  )

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        footer={<div className="flex items-center gap-2">{footer}</div>}
      >
        <p className="px-6 pb-3 text-body-sm text-muted-foreground">
          {description}
        </p>
        {form}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {form}
        <SheetFooter className="flex-row items-center gap-2 border-t border-border px-6 py-3">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="h-8 rounded-full border border-border px-2.5 text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background md:h-6"
    >
      {children}
    </button>
  )
}

function FieldRow({
  column: c,
  state,
  inserting,
  changed,
  onChange,
}: {
  column: ObjectColumn
  state: FieldState
  inserting: boolean
  changed: boolean
  onChange: (patch: Partial<FieldState>) => void
}) {
  const id = `field-${c.name}`
  const auto = /identity|auto_increment|generated|computed/i.test(c.extra ?? "")
  const multi =
    longType(c) || state.value.length > 60 || state.value.includes("\n")
  const boolish = /^(bool|boolean|bit|tinyint\(1\))/i.test(c.type)
  const off = state.isNull || (inserting && state.useDefault)
  const type = (value: string) =>
    onChange({ value, isNull: false, useDefault: false })

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3 md:px-6",
        changed && "bg-brand-soft/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-body-sm font-medium"
        >
          {c.key && (
            <KeyRound className="size-3.5 text-brand" aria-label="Key" />
          )}
          {c.name}
        </label>
        <span className="font-mono text-caption text-ash lowercase">
          {c.type}
        </span>
        {auto && <span className="text-caption text-ash">· {c.extra}</span>}
        <span className="ms-auto flex gap-1">
          {inserting && (
            <Chip
              on={state.useDefault}
              onClick={() =>
                onChange({ useDefault: !state.useDefault, isNull: false })
              }
            >
              Default
            </Chip>
          )}
          {c.nullable && (
            <Chip
              on={state.isNull}
              onClick={() =>
                onChange({ isNull: !state.isNull, useDefault: false })
              }
            >
              NULL
            </Chip>
          )}
        </span>
      </div>
      {boolish && !multi ? (
        <div className="flex gap-1">
          {["true", "false"].map((v) => (
            <Chip
              key={v}
              on={!off && state.value === v}
              onClick={() => type(v)}
            >
              {v}
            </Chip>
          ))}
        </div>
      ) : multi ? (
        <Textarea
          id={id}
          value={state.value}
          onChange={(e) => type(e.target.value)}
          placeholder={
            off ? (state.isNull ? "NULL" : (c.default ?? "Default")) : ""
          }
          rows={Math.min(8, Math.max(2, state.value.split("\n").length))}
          spellCheck={false}
          className={cn("font-mono text-[12.5px]", off && "opacity-60")}
        />
      ) : (
        <Input
          id={id}
          value={state.value}
          onChange={(e) => type(e.target.value)}
          placeholder={
            off ? (state.isNull ? "NULL" : (c.default ?? "Default")) : ""
          }
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn("font-mono text-[12.5px]", off && "opacity-60")}
        />
      )}
    </div>
  )
}

const jsonExtensions = [editorTheme, EditorView.lineWrapping, json()]

function JsonEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const theme = useCodeTheme()
  return (
    <div className="min-h-64 flex-1 overflow-hidden rounded-2xl border border-border">
      <CodeMirror
        theme={theme}
        value={value}
        onChange={onChange}
        extensions={jsonExtensions}
        basicSetup={{ foldGutter: true, tabSize: 2 }}
        height="100%"
        className="h-full"
      />
    </div>
  )
}
