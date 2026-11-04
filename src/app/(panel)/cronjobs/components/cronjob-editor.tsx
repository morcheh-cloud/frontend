"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  CalendarClock,
  ChevronLeft,
  Info,
  Pencil,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

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
import { Switch } from "@/components/ui/switch"
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
import { type EndDraft, EndPicker, type Role } from "./end-picker"
import {
  browserZone,
  EndIcon,
  endId,
  endName,
  modeMeta,
  modes,
  type SyncMode,
} from "./meta"
import { useCronjobCan } from "./permissions"
import { ScheduleField } from "./schedule-field"

const MAX_DESTINATIONS = 20

type Draft = {
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
}

const fromSaved = (s: Schedule): Draft => ({
  name: s.name,
  description: s.description,
  source: s.source,
  destinations: s.destinations,
  cron: s.cron,
  builder: toBuilder(s.cron),
  timezone: s.timezone || "UTC",
  mode: s.options.mode,
  excludes: (s.options.excludes ?? []).join("\n"),
  keep: String(s.options.keep ?? 0),
  enabled: s.enabled,
})

const fresh = (): Draft => ({
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

function toBody(d: Draft): ScheduleBody | null {
  if (!d.source) return null
  return {
    name: d.name.trim(),
    description: d.description.trim(),
    source: toEnd(d.source),
    destinations: d.destinations.map(toEnd),
    cron: d.cron.trim(),
    timezone: d.timezone,
    enabled: d.enabled,
    options: {
      mode: d.mode,
      excludes: excludeList(d.excludes),
      keep: d.mode === "snapshot" ? Number(d.keep) || 0 : 0,
    },
  }
}

const same = (a: Draft, b: Draft) =>
  JSON.stringify(toBody(a)) === JSON.stringify(toBody(b)) && a.name === b.name

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
>

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
        delete next[k as keyof Errors]
      }
      return next
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
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Give it a name"
    if (!draft.source) e.source = "Choose what to copy"
    if (draft.destinations.length === 0) {
      e.destinations = "Add at least one place to copy to"
    }
    if (!draft.cron.trim()) e.cron = "Enter a schedule"
    const keep = Number(draft.keep)
    if (
      draft.mode === "snapshot" &&
      (!Number.isInteger(keep) || keep < 0 || keep > 1000)
    ) {
      e.keep = "A whole number from 0 to 1000"
    }
    return e
  }

  function save(opts?: { overwrite?: boolean }) {
    const e = check()
    setErrors(e)
    const body = toBody(draft)
    if (Object.keys(e).length > 0 || !body) {
      toast.error(Object.values(e)[0] ?? "Check the form")
      return
    }
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
        if (k === "name") mapped.name = v
        else if (k === "cron" || k === "timezone") mapped.cron = v
        else if (k.startsWith("source")) mapped.source = v
        else if (k.startsWith("destinations")) mapped.destinations = v
        else if (k.startsWith("options.keep")) mapped.keep = v
      }
      setErrors(mapped)
      toast.error(Object.values(mapped)[0] ?? err.message)
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

  const title = draft.name.trim() || saved?.name || "New cron job"
  const runsAs =
    saved?.run_as_id && saved.run_as_id !== user.id
      ? `It runs with ${saved.run_as_name || "someone else"}'s access now. Once you save, it runs with yours.`
      : "It runs with your access: Operator on the source, Engineer on every destination. If you lose that, it stops and says why."

  const sections = (
    <>
      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Nightly site backup"
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
              placeholder="Copies the uploads folder to the backup bucket"
              maxLength={2000}
              rows={2}
              className="placeholder:text-ash"
            />
          )}
        </Field>
      </Section>

      <Section
        title="Copy from"
        hint="A folder's contents (or one file) on a server or storage."
        phone={phone}
      >
        {draft.source ? (
          <EndRow
            end={draft.source}
            onChange={() => pick("source")}
            label="Change source"
          />
        ) : (
          <AddButton onClick={() => pick("source")}>Choose source</AddButton>
        )}
        <FieldError text={errors.source} />
      </Section>

      <Section
        title="Copy to"
        hint={`One or more folders, up to ${MAX_DESTINATIONS}. Each gets the same copy.`}
        phone={phone}
      >
        {draft.destinations.length > 0 && (
          <ul className="flex flex-col gap-2">
            {draft.destinations.map((d, i) => (
              <li key={`${endId(d)}:${d.path}`}>
                <EndRow
                  end={d}
                  onChange={() => pick("destination", i)}
                  label="Change destination"
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
              ? "Choose destination"
              : "Add another destination"}
          </AddButton>
        )}
        <FieldError text={errors.destinations} />
      </Section>

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
            have. Point it at a folder that holds only this copy, and try a Test
            run first.
          </Callout>
        )}
        {draft.mode === "snapshot" && (
          <Field
            label="Snapshots to keep"
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
        )}
        <Field
          label="Leave out"
          hint="One pattern per line. Without a slash it matches a name at any depth (*.log, node_modules); with one, a path from the source (cache/tmp)."
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
      </Section>

      <Section title="Access" phone={phone}>
        <div className="flex min-h-11 items-center justify-between gap-4">
          <label htmlFor="cronjob-enabled">
            <span className="block text-body-sm font-medium">
              Run on schedule
            </span>
            <span className="block text-caption text-muted-foreground">
              Off = paused. Run now still works.
            </span>
          </label>
          <Switch
            id="cronjob-enabled"
            checked={draft.enabled}
            onCheckedChange={(enabled) => set({ enabled })}
          />
        </div>
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

// A titled block: a card on desktop, a plain full-width group on phones.
function Section({
  title,
  hint,
  phone,
  children,
}: {
  title: string
  hint?: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8",
      )}
    >
      <div>
        <h2 className="text-body font-medium">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

function EndRow({
  end,
  onChange,
  onRemove,
  label,
}: {
  end: EndDraft
  onChange: () => void
  onRemove?: () => void
  label: string
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-input ps-3">
      <button
        type="button"
        onClick={onChange}
        aria-label={`${label}: ${endName({ ...end, missing: !!end.missing })} ${end.path}`}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <EndIcon end={end} className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-body-sm font-medium",
              end.missing && "text-destructive",
            )}
          >
            {endName({ ...end, missing: !!end.missing })}
          </span>
          <span className="block truncate font-mono text-caption text-muted-foreground">
            {end.path}
          </span>
        </span>
        <Pencil className="size-4 shrink-0 text-ash" />
      </button>
      {onRemove ? (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Remove"
          className="shrink-0 md:size-9"
          onClick={onRemove}
        >
          <X />
        </Button>
      ) : (
        <span className="w-2" />
      )}
    </div>
  )
}

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      variant="outline"
      className="h-11 justify-start self-stretch border-dashed md:h-10 md:self-start"
      onClick={onClick}
    >
      <Plus />
      {children}
    </Button>
  )
}

function FieldError({ text }: { text?: string }) {
  if (!text) return null
  return <p className="text-caption text-destructive">{text}</p>
}

function Callout({
  icon,
  tone,
  children,
}: {
  icon: ReactNode
  tone?: "warning"
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0",
        tone === "warning" && "[&>svg]:text-warning",
      )}
    >
      {icon}
      <p>{children}</p>
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
