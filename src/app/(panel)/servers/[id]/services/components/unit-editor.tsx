"use client"

import { Loader2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import type { ServiceDetails } from "@/lib/services"
import { Segmented } from "../../../components/fields"
import {
  type Draft,
  EditorHint,
  EditorLayer,
  IniEditor,
  type Problem,
  ProblemNotice,
} from "../../components/ini-editor"
import { useServerPage } from "../../components/server-page"
import { type FileKind, useSaveUnitFile, useServiceDetails } from "../api"
import { overrideTemplate, serviceState, shortName } from "./meta"
import { useServicesActions } from "./services-actions"

function original(d: ServiceDetails, kind: FileKind) {
  if (kind === "file") return d.files.find((f) => !f.drop_in)?.content ?? ""
  return d.files.find((f) => f.path === d.override)?.content ?? ""
}

// A unit's override (drop-in) or, for one made here, its whole unit file.
// The backend checks it with systemd-analyze and puts the old one back when
// systemd rejects it.
export function UnitEditor({
  open,
  onOpenChange,
  unit,
  kind,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: string
  kind: FileKind
}) {
  const { server, phone } = useServerPage()
  const a = useServicesActions()
  const query = useServiceDetails(server.id, open ? unit : null)
  const save = useSaveUnitFile(server.id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [view, setView] = useState<"mine" | "packaged">("mine")
  const s = a.overview.services.find((x) => x.name === unit)
  const running = s ? serviceState(s) !== "stopped" : false
  const [restart, setRestart] = useState(running)
  const d = query.data

  const saved = d ? original(d, kind) : ""
  // An override that doesn't exist yet starts from a template.
  const base =
    d && kind === "override" && !saved ? overrideTemplate(unit) : saved
  const content = draft?.content ?? base
  const revision = d ? (kind === "file" ? d.file_revision : d.revision) : ""
  // A new override is worth saving as soon as it says something.
  const dirty = draft !== null && draft.content !== base
  const removing = kind === "override" && !!saved && !content.trim()

  function send(rev = draft?.revision ?? revision) {
    setProblem(null)
    save.mutate(
      {
        unit,
        kind,
        body: { content, revision: rev, restart: restart && running },
      },
      {
        onSuccess: () => {
          setDraft(null)
          const name = shortName(unit)
          toast.success(
            removing
              ? `Override of ${name} removed`
              : restart && running
                ? `${name} saved and restarted`
                : `${name} saved, systemd reloaded`,
          )
          onOpenChange(false)
        },
        onError: (err) => {
          if (err.status === 409) {
            query.refetch()
            setProblem({
              conflict: true,
              message: "The file changed on the server since you opened it.",
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

  const packaged = d?.files.filter((f) => f.path !== d.override) ?? []
  const title =
    kind === "file" ? shortName(unit) : `Override · ${shortName(unit)}`
  const path = kind === "file" ? (d?.path ?? unit) : (d?.override ?? "")

  let body: ReactNode
  if (!d) {
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
        Reading the unit…
      </div>
    )
  } else {
    const showPackaged =
      kind === "override" && view === "packaged" && packaged.length > 0
    body = (
      <>
        {kind === "override" && packaged.length > 0 && (
          <div className="shrink-0 border-b border-border px-4 py-2 md:px-6">
            <Segmented
              label="File"
              value={view}
              onChange={setView}
              options={[
                { value: "mine", label: "override.conf (yours)" },
                { value: "packaged", label: "What it overrides" },
              ]}
            />
          </div>
        )}
        <ProblemNotice
          problem={problem}
          onLoadTheirs={discard}
          onOverwrite={() => send(revision)}
        />
        {showPackaged ? (
          <IniEditor
            readOnly
            value={packaged
              .map((f) => `# ${f.path}\n${f.content.trimEnd()}\n`)
              .join("\n")}
          />
        ) : (
          <IniEditor
            value={content}
            onChange={(value) =>
              setDraft((prev) => ({
                content: value,
                revision: prev?.revision ?? revision,
              }))
            }
          />
        )}
        {phone && running && <RestartRow on={restart} onChange={setRestart} />}
        <EditorHint>
          {kind === "override"
            ? "Only what you set here replaces the packaged unit, and it survives package updates · empty the file to remove the override · checked with systemd-analyze before it's kept"
            : "Checked with systemd-analyze before it's kept; the old file goes back if systemd rejects it"}
        </EditorHint>
      </>
    )
  }

  return (
    <EditorLayer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={path}
      dirty={dirty}
      saving={save.isPending}
      onSave={() => send()}
      onDiscard={discard}
      extra={
        running && <RestartRow on={restart} onChange={setRestart} inline />
      }
    >
      {body}
    </EditorLayer>
  )
}

function RestartRow({
  on,
  onChange,
  inline,
}: {
  on: boolean
  onChange: (on: boolean) => void
  inline?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch inside is the control
    <label
      className={
        inline
          ? "me-2 flex cursor-pointer items-center gap-2 text-body-sm"
          : "flex min-h-14 shrink-0 cursor-pointer items-center justify-between gap-4 border-t border-border px-4 text-body"
      }
    >
      {inline ? (
        <>
          <Switch checked={on} onCheckedChange={onChange} />
          Restart after saving
        </>
      ) : (
        <>
          Restart after saving
          <Switch checked={on} onCheckedChange={onChange} />
        </>
      )}
    </label>
  )
}
