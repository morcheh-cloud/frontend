"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  Ellipsis,
  FileCode,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { RunStateBadge } from "@/app/(panel)/ansible/components/meta"
import {
  Empty,
  type Item,
  ItemMenu,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api } from "@/lib/api"
import type { Script, ScriptParam } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  scriptKeys,
  serversText,
  useCreateScript,
  useScript,
  useScriptRuns,
  useUpdateScript,
} from "../api"
import { CodeEditor } from "./code-editor"
import {
  type Interpreter,
  interpreterLabels,
  type RunAs,
  runAsHints,
  runAsLabels,
  templates,
  timeoutText,
} from "./meta"
import { useScriptsCan } from "./permissions"
import { Labeled } from "./run-layer"
import { useScriptsActions } from "./scripts-actions"
import { ResultText } from "./scripts-view"

type Draft = {
  name: string
  description: string
  interpreter: Interpreter
  run_as: RunAs
  // Minutes, as typed.
  timeout: string
  content: string
  params: ScriptParam[]
}

const fromSaved = (s: Script): Draft => ({
  name: s.name,
  description: s.description,
  interpreter: s.interpreter,
  run_as: s.run_as,
  timeout: minutesText(s.timeout_seconds),
  content: s.content,
  params: s.params ?? [],
})

const minutesText = (seconds: number) =>
  String(Math.round((seconds / 60) * 100) / 100)

const sameParams = (a: ScriptParam[], b: ScriptParam[]) =>
  JSON.stringify(a) === JSON.stringify(b)

const same = (a: Draft, b: Draft) =>
  a.name === b.name &&
  a.description === b.description &&
  a.interpreter === b.interpreter &&
  a.run_as === b.run_as &&
  a.timeout === b.timeout &&
  a.content === b.content &&
  sameParams(a.params, b.params)

const paramName = /^[A-Za-z_][A-Za-z0-9_]*$/

function paramProblem(p: ScriptParam, all: ScriptParam[]) {
  if (!p.name) return "Give it a name."
  if (!paramName.test(p.name))
    return "Letters, digits and _ only, not starting with a digit."
  if (all.filter((o) => o.name === p.name).length > 1) return "Used twice."
  return ""
}

// /scripts/new and /scripts/[id].
export function ScriptPage({ id }: { id?: string }) {
  const phone = useIsPhone()
  const query = useScript(id)
  if (phone === null) return null
  if (id && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={FileCode}
          title={gone ? "This script isn't here" : "Couldn't load the script"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/scripts" />}
              nativeButton={false}
            >
              Back to Scripts
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <Editor
      // A new script's page becomes the saved one's: start over then.
      key={query.data?.id ?? "new"}
      saved={query.data}
      phone={phone}
    />
  )
}

type Pane = "script" | "details" | "values" | "runs"

function Editor({
  saved,
  phone,
}: {
  saved: Script | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const can = useScriptsCan()
  const a = useScriptsActions()
  const router = useRouter()
  const qc = useQueryClient()
  const back = useBack("/scripts")
  const readOnly = !can.edit

  const base: Draft = saved
    ? fromSaved(saved)
    : {
        name: "",
        description: "",
        interpreter: templates[0].interpreter,
        run_as: templates[0].run_as,
        timeout: "10",
        content: templates[0].content,
        params: [],
      }
  const [draft, setDraft] = useState<Draft>(base)
  const [template, setTemplate] = useState(saved ? "" : templates[0].key)
  // What the draft started from: a 409 means someone else saved in between.
  const [revision, setRevision] = useState(saved?.updated_at)
  const [conflict, setConflict] = useOpen("script-conflict")
  const [pane, setPane] = useState<Pane>("script")
  const [touched, setTouched] = useState(false)

  const create = useCreateScript(ws)
  const update = useUpdateScript(saved?.id ?? "")
  const saving = create.isPending || update.isPending
  const dirty = !saved || !same(draft, fromSaved(saved))

  usePageCrumbs([
    {
      href: saved ? `/scripts/${saved.id}` : "/scripts/new",
      label: saved?.name ?? "New script",
    },
  ])

  // Don't lose typing to a closed tab.
  useEffect(() => {
    if (!dirty || readOnly || (!saved && !touched)) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, readOnly, saved, touched])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const pickTemplate = (key: string) => {
    const t = templates.find((x) => x.key === key)
    if (!t) return
    setTemplate(key)
    setDraft((d) => ({
      ...d,
      interpreter: t.interpreter,
      run_as: t.run_as,
      content: t.content,
      params: t.params ?? [],
    }))
  }

  const minutes = Number(draft.timeout)
  const timeoutSeconds = Math.round(minutes * 60)
  const nameProblem = draft.name.trim() ? "" : "Give it a name."
  const contentProblem = draft.content.trim() ? "" : "The script is empty."
  const timeoutProblem =
    Number.isFinite(minutes) && timeoutSeconds >= 1 && timeoutSeconds <= 86400
      ? ""
      : "Between 1 second and 24 hours (1440 minutes)."
  const paramsProblem = draft.params.some((p) => paramProblem(p, draft.params))
    ? "Fix the values first."
    : ""
  const problem =
    nameProblem || contentProblem || timeoutProblem || paramsProblem

  const body = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    interpreter: draft.interpreter,
    run_as: draft.run_as,
    timeout_seconds: timeoutSeconds,
    content: draft.content,
    params: draft.params.map((p) => ({
      name: p.name,
      label: p.label?.trim() || undefined,
      default: p.default || undefined,
      required: p.required || undefined,
    })),
  }

  const save = (opts?: {
    overwrite?: boolean
    andThen?: (s: Script) => void
  }) => {
    setTouched(true)
    if (problem) {
      if (nameProblem || timeoutProblem) setPane("details")
      else if (paramsProblem) setPane("values")
      toast.error(problem)
      return
    }
    const done = (s: Script) => {
      setRevision(s.updated_at)
      if (!saved) {
        toast.success("Script saved")
        router.replace(`/scripts/${s.id}`)
      } else {
        toast.success("Saved")
      }
      opts?.andThen?.(s)
    }
    const failed = (err: Error) => {
      if (err instanceof ApiError && err.status === 409) setConflict(true)
      else toast.error(err.message)
    }
    if (!saved) {
      create.mutate(body, { onSuccess: done, onError: failed })
    } else {
      update.mutate(
        { ...body, revision: opts?.overwrite ? undefined : revision },
        { onSuccess: done, onError: failed },
      )
    }
  }

  // Runs what's saved: save the changes first.
  const run = () => {
    if (saved && (!dirty || readOnly)) a.runScript(saved)
    else save({ andThen: (s) => a.runScript(s) })
  }

  const loadTheirs = () => {
    setConflict(false)
    if (!saved) return
    api.scripts.getScript(saved.id).then(
      (s) => {
        qc.setQueryData(scriptKeys.script(s.id), s)
        setDraft(fromSaved(s))
        setRevision(s.updated_at)
      },
      (err: Error) => toast.error(err.message),
    )
  }

  const menu: Item[][] = [
    saved && can.edit
      ? [
          {
            key: "delete",
            label: "Delete script",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () =>
              a.removeScript(saved, () => router.replace("/scripts")),
          },
        ]
      : [],
  ]

  const runLabel = dirty && !readOnly ? "Save and run" : "Run"
  const title = draft.name || (saved ? saved.name : "New script")

  const editor = (
    <div className="flex min-h-0 flex-1 flex-col">
      {!saved && !touched && (
        <TemplatePicker current={template} onPick={pickTemplate} />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          !phone && "rounded-2xl border border-border",
        )}
      >
        <CodeEditor
          value={draft.content}
          onChange={readOnly ? undefined : (content) => set({ content })}
          interpreter={draft.interpreter}
          readOnly={readOnly}
        />
      </div>
      <p
        role={touched && contentProblem ? "alert" : undefined}
        className={cn(
          "px-4 pt-2 text-caption md:px-0",
          touched && contentProblem
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {touched && contentProblem
          ? contentProblem
          : draft.params.length > 0
            ? `Values reach the script as environment variables: ${draft.params.map((p) => `$${p.name}`).join(", ")}.`
            : "Runs from a temporary folder; the output and the exit code are kept for each server."}
      </p>
    </div>
  )

  const details = (
    <div className="flex flex-col gap-4">
      <Labeled
        label="Name"
        hint={touched ? nameProblem : undefined}
        error={touched && !!nameProblem}
      >
        {(fid) => (
          <Input
            id={fid}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Clean old logs"
            maxLength={100}
            readOnly={readOnly}
            aria-invalid={(touched && !!nameProblem) || undefined}
          />
        )}
      </Labeled>
      <Labeled label="Description">
        {(fid) => (
          <Textarea
            id={fid}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="What it does, what it changes"
            maxLength={2000}
            rows={3}
            readOnly={readOnly}
          />
        )}
      </Labeled>
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Runs with</span>
        <Segmented
          label="Interpreter"
          value={draft.interpreter}
          onChange={(interpreter) => !readOnly && set({ interpreter })}
          items={(["bash", "sh", "python3"] as const).map((v) => ({
            value: v,
            label: interpreterLabels[v],
          }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Runs as</span>
        <Segmented
          label="Run as"
          value={draft.run_as}
          onChange={(run_as) => !readOnly && set({ run_as })}
          items={(["user", "root"] as const).map((v) => ({
            value: v,
            label: runAsLabels[v],
          }))}
        />
        <p className="text-caption text-muted-foreground">
          {runAsHints[draft.run_as]}
        </p>
      </div>
      <Labeled
        label="Time limit (minutes)"
        hint={
          timeoutProblem ||
          `Stopped after ${timeoutText(timeoutSeconds)} on a server that's still running it.`
        }
        error={!!timeoutProblem}
      >
        {(fid) => (
          <Input
            id={fid}
            value={draft.timeout}
            onChange={(e) => set({ timeout: e.target.value })}
            inputMode="decimal"
            className="w-32"
            readOnly={readOnly}
            aria-invalid={!!timeoutProblem || undefined}
          />
        )}
      </Labeled>
      {saved && (
        <p className="text-caption text-ash">
          Changed {timeAgo(saved.updated_at)} by {saved.updated_by_name}
        </p>
      )}
    </div>
  )

  const values = (
    <ParamsEditor
      params={draft.params}
      onChange={(params) => set({ params })}
      readOnly={readOnly}
      touched={touched}
    />
  )

  const runs = saved && can.runs ? <RecentRuns scriptId={saved.id} /> : null

  const conflictDialog = (
    <ResponsiveDialog
      open={conflict}
      onOpenChange={setConflict}
      title="Someone else saved this script"
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={loadTheirs}
          >
            Load theirs
          </Button>
          <Button
            variant="destructive"
            className="h-11 md:h-9"
            onClick={() => {
              setConflict(false)
              save({ overwrite: true })
            }}
          >
            Overwrite
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-muted-foreground">
        It changed after you opened it. Load their version (your changes go), or
        save yours over it.
      </p>
    </ResponsiveDialog>
  )

  if (phone) {
    const panes: { value: Pane; label: string }[] = [
      { value: "script", label: "Script" },
      { value: "details", label: "Details" },
      { value: "values", label: "Values" },
      ...(runs ? [{ value: "runs" as const, label: "Runs" }] : []),
    ]
    return (
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {title}
          </h1>
          {!readOnly && (
            <Button
              variant="ghost"
              className="h-11 px-3 text-brand"
              disabled={saving || (!!saved && !dirty)}
              onClick={() => save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
          <PhoneMenu groups={menu} />
        </header>
        <div className="flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3">
          <Segmented
            label="Show"
            items={panes}
            value={pane}
            onChange={setPane}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {pane === "script" && editor}
          {pane === "details" && (
            <div className="overflow-y-auto px-4 py-2">{details}</div>
          )}
          {pane === "values" && (
            <div className="overflow-y-auto px-4 py-2">{values}</div>
          )}
          {pane === "runs" && <div className="overflow-y-auto">{runs}</div>}
        </div>
        {can.run && (
          <div className="shrink-0 border-t border-border bg-background p-3">
            <Button className="h-11 w-full" disabled={saving} onClick={run}>
              <Play />
              {runLabel}
            </Button>
          </div>
        )}
        {conflictDialog}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-3rem-1px)] flex-col gap-4 px-6 pt-5 pb-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileCode className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">{title}</h1>
          <p className="truncate text-caption text-ash">
            {readOnly
              ? "Read-only: editing needs Engineer access to this workspace."
              : dirty && (saved || touched)
                ? "Unsaved changes"
                : saved
                  ? `Saved ${timeAgo(saved.updated_at)}`
                  : "Not saved yet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {can.run && (
            <Button
              variant={dirty && !readOnly ? "outline" : "default"}
              disabled={saving}
              onClick={run}
            >
              <Play />
              {runLabel}
            </Button>
          )}
          {!readOnly && (
            <Button
              disabled={saving || (!!saved && !dirty)}
              onClick={() => save()}
            >
              {saving ? "Saving…" : saved ? "Save" : "Create"}
            </Button>
          )}
          <ItemMenu groups={menu} label="Script actions" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex min-w-0 flex-1 flex-col">{editor}</div>
        <aside className="flex w-80 shrink-0 flex-col gap-8 overflow-y-auto pb-2">
          {details}
          <section className="flex flex-col gap-3">
            <h2 className="text-body-sm font-medium">Values</h2>
            {values}
          </section>
          {runs}
        </aside>
      </div>
      {conflictDialog}
    </div>
  )
}

function TemplatePicker({
  current,
  onPick,
}: {
  current: string
  onPick: (key: string) => void
}) {
  return (
    <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 pb-3 md:px-0">
      <span className="shrink-0 text-caption text-ash">Start from</span>
      {templates.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={current === t.key}
          onClick={() => onPick(t.key)}
          className={cn(
            "h-9 shrink-0 rounded-full border px-3 text-body-sm md:h-7",
            current === t.key
              ? "border-brand bg-brand-soft text-brand-strong"
              : "border-border hover:bg-muted",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// The values asked for at each run, handed to the script as environment
// variables.
function ParamsEditor({
  params,
  onChange,
  readOnly,
  touched,
}: {
  params: ScriptParam[]
  onChange: (params: ScriptParam[]) => void
  readOnly: boolean
  touched: boolean
}) {
  const patch = (i: number, p: Partial<ScriptParam>) =>
    onChange(params.map((o, j) => (j === i ? { ...o, ...p } : o)))
  return (
    <div className="flex flex-col gap-3">
      {params.length === 0 && (
        <p className="text-body-sm text-muted-foreground">
          {readOnly
            ? "It asks for nothing when it runs."
            : "Ask for a value at each run (a service name, a path, a version) and read it in the script as $NAME."}
        </p>
      )}
      {params.map((p, i) => {
        const bad = touched || p.name ? paramProblem(p, params) : ""
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place; names change while typing
            key={i}
            className="flex flex-col gap-2 rounded-2xl border border-border p-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Input
                  aria-label="Variable name"
                  value={p.name}
                  onChange={(e) =>
                    patch(i, {
                      name: e.target.value.replace(/\s/g, "_").toUpperCase(),
                    })
                  }
                  placeholder="SERVICE"
                  maxLength={64}
                  readOnly={readOnly}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono"
                  aria-invalid={!!bad || undefined}
                />
                {bad && <p className="text-caption text-destructive">{bad}</p>}
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 md:size-9"
                  aria-label={`Remove ${p.name || "value"}`}
                  onClick={() => onChange(params.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              )}
            </div>
            <Input
              aria-label="Question"
              value={p.label ?? ""}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder="Question (e.g. Which service?)"
              maxLength={100}
              readOnly={readOnly}
            />
            <Input
              aria-label="Default value"
              value={p.default ?? ""}
              onChange={(e) => patch(i, { default: e.target.value })}
              placeholder="Default (optional)"
              maxLength={4096}
              readOnly={readOnly}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox renders the control inside */}
            <label className="flex min-h-11 items-center gap-2 text-body-sm md:min-h-0">
              <Checkbox
                checked={!!p.required}
                onCheckedChange={(v) => patch(i, { required: v })}
                disabled={readOnly}
              />
              A value is needed to run
            </label>
          </div>
        )
      })}
      {!readOnly && params.length < 30 && (
        <Button
          variant="outline"
          className="h-11 self-start md:h-9"
          onClick={() => onChange([...params, { name: "" }])}
        >
          <Plus />
          Add a value
        </Button>
      )}
    </div>
  )
}

function RecentRuns({ scriptId }: { scriptId: string }) {
  const { workspace } = useWorkspace()
  const runs = useScriptRuns(workspace?.id, { script_id: scriptId, limit: 10 })
  const items = runs.data?.items ?? []
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-body-sm font-medium md:px-0">Recent runs</h2>
      {runs.isPending ? (
        <Skeleton className="mx-4 h-24 rounded-2xl md:mx-0" />
      ) : items.length === 0 ? (
        <p className="px-4 text-body-sm text-muted-foreground md:px-0">
          It hasn't run yet.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                href={`/scripts/runs/${r.id}`}
                className="flex min-h-14 flex-col justify-center gap-0.5 px-4 py-2 outline-none hover:bg-subtle active:bg-muted md:min-h-12 md:px-3"
              >
                <span className="flex items-center gap-2">
                  <RunStateBadge state={r.state} />
                  <span className="ms-auto text-caption text-ash">
                    {timeAgo(r.created_at)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="truncate text-caption text-muted-foreground">
                    {serversText(r)}
                  </span>
                  <ResultText r={r} className="ms-auto shrink-0" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PhoneMenu({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("script-menu")
  if (groups.every((g) => g.length === 0)) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="More"
        onClick={() => setOpen(true)}
      >
        <Ellipsis className="size-5" />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Script">
        <SheetItems groups={groups} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4 pt-5", phone ? "px-4" : "px-6")}>
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-[60dvh] rounded-2xl" />
    </div>
  )
}

export function ScriptFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <ScriptPage id={id} />
}
