"use client"

import { StreamLanguage } from "@codemirror/language"
import { properties } from "@codemirror/legacy-modes/mode/properties"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { FlaskConical, Loader2, TriangleAlert } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Fail2BanFile } from "@/lib/services"
import { Segmented } from "../../../components/fields"
import { afterClose } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useEdit, useFilter, useSaveFilter } from "../api"
import { useF2bActions } from "./fail2ban-actions"
import { fileLabel } from "./meta"

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: MONO, lineHeight: "1.6" },
  ".cm-gutters": {
    backgroundColor: "var(--color-subtle)",
    borderInlineEnd: "1px solid var(--color-border)",
    color: "var(--color-ash)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--color-muted)" },
  ".cm-activeLine": { backgroundColor: "var(--color-subtle)" },
})

// fail2ban's files are INI: [section], key = value, # comments.
const extensions = [
  theme,
  EditorView.lineWrapping,
  StreamLanguage.define(properties),
]
const readOnlyExtensions = [...extensions, EditorView.editable.of(false)]

type Draft = { content: string; revision: string }
type Problem = { message: string; conflict?: boolean }

// jail.local as text, for what the forms don't cover (comments, actions with
// options, any key). fail2ban checks it before it's kept.
export function ConfigEditor({
  open,
  onOpenChange,
  file,
  path,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: Fail2BanFile
  path: string
}) {
  const { server } = useServerPage()
  const edit = useEdit(server.id)
  // null until the first keystroke: until then, follow the file as fetched.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const content = draft?.content ?? file.content
  const dirty = draft !== null && draft.content !== file.content

  function save(revision = draft?.revision ?? file.revision) {
    setProblem(null)
    edit.mutate(
      { kind: "config", content, revision },
      {
        onSuccess: () => {
          setDraft(null)
          toast.success("jail.local saved, fail2ban reloaded")
          onOpenChange(false)
        },
        onError: (err) => {
          if (err.status === 409) {
            setProblem({
              conflict: true,
              message: "jail.local changed on the server since you opened it.",
            })
            return
          }
          setProblem({ message: err.message })
        },
      },
    )
  }

  function discard() {
    setDraft(null)
    setProblem(null)
  }

  return (
    <EditorLayer
      open={open}
      onOpenChange={onOpenChange}
      title="jail.local"
      description={path}
      dirty={dirty}
      saving={edit.isPending}
      onSave={() => save()}
      onDiscard={discard}
    >
      <ProblemNotice
        problem={problem}
        onLoadTheirs={discard}
        onOverwrite={() => save(file.revision)}
      />
      <Editor
        value={content}
        onChange={(value) =>
          setDraft((d) => ({
            content: value,
            revision: d?.revision ?? file.revision,
          }))
        }
        placeholder={"[DEFAULT]\nbantime = 1h\n\n[sshd]\nenabled = true"}
      />
      <EditorHint>
        Overrides jail.conf and jail.d/*.conf · [DEFAULT] applies to every jail
        · fail2ban checks the file and puts the old one back if it rejects it
      </EditorHint>
    </EditorLayer>
  )
}

const filterTemplate = (name: string, custom: boolean) =>
  custom
    ? `# ${name}: which log lines count as a failure.\n[Definition]\nfailregex = ^.* from <HOST>\nignoreregex =\n`
    : `# Changes to filter.d/${name}.conf; only what you set here is replaced.\n[Definition]\n`

// A filter's .local file: overrides for a shipped filter, or a whole new one.
// The shipped .conf can be read beside it, never changed (updates replace it).
export function FilterEditor({
  open,
  onOpenChange,
  name,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
}) {
  const { server } = useServerPage()
  const a = useF2bActions()
  const query = useFilter(server.id, name)
  const saveFilter = useSaveFilter(server.id)
  const [view, setView] = useState<"local" | "conf">("local")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const f = query.data
  const base = f
    ? f.local.exists
      ? f.local.content
      : filterTemplate(name, !f.conf.exists)
    : ""
  const content = draft?.content ?? base
  const dirty = draft !== null && draft.content !== base

  function save(revision = draft?.revision ?? f?.local.revision ?? "") {
    setProblem(null)
    saveFilter.mutate(
      { name, content, revision },
      {
        onSuccess: () => {
          setDraft(null)
          toast.success(`${name}.local saved, fail2ban reloaded`)
          onOpenChange(false)
        },
        onError: (err) => {
          if (err.status === 409) {
            query.refetch()
            setProblem({
              conflict: true,
              message: `${name}.local changed on the server since you opened it.`,
            })
            return
          }
          setProblem({ message: err.message })
        },
      },
    )
  }

  function discard() {
    setDraft(null)
    setProblem(null)
  }

  let body: ReactNode
  if (!f) {
    body = query.error ? (
      <p
        role="alert"
        className="m-4 rounded-2xl border border-border bg-subtle p-4 text-body-sm md:m-6"
      >
        {query.error.message}
      </p>
    ) : (
      <div className="flex flex-1 items-center justify-center gap-2 text-body-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Reading the filter…
      </div>
    )
  } else {
    const showConf = view === "conf" && f.conf.exists
    body = (
      <>
        {f.conf.exists && (
          <div className="shrink-0 border-b border-border px-4 py-2 md:px-6">
            <Segmented
              label="File"
              value={view}
              onChange={setView}
              options={[
                { value: "local", label: `${name}.local (yours)` },
                { value: "conf", label: `${name}.conf (shipped)` },
              ]}
            />
          </div>
        )}
        {!showConf && (
          <ProblemNotice
            problem={problem}
            onLoadTheirs={discard}
            onOverwrite={() => save(f.local.revision)}
          />
        )}
        {showConf ? (
          <Editor key="conf" value={f.conf.content} readOnly />
        ) : (
          <Editor
            key="local"
            value={content}
            onChange={(value) =>
              setDraft((d) => ({
                content: value,
                revision: d?.revision ?? f.local.revision,
              }))
            }
          />
        )}
        <EditorHint>
          {showConf
            ? `${fileLabel(f.conf.path)} · read-only: package updates replace it`
            : f.conf.exists
              ? `${fileLabel(f.local.path)} · keys here replace the same keys in ${name}.conf`
              : `${fileLabel(f.local.path)} · <HOST> marks the address to ban`}
        </EditorHint>
      </>
    )
  }

  return (
    <EditorLayer
      open={open}
      onOpenChange={onOpenChange}
      title={`Filter: ${name}`}
      description={
        f?.local.exists
          ? fileLabel(f.local.path)
          : `Saving creates filter.d/${name}.local`
      }
      dirty={dirty}
      saving={saveFilter.isPending}
      onSave={() => save()}
      onDiscard={discard}
      extra={
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            afterClose(onOpenChange, () => a.test({ filter: name }))
          }
        >
          <FlaskConical />
          Test
        </Button>
      }
    >
      {body}
    </EditorLayer>
  )
}

function Editor({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
}) {
  const { phone } = useServerPage()
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={readOnly ? readOnlyExtensions : extensions}
      basicSetup={{ highlightActiveLine: !readOnly, foldGutter: false }}
      autoFocus={!phone && !readOnly}
      placeholder={placeholder}
      className="min-h-0 flex-1 overflow-hidden"
      height="100%"
    />
  )
}

function EditorHint({ children }: { children: ReactNode }) {
  return (
    <p className="shrink-0 border-t border-border px-4 py-2 text-caption text-ash md:px-6">
      {children}
    </p>
  )
}

function ProblemNotice({
  problem,
  onLoadTheirs,
  onOverwrite,
}: {
  problem: Problem | null
  onLoadTheirs: () => void
  onOverwrite: () => void
}) {
  if (!problem) return null
  return (
    <div
      role="alert"
      className="flex shrink-0 flex-wrap items-start gap-x-3 gap-y-2 border-b border-border bg-subtle px-4 py-2.5 text-body-sm md:px-6"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span className="max-h-40 min-w-0 flex-1 overflow-y-auto break-words whitespace-pre-wrap">
        {problem.message}
      </span>
      {problem.conflict && (
        <span className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onLoadTheirs}>
            Load theirs
          </Button>
          <Button variant="outline" size="sm" onClick={onOverwrite}>
            Overwrite
          </Button>
        </span>
      )}
    </div>
  )
}

// Full-height sheet with Close · title · Save on phones; a wide side sheet
// with the actions in its footer on desktop.
function EditorLayer({
  open,
  onOpenChange,
  title,
  description,
  dirty,
  saving,
  onSave,
  onDiscard,
  extra,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  extra?: ReactNode
  children: ReactNode
}) {
  const { phone } = useServerPage()
  const body = <div className="flex min-h-0 flex-1 flex-col">{children}</div>

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <span className="truncate text-body font-medium">{title}</span>
            <Button
              variant="ghost"
              disabled={!dirty || saving}
              onClick={onSave}
              className="h-11 justify-self-end text-body text-brand"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {body}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription className="font-mono text-caption">
            {description}
          </SheetDescription>
        </SheetHeader>
        {body}
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          {extra}
          {dirty && (
            <>
              <span className="text-body-sm text-muted-foreground">
                Unsaved changes
              </span>
              <Button variant="ghost" size="sm" onClick={onDiscard}>
                Discard
              </Button>
            </>
          )}
          <span className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={!dirty || saving} onClick={onSave}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
