"use client"

import { useQueryClient } from "@tanstack/react-query"
import { CalendarClock, ChevronLeft, Info, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useScripts } from "@/app/(panel)/scripts/api"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Builder,
  fromBuilder,
  toBuilder,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAuth } from "@/components/auth/auth"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api, fieldErrors } from "@/lib/api"
import type { Schedule, ScheduleBody, ScheduleEnd } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  cronjobKeys,
  useCreateCronjob,
  useCronjob,
  useUpdateCronjob,
} from "../api"
import {
  AddButton,
  Callout,
  EndRow,
  FieldError,
  Section,
  ToggleRow,
} from "./editor-parts"
import { type EndDraft, EndPicker, type Role } from "./end-picker"
import {
  type Action,
  ActionIcon,
  actionMeta,
  browserZone,
  endId,
  modeMeta,
  modes,
  type SyncMode,
  usesDestinations,
  usesSource,
} from "./meta"
import { useCronjobCan } from "./permissions"
import { ScheduleField } from "./schedule-field"
import {
  ActionPicker,
  accessText,
  checkTask,
  freshTask,
  type TaskDraft,
  type TaskErrors,
  TaskSections,
  taskErrorKey,
  taskFromSaved,
  toTask,
} from "./task-fields"

const MAX_DESTINATIONS = 20

type Draft = {
  action: Action
  name: string
  description: string
  source: EndDraft | null
  destinations: EndDraft[]
  // What's sent. The builder shows it; a saved "@daily" stays "@daily" until
  // the schedule is changed.
  cron: string
  builder: Builder
  timezone: string
  mode: SyncMode
  excludes: string
  keep: string
  enabled: boolean
  task: TaskDraft
}

const fromSaved = (s: Schedule): Draft => ({
  action: s.action ?? "sync",
  name: s.name,
  description: s.description,
  source: s.source ?? null,
  destinations: s.destinations ?? [],
  cron: s.cron,
  builder: toBuilder(s.cron),
  timezone: s.timezone || "UTC",
  mode: s.options.mode,
  excludes: (s.options.excludes ?? []).join("\n"),
  keep: String(s.options.keep ?? 0),
  enabled: s.enabled,
  task: taskFromSaved(s),
})

const fresh = (): Draft => ({
  action: "sync",
  name: "",
  description: "",
  source: null,
  destinations: [],
  cron: "0 3 * * *",
  builder: toBuilder("0 3 * * *"),
  timezone: browserZone(),
  mode: "update",
  excludes: "",
  keep: "7",
  enabled: true,
  task: freshTask(),
})

// Only what the API takes: Huma refuses unknown fields like name/missing.
const toEnd = (e: EndDraft): ScheduleEnd =>
  e.server_id
    ? { server_id: e.server_id, path: e.path }
    : { storage_id: e.storage_id, path: e.path }

const sameEnd = (a: ScheduleEnd, b: ScheduleEnd) =>
  endId(a) === endId(b) && a.path === b.path

const excludeList = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

// Only what the action uses: a copy's folders, or the task of the others.
function toBody(d: Draft): ScheduleBody {
  const a = d.action
  const keeps = a === "archive" || (a === "sync" && d.mode === "snapshot")
  return {
    action: a,
    name: d.name.trim(),
    description: d.description.trim(),
    source: usesSource(a) && d.source ? toEnd(d.source) : undefined,
    destinations: usesDestinations(a) ? d.destinations.map(toEnd) : [],
    task: toTask(a, d.task),
    cron: d.cron.trim(),
    timezone: d.timezone,
    enabled: d.enabled,
    options: {
      mode: a === "sync" ? d.mode : "update",
      excludes: usesSource(a) ? excludeList(d.excludes) : [],
      keep: keeps ? Number(d.keep) || 0 : 0,
    },
  }
}

const same = (a: Draft, b: Draft) =>
  JSON.stringify(toBody(a)) === JSON.stringify(toBody(b)) && a.name === b.name

const namePlaceholders: Record<Action, string> = {
  sync: "Nightly site backup",
  archive: "Weekly site archive",
  fetch: "Refresh the blocklist",
  script: "Clean up old logs",
  ansible: "Nightly hardening check",
  service: "Restart the workers",
  reboot: "Sunday reboots",
  "verify-backup": "Check last night's backups",
  "software-update": "Weekly updates",
}

function pickerTitle(a: Action, role: Role) {
  if (a === "archive")
    return role === "source" ? "Folder to archive" : "Send to"
  if (a === "fetch") return "Save in"
  return role === "source" ? "Copy from" : "Copy to"
}

function pickerHint(a: Action, role: Role) {
  if (a === "archive") {
    return role === "source"
      ? "A folder on a server. It's packed with its contents."
      : "The folder the archive goes into. Missing folders are created."
  }
  if (a === "fetch") {
    return "A folder on a server. Missing folders are created."
  }
  return undefined
}

function firstError(e: Errors): string | undefined {
  const { task, ...rest } = e
  return Object.values(rest)[0] ?? Object.values(task ?? {})[0]
}

// /cronjobs/[id]/edit reads its id from the route.
export function CronjobEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <CronjobEditor id={id} />
}

// /cronjobs/new and /cronjobs/[id]/edit.
export function CronjobEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const query = useCronjob(id, { poll: false })
  if (phone === null) return null
  if (id && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={CalendarClock}
          title={
            gone ? "This cron job isn't here" : "Couldn't load the cron job"
          }
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/cronjobs" />}
              nativeButton={false}
            >
              Back to cron jobs
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <Editor key={query.data?.id ?? "new"} saved={query.data} phone={phone} />
  )
}

type Errors = Partial<
  Record<"name" | "source" | "destinations" | "cron" | "keep", string>
> & { task?: TaskErrors }

function Editor({
  saved,
  phone,
}: {
  saved: Schedule | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const ws = saved?.workspace_id ?? workspace?.id ?? ""
  const can = useCronjobCan(ws)
  const { user } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const home = saved ? `/cronjobs/${saved.id}` : "/cronjobs"
  const back = useBack(home)

  const [draft, setDraft] = useState<Draft>(() =>
    saved ? fromSaved(saved) : fresh(),
  )
  const [revision, setRevision] = useState(saved?.updated_at)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)
  const [conflict, setConflict] = useOpen("cronjob-conflict")
  const [picking, setPicking] = useOpen("cronjob-end-picker")
  const [target, setTarget] = useState<{ role: Role; index?: number }>({
    role: "source",
  })

  const scripts = useScripts(ws)
  const scriptParams =
    draft.task.scriptKind === "saved"
      ? (scripts.data?.find((x) => x.id === draft.task.scriptId)?.params ?? [])
      : []

  const create = useCreateCronjob()
  const update = useUpdateCronjob()
  const saving = create.isPending || update.isPending
  const dirty = saved ? !same(draft, fromSaved(saved)) : touched

  usePageCrumbs(
    saved
      ? [
          { href: `/cronjobs/${saved.id}`, label: saved.name },
          { href: `/cronjobs/${saved.id}/edit`, label: "Edit" },
        ]
      : [{ href: "/cronjobs/new", label: "New cron job" }],
  )

  // Don't lose a half-made job to a closed tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(patch)) {
        if (k === "builder") delete next.cron
        if (k === "action") delete next.task
        delete next[k as keyof Errors]
      }
      return next
    })
  }

  const setTask = (patch: Partial<TaskDraft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, task: { ...d.task, ...patch } }))
    setErrors((e) => {
      if (!e.task) return e
      const task = { ...e.task }
      for (const k of Object.keys(patch)) {
        if (k === "scriptId" || k === "scriptKind") delete task.script
        if (k === "playbookId") delete task.playbook
        if (k === "picked") delete task.targets
        if (k === "databaseId") delete task.database
        if (k === "planId") delete task.plan
        if (k === "fileName") delete task.fileName
        if (k === "serviceAction") delete task.force
        delete task[k as keyof TaskErrors]
      }
      return { ...e, task }
    })
  }

  function pick(role: Role, index?: number) {
    setTarget({ role, index })
    setPicking(true)
  }

  function onPick(end: EndDraft) {
    const { role, index } = target
    if (role === "source") {
      if (draft.destinations.some((d) => sameEnd(d, end))) {
        toast.error("That folder is already a destination")
        return
      }
      set({ source: end })
      return
    }
    if (draft.source && sameEnd(draft.source, end)) {
      toast.error("That's the source: pick another folder")
      return
    }
    if (draft.destinations.some((d, i) => i !== index && sameEnd(d, end))) {
      toast.error("That folder is already in the list")
      return
    }
    const destinations =
      index === undefined
        ? [...draft.destinations, end]
        : draft.destinations.map((d, i) => (i === index ? end : d))
    set({ destinations })
  }

  function check(): Errors {
    const a = draft.action
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Give it a name"
    if (usesSource(a) && !draft.source) {
      e.source = a === "archive" ? "Choose the folder" : "Choose what to copy"
    }
    if (usesDestinations(a) && draft.destinations.length === 0) {
      e.destinations =
        a === "fetch"
          ? "Add at least one folder to save it in"
          : "Add at least one place to copy to"
    }
    if (!draft.cron.trim()) e.cron = "Enter a schedule"
    const keep = Number(draft.keep)
    if (
      (a === "archive" || (a === "sync" && draft.mode === "snapshot")) &&
      (!Number.isInteger(keep) || keep < 0 || keep > 1000)
    ) {
      e.keep = "A whole number from 0 to 1000"
    }
    const task = checkTask(a, draft.task, scriptParams)
    if (Object.keys(task).length > 0) e.task = task
    return e
  }

  function save(opts?: { overwrite?: boolean }) {
    const e = check()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(firstError(e) ?? "Check the form")
      return
    }
    const body = toBody(draft)
    const done = (s: Schedule) => {
      setRevision(s.updated_at)
      setTouched(false)
      toast.success(saved ? "Saved" : `${s.name} created`)
      router.replace(`/cronjobs/${s.id}`)
    }
    const failed = (err: Error) => {
      if (err instanceof ApiError && err.status === 409 && saved) {
        setConflict(true)
        return
      }
      const fields = fieldErrors(err)
      const mapped: Errors = {}
      for (const [k, v] of Object.entries(fields)) {
        const tk = taskErrorKey(draft.action, k)
        if (tk) mapped.task = { ...mapped.task, [tk]: v }
        else if (k === "name") mapped.name = v
        else if (k === "cron" || k === "timezone") mapped.cron = v
        else if (k.startsWith("source")) mapped.source = v
        else if (k.startsWith("destinations")) mapped.destinations = v
        else if (k.startsWith("options.keep")) mapped.keep = v
      }
      setErrors(mapped)
      toast.error(firstError(mapped) ?? err.message)
    }
    if (!saved) {
      create.mutate({ ws, body }, { onSuccess: done, onError: failed })
    } else {
      update.mutate(
        {
          id: saved.id,
          body: { ...body, revision: opts?.overwrite ? undefined : revision },
        },
        { onSuccess: done, onError: failed },
      )
    }
  }

  function loadTheirs() {
    setConflict(false)
    if (!saved) return
    api.cronJobs.getSchedule(saved.id).then(
      (s) => {
        qc.setQueryData(cronjobKeys.detail(s.id), s)
        setDraft(fromSaved(s))
        setRevision(s.updated_at)
        setErrors({})
      },
      (err: Error) => toast.error(err.message),
    )
  }

  if (!can.edit) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={CalendarClock}
          title="You can't change cron jobs here"
          body="Creating and editing them needs Engineer access to this workspace."
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href={home} />}
              nativeButton={false}
            >
              Back
            </Button>
          }
        />
      </div>
    )
  }

  const a = draft.action
  const title = draft.name.trim() || saved?.name || "New cron job"
  const runsAs =
    saved?.run_as_id && saved.run_as_id !== user.id
      ? `It runs with ${saved.run_as_name || "someone else"}'s access now. Once you save, it runs with yours.`
      : `It runs with your access: ${accessText[a]}. If you lose that, it stops and says why.`
  const keeps = a === "archive" || (a === "sync" && draft.mode === "snapshot")
  const keepField = (
    <Field
      label={a === "archive" ? "Archives to keep" : "Snapshots to keep"}
      hint="Older ones are deleted after a run that worked. 0 keeps them all."
      error={errors.keep}
      className="w-56"
    >
      {(p) => (
        <Input
          {...p}
          type="number"
          inputMode="numeric"
          min={0}
          max={1000}
          value={draft.keep}
          onChange={(e) => set({ keep: e.target.value })}
          className="tabular-nums"
        />
      )}
    </Field>
  )
  const excludesField = (
    <Field
      label="Leave out"
      hint={`One pattern per line. Without a slash it matches a name at any depth (*.log, node_modules); with one, a path from the ${a === "archive" ? "folder" : "source"} (cache/tmp).`}
    >
      {(p) => (
        <Textarea
          {...p}
          value={draft.excludes}
          onChange={(e) => set({ excludes: e.target.value })}
          placeholder="Nothing is left out"
          rows={3}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono placeholder:font-sans placeholder:text-ash"
        />
      )}
    </Field>
  )
  const destWord = a === "fetch" ? "folder" : "destination"

  const sections = (
    <>
      <Section
        title="What it does"
        hint={saved ? undefined : "Can't be changed once the job is saved."}
        phone={phone}
      >
        {saved ? (
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ActionIcon action={a} className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-medium">{actionMeta[a].label}</p>
              <p className="text-caption text-muted-foreground">
                {actionMeta[a].hint} Set when the job was made: for something
                else, make a new job.
              </p>
            </div>
          </div>
        ) : (
          <ActionPicker
            value={a}
            onChange={(action) => set({ action })}
            phone={phone}
          />
        )}
      </Section>

      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={namePlaceholders[a]}
              maxLength={100}
              className="placeholder:text-ash"
              enterKeyHint="next"
            />
          )}
        </Field>
        <Field label="Description" hint="Optional: what it's for.">
          {(p) => (
            <Textarea
              {...p}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              maxLength={2000}
              rows={2}
            />
          )}
        </Field>
      </Section>

      {usesSource(a) && (
        <Section
          title={a === "archive" ? "Folder to archive" : "Copy from"}
          hint={
            a === "archive"
              ? "A folder on a server, packed into one .tar.gz on the server itself."
              : "A folder's contents (or one file) on a server or storage."
          }
          phone={phone}
        >
          {draft.source ? (
            <EndRow
              end={draft.source}
              onChange={() => pick("source")}
              label={a === "archive" ? "Change folder" : "Change source"}
            />
          ) : (
            <AddButton onClick={() => pick("source")}>
              {a === "archive" ? "Choose folder" : "Choose source"}
            </AddButton>
          )}
          <FieldError text={errors.source} />
        </Section>
      )}

      <TaskSections
        action={a}
        t={draft.task}
        set={setTask}
        errors={errors.task ?? {}}
        phone={phone}
        ws={ws}
      />

      {usesDestinations(a) && (
        <Section
          title={
            a === "archive" ? "Send to" : a === "fetch" ? "Save in" : "Copy to"
          }
          hint={
            a === "fetch"
              ? `Folders on servers, up to ${MAX_DESTINATIONS}. Each server downloads its own copy.`
              : a === "archive"
                ? `Up to ${MAX_DESTINATIONS} folders on servers or storages. Each gets the archive.`
                : `One or more folders, up to ${MAX_DESTINATIONS}. Each gets the same copy.`
          }
          phone={phone}
        >
          {draft.destinations.length > 0 && (
            <ul className="flex flex-col gap-2">
              {draft.destinations.map((d, i) => (
                <li key={`${endId(d)}:${d.path}`}>
                  <EndRow
                    end={d}
                    onChange={() => pick("destination", i)}
                    label={`Change ${destWord}`}
                    onRemove={() =>
                      set({
                        destinations: draft.destinations.filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {draft.destinations.length < MAX_DESTINATIONS && (
            <AddButton onClick={() => pick("destination")}>
              {draft.destinations.length === 0
                ? `Choose ${destWord}`
                : `Add another ${destWord}`}
            </AddButton>
          )}
          <FieldError text={errors.destinations} />
        </Section>
      )}

      <Section title="When" phone={phone}>
        <ScheduleField
          builder={draft.builder}
          onChange={(builder) => set({ builder, cron: fromBuilder(builder) })}
          timezone={draft.timezone}
          onTimezone={(timezone) => set({ timezone })}
          error={errors.cron}
          phone={phone}
        />
      </Section>

      {a === "sync" && (
        <Section title="How" phone={phone}>
          <div className="flex flex-col gap-2">
            <div className="[scrollbar-width:none] overflow-x-auto">
              <Segmented
                label="Mode"
                items={modes}
                value={draft.mode}
                onChange={(mode) => set({ mode })}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              <span className="font-medium text-foreground">
                {modeMeta[draft.mode].label}.
              </span>{" "}
              {modeMeta[draft.mode].hint}
            </p>
          </div>
          {draft.mode === "mirror" && (
            <Callout icon={<TriangleAlert />} tone="warning">
              Mirror deletes files at each destination that the source doesn't
              have. Point it at a folder that holds only this copy, and try a
              Test run first.
            </Callout>
          )}
          {keeps && keepField}
          {excludesField}
        </Section>
      )}

      {a === "archive" && (
        <Section
          title="Archive"
          hint="Named after the folder and the time: site-2026-11-08_03-00-00.tar.gz."
          phone={phone}
        >
          {keepField}
          {excludesField}
        </Section>
      )}

      <Section title="Access" phone={phone}>
        <ToggleRow
          id="cronjob-enabled"
          label="Run on schedule"
          hint="Off = paused. Run now still works."
          checked={draft.enabled}
          onChange={(enabled) => set({ enabled })}
        />
        <Callout icon={<Info />}>{runsAs}</Callout>
      </Section>
    </>
  )

  const conflictDialog = (
    <ResponsiveDialog
      open={conflict}
      onOpenChange={setConflict}
      title="Someone else saved this cron job"
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

  const picker = (
    <EndPicker
      open={picking}
      onOpenChange={setPicking}
      role={target.role}
      serversOnly={
        (a === "archive" && target.role === "source") || a === "fetch"
      }
      need={a === "archive" ? "engineer" : undefined}
      title={pickerTitle(a, target.role)}
      description={pickerHint(a, target.role)}
      value={
        target.role === "source"
          ? (draft.source ?? undefined)
          : target.index !== undefined
            ? draft.destinations[target.index]
            : undefined
      }
      onPick={onPick}
    />
  )

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved ? "Edit cron job" : "New cron job"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={saving || (!!saved && !dirty)}
            onClick={() => save()}
          >
            {saving ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
        {picker}
        {conflictDialog}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CalendarClock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">{title}</h1>
          <p className="truncate text-caption text-ash">
            {dirty
              ? "Unsaved changes"
              : saved
                ? `Saved ${timeAgo(saved.updated_at)}`
                : "Not saved yet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            className="h-9"
            render={<Link href={home} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button
            className="h-9"
            disabled={saving || (!!saved && !dirty)}
            onClick={() => save()}
          >
            {saving ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </div>
      </div>
      <div className="grid max-w-5xl gap-6">{sections}</div>
      {picker}
      {conflictDialog}
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-6")}>
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
      <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
    </div>
  )
}
