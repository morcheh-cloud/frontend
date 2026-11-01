"use client"

import { FlaskConical, Loader2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Fail2BanFile } from "@/lib/services"
import { Segmented } from "../../../components/fields"
import {
  type Draft,
  EditorHint,
  EditorLayer,
  IniEditor,
  type Problem,
  ProblemNotice,
} from "../../components/ini-editor"
import { afterClose } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useEdit, useFilter, useSaveFilter } from "../api"
import { useF2bActions } from "./fail2ban-actions"
import { fileLabel } from "./meta"

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
      <IniEditor
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
          <IniEditor key="conf" value={f.conf.content} readOnly />
        ) : (
          <IniEditor
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
