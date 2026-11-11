"use client"

import {
  Activity,
  Check,
  ChevronLeft,
  Copy,
  FlaskConical,
  Info,
  Plus,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useChannels } from "@/app/(panel)/alerts/api"
import {
  ChannelIcon,
  channelBroken,
  channelTarget,
} from "@/app/(panel)/alerts/components/meta"
import {
  Callout,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { useOutboundIp } from "@/app/(panel)/databases/api"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type { CheckResult, MonitorConfig, UptimeMonitor } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCreateMonitor,
  useMonitor,
  useTestMonitor,
  useUpdateMonitor,
} from "../api"
import {
  checkDraft,
  type Draft,
  draftFrom,
  type Errors,
  errorKeysOf,
  freshDraft,
  fromMorche,
  locationsOf,
  sameDraft,
  serverLocations,
  toBody,
  uses,
} from "./draft"
import { LocationResults } from "./location-report"
import { LocationsPicker, RuleFields } from "./locations"
import {
  type Kind,
  KindIcon,
  kindMeta,
  onServer,
  pushUrl,
  stateMeta,
} from "./meta"
import {
  AnswerFields,
  type FieldProps,
  FixedKind,
  HeaderFields,
  KindPicker,
  Pick,
  SignInFields,
  TargetFields,
  usesAnswer,
  usesSignIn,
} from "./monitor-fields"
import { monitorHref } from "./monitor-menu"
import { useUptimeCan } from "./permissions"

const intervalPresets = [
  { value: "30", label: "30 s" },
  { value: "60", label: "1 min" },
  { value: "300", label: "5 min" },
  { value: "900", label: "15 min" },
  { value: "3600", label: "1 h" },
]

const namePlaceholders: Partial<Record<Kind, string>> = {
  http: "Website",
  tcp: "SSH on the bastion",
  udp: "WireGuard",
  ping: "Office router",
  dns: "example.com A record",
  tls: "example.com certificate",
  websocket: "Live updates socket",
  socketio: "Chat server",
  smtp: "Mail server",
  database: "Main PostgreSQL",
  rabbitmq: "RabbitMQ",
  kafka: "Kafka brokers",
  nats: "NATS",
  mqtt: "MQTT broker",
  memcached: "Memcached",
  elasticsearch: "Search cluster",
  docker: "web-app container",
  systemd: "nginx on web-1",
  command: "Disk below 90%",
  push: "Nightly backup",
}

// /uptime/[id]/edit reads its id from the route.
export function MonitorEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <MonitorEditor id={id} />
}

// /uptime/new (?kind=, ?server=, ?from= to copy one) and /uptime/[id]/edit.
export function MonitorEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const params = useSearchParams()
  const from = id ? undefined : (params.get("from") ?? undefined)
  const query = useMonitor(id ?? from, { poll: false })
  if (phone === null) return null
  if ((id || from) && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Activity}
          title={gone ? "This monitor isn't here" : "Couldn't load the monitor"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/uptime" />}
              nativeButton={false}
            >
              Back to uptime
            </Button>
          }
        />
      </div>
    )
  }
  const saved = id ? query.data : undefined
  const copyOf = !id && from ? query.data : undefined
  const kind = params.get("kind")
  const server = params.get("server") ?? ""
  const start = (): Draft => {
    if (saved) return draftFrom(saved)
    if (copyOf) return draftFrom(copyOf, true)
    const d = freshDraft(kind && kind in kindMeta ? (kind as Kind) : "http")
    if (server) {
      d.server = server
      if (onServer(d.kind)) d.locations = [server]
    }
    const host = params.get("host")
    if (host) d.c = { ...d.c, host }
    const port = params.get("port")
    if (port && /^\d+$/.test(port)) d.port = port
    return d
  }
  return (
    <Editor
      key={saved?.id ?? copyOf?.id ?? "new"}
      saved={saved}
      start={start}
      phone={phone}
    />
  )
}

function Editor({
  saved,
  start,
  phone,
}: {
  saved: UptimeMonitor | undefined
  start: () => Draft
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const ws = saved?.workspace_id ?? workspace?.id ?? ""
  const can = useUptimeCan(ws)
  const access = useAccess()
  const router = useRouter()
  const home = saved ? monitorHref(saved.id) : "/uptime"
  const back = useBack(home)

  const [draft, setDraft] = useState<Draft>(start)
  const [initial] = useState<Draft>(start)
  const [errors, setErrors] = useState<Errors>({})
  const [tested, setTested] = useState<CheckResult | null>(null)

  const create = useCreateMonitor()
  const update = useUpdateMonitor()
  const test = useTestMonitor()
  const saving = create.isPending || update.isPending
  const dirty = !sameDraft(draft, initial) || draft.name !== initial.name

  const servers = useServers({ limit: 500 })
  const channels = useChannels(ws)
  const outbound = useOutboundIp(fromMorche(draft))

  usePageCrumbs(
    saved
      ? [
          { href: monitorHref(saved.id), label: saved.name },
          { href: `${monitorHref(saved.id)}/edit`, label: "Edit" },
        ]
      : [{ href: "/uptime/new", label: "New monitor" }],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const clear = (keys: string[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e
      const next = { ...e }
      for (const k of keys) delete next[k]
      return next
    })

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setTested(null)
    const keys: string[] = []
    for (const k of Object.keys(patch) as (keyof Draft)[]) {
      keys.push(k, ...(errorKeysOf[k] ?? []))
    }
    clear(keys)
  }

  const setC = (patch: Partial<MonitorConfig>) => {
    setDraft((d) => ({ ...d, c: { ...d.c, ...patch } }))
    setTested(null)
    clear(Object.keys(patch).map((k) => `config.${k}`))
  }

  // Another kind keeps the address and login; ports and modes start over.
  const pickKind = (kind: Kind) => {
    setDraft((d) => ({
      ...d,
      kind,
      port: "",
      c: { ...d.c, tls_mode: undefined },
    }))
    setTested(null)
    setErrors({})
  }

  const fieldProps: FieldProps = {
    d: draft,
    set,
    setC,
    errors,
    phone,
    saved: saved?.secrets ?? [],
  }

  function mapErrors(err: Error): Errors {
    const out: Errors = {}
    for (const [k, v] of Object.entries(fieldErrors(err))) {
      out[k.replace(/^secrets\./, "")] = v
    }
    return out
  }

  function firstError(e: Errors) {
    return Object.values(e)[0]
  }

  function validate() {
    const e = checkDraft(draft)
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(firstError(e) ?? "Check the form")
      requestAnimationFrame(() =>
        document
          .querySelector("[aria-invalid=true]")
          ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      )
      return false
    }
    return true
  }

  function save() {
    if (!validate()) return
    const body = toBody(draft, !saved)
    const done = (m: UptimeMonitor) => {
      toast.success(saved ? "Saved" : `${m.name} is being watched`)
      setDraft(draftFrom(m))
      router.replace(monitorHref(m.id))
    }
    const failed = (err: Error) => {
      const e = mapErrors(err)
      setErrors(e)
      toast.error(firstError(e) ?? err.message)
    }
    if (saved) {
      update.mutate(
        { id: saved.id, body },
        { onSuccess: done, onError: failed },
      )
    } else {
      create.mutate(body, { onSuccess: done, onError: failed })
    }
  }

  function runTest() {
    if (!validate()) return
    setTested(null)
    test.mutate(
      { ...toBody(draft, !saved), monitor_id: saved?.id },
      {
        onSuccess: (r) => {
          setTested(r)
          if (r.status === "down") toast.error(`Down: ${r.message}`)
          else toast.success(`${stateMeta[r.status].label}: ${r.message}`)
        },
        onError: (err) => {
          const e = mapErrors(err)
          if (Object.keys(e).length) setErrors(e)
          toast.error(firstError(e) ?? err.message)
        },
      },
    )
  }

  if (!can.edit) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Activity}
          title="You can't change monitors here"
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

  const k = draft.kind
  const isPush = k === "push"
  const title = draft.name.trim() || saved?.name || "New monitor"

  // Servers: checking from one needs Engineer there; "related" takes any.
  const all = servers.data?.items ?? []
  // A saved location stays offered: unticking it needs no access.
  const savedLocs = saved?.locations ?? []
  const locOptions = all
    .filter(
      (s) =>
        savedLocs.some((l) => l.server_id === s.id) ||
        atLeast(access.serverLevel(s.id, s.workspace_id), "engineer"),
    )
    .map((s) => ({ id: s.id, name: s.name, host: s.host, status: s.status }))
  const locNames = Object.fromEntries(
    savedLocs.map((l) => [l.location, l.name]),
  )
  const onIt = serverLocations(draft)[0] ?? ""
  const locCount = locationsOf(draft).length
  const relatedOptions = all.map((s) => ({
    value: s.id,
    label: s.name,
    detail: s.host,
  }))

  const testButton = !isPush && (
    <Button
      variant="outline"
      className={phone ? "h-11 w-full" : "h-9"}
      disabled={test.isPending}
      onClick={runTest}
    >
      <FlaskConical />
      {test.isPending ? "Checking…" : "Try it now"}
    </Button>
  )

  const sections = (
    <>
      <Section
        title="What to watch"
        hint={saved ? undefined : "Can't be changed once it's saved."}
        phone={phone}
      >
        {saved ? (
          <FixedKind kind={k} />
        ) : (
          <KindPicker value={k} onChange={pickKind} phone={phone} />
        )}
      </Section>

      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={namePlaceholders[k]}
              maxLength={100}
              className="placeholder:text-ash"
              enterKeyHint="next"
            />
          )}
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Description"
            hint="Optional: what breaks when it's down."
          >
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
          <Field
            label="Tags"
            error={errors.tags}
            hint="Optional, comma separated: production, customers…"
          >
            {(p) => (
              <Input
                {...p}
                value={draft.tags}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder="production"
                autoCapitalize="none"
                className="placeholder:text-ash"
              />
            )}
          </Field>
        </div>
      </Section>

      {isPush ? (
        <PushSection
          saved={saved}
          resetPush={draft.resetPush}
          onReset={(resetPush) => set({ resetPush })}
          phone={phone}
        />
      ) : (
        <Section title="What to check" hint={kindMeta[k].short} phone={phone}>
          <TargetFields {...fieldProps} />
        </Section>
      )}

      {usesSignIn(k) && (
        <Section
          title={uses.headers(k) ? "Sign-in and headers" : "Sign-in"}
          hint="Passwords and tokens are kept encrypted. A blank one keeps what's saved."
          phone={phone}
        >
          <SignInFields {...fieldProps} />
          {uses.headers(k) && (
            <div className="flex flex-col gap-1.5">
              <p className="text-body-sm font-medium">Request headers</p>
              <HeaderFields {...fieldProps} />
            </div>
          )}
        </Section>
      )}

      {usesAnswer(k) && (
        <Section title="What counts as up" phone={phone}>
          <AnswerFields {...fieldProps} />
        </Section>
      )}

      {!isPush && (
        <Section
          title="Check from"
          hint={
            onServer(k)
              ? "It runs over SSH on this server."
              : "Morche itself and/or your servers (over SSH). Several places tell a real outage from one network's trouble."
          }
          phone={phone}
        >
          {k === "udp" ? (
            <Callout icon={<Info />}>
              UDP checks go out from Morche only.
            </Callout>
          ) : onServer(k) ? (
            <Field
              label="Server"
              error={errors.locations}
              hint="Servers where you have Engineer access."
            >
              {(p) => (
                <Pick
                  {...p}
                  phone={phone}
                  value={onIt}
                  onChange={(id) =>
                    set(
                      !draft.server || draft.server === onIt
                        ? { locations: id ? [id] : [], server: id }
                        : { locations: id ? [id] : [] },
                    )
                  }
                  items={[
                    {
                      value: "",
                      label: servers.isPending
                        ? "Loading…"
                        : locOptions.length
                          ? "Pick a server"
                          : "No server you can manage",
                    },
                    ...locOptions.map((o) => ({
                      value: o.id,
                      label: o.name,
                      detail: o.host,
                    })),
                  ]}
                />
              )}
            </Field>
          ) : (
            <>
              <Field
                label="Locations"
                error={errors.locations}
                hint={
                  locCount > 1
                    ? `${locCount} places, checked at the same time.`
                    : "Tick more than one to tell a real outage from one network's trouble."
                }
              >
                {() => (
                  <LocationsPicker
                    value={draft.locations}
                    onChange={(locations) => set({ locations })}
                    options={locOptions}
                    names={locNames}
                    outboundIp={outbound.data?.ip}
                    loading={servers.isPending}
                    phone={phone}
                  />
                )}
              </Field>
              {locCount > 1 && (
                <RuleFields d={draft} set={set} errors={errors} />
              )}
              {fromMorche(draft) && can.admin && (
                <ToggleRow
                  id="monitor-internal"
                  label="Allow a private address"
                  hint="From Morche, loopback and private ranges are refused unless a system admin allows it here."
                  checked={draft.allowInternal}
                  onChange={(allowInternal) => set({ allowInternal })}
                />
              )}
            </>
          )}
        </Section>
      )}

      {!onServer(k) && (
        <Section
          title="Related server"
          hint="Optional: shows this monitor on that server's Uptime tab."
          phone={phone}
        >
          <Field label="Server" error={errors.server_id}>
            {(p) => (
              <Pick
                {...p}
                phone={phone}
                value={draft.server}
                onChange={(server) => set({ server })}
                items={[{ value: "", label: "None" }, ...relatedOptions]}
              />
            )}
          </Field>
        </Section>
      )}

      <Section
        title={isPush ? "Expect a ping" : "How often"}
        hint={
          isPush
            ? "Down when no ping arrives within the interval (and the grace below)."
            : undefined
        }
        phone={phone}
      >
        <div className="flex flex-col gap-2">
          <Field
            label={isPush ? "Every" : "Check every"}
            error={errors.interval_seconds}
            hint="Seconds, 10 to 86400."
          >
            {(p) => (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  {...p}
                  value={draft.interval}
                  onChange={(e) =>
                    set({ interval: e.target.value.replace(/\D/g, "") })
                  }
                  inputMode="numeric"
                  className="w-28 tabular-nums"
                />
                <div className="flex flex-wrap gap-1.5">
                  {intervalPresets.map((i) => (
                    <button
                      key={i.value}
                      type="button"
                      aria-pressed={draft.interval === i.value}
                      onClick={() => set({ interval: i.value })}
                      className="h-11 rounded-full border border-border px-3 text-body-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Failures before down"
            hint="0 = the first failure"
            value={draft.retries}
            error={errors.retries}
            onChange={(retries) => set({ retries })}
          />
          <NumberField
            label="Retry after (s)"
            hint="Sooner than the interval while failing"
            value={draft.retry}
            error={errors.retry_seconds}
            onChange={(retry) => set({ retry })}
          />
          {!isPush && (
            <NumberField
              label="Time limit (s)"
              hint="1 to 120"
              value={draft.timeout}
              error={errors.timeout_seconds}
              onChange={(timeout) => set({ timeout })}
            />
          )}
        </div>
        {!isPush && (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Slow when over (ms)"
              hint="Optional: counts as degraded"
              value={draft.degraded}
              error={errors["config.degraded_ms"]}
              onChange={(degraded) => set({ degraded })}
              placeholder="Never"
            />
            {uses.certDays(k) && (
              <NumberField
                label="Warn before expiry (days)"
                hint="Degraded when the certificate runs out sooner"
                value={draft.certDays}
                error={errors["config.cert_days"]}
                onChange={(certDays) => set({ certDays })}
                placeholder={k === "tls" ? "14" : "Off"}
              />
            )}
          </div>
        )}
      </Section>

      <Section
        title="Alerts"
        hint="Where a message goes when it goes down and comes back."
        phone={phone}
      >
        <ChannelPicker
          ws={ws}
          query={channels}
          value={draft.channels}
          onChange={(channels) => set({ channels })}
          error={errors.channel_ids}
        />
        <ToggleRow
          id="monitor-notify-degraded"
          label="Also when it turns degraded"
          hint="Slow answers, certificates close to expiry, a yellow cluster…"
          checked={draft.notifyDegraded}
          onChange={(notifyDegraded) => set({ notifyDegraded })}
        />
        <NumberField
          label="Remind while down, every … checks"
          hint="0 = only once"
          value={draft.resend}
          error={errors.resend_every}
          onChange={(resend) => set({ resend })}
          className="sm:w-64"
        />
      </Section>

      {!isPush && (
        <Section
          title="Try it"
          hint="Runs one check with these settings, without saving."
          phone={phone}
        >
          {tested && <TestResult r={tested} />}
          <div>{testButton}</div>
        </Section>
      )}

      {!saved && (
        <Section title="Start" phone={phone}>
          <ToggleRow
            id="monitor-paused"
            label="Start paused"
            hint="Saved, but not checked until you resume it."
            checked={draft.paused}
            onChange={(paused) => set({ paused })}
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
            {saved ? "Edit monitor" : "New monitor"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={saving || (!!saved && !dirty)}
            onClick={save}
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

  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon kind={k} className="size-5" />
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
          {testButton}
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
            onClick={save}
          >
            {saving ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </div>
      </div>
      <div className="grid max-w-5xl gap-6">{sections}</div>
    </div>
  )
}

function NumberField({
  label,
  hint,
  value,
  error,
  onChange,
  placeholder,
  className,
}: {
  label: string
  hint?: string
  value: string
  error?: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(p) => (
        <Input
          {...p}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder={placeholder}
          className="tabular-nums placeholder:text-ash"
        />
      )}
    </Field>
  )
}

// Shared with the alert rule editor (`empty` = what happens without a channel).
export function ChannelPicker({
  ws,
  query,
  value,
  onChange,
  error,
  empty = "down times still show here and on Home.",
}: {
  ws: string
  query: ReturnType<typeof useChannels>
  value: string[] | null
  onChange: (v: string[]) => void
  error?: string
  empty?: string
}) {
  if (query.isPending) return <Skeleton className="h-16 w-full rounded-lg" />
  const items = query.data ?? []
  if (items.length === 0) {
    return (
      <Callout icon={<Info />}>
        <span>
          No alert channels in this workspace yet: {empty}{" "}
          <Link
            href="/alerts"
            className="font-medium text-brand hover:underline"
          >
            Add a channel
          </Link>{" "}
          (Telegram, Bale, email, Slack…).
        </span>
      </Callout>
    )
  }
  // null = a new monitor that takes the workspace's default channels.
  const picked = value ?? items.filter((c) => c.is_default).map((c) => c.id)
  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...picked, id] : picked.filter((x) => x !== id))
  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {items.map((c) => (
          <li key={c.id}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox renders the control inside */}
            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-subtle has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
              <Checkbox
                checked={picked.includes(c.id)}
                onCheckedChange={(on) => toggle(c.id, on)}
              />
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <ChannelIcon kind={c.kind} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-body-sm font-medium">
                  <span className="truncate">{c.name}</span>
                  {c.is_default && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-caption font-normal text-muted-foreground">
                      Default
                    </span>
                  )}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {!c.enabled ? (
                    "Turned off"
                  ) : channelBroken(c) ? (
                    <span className="text-destructive">
                      Last message failed
                    </span>
                  ) : (
                    channelTarget(c)
                  )}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-caption text-destructive">{error}</p>}
      <Link
        href="/alerts"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-body-sm text-brand hover:underline md:min-h-0"
        data-ws={ws}
      >
        <Plus className="size-4" />
        Manage alert channels
      </Link>
    </div>
  )
}

function PushSection({
  saved,
  resetPush,
  onReset,
  phone,
}: {
  saved: UptimeMonitor | undefined
  resetPush: boolean
  onReset: (v: boolean) => void
  phone: boolean
}) {
  const url = saved?.push_token ? pushUrl(saved.push_token) : ""
  return (
    <Section
      title="Heartbeat address"
      hint="Your job calls it when it finishes; silence means down."
      phone={phone}
    >
      {url ? (
        <>
          <CopyLine text={url} />
          <CopyLine text={`curl -fsS -m 10 --retry 3 ${url}`} code />
          <p className="text-caption text-muted-foreground">
            Add <span className="font-mono">?status=down&amp;msg=…</span> to
            report a failure, or <span className="font-mono">?ms=…</span> for
            how long it took.
          </p>
          <ToggleRow
            id="monitor-reset-push"
            label="Make a new address when saving"
            hint="The old one stops working at once."
            checked={resetPush}
            onChange={onReset}
          />
        </>
      ) : (
        <Callout icon={<Info />}>
          The address appears once it's created. Call it from a cron job, backup
          script or CI step.
        </Callout>
      )}
    </Section>
  )
}

function CopyLine({ text, code }: { text: string; code?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-subtle ps-3">
      <span
        className={cn(
          "min-w-0 flex-1 truncate py-2 font-mono text-caption",
          code && "text-muted-foreground",
        )}
        title={text}
      >
        {text}
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Copy"
        className="shrink-0 md:size-9"
        onClick={() =>
          navigator.clipboard.writeText(text).then(
            () => {
              setDone(true)
              setTimeout(() => setDone(false), 1500)
            },
            () => toast.error("Couldn't copy"),
          )
        }
      >
        {done ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

export function TestResult({ r }: { r: CheckResult }) {
  const meta = stateMeta[r.status]
  const Icon = meta.icon
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border px-3 py-2.5",
        r.status === "down"
          ? "border-destructive/30 bg-destructive/5"
          : r.status === "degraded"
            ? "border-warning/30 bg-warning/5"
            : "border-success/30 bg-success/5",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", meta.text)} />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm">
          <span className={cn("font-medium", meta.text)}>{meta.label}</span>
          {r.latency_ms != null && (
            <span className="text-muted-foreground"> · {r.latency_ms} ms</span>
          )}
          {r.code && (
            <span className="font-mono text-muted-foreground"> · {r.code}</span>
          )}
        </p>
        <p className="text-body-sm break-words text-muted-foreground">
          {r.message}
        </p>
        {r.detail && (
          <pre className="mt-1.5 max-h-40 overflow-auto rounded-md bg-background p-2 font-mono text-caption whitespace-pre-wrap text-muted-foreground">
            {r.detail}
          </pre>
        )}
        {r.cert_expires && (
          <p className="mt-1 text-caption text-ash">
            Certificate valid until{" "}
            {new Date(r.cert_expires).toLocaleDateString()}
          </p>
        )}
        {r.locations && r.locations.length > 1 && (
          <LocationResults
            items={r.locations}
            className="mt-2 border-t border-border pt-2"
          />
        )}
      </div>
      {r.status === "down" && <TriangleAlert className="sr-only" aria-hidden />}
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
