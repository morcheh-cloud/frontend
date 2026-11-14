"use client"

import { ChevronLeft, Info, RefreshCcwDot, Tag as TagIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useChannels } from "@/app/(panel)/alerts/api"
import {
  type Builder,
  fromBuilder,
  toBuilder,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { AsideCard, EditorPage, SummaryList } from "@/components/editor-page"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import type { DockerAutoUpdate, DockerAutoUpdateRules } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Callout,
  FieldError,
  Section,
  ToggleRow,
} from "../../cronjobs/components/editor-parts"
import { browserZone, cronText } from "../../cronjobs/components/meta"
import { Choice, ScheduleField } from "../../cronjobs/components/schedule-field"
import { Empty } from "../../servers/[id]/components/parts"
import { Checklist } from "../../servers/components/server-checklist"
import { ChannelPicker } from "../../uptime/components/monitor-editor"
import { useSaveAutoUpdate } from "../api"
import { useDockerEnv } from "../env"
import { CoverPreview } from "./auto-update-cover"
import {
  AUTO_UPDATE,
  autoUpdateHref,
  type Draft,
  draftOf,
  freshDraft,
  modeMeta,
  newParsers,
  notifyMeta,
  pickMeta,
  sameDraft,
  splitPatterns,
} from "./auto-update-meta"
import { useDockerWorkspaceCan } from "./permissions"

type Form = {
  d: Draft
  builder: Builder
  // No schedule: runs only by hand or from its webhook.
  manual: boolean
  include: string
  exclude: string
}

const formOf = (d: Draft): Form => ({
  // A saved policy always has one (the backend fills UTC); a new one starts
  // on the browser's.
  d: { ...d, timezone: d.timezone || browserZone() },
  builder: toBuilder(d.cron || "0 4 * * *"),
  manual: !d.cron,
  include: d.include.join("\n"),
  exclude: d.exclude.join("\n"),
})

const draftFrom = (f: Form): Draft => ({
  ...f.d,
  cron: f.manual ? "" : fromBuilder(f.builder),
  include: splitPatterns(f.include),
  exclude: splitPatterns(f.exclude),
})

type Errors = Record<string, string>

const engineWord: Record<string, string> = {
  stopped: "Engine stopped",
  "no-access": "No access",
  error: "Engine error",
  offline: "Offline",
}

// What the backend would refuse, said before it does.
function check(d: Draft): Errors {
  const e: Errors = {}
  if (!d.name.trim()) e.name = "Give the policy a name"
  if (d.servers.length === 0) e.servers = "Pick at least one server"
  if (d.pick === "chosen" && d.include.length === 0) {
    e.include = "Name at least one container, project or image"
  }
  return e
}

// The policy form: a page of its own for a new policy, the Settings tab of
// an existing one (with a sticky save bar while there are changes).
export function AutoUpdateEditor({
  ws,
  phone,
  saved,
  prefill,
}: {
  ws: string
  phone: boolean
  saved?: DockerAutoUpdate
  prefill?: { server?: string | null; container?: string | null }
}) {
  const router = useRouter()
  const base = saved
    ? draftOf(saved)
    : freshDraft(prefill?.server ?? undefined, prefill?.container ?? undefined)
  const [form, setForm] = useState<Form>(() => formOf(base))
  const [errors, setErrors] = useState<Errors>({})
  const save = useSaveAutoUpdate()
  const channels = useChannels(ws)
  const env = useDockerEnv()
  const back = useBack(saved ? autoUpdateHref(saved.id) : AUTO_UPDATE)

  const draft = draftFrom(form)
  const dirty = !sameDraft(draft, draftFrom(formOf(base)))
  const d = form.d

  // Don't lose a half-made policy to a closed tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Form>, ...clear: string[]) => {
    setForm((f) => ({ ...f, ...patch }))
    if (clear.length > 0) {
      setErrors((e) => {
        const next = { ...e }
        for (const k of clear) delete next[k]
        return next
      })
    }
  }
  const setD = (patch: Partial<Draft>) =>
    set({ d: { ...form.d, ...patch } }, ...Object.keys(patch))

  const submit = () => {
    const problems = check(draft)
    if (Object.keys(problems).length > 0) {
      setErrors(problems)
      toast.error(Object.values(problems)[0])
      return
    }
    const picked =
      draft.channels ??
      (channels.data ?? []).filter((c) => c.is_default).map((c) => c.id)
    save.mutate(
      { ws, id: saved?.id, ...draft, channels: picked },
      {
        onSuccess: (p) => {
          setErrors({})
          if (saved) {
            toast.success("Saved")
            setForm(formOf(draftOf(p)))
          } else {
            toast.success(`${p.name} created`)
            router.replace(autoUpdateHref(p.id))
          }
        },
        onError: (err) => {
          const fields: Errors = {}
          for (const [k, v] of Object.entries(fieldErrors(err))) {
            fields[k.split(/[.[]/)[0]] ??= v
          }
          setErrors(fields)
          toast.error(err.message)
        },
      },
    )
  }

  const servers = env.servers.filter((s) => s.workspace_id === ws)
  const missing = saved?.servers.filter((s) => s.missing) ?? []
  const rules: DockerAutoUpdateRules = {
    servers: draft.servers,
    pick: draft.pick,
    include: draft.include,
    exclude: draft.exclude,
    include_stopped: draft.include_stopped,
    mode: draft.mode,
  }
  const updates = d.mode === "update"

  const sections = (
    <>
      <Section title="Policy" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={d.name}
              maxLength={80}
              placeholder="Nightly updates"
              onChange={(e) => setD({ name: e.target.value })}
            />
          )}
        </Field>
        <ToggleRow
          id="au-enabled"
          label="On"
          hint="A paused policy doesn't run on its schedule or webhook; you can still run it by hand."
          checked={d.enabled}
          onChange={(enabled) => setD({ enabled })}
        />
      </Section>

      <Section
        title="Servers"
        hint="Where it looks for containers. Only servers with Docker or Podman are listed."
        phone={phone}
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <Checklist
            items={servers.map((s) => ({
              id: s.server_id,
              label: s.name,
              meta:
                s.state === "ready"
                  ? `${s.running} running · ${s.total} containers`
                  : undefined,
              status: s.state === "ready" ? undefined : engineWord[s.state],
            }))}
            checked={(id) => d.servers.includes(id)}
            onToggle={(id, on) =>
              setD({
                servers: on
                  ? [...d.servers, id]
                  : d.servers.filter((x) => x !== id),
              })
            }
            empty="No server in this workspace runs Docker or Podman yet."
            loading={env.fleet.isPending}
            tall
          />
        </div>
        <FieldError text={errors.servers} />
        {missing.length > 0 && (
          <Callout icon={<Info />} tone="warning">
            {missing.map((s) => s.name).join(", ")}{" "}
            {missing.length === 1 ? "was" : "were"} deleted or moved out of this
            workspace and will be dropped when you save.
          </Callout>
        )}
      </Section>

      <Section
        title="Containers"
        hint="Which ones it keeps up to date. Containers built on the server, or pinned to a digest, are never touched."
        phone={phone}
      >
        <OptionCards
          label="Which containers"
          value={d.pick}
          onChange={(pick) => setD({ pick })}
          items={(["all", "labeled", "chosen"] as const).map((v) => ({
            value: v,
            ...pickMeta[v],
          }))}
        />
        {d.pick === "labeled" && (
          <Callout icon={<TagIcon />}>
            Add the label{" "}
            <code className="font-mono text-foreground">
              morcheh.auto-update.enable=true
            </code>{" "}
            to a container (in compose: under <code>labels:</code>). Containers
            already set up for Watchtower (
            <code className="font-mono">
              com.centurylinklabs.watchtower.enable=true
            </code>
            ) are picked up as they are.
          </Callout>
        )}
        {d.pick === "chosen" && (
          <Field
            label="Containers, projects or images"
            error={errors.include}
            hint="One per line or comma: a container (web), a compose project (shop), or an image (nginx, ghcr.io/acme/*). * and ? match anything."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                value={form.include}
                placeholder={"web\nshop\nghcr.io/acme/*"}
                onChange={(e) => set({ include: e.target.value }, "include")}
                className="font-mono text-body-sm"
                spellCheck={false}
                autoCapitalize="off"
              />
            )}
          </Field>
        )}
        <Field
          label="Never touch"
          error={errors.exclude}
          hint="Same kinds of names. A container labelled morcheh.auto-update.enable=false is left out too."
        >
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={form.exclude}
              placeholder={"postgres*\nmorcheh"}
              onChange={(e) => set({ exclude: e.target.value }, "exclude")}
              className="font-mono text-body-sm"
              spellCheck={false}
              autoCapitalize="off"
            />
          )}
        </Field>
        <ToggleRow
          id="au-stopped"
          label="Stopped containers too"
          hint="Update containers that aren't running as well."
          checked={d.include_stopped}
          onChange={(include_stopped) =>
            setD({
              include_stopped,
              revive_stopped: include_stopped && d.revive_stopped,
            })
          }
        />
        {d.include_stopped && updates && (
          <ToggleRow
            id="au-revive"
            label="Start them after updating"
            hint="Off: an updated stopped container stays stopped."
            checked={d.revive_stopped}
            onChange={(revive_stopped) => setD({ revive_stopped })}
          />
        )}
        <div className="flex flex-col gap-2">
          <h3 className="font-label text-[11px] tracking-label text-muted-foreground uppercase">
            Right now
          </h3>
          <CoverPreview ws={ws} rules={rules} phone={phone} />
        </div>
      </Section>

      <Section title="What it does" phone={phone}>
        <OptionCards
          label="What it does"
          value={d.mode}
          onChange={(mode) => setD({ mode })}
          items={(["update", "monitor"] as const).map((v) => ({
            value: v,
            ...modeMeta[v],
          }))}
        />
        {updates && (
          <>
            <ToggleRow
              id="au-nopull"
              label="Never pull"
              hint="Only recreate containers whose image was already replaced on the server (built or pulled there some other way)."
              checked={d.no_pull}
              onChange={(no_pull) => setD({ no_pull })}
            />
            <NumberField
              label="Wait before taking a new image"
              unit="hours"
              value={d.min_age_hours}
              min={0}
              max={720}
              error={errors.min_age_hours}
              hint="0 = at once. A few hours lets a broken release be pulled back by its publisher before you get it."
              onChange={(min_age_hours) => setD({ min_age_hours })}
            />
          </>
        )}
      </Section>

      <Section
        title="When"
        hint="Every run checks each container's registry for a newer image of its tag."
        phone={phone}
      >
        <ToggleRow
          id="au-manual"
          label="Only by hand or webhook"
          hint="No schedule: it runs when you press Run now or your CI calls its webhook."
          checked={form.manual}
          onChange={(manual) => set({ manual }, "cron")}
        />
        {!form.manual && (
          <ScheduleField
            builder={form.builder}
            onChange={(builder) => set({ builder }, "cron")}
            timezone={d.timezone ?? ""}
            onTimezone={(timezone) => setD({ timezone })}
            error={errors.cron ?? errors.timezone}
            phone={phone}
          />
        )}
        <p className="text-caption text-muted-foreground">
          {saved
            ? "Its webhook URL is on the policy's Overview."
            : "Once saved, the policy also gets a webhook URL your CI can call after pushing an image."}
        </p>
      </Section>

      {updates && (
        <Section
          title="Safety"
          hint="How carefully a container is swapped for its new version."
          phone={phone}
        >
          <ToggleRow
            id="au-rollback"
            label="Roll back if it fails"
            hint="Watch the new container; if it stops or turns unhealthy, put the old image back."
            checked={d.rollback}
            onChange={(rollback) => setD({ rollback })}
          />
          {d.rollback && (
            <NumberField
              label="Watch it for"
              unit="seconds"
              value={d.wait_seconds}
              min={10}
              max={600}
              error={errors.wait_seconds}
              hint="A health check, if the container has one, decides sooner."
              onChange={(wait_seconds) => setD({ wait_seconds })}
            />
          )}
          <ToggleRow
            id="au-linked"
            label="Restart linked containers"
            hint="Containers that depend on an updated one (depends-on label or network_mode container:) are restarted after it."
            checked={d.restart_linked}
            onChange={(restart_linked) => setD({ restart_linked })}
          />
          <NumberField
            label="Time to stop"
            unit="seconds"
            value={d.stop_timeout}
            min={0}
            max={600}
            error={errors.stop_timeout}
            hint="How long a container gets to shut down cleanly before it's killed."
            onChange={(stop_timeout) => setD({ stop_timeout })}
          />
          <ToggleRow
            id="au-cleanup"
            label="Remove the old image"
            hint="Once nothing uses it any more, to keep the disk from filling."
            checked={d.cleanup}
            onChange={(cleanup) => setD({ cleanup })}
          />
        </Section>
      )}

      <Section
        title="Hooks"
        hint="Commands a container runs inside itself around its update, set with labels."
        phone={phone}
      >
        <ToggleRow
          id="au-hooks"
          label="Run lifecycle hooks"
          checked={d.hooks}
          onChange={(hooks) => setD({ hooks })}
        />
        {d.hooks && (
          <>
            <NumberField
              label="Time a hook may take"
              unit="seconds"
              value={d.hook_timeout}
              min={5}
              max={1800}
              error={errors.hook_timeout}
              onChange={(hook_timeout) => setD({ hook_timeout })}
            />
            <Callout icon={<Info />}>
              Labels (prefix{" "}
              <code className="font-mono text-foreground">
                morcheh.auto-update.
              </code>{" "}
              or Watchtower's{" "}
              <code className="font-mono">com.centurylinklabs.watchtower.</code>
              ): <code className="font-mono">lifecycle.pre-check</code>,{" "}
              <code className="font-mono">lifecycle.pre-update</code>,{" "}
              <code className="font-mono">lifecycle.post-update</code>,{" "}
              <code className="font-mono">lifecycle.post-check</code>. A
              pre-update hook that fails skips the update. Add{" "}
              <code className="font-mono">-timeout</code> (minutes) to one to
              give it its own limit.
            </Callout>
          </>
        )}
      </Section>

      <Section title="Notifications" phone={phone}>
        <Field label="Tell me">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={d.notify}
              onChange={(v) => setD({ notify: v as Draft["notify"] })}
              items={(["changes", "failures", "always", "never"] as const).map(
                (v) => ({ value: v, label: notifyMeta[v] }),
              )}
            />
          )}
        </Field>
        {d.notify !== "never" && (
          <ChannelPicker
            ws={ws}
            query={channels}
            value={d.channels}
            onChange={(channels) => setD({ channels })}
            error={errors.channels}
            empty="what happens still shows in Activity."
          />
        )}
      </Section>

      {saved?.runs_as && (
        <Callout icon={<Info />}>
          Runs with the access of {saved.runs_as}, who saved it last. Saving it
          makes it run with yours.
        </Callout>
      )}
    </>
  )

  // Settings tab of a saved policy.
  if (saved) {
    return (
      <div className={cn("flex flex-col", !phone && "gap-6")}>
        <div className={cn("flex flex-col", !phone && "gap-6")}>{sections}</div>
        {dirty && (
          <div
            className={cn(
              "sticky z-10 flex items-center gap-2 border-border bg-background",
              phone
                ? "bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] border-t px-4 py-2"
                : "bottom-4 rounded-2xl border px-4 py-3 shadow-md",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">
              Unsaved changes
            </span>
            <Button
              variant="outline"
              className="h-11 md:h-9"
              disabled={save.isPending}
              onClick={() => {
                setForm(formOf(base))
                setErrors({})
              }}
            >
              Discard
            </Button>
            <Button
              className="h-11 md:h-9"
              disabled={save.isPending}
              onClick={submit}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>
    )
  }

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
            New policy
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={save.isPending}
            onClick={submit}
          >
            {save.isPending ? "Saving…" : "Create"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  const serverCount = d.servers.length
  return (
    <EditorPage
      icon={<RefreshCcwDot />}
      title={d.name.trim() || "New auto-update policy"}
      status="Not saved yet"
      onSave={save.isPending ? undefined : submit}
      aside={
        <AsideCard title="Summary">
          <SummaryList
            rows={[
              [
                "Servers",
                serverCount === 0
                  ? ""
                  : serverCount === 1
                    ? "1 server"
                    : `${serverCount} servers`,
              ],
              ["Containers", pickMeta[d.pick].label],
              ["Does", modeMeta[d.mode].label],
              [
                "When",
                form.manual
                  ? "By hand or from its webhook"
                  : cronText(fromBuilder(form.builder)),
              ],
              ["Tells", notifyMeta[d.notify]],
            ]}
          />
        </AsideCard>
      }
      actions={
        <>
          <Button
            variant="outline"
            className="h-9"
            render={<Link href={AUTO_UPDATE} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button className="h-9" disabled={save.isPending} onClick={submit}>
            {save.isPending ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

// /containers/auto-update/new (?server=&container= prefill it).
export function NewAutoUpdatePage() {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  const [prefill] = useQueryStates(newParsers)
  const can = useDockerWorkspaceCan(workspace?.id)
  usePageCrumbs([{ href: `${AUTO_UPDATE}/new`, label: "New policy" }])
  if (phone === null) return null
  if (!workspace || !can.edit) {
    return (
      <div className="px-4 pt-6 md:px-6">
        <Empty
          icon={RefreshCcwDot}
          title={workspace ? "You can't add policies here" : "No workspace"}
          body={
            workspace
              ? "Making an auto-update policy needs Engineer access to the workspace."
              : "Auto-update policies belong to a workspace; ask an admin to give you one."
          }
        />
      </div>
    )
  }
  return (
    <AutoUpdateEditor
      key={`${prefill.server}:${prefill.container}`}
      ws={workspace.id}
      phone={phone}
      prefill={prefill}
    />
  )
}

// Radio cards: a label and a line under it, side by side on desktop.
function OptionCards<T extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string; hint: string }[]
}) {
  return (
    <fieldset
      className={cn(
        "grid gap-2",
        items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      <legend className="sr-only">{label}</legend>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className="flex min-h-11 min-w-0 flex-col items-start gap-0.5 rounded-lg border border-input px-3 py-2.5 text-start outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft/60"
        >
          <span className="text-body-sm font-medium">{item.label}</span>
          <span className="text-caption [overflow-wrap:anywhere] text-muted-foreground">
            {item.hint}
          </span>
        </button>
      ))}
    </fieldset>
  )
}

function NumberField({
  label,
  unit,
  value,
  min,
  max,
  hint,
  error,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  hint?: string
  error?: string
  onChange: (v: number) => void
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <div className="flex items-center gap-2">
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) {
                onChange(Math.min(max, Math.max(min, Math.round(n))))
              }
            }}
            className="w-28 tabular-nums"
          />
          <span className="text-body-sm text-muted-foreground">{unit}</span>
        </div>
      )}
    </Field>
  )
}
