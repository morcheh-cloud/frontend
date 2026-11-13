"use client"

import {
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  ListPlus,
  Loader2,
  Plus,
  Rocket,
  Rows3,
  Save,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api"
import type { DockerProjectDetails } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Note,
  Notices,
  Segmented,
} from "../../servers/[id]/components/parts"
import { useSaveProjectFiles } from "../api"

// The project's .env as rows of name = value: values hidden until asked,
// what the compose file uses marked, and the plain text one switch away.

// `orig` = the line as written, reused while the row is unchanged.
type Row = {
  id: number
  key: string
  value: string
  orig?: { key: string; value: string; line: string }
}
type Line = { kind: "pair"; row: Row } | { kind: "text"; text: string }

const keyPattern = /^[A-Za-z_][A-Za-z0-9_.-]*$/
// Rows read from the file are numbered by line; added ones count from here.
let nextId = 1_000_000

function unquote(v: string): string {
  const t = v.trim()
  if (t.length >= 2 && t[0] === "'" && t.endsWith("'")) return t.slice(1, -1)
  if (t.length >= 2 && t[0] === '"' && t.endsWith('"'))
    return t
      .slice(1, -1)
      .replace(/\\(["\\n])/g, (_, c) => (c === "n" ? "\n" : c))
  // An unquoted value ends at " #".
  return t.replace(/\s+#.*$/, "")
}

function quote(v: string): string {
  if (v === "" || /^[A-Za-z0-9_./:@,+=-]+$/.test(v)) return v
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`
}

// null = the file holds something the rows can't show (a value over several
// lines): it stays in the text view.
export function parseEnv(text: string): Line[] | null {
  const out: Line[] = []
  for (const [i, line] of text.split("\n").entries()) {
    const m = /^\s*(?:export\s+)?([^=\s#][^=]*?)\s*=(.*)$/.exec(line)
    if (!m) {
      if (line.trim() && !line.trim().startsWith("#")) return null
      out.push({ kind: "text", text: line })
      continue
    }
    const rawValue = m[2]
    const t = rawValue.trim()
    if (
      (t.startsWith('"') && (t.length < 2 || !/[^\\]"\s*(#.*)?$/.test(t))) ||
      (t.startsWith("'") && (t.length < 2 || !/'\s*(#.*)?$/.test(t)))
    )
      return null
    const value = unquote(rawValue)
    out.push({
      kind: "pair",
      row: { id: i, key: m[1], value, orig: { key: m[1], value, line } },
    })
  }
  if (
    out.length &&
    out.at(-1)?.kind === "text" &&
    !(out.at(-1) as { text: string }).text
  )
    out.pop()
  return out
}

function printEnv(lines: Line[]): string {
  const text = lines
    .map((l) => {
      if (l.kind === "text") return l.text
      const o = l.row.orig
      if (o && o.key === l.row.key && o.value === l.row.value) return o.line
      return `${l.row.key.trim()}=${quote(l.row.value)}`
    })
    .join("\n")
  return text ? `${text}\n` : ""
}

// Variables the compose file reads; `required` = no default given.
export function composeVars(compose: string) {
  const vars = new Map<string, boolean>()
  const re =
    /(\$\$)|\$\{([A-Za-z_][A-Za-z0-9_]*)([^}]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g
  for (const m of compose.matchAll(re)) {
    if (m[1]) continue
    const name = m[2] ?? m[4]
    const rest = m[3] ?? ""
    const required = !/^:?[-+]/.test(rest)
    vars.set(name, (vars.get(name) ?? false) || required)
  }
  return vars
}

export function ProjectEnv({
  p,
  serverId,
  phone,
  onApply,
}: {
  p: DockerProjectDetails
  serverId: string
  phone: boolean
  onApply: () => void
}) {
  const save = useSaveProjectFiles()
  const base = parseEnv(p.env)
  const [draft, setDraft] = useState<string | null>(null)
  const [rowsDraft, setRowsDraft] = useState<Line[] | null>(null)
  const [mode, setMode] = useState<"rows" | "text">(base ? "rows" : "text")
  const [shown, setShown] = useState<Set<number>>(new Set())
  const [all, setAll] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [note, setNote] = useState("")

  const lines = rowsDraft ?? base ?? []
  const text = draft ?? (rowsDraft ? printEnv(rowsDraft) : p.env)
  const dirty = text !== p.env
  const parsedText = mode === "text" ? parseEnv(text) : lines
  const pairs = (parsedText ?? []).flatMap((l) =>
    l.kind === "pair" ? [l.row] : [],
  )
  const vars = composeVars(p.compose)
  const have = new Set(pairs.map((r) => r.key.trim()))
  const missing = [...vars]
    .filter(([k, req]) => req && !have.has(k))
    .map(([k]) => k)
  const dupes = new Set(
    pairs.map((r) => r.key.trim()).filter((k, i, a) => a.indexOf(k) !== i),
  )
  const badKey = pairs.find(
    (r) => r.key.trim() && !keyPattern.test(r.key.trim()),
  )
  const emptyKey = pairs.some((r) => !r.key.trim() && r.value)
  const blocked = !!badKey || emptyKey

  const setRows = (next: Line[]) => {
    setRowsDraft(next)
    setDraft(null)
  }
  const patch = (id: number, change: Partial<Row>) =>
    setRows(
      lines.map((l) =>
        l.kind === "pair" && l.row.id === id
          ? { kind: "pair", row: { ...l.row, ...change } }
          : l,
      ),
    )
  const add = (keys: string[] = [""]) => {
    const rows: Line[] = keys.map((key) => ({
      kind: "pair",
      row: { id: nextId++, key, value: "" },
    }))
    setRows([...lines, ...rows])
    setShown(
      (s) => new Set([...s, ...rows.map((r) => (r as { row: Row }).row.id)]),
    )
  }
  const switchMode = (m: "rows" | "text") => {
    if (m === "rows") {
      const parsed = parseEnv(text)
      if (!parsed) {
        toast.error("This file can't be shown as rows", {
          description: "A value runs over several lines. Edit it as text.",
        })
        return
      }
      setRowsDraft(parsed)
      setDraft(null)
    } else {
      setDraft(text)
    }
    setMode(m)
  }
  const reset = () => {
    setDraft(null)
    setRowsDraft(null)
    setConflict(false)
    setNote("")
    save.reset()
    if (!base) setMode("text")
  }

  const write = (apply: boolean, overwrite = false) =>
    save.mutate(
      {
        server: serverId,
        project: p.name,
        compose: p.compose,
        env: text,
        revision: overwrite ? "" : p.revision,
        note: note || "Changed .env",
      },
      {
        onSuccess: () => {
          reset()
          toast.success(apply ? "Saved, applying the changes" : "Saved", {
            description: apply
              ? undefined
              : "Containers pick up new values when they're made again.",
          })
          if (apply) onApply()
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409) setConflict(true)
          else if (!(e instanceof ApiError && e.status === 422))
            toast.error("Couldn't save", { description: e.message })
        },
      },
    )

  if (p.missing)
    return (
      <Empty
        icon={KeyRound}
        title="No project files"
        body="The compose file this project was made from isn't on the server any more."
      />
    )

  const notes: Note[] = []
  if (conflict)
    notes.push({
      key: "conflict",
      title: "The files changed on the server meanwhile",
      body: "Load their version (your edits are dropped), or overwrite it with yours.",
      warn: true,
      action: (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Load theirs
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => write(false, true)}
          >
            Overwrite
          </Button>
        </div>
      ),
    })
  if (save.error instanceof ApiError && save.error.status === 422)
    notes.push({
      key: "refused",
      title: "docker compose refused the files",
      body: (
        <span className="font-mono text-caption whitespace-pre-wrap">
          {save.error.message}
        </span>
      ),
      warn: true,
    })
  if (missing.length)
    notes.push({
      key: "missing",
      title: `The compose file uses ${missing.length === 1 ? "a value" : "values"} not set here`,
      body: (
        <>
          <span className="font-mono">{missing.join(", ")}</span> — unless the
          server's shell sets {missing.length === 1 ? "it" : "them"}, compose
          puts an empty string there.
        </>
      ),
      warn: true,
      action:
        mode === "rows" ? (
          <Button variant="outline" size="sm" onClick={() => add(missing)}>
            <ListPlus />
            Add {missing.length === 1 ? "it" : "them"}
          </Button>
        ) : undefined,
    })
  if (badKey)
    notes.push({
      key: "bad",
      title: `“${badKey.key}” isn't a valid name`,
      body: "Names start with a letter or _ and hold letters, digits, _ . and -.",
      warn: true,
    })

  const buttons = (
    <>
      <Button
        variant="outline"
        disabled={!dirty || save.isPending}
        onClick={reset}
        className={cn(phone && "h-11")}
      >
        Discard
      </Button>
      <Button
        variant="outline"
        disabled={!dirty || save.isPending || blocked}
        onClick={() => write(false)}
        className={cn(phone && "h-11 flex-1")}
      >
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save
      </Button>
      <Button
        disabled={!dirty || save.isPending || blocked}
        onClick={() => write(true)}
        className={cn(phone && "h-11 flex-1")}
      >
        <Rocket />
        Save and apply
      </Button>
    </>
  )

  const rowList = (
    <div className="flex flex-col">
      {lines.every((l) => l.kind !== "pair") && (
        <Empty
          icon={KeyRound}
          title="No values yet"
          body="Values here fill ${NAME} in the compose file and keep secrets out of it. They're also kept in the project's history, encrypted."
          action={
            <Button onClick={() => add()}>
              <Plus />
              Add a value
            </Button>
          }
        />
      )}
      {lines.map((l) => {
        if (l.kind !== "pair") return null
        const r = l.row
        const visible = all || shown.has(r.id)
        const k = r.key.trim()
        const used = vars.has(k)
        return (
          <div
            key={r.id}
            className={cn(
              "flex gap-2 border-b border-border py-2 last:border-b-0",
              phone ? "flex-col px-4" : "items-center px-4",
            )}
          >
            <div className={cn("flex items-center gap-2", !phone && "w-[34%]")}>
              <Input
                value={r.key}
                onChange={(e) => patch(r.id, { key: e.target.value })}
                placeholder="NAME"
                aria-label="Name"
                aria-invalid={
                  (!!k && !keyPattern.test(k)) || dupes.has(k) || undefined
                }
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Input
                value={visible ? r.value : r.value ? "••••••••" : ""}
                readOnly={!visible}
                onFocus={() =>
                  !visible && setShown((s) => new Set(s).add(r.id))
                }
                onChange={(e) => patch(r.id, { value: e.target.value })}
                placeholder="value"
                aria-label={`Value of ${k || "the new row"}`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 font-mono"
              />
              <Button
                variant="ghost"
                size={phone ? "icon-lg" : "icon"}
                aria-label={visible ? "Hide the value" : "Show the value"}
                onClick={() =>
                  setShown((s) => {
                    const n = new Set(s)
                    if (n.has(r.id)) n.delete(r.id)
                    else n.add(r.id)
                    return n
                  })
                }
              >
                {visible ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                variant="ghost"
                size={phone ? "icon-lg" : "icon"}
                aria-label={`Remove ${k || "this row"}`}
                onClick={() =>
                  setRows(
                    lines.filter((x) => x.kind !== "pair" || x.row.id !== r.id),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
            <div
              className={cn(
                "flex shrink-0 gap-1 text-caption",
                !phone && "w-36 justify-end",
              )}
            >
              {dupes.has(k) && (
                <span className="rounded-full bg-warning/15 px-2 text-warning">
                  Twice: the last wins
                </span>
              )}
              {used && !dupes.has(k) && (
                <span className="rounded-full bg-brand-soft px-2 text-brand-strong">
                  Used by compose
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <Notices notes={notes} className="max-md:-mx-4" />
      <div
        className={cn(
          "flex flex-col overflow-hidden",
          phone
            ? "-mx-4 border-y border-border"
            : "rounded-2xl border border-border",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-subtle px-4 py-2">
          <Segmented
            value={mode}
            label="How to show the file"
            onChange={(m) => switchMode(m as "rows" | "text")}
            items={[
              {
                value: "rows",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Rows3 className="size-3.5" />
                    Rows
                  </span>
                ),
              },
              {
                value: "text",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    Text
                  </span>
                ),
              },
            ]}
          />
          {mode === "rows" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>
                {all ? <EyeOff /> : <Eye />}
                {all ? "Hide values" : "Show values"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => add()}>
                <Plus />
                Add
              </Button>
            </>
          )}
          <span className="ms-auto text-caption text-ash">
            {p.dir ? `${p.dir.replace(/\/$/, "")}/.env` : ".env"}
            {dirty && " · unsaved"}
          </span>
        </div>
        {mode === "rows" ? (
          rowList
        ) : (
          <textarea
            value={text}
            onChange={(e) => {
              setDraft(e.target.value)
              setRowsDraft(null)
            }}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label=".env file"
            placeholder={"DB_PASSWORD=…\nAPP_URL=https://example.com"}
            className="min-h-80 w-full resize-y bg-background p-4 font-mono text-body-sm outline-none"
          />
        )}
      </div>
      {dirty && (
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="What changed (kept in the history, optional)"
          aria-label="What changed"
          className={cn(phone && "-mx-0")}
        />
      )}
      <div
        className={cn(
          "flex gap-2",
          phone
            ? "sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border bg-background px-4 py-2"
            : "justify-end",
        )}
      >
        {buttons}
      </div>
    </div>
  )
}
