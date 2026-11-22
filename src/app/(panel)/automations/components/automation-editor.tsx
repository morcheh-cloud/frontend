"use client"

import {
  ChevronLeft,
  Info,
  Link2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useChannels } from "@/app/(panel)/alerts/api"
import {
  Callout,
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Choice } from "@/app/(panel)/cronjobs/components/task-fields"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAuth } from "@/components/auth/auth"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { eventLabel, useEventCatalog } from "@/components/events/catalog"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type { Automation, AutomationEventInput } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAutomation, useAutomationPreview, useSaveAutomation } from "../api"
import { useNames } from "./automation-page"
import { TemplateCard } from "./automations-view"
import { plainWords } from "./describe"
import {
  checkDraft,
  type Draft,
  draftFromSaved,
  draftFromTemplate,
  type Errors,
  freshDraft,
  mapServerError,
  sameDraft,
  stepsWithErrors,
  toBody,
} from "./draft"
import { DryRunView } from "./dry-run"
import {
  AutomationIcon,
  actsOnServers,
  automationHref,
  LIST,
  stepMeta,
  triggerMeta,
} from "./meta"
import { useAutomationCan } from "./permissions"
import { StepList } from "./step-list"
import { templateOf, templates } from "./templates"
import { EventsField, FilterFields, TriggerTiles } from "./trigger-fields"

// /automations/[id]/edit reads its id from the route.
export function AutomationEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <AutomationEditor id={id} />
}

// /automations/new (?template=) and /automations/[id]/edit.
export function AutomationEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  const query = useAutomation(id, { poll: false })
  const [template] = useQueryState("template", parseAsString)
  const ws = query.data?.workspace_id ?? workspace?.id ?? ""
  const channels = useChannels(ws)
  if (phone === null || !ws) return null
  if ((id && query.isPending) || (!id && template && channels.isPending))
    return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={AutomationIcon}
          title={
            gone ? "This automation isn't here" : "Couldn't load the automation"
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
              render={<Link href={LIST} />}
              nativeButton={false}
            >
              Back to automations
            </Button>
          }
        />
      </div>
    )
  }
  const defaults = (channels.data ?? [])
    .filter((c) => c.is_default)
    .map((c) => c.id)
  return (
    <Editor
      key={query.data?.id ?? `new-${template ?? ""}`}
      saved={query.data}
      ws={ws}
      phone={phone}
      template={id ? null : template}
      defaults={defaults}
    />
  )
}

function Editor({
  saved,
  ws,
  phone,
  template,
  defaults,
}: {
  saved: Automation | undefined
  ws: string
  phone: boolean
  template: string | null
  defaults: string[]
}) {
  const can = useAutomationCan(ws)
  const { user } = useAuth()
  const router = useRouter()
  const catalog = useEventCatalog()
  const home = saved ? automationHref(saved.id) : LIST
  const back = useBack(home)
  const lookups = useNames(ws)
  const save = useSaveAutomation()

  const start = templateOf(template)
  const [draft, setDraft] = useState<Draft>(() =>
    saved
      ? draftFromSaved(saved)
      : start
        ? draftFromTemplate(start, defaults)
        : freshDraft(),
  )
  const [picked, setPicked] = useState<typeof start | undefined>(start)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [chosenNames, setChosenNames] = useState(new Map<string, string>())
  const names = new Map([...(lookups.servers ?? []), ...chosenNames])
  const dirty = saved ? !sameDraft(draft, draftFromSaved(saved)) : touched

  usePageCrumbs(
    saved
      ? [
          { href: automationHref(saved.id), label: saved.name },
          { href: `${LIST}/${saved.id}/edit`, label: "Edit" },
        ]
      : [{ href: "/automations/new", label: "New automation" }],
  )

  // Don't lose a half-made automation to a closed tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => {
      const next = { ...d, ...patch }
      // Without an event there's no event server: steps act on chosen ones.
      if (patch.kind && patch.kind !== d.kind && patch.kind === "webhook")
        next.steps = next.steps.map((s) =>
          actsOnServers(s.kind) ? { ...s, on: "servers" } : s,
        )
      return next
    })
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(patch)) {
        if (k === "events") delete next["trigger.events"]
        if (k === "steps") {
          delete next.actions
          for (const key of Object.keys(next))
            if (key.startsWith("steps.")) delete next[key]
        }
        if (k === "cooldown") delete next.cooldown_seconds
        if (k === "maxPerHour") delete next.max_runs_per_hour
        delete next[k]
      }
      return next
    })
  }

  const apply = (key: string) => {
    const t = templateOf(key)
    if (!t) return
    setDraft(draftFromTemplate(t, defaults))
    setPicked(t)
    setTouched(true)
    setErrors({})
  }

  // ---- live dry run ----
  const [sample, setSample] = useState({ type: "", server: "" })
  const previewable =
    draft.steps.length > 0 &&
    (draft.kind !== "event" || draft.events.length > 0)
  const sampleEvent: AutomationEventInput | undefined =
    sample.type || sample.server
      ? {
          ...(draft.kind === "event" && draft.events.includes(sample.type)
            ? { type: sample.type }
            : {}),
          ...(sample.server ? { server_id: sample.server } : {}),
        }
      : undefined
  const preview = useAutomationPreview(
    ws,
    toBody(draft, true),
    sampleEvent,
    previewable && can.edit,
  )

  function submit() {
    const e = checkDraft(draft)
    setErrors(e)
    if (Object.keys(e).length > 0) {
      const bad = stepsWithErrors(e)
      const first = draft.steps.find((s) => bad.has(s.key))
      if (first) setOpen(first.key)
      toast.error(Object.values(e)[0] ?? "Check the form")
      return
    }
    const keys = draft.steps.map((s) => s.key)
    save.mutate(
      { id: saved?.id, ws, body: toBody(draft) },
      {
        onSuccess: (a) => {
          setTouched(false)
          toast.success(saved ? "Saved" : `${a.name} created`)
          router.replace(automationHref(a.id))
        },
        onError: (err) => {
          const mapped: Errors = {}
          for (const [k, v] of Object.entries(fieldErrors(err)))
            mapped[mapServerError(k, keys)] ??= v
          setErrors(mapped)
          const bad = stepsWithErrors(mapped)
          const first = draft.steps.find((s) => bad.has(s.key))
          if (first) setOpen(first.key)
          toast.error(Object.values(mapped)[0] ?? err.message)
        },
      },
    )
  }

  if (!can.edit) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={AutomationIcon}
          title="You can't change automations here"
          body={
            can.demo
              ? "The public demo shows automations but doesn't change them."
              : "Creating and editing them needs Engineer access to this workspace."
          }
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

  const saving = save.isPending
  const title = draft.name.trim() || saved?.name || "New automation"
  const runsAs =
    saved?.run_as_id && saved.run_as_id !== user.id
      ? `It runs with ${saved.run_as_name || "someone else"}'s access now. Once you save, it runs with yours.`
      : "It runs with your access. If you lose it (or your account is removed), it stops and says why until someone saves it again."
  const words = plainWords(
    toBody(draft).trigger,
    toBody(draft).actions,
    catalog.data,
    {
      ...lookups,
      servers: names,
    },
  )

  const sections = (
    <>
      {!saved && draft.steps.length === 0 && !picked && (
        <Section
          title="Start from a template"
          hint="Ready-made automations to adjust, or start from scratch below."
          phone={phone}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-2">
            {templates.map((t) => (
              <TemplateCard
                key={t.key}
                t={t}
                canEdit
                onPick={() => apply(t.key)}
                className="min-h-32"
              />
            ))}
          </div>
        </Section>
      )}

      {picked?.note && !saved && (
        <div className={cn(phone && "px-4 pt-4")}>
          <Callout icon={<Info />}>
            <span className="font-medium text-foreground">{picked.name}.</span>{" "}
            {picked.note}
          </Callout>
        </div>
      )}

      <Section
        title="When"
        hint="What starts it. It can always be run by hand too."
        phone={phone}
      >
        <div className="@container flex flex-col gap-4">
          <TriggerTiles value={draft.kind} onChange={(kind) => set({ kind })} />
          <FieldError text={errors["trigger.kind"]} />
          {draft.kind === "event" && (
            <>
              <EventsField d={draft} set={set} errors={errors} />
              <div className="flex flex-col gap-4 rounded-xl bg-subtle p-4">
                <div>
                  <p className="text-body-sm font-medium">Only when…</p>
                  <p className="text-caption text-muted-foreground">
                    Every filter you set must match. None = every event of the
                    chosen kinds.
                  </p>
                </div>
                <FilterFields
                  ws={ws}
                  d={draft}
                  set={set}
                  errors={errors}
                  phone={phone}
                  names={names}
                  onNames={(m) => setChosenNames(m)}
                />
              </div>
            </>
          )}
          {draft.kind === "webhook" && (
            <Callout icon={<Link2 />}>
              {saved?.has_hook
                ? "Its incoming URL is set. Make a new one or remove it on the automation's page."
                : "Once it's saved, make its secret URL on the automation's page. A POST with JSON there starts it; the JSON is the event's data ({{data.branch}}…)."}
            </Callout>
          )}
          {draft.kind === "manual" && (
            <Callout icon={<Info />}>
              Only Run now starts it: on its page or the list. Run now can give
              it a server to act on.
            </Callout>
          )}
        </div>
      </Section>

      <Section
        title="Do"
        hint="Up to 10 steps, in order. The first one that fails ends the run, unless it may go on (Safety)."
        phone={phone}
      >
        <StepList
          steps={draft.steps}
          onSteps={(steps) => set({ steps })}
          open={open}
          onOpen={setOpen}
          errors={errors}
          ws={ws}
          trigger={draft.kind}
          phone={phone}
          names={names}
          onNames={(m) => setChosenNames(m)}
          lookups={{ ...lookups, servers: names }}
        />
        <FieldError text={errors.actions} />
      </Section>

      <Section
        title="Safety"
        hint="What keeps a noisy event from running it again and again."
        phone={phone}
      >
        <div className="@container">
          <div className="grid gap-4 @2xl:grid-cols-2">
            <Field
              label="Cooldown"
              hint="Seconds. After a run for a server, monitor or database, more events about the same one are skipped this long. 0 = none."
              error={errors.cooldown_seconds}
            >
              {(f) => (
                <div className="flex flex-col gap-2">
                  <Input
                    {...f}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={86400}
                    value={draft.cooldown}
                    onChange={(e) => set({ cooldown: e.target.value })}
                    className="tabular-nums sm:w-40"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ["0", "None"],
                      ["300", "5 min"],
                      ["900", "15 min"],
                      ["3600", "1 hour"],
                    ].map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={draft.cooldown === v}
                        onClick={() => set({ cooldown: v })}
                        className="h-8 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand/40 aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-10"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>
            <Field
              label="At most, runs an hour"
              hint="Past it, events are skipped with a reason. 0 = no limit."
              error={errors.max_runs_per_hour}
            >
              {(f) => (
                <Input
                  {...f}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  value={draft.maxPerHour}
                  onChange={(e) => set({ maxPerHour: e.target.value })}
                  className="tabular-nums sm:w-40"
                />
              )}
            </Field>
          </div>
        </div>
        {draft.steps.length > 1 && (
          <div className="flex flex-col gap-1">
            <p className="text-body-sm font-medium">If a step fails</p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {draft.steps.slice(0, -1).map((s, i) => (
                <li key={s.key} className="px-3">
                  <ToggleRow
                    id={`${s.key}-goon`}
                    label={`${i + 1}. ${s.label.trim() || stepMeta[s.kind].label}`}
                    hint={
                      s.continueOnError
                        ? "Goes on with the next step."
                        : "Stops the run; the rest are skipped."
                    }
                    checked={s.continueOnError}
                    onChange={(continueOnError) =>
                      set({
                        steps: draft.steps.map((x) =>
                          x.key === s.key ? { ...x, continueOnError } : x,
                        ),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
        <Callout icon={<ShieldCheck />}>
          Events an automation caused never start automations, and one subject
          never has two runs at once.
        </Callout>
      </Section>

      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(f) => (
            <Input
              {...f}
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Restart nginx when it fails"
              maxLength={100}
              className="placeholder:text-ash"
              enterKeyHint="next"
            />
          )}
        </Field>
        <Field label="Description" hint="Optional: what it's for.">
          {(f) => (
            <Textarea
              {...f}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              maxLength={2000}
              rows={2}
            />
          )}
        </Field>
        <ToggleRow
          id="automation-enabled"
          label="On"
          hint={
            draft.enabled
              ? "It reacts as soon as it's saved."
              : "Off, nothing starts it. Run now still works."
          }
          checked={draft.enabled}
          onChange={(enabled) => set({ enabled })}
        />
      </Section>

      <Section title="Runs as" phone={phone}>
        <Callout icon={<Info />}>{runsAs}</Callout>
        <p className="text-caption text-muted-foreground">
          Steps that run commands or act on services need Engineer access to
          their servers, a check needs Operator: at save and again at each run.
        </p>
      </Section>

      {phone && (
        <Section
          title="What would happen"
          hint="A dry run with a sample event, as you. Nothing runs."
          phone
        >
          <PreviewBody
            draft={draft}
            sample={sample}
            setSample={setSample}
            preview={preview}
            previewable={previewable}
          />
        </Section>
      )}
    </>
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
            {saved ? "Edit automation" : "New automation"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={saving || (!!saved && !dirty)}
            onClick={submit}
          >
            {saving ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  const TriggerIcon = triggerMeta[draft.kind].icon
  return (
    <EditorPage
      icon={<AutomationIcon />}
      title={title}
      dirty={dirty}
      status={
        dirty
          ? "Unsaved changes"
          : saved
            ? `Saved ${timeAgo(saved.updated_at)}`
            : "Not saved yet"
      }
      onSave={saving || (!!saved && !dirty) ? undefined : submit}
      aside={
        <>
          <AsideCard title="In plain words">
            <div className="flex flex-col gap-2 text-body-sm">
              <p className="flex gap-2 font-medium">
                <TriggerIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0 break-words">{words.when},</span>
              </p>
              {words.steps.length ? (
                <ol className="flex flex-col gap-1 ps-6 text-muted-foreground">
                  {words.steps.map((s, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: in order
                    <li key={i} className="break-words">
                      {s}
                      {i === words.steps.length - 1 ? "." : ","}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="ps-6 text-ash">…do nothing yet: add a step.</p>
              )}
            </div>
          </AsideCard>
          <AsideCard title="What would happen">
            <PreviewBody
              draft={draft}
              sample={sample}
              setSample={setSample}
              preview={preview}
              previewable={previewable}
              compact
            />
          </AsideCard>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                ["Starts", triggerMeta[draft.kind].label],
                [
                  "Events",
                  draft.kind === "event"
                    ? draft.events
                        .map((e) => eventLabel(catalog.data, e))
                        .join(", ")
                    : "",
                ],
                ["Steps", String(draft.steps.length)],
                [
                  "Cooldown",
                  Number(draft.cooldown) ? `${draft.cooldown} s` : "None",
                ],
                ["State", draft.enabled ? "On" : "Off"],
                [
                  "Runs with",
                  saved?.run_as_id && saved.run_as_id !== user.id && !dirty
                    ? `${saved.run_as_name || "Someone else"}'s access`
                    : "Your access",
                ],
              ]}
            />
          </AsideCard>
        </>
      }
      actions={
        <>
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
            onClick={submit}
          >
            {saving ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

function PreviewBody({
  draft,
  sample,
  setSample,
  preview,
  previewable,
  compact,
}: {
  draft: Draft
  sample: { type: string; server: string }
  setSample: (s: { type: string; server: string }) => void
  preview: ReturnType<typeof useAutomationPreview>
  previewable: boolean
  compact?: boolean
}) {
  const catalog = useEventCatalog()
  const servers = useServers({ limit: 200, sort: "name" })
  const onEvent = draft.steps.some(
    (s) => actsOnServers(s.kind) && s.on === "event",
  )
  if (!previewable)
    return (
      <p className="text-caption text-ash">
        {draft.kind === "event" && !draft.events.length
          ? "Choose an event and add a step: a dry run with its sample shows here."
          : "Add a step: a dry run shows here what it would do."}
      </p>
    )
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
        {draft.kind === "event" && draft.events.length > 1 && (
          <Choice
            id="preview-type"
            value={draft.events.includes(sample.type) ? sample.type : ""}
            onChange={(type) => setSample({ ...sample, type })}
            placeholder={`Sample: ${eventLabel(catalog.data, draft.events[0])}`}
            items={draft.events.slice(1).map((e) => ({
              value: e,
              label: `Sample: ${eventLabel(catalog.data, e)}`,
            }))}
          />
        )}
        {onEvent && (
          <Choice
            id="preview-server"
            value={sample.server}
            onChange={(server) => setSample({ ...sample, server })}
            placeholder="On no server"
            items={(servers.data?.items ?? []).map((x) => ({
              value: x.id,
              label: `On ${x.name}`,
            }))}
          />
        )}
      </div>
      {preview.isError && (
        <p className="flex gap-1.5 text-caption text-muted-foreground">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
          <span className="min-w-0 break-words">
            {fieldErrors(preview.error) &&
            Object.values(fieldErrors(preview.error))[0]
              ? `Not yet: ${Object.values(fieldErrors(preview.error))[0]}`
              : preview.error.message}
          </span>
        </p>
      )}
      {preview.data ? (
        <div
          className={cn(preview.isFetching && "opacity-60 transition-opacity")}
        >
          <DryRunView
            d={preview.data}
            compact={compact}
            manual={draft.kind === "manual"}
          />
        </div>
      ) : preview.isPending && !preview.isError ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : null}
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  if (!phone) return <EditorLoading />
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
