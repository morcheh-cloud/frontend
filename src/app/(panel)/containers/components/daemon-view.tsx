"use client"

import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter } from "@codemirror/lint"
import CodeMirror from "@uiw/react-codemirror"
import {
  Braces,
  Copy,
  FileCog,
  History,
  RefreshCw,
  RotateCcw,
  Save,
  Undo2,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useCodeTheme } from "@/components/code-theme"
import { DiffLines, lineDiff } from "@/components/diff"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { DockerDaemonConfig, DockerFleetServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { editorTheme } from "../../servers/[id]/components/ini-editor"
import {
  Empty,
  type Item,
  type Note,
  Notices,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useApplyDaemon, useDaemonConfig, useSaveDaemonConfig } from "../api"
import {
  type Config,
  changedKeys,
  flagClashes,
  needsRestart,
  parseConfig,
  printConfig,
  warningsFor,
} from "./daemon-catalog"
import { DaemonSuggestions } from "./daemon-suggestions"
import { EnvPage } from "./env-page"
import { PageBar } from "./kit"

const extensions = [
  editorTheme,
  json(),
  linter(jsonParseLinter(), { delay: 300 }),
  lintGutter(),
]

export function DaemonPage() {
  return (
    <EnvPage title="Engine config" anyState>
      {({ env, phone }) => (
        <DaemonView key={env.server_id} env={env} phone={phone} />
      )}
    </EnvPage>
  )
}

type Apply = "none" | "reload" | "restart"

function DaemonView({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const q = useDaemonConfig(env.server_id)
  const { serverLevel } = useAccess()
  const owner = atLeast(serverLevel(env.server_id, env.workspace_id), "owner")

  if (q.isPending)
    return (
      <div className="flex flex-col gap-4 max-md:px-4 max-md:pt-4">
        <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-[28rem] rounded-2xl" />
      </div>
    )
  if (q.isError && !q.data)
    return (
      <Empty
        icon={FileCog}
        title="Couldn't read Docker's config"
        body={q.error.message}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  const d = q.data
  if (!d.supported)
    return (
      <Empty
        icon={FileCog}
        title="No daemon.json here"
        body={
          d.note ||
          (env.podman
            ? "Podman has no daemon and no daemon.json; it reads containers.conf instead."
            : "Docker Engine (dockerd) isn't installed on this server.")
        }
        className="max-md:mt-4"
      />
    )
  return (
    <Editor
      env={env}
      d={d}
      phone={phone}
      owner={owner}
      busy={q.isFetching}
      refetch={() => q.refetch()}
    />
  )
}

function Editor({
  env,
  d,
  phone,
  owner,
  busy,
  refetch,
}: {
  env: DockerFleetServer
  d: DockerDaemonConfig
  phone: boolean
  owner: boolean
  busy: boolean
  refetch: () => void
}) {
  const codeTheme = useCodeTheme()
  const save = useSaveDaemonConfig()
  const apply = useApplyDaemon()
  const [draft, setDraft] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [review, setReview] = useOpen("daemon-review")
  const [confirmRestart, setConfirmRestart] = useOpen("daemon-restart")

  const canEdit = owner && d.writable
  const text = draft ?? d.content
  const dirty = draft !== null && draft !== d.content
  const parsed = parseConfig(text)
  const cfg = parsed.ok ? parsed.value : null
  const savedParsed = parseConfig(d.content)
  const saved = savedParsed.ok ? savedParsed.value : {}
  const clashes = cfg ? flagClashes(d.flags, cfg) : []
  const warnings = cfg && dirty ? warningsFor(cfg, saved) : []
  const liveRestore = (cfg ?? saved)["live-restore"] === true

  const edit = (c: Config) => setDraft(printConfig(c))
  const discard = () => {
    setDraft(null)
    setConflict(false)
    save.reset()
  }

  const write = (how: Apply, overwrite = false) =>
    save.mutate(
      {
        server: env.server_id,
        content: text,
        revision: d.revision,
        force: overwrite,
        apply: how,
      },
      {
        onSuccess: (r) => {
          setDraft(null)
          setConflict(false)
          setReview(false)
          toast.success(
            r.applied === "restart"
              ? "Saved, and Docker restarted"
              : r.applied === "reload"
                ? "Saved, and Docker reloaded it"
                : "Saved",
            {
              description:
                r.applied === "none"
                  ? "Docker uses it from its next restart."
                  : undefined,
            },
          )
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409) {
            setConflict(true)
            setReview(false)
          } else if (!(e instanceof ApiError && e.status === 422)) {
            setReview(false)
            toast.error("Couldn't save", { description: e.message })
          }
        },
      },
    )

  const run = (how: "reload" | "restart") =>
    apply.mutate(
      { server: env.server_id, apply: how },
      {
        onSuccess: () => {
          setConfirmRestart(false)
          toast.success(
            how === "restart" ? "Docker restarted" : "Docker reloaded the file",
          )
        },
        onError: (e) => {
          setConfirmRestart(false)
          toast.error(how === "restart" ? "Restart failed" : "Reload failed", {
            description: e.message,
          })
        },
      },
    )

  const notes: Note[] = []
  if (!owner)
    notes.push({
      key: "owner",
      title: "Read only",
      body: "Changing Docker's config affects every container on this server, so only an Owner of the server can do it.",
    })
  else if (!d.writable)
    notes.push({
      key: "writable",
      title: "Morche can't write this file",
      body:
        d.note ||
        "Its login on this server isn't root and has no sudo. Give it sudo, or edit the file on the server.",
      warn: true,
    })
  if (conflict)
    notes.push({
      key: "conflict",
      title: "daemon.json changed on the server meanwhile",
      body: "Load their version (your edits are dropped), or overwrite it with yours.",
      warn: true,
      action: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              discard()
              refetch()
            }}
          >
            Load theirs
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setReview(true)}
          >
            Overwrite
          </Button>
        </div>
      ),
    })
  if (!parsed.ok)
    notes.push({
      key: "json",
      title: parsed.line
        ? `Not valid JSON (line ${parsed.line}, column ${parsed.column})`
        : "Not valid JSON",
      body: parsed.message,
      warn: true,
    })
  if (clashes.length)
    notes.push({
      key: "clash",
      title: "Docker won't start: set both as a flag and in the file",
      body: (
        <>
          {clashes.map((c, i) => (
            <span key={c.key}>
              {i > 0 && ", "}
              <span className="font-mono">{c.key}</span> (flag{" "}
              <span className="font-mono">{c.flag}</span>)
            </span>
          ))}
          . Remove {clashes.length === 1 ? "it" : "them"} from the file, or from
          the service's ExecStart line.
        </>
      ),
      warn: true,
    })
  for (const w of warnings)
    notes.push({ key: w.key, title: w.title, body: w.body, warn: true })
  if (d.pending && !dirty)
    notes.push({
      key: "pending",
      title: "Saved, but Docker isn't using it yet",
      body: "The file changed after Docker started. Reload applies some settings; the rest wait for a restart.",
      action: owner && (d.can_reload || d.can_restart) && (
        <div className="flex gap-2">
          {d.can_reload && (
            <Button
              size="sm"
              variant="outline"
              disabled={apply.isPending}
              onClick={() => run("reload")}
            >
              Reload
            </Button>
          )}
          {d.can_restart && (
            <Button
              size="sm"
              disabled={apply.isPending}
              onClick={() => setConfirmRestart(true)}
            >
              Restart Docker
            </Button>
          )}
        </div>
      ),
    })
  if (owner && d.writable && !d.can_restart && d.running)
    notes.push({
      key: "manager",
      title: "Morche can't restart Docker here",
      body: "Docker isn't run by a service manager Morche knows (it may be the container's main process). Save, then restart it yourself.",
    })
  if (save.error instanceof ApiError && save.error.status === 422)
    notes.push({
      key: "refused",
      title: "Not saved as it is",
      body: (
        <span className="font-mono text-caption whitespace-pre-wrap">
          {save.error.message}
        </span>
      ),
      warn: true,
    })

  const more: Item[][] = [
    [
      {
        key: "format",
        label: "Format",
        icon: <Braces />,
        disabled: !canEdit || !cfg || printConfig(cfg) === text,
        onSelect: () => cfg && setDraft(printConfig(cfg)),
      },
      {
        key: "copy",
        label: "Copy",
        icon: <Copy />,
        onSelect: () =>
          navigator.clipboard
            ?.writeText(text)
            .then(() => toast.success("Copied"))
            .catch(() => toast.error("Couldn't copy")),
      },
      ...(canEdit && d.previous && d.previous !== text
        ? [
            {
              key: "previous",
              label: "Load the copy before the last save",
              icon: <History />,
              onSelect: () => setDraft(d.previous),
            },
          ]
        : []),
      ...(dirty
        ? [
            {
              key: "discard",
              label: "Discard changes",
              icon: <Undo2 />,
              onSelect: discard,
            },
          ]
        : []),
    ],
    owner
      ? [
          ...(d.can_reload
            ? [
                {
                  key: "reload",
                  label: "Reload Docker",
                  icon: <Zap />,
                  disabled: apply.isPending,
                  onSelect: () => run("reload"),
                },
              ]
            : []),
          ...(d.can_restart
            ? [
                {
                  key: "restart",
                  label: "Restart Docker",
                  icon: <RotateCcw />,
                  disabled: apply.isPending,
                  onSelect: () => setConfirmRestart(true),
                },
              ]
            : []),
        ]
      : [],
  ]

  const canSave = canEdit && dirty && parsed.ok && clashes.length === 0
  const saveButton = (
    <Button
      className={cn(!phone && "h-9")}
      disabled={!canSave || save.isPending}
      onClick={() => setReview(true)}
    >
      <Save />
      Save
    </Button>
  )

  const fileLabel = (
    <span className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
      <FileCog className="size-4 shrink-0 text-ash" />
      <span className="truncate font-mono text-body-sm" title={d.path}>
        {d.path}
      </span>
      {dirty && (
        <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-caption text-brand-strong">
          Edited
        </span>
      )}
      {!d.exists && !dirty && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
          Not created yet
        </span>
      )}
    </span>
  )

  const caption = [
    d.modified_at && `Changed ${timeAgo(d.modified_at)}`,
    d.running
      ? d.started_at && `Docker started ${timeAgo(d.started_at)}`
      : "Docker isn't running",
  ]
    .filter(Boolean)
    .join(" · ")

  const editor = (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden [contain:inline-size]",
        !phone && "rounded-2xl border border-border bg-card",
      )}
    >
      <CodeMirror
        theme={codeTheme}
        value={text}
        onChange={(v) => setDraft(v)}
        readOnly={!canEdit}
        editable={canEdit}
        extensions={extensions}
        basicSetup={{ highlightActiveLine: canEdit, foldGutter: true }}
        placeholder={
          "{}  — empty: Docker uses its defaults.\nPick a suggested setting to start."
        }
        height={phone ? "55vh" : "max(26rem, calc(100dvh - 15rem))"}
        className="min-h-0 overflow-hidden"
      />
    </div>
  )

  return (
    <>
      <PageBar
        phone={phone}
        tabs={phone ? undefined : fileLabel}
        search={phone ? fileLabel : undefined}
        caption={caption}
        refresh={{ busy, run: refetch }}
        aside={phone ? undefined : saveButton}
        more={more}
      />
      <Notices notes={notes} />
      <div
        className={cn(
          "grid gap-4",
          phone
            ? "mt-4 gap-0"
            : "xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start",
        )}
      >
        {editor}
        <div
          className={cn(
            !phone &&
              "xl:sticky xl:top-[calc(3rem+1px+1.25rem)] xl:max-h-[calc(100dvh-3rem-2.5rem)] xl:overflow-y-auto xl:rounded-2xl",
          )}
        >
          <DaemonSuggestions
            cfg={cfg}
            saved={saved}
            canEdit={canEdit}
            onChange={edit}
            phone={phone}
          />
        </div>
      </div>
      {phone && dirty && canEdit && (
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-10 flex gap-2 border-t border-border bg-background px-4 py-3">
          <Button variant="outline" className="h-11 flex-1" onClick={discard}>
            Discard
          </Button>
          <Button
            className="h-11 flex-1"
            disabled={!canSave || save.isPending}
            onClick={() => setReview(true)}
          >
            <Save />
            Save
          </Button>
        </div>
      )}
      {review && (
        <ReviewDialog
          open={review}
          onOpenChange={setReview}
          d={d}
          text={text}
          saved={saved}
          cfg={cfg ?? {}}
          running={env.running}
          liveRestore={liveRestore}
          pending={save.isPending}
          error={
            save.error instanceof ApiError && save.error.status === 422
              ? save.error.message
              : null
          }
          onSave={(how) => write(how, conflict)}
        />
      )}
      <ConfirmDialog
        open={confirmRestart}
        onOpenChange={setConfirmRestart}
        title="Restart Docker?"
        description={
          liveRestore
            ? "live-restore is on, so containers keep running while Docker restarts."
            : `Every running container (${env.running} now) stops and starts again; containers without a restart policy stay stopped.`
        }
        confirmLabel={apply.isPending ? "Restarting…" : "Restart Docker"}
        pending={apply.isPending}
        onConfirm={() => run("restart")}
      />
    </>
  )
}

function ReviewDialog({
  open,
  onOpenChange,
  d,
  text,
  saved,
  cfg,
  running,
  liveRestore,
  pending,
  error,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  d: DockerDaemonConfig
  text: string
  saved: Config
  cfg: Config
  running: number
  liveRestore: boolean
  pending: boolean
  error: string | null
  onSave: (how: Apply) => void
}) {
  const keys = changedKeys(saved, cfg)
  const restartKeys = needsRestart(keys)
  const reloadOk = d.can_reload && d.running && restartKeys.length === 0
  const initial: Apply = !d.running
    ? d.can_restart
      ? "restart"
      : "none"
    : reloadOk && keys.length > 0
      ? "reload"
      : d.can_restart
        ? "restart"
        : "none"
  const [how, setHow] = useState<Apply>(initial)
  const removing = text.trim() === ""
  const diff = lineDiff(d.content, text)

  const choices: {
    value: Apply
    title: string
    body: string
    disabled?: string
  }[] = [
    {
      value: "restart",
      title: d.running ? "Save and restart Docker" : "Save and start Docker",
      body: liveRestore
        ? "Everything applies. Containers keep running (live-restore is on)."
        : `Everything applies. ${running} running container${running === 1 ? "" : "s"} stop and start again; ones without a restart policy stay stopped. If Docker doesn't come back, the old file is put back.`,
      disabled: d.can_restart
        ? undefined
        : "Morche can't restart Docker on this server.",
    },
    {
      value: "reload",
      title: "Save and reload",
      body:
        restartKeys.length === 0
          ? "Docker re-reads the file without stopping anything; every change here takes effect."
          : `No downtime, but ${restartKeys.join(", ")} only take${restartKeys.length === 1 ? "s" : ""} effect at the next restart.`,
      disabled: !d.running
        ? "Docker isn't running."
        : d.can_reload
          ? undefined
          : "Morche can't signal Docker on this server.",
    },
    {
      value: "none",
      title: "Only save",
      body: "Nothing changes now; Docker uses the file from its next restart.",
    },
  ]

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Save daemon.json"
      description={d.path}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={pending} onClick={() => onSave(how)}>
            {pending ? <RefreshCw className="animate-spin" /> : <Save />}
            {pending
              ? how === "restart"
                ? "Restarting Docker…"
                : "Saving…"
              : choices.find((c) => c.value === how)?.title}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {removing ? (
          <p className="text-body-sm text-muted-foreground">
            The editor is empty, so the file is removed and Docker goes back to
            its defaults.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-caption font-medium">
              {keys.length === 0
                ? "No settings change (only formatting)"
                : `Changes: ${keys.join(", ")}`}
            </p>
            <DiffLines lines={diff} className="max-h-64" />
          </div>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-caption font-medium">Then</legend>
          {choices.map((c) => (
            <label
              key={c.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-checked:border-brand has-checked:bg-brand-soft/40",
                c.disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="daemon-apply"
                value={c.value}
                checked={how === c.value}
                disabled={!!c.disabled || pending}
                onChange={() => setHow(c.value)}
                className="mt-1 accent-[var(--color-brand)]"
              />
              <span className="min-w-0">
                <span className="block text-body-sm font-medium">
                  {c.title}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {c.disabled ?? c.body}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-caption text-ash">
          {d.validates
            ? "Docker checks the file before it's saved; a file it refuses is never written."
            : "This Docker can't check a file in advance (no dockerd --validate)."}{" "}
          The current file is kept beside it as{" "}
          <span className="font-mono">daemon.json.morcheh-bak</span>.
        </p>
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 font-mono text-caption whitespace-pre-wrap text-destructive">
            {error}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
