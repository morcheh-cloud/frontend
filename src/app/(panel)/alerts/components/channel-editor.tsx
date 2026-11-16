"use client"

import {
  BellRing,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Plus,
  X,
} from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Pick } from "@/app/(panel)/monitoring/components/monitor-fields"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace, useWorkspace } from "@/components/panel/workspace"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type {
  ChannelConfig,
  ChannelSecrets,
  NotifyChannel,
  NotifyChannelBody,
} from "@/lib/services"
import { useChannel, useSaveChannel, useTestChannelSettings } from "../api"
import {
  ChannelIcon,
  type ChannelKind,
  channelGroups,
  channelKinds,
  channelMeta,
  editChannelHref,
} from "./meta"

// The alert channel editor: /alerts/channels/new (?kind= picks the kind)
// and /alerts/channels/[id]/edit. A full page on desktop (EditorPage), a
// native screen with its own app bar on phones. Owner on the workspace.

// carry a login); `saved` = the name it was saved under, so a blank value
// keeps that saved value.
type Header = { key: string; name: string; value: string; saved?: string }

type Draft = {
  kind: ChannelKind
  name: string
  enabled: boolean
  isDefault: boolean
  attachAll: boolean
  allowInternal: boolean
  host: string
  port: string
  security: "starttls" | "tls" | "none"
  username: string
  from: string
  to: string
  chatId: string
  apiUrl: string
  silent: boolean
  url: string
  method: "POST" | "PUT" | "PATCH"
  topic: string
  priority: string
  headers: Header[]
  password: string
  token: string
  userKey: string
  webhookUrl: string
  signingKey: string
}

type Errors = Record<string, string>

let headerSeq = 0
const header = (name = "", saved?: string): Header => ({
  key: `h${++headerSeq}`,
  name,
  value: "",
  saved,
})

const savedHeaders = (names: string[]) =>
  names
    .filter((n) => n.startsWith("header:"))
    .map((n) => n.slice("header:".length))

// An HTTP token, as the backend's validHeaderName.
const headerName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

function draftOf(c?: NotifyChannel, kind: ChannelKind = "telegram"): Draft {
  const cfg = c?.config ?? {}
  return {
    kind: (c?.kind as ChannelKind) ?? kind,
    name: c?.name ?? "",
    enabled: c?.enabled ?? true,
    isDefault: c?.is_default ?? false,
    attachAll: false,
    allowInternal: c?.allow_internal ?? false,
    host: cfg.host ?? "",
    port: cfg.port ? String(cfg.port) : "",
    security: cfg.security || "starttls",
    username: cfg.username ?? "",
    from: cfg.from ?? "",
    to: (cfg.to ?? []).join(", "),
    chatId: cfg.chat_id ?? "",
    apiUrl: cfg.api_url ?? "",
    silent: cfg.silent ?? false,
    url: cfg.url ?? "",
    method: cfg.method || "POST",
    topic: cfg.topic ?? "",
    priority: String(cfg.priority ?? 0),
    headers: savedHeaders(c?.secrets ?? []).map((n) => header(n, n)),
    password: "",
    token: "",
    userKey: "",
    webhookUrl: "",
    signingKey: "",
  }
}

const isChat = (k: ChannelKind) =>
  k === "slack" || k === "discord" || k === "mattermost" || k === "teams"
const usesPriority = (k: ChannelKind) =>
  k === "ntfy" || k === "gotify" || k === "pushover"

function toBody(d: Draft): NotifyChannelBody {
  const k = d.kind
  const config: ChannelConfig = {}
  const secrets: ChannelSecrets = {}
  const t = (s: string) => s.trim()
  if (k === "email") {
    config.host = t(d.host)
    if (t(d.port)) config.port = Number(d.port)
    config.security = d.security
    config.username = t(d.username) || undefined
    config.from = t(d.from)
    config.to = d.to
      .split(/[\s,;]+/)
      .map(t)
      .filter(Boolean)
    if (d.password) secrets.password = d.password
  }
  if (k === "telegram" || k === "bale") {
    config.chat_id = t(d.chatId)
    if (t(d.apiUrl)) config.api_url = t(d.apiUrl)
    config.silent = d.silent
    if (d.token) secrets.token = t(d.token)
  }
  if (isChat(k) && d.webhookUrl) secrets.webhook_url = t(d.webhookUrl)
  if (k === "ntfy") {
    if (t(d.url)) config.url = t(d.url)
    config.topic = t(d.topic)
    if (d.token) secrets.token = t(d.token)
  }
  if (k === "gotify") {
    config.url = t(d.url)
    if (d.token) secrets.token = t(d.token)
  }
  if (k === "pushover") {
    config.silent = d.silent
    if (d.token) secrets.token = t(d.token)
    if (d.userKey) secrets.user_key = t(d.userKey)
  }
  if (usesPriority(k)) config.priority = Number(d.priority) || 0
  if (k === "webhook") {
    config.url = t(d.url)
    config.method = d.method
    // Always sent for a webhook: the names listed are the new set (a removed
    // row is dropped), a blank value keeps a saved one.
    secrets.headers = Object.fromEntries(
      d.headers.filter((h) => t(h.name)).map((h) => [t(h.name), h.value]),
    )
    if (d.signingKey) secrets.signing_key = d.signingKey
  }
  return {
    kind: k,
    name: t(d.name) || channelMeta[k].label,
    config,
    secrets,
    enabled: d.enabled,
    is_default: d.isDefault,
    allow_internal: d.allowInternal,
    attach_all: d.attachAll || undefined,
  }
}

const httpOk = (v: string) => {
  try {
    const u = new URL(v.trim())
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.host
  } catch {
    return false
  }
}

// Mirrors the backend's notify.Check (secrets already saved count as set).
function check(d: Draft, saved: string[]): Errors {
  const e: Errors = {}
  const has = (v: string, name: string) => !!v.trim() || saved.includes(name)
  const url = (key: string, v: string) => {
    if (!httpOk(v)) e[key] = "Enter an http:// or https:// address"
  }
  switch (d.kind) {
    case "email": {
      if (!d.host.trim()) e["config.host"] = "Enter the SMTP server"
      if (!d.from.trim()) e["config.from"] = "Enter who the email is from"
      const to = d.to.split(/[\s,;]+/).filter(Boolean)
      if (!to.length) e["config.to"] = "Add at least one address"
      const bad = to.find((x) => !x.includes("@"))
      if (bad) e["config.to"] = `"${bad}" isn't an email address`
      if (d.port && (Number(d.port) < 1 || Number(d.port) > 65535))
        e["config.port"] = "1 to 65535"
      break
    }
    case "telegram":
    case "bale":
      if (!has(d.token, "token")) e["secrets.token"] = "Enter the bot token"
      if (!d.chatId.trim()) e["config.chat_id"] = "Enter the chat id"
      if (d.apiUrl.trim()) url("config.api_url", d.apiUrl)
      break
    case "webhook":
      url("config.url", d.url)
      for (const h of d.headers) {
        const n = h.name.trim()
        if (!n) continue
        if (!headerName.test(n))
          e["secrets.headers"] = `“${n}” isn't a valid header name`
        else if (/[\r\n]/.test(h.value))
          e["secrets.headers"] = "A header value can't hold a line break"
        else if (!h.value && h.saved !== n)
          e["secrets.headers"] = `Enter a value for ${n}`
      }
      break
    case "slack":
    case "discord":
    case "mattermost":
    case "teams":
      if (!has(d.webhookUrl, "webhook_url"))
        e["secrets.webhook_url"] = "Paste the webhook address"
      else if (d.webhookUrl.trim()) url("secrets.webhook_url", d.webhookUrl)
      break
    case "ntfy":
      if (!d.topic.trim()) e["config.topic"] = "Enter the topic"
      if (d.url.trim()) url("config.url", d.url)
      break
    case "gotify":
      url("config.url", d.url)
      if (!has(d.token, "token")) e["secrets.token"] = "Enter the app token"
      break
    case "pushover":
      if (!has(d.token, "token")) e["secrets.token"] = "Enter the app token"
      if (!has(d.userKey, "user_key"))
        e["secrets.user_key"] = "Enter the user or group key"
      break
  }
  return e
}

const priorities: Record<string, { value: string; label: string }[]> = {
  ntfy: ["Min", "Low", "Default", "High", "Urgent"].map((l, i) => ({
    value: String(i + 1),
    label: l,
  })),
  gotify: Array.from({ length: 11 }, (_, i) => ({
    value: String(i),
    label: i === 0 ? "By the event" : String(i),
  })).slice(1),
  pushover: ["Lowest", "Low", "Normal", "High", "Emergency"].map((l, i) => ({
    value: String(i),
    label: l,
  })),
}

// /alerts/channels/[id]/edit reads its id from the route.
export function ChannelEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <ChannelEditor id={id} />
}

export function ChannelEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const params = useSearchParams()
  const query = useChannel(id)
  if (phone === null) return null
  if (id && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={BellRing}
          title={gone ? "This channel isn't here" : "Couldn't load the channel"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={<BackToChannels />}
        />
      </div>
    )
  }
  const saved = id ? query.data : undefined
  const asked = params.get("kind")
  const kind = channelKinds.find((k) => k.value === asked)?.value
  return (
    <Editor
      key={saved?.id ?? `new:${kind ?? ""}`}
      saved={saved}
      kind={kind}
      phone={phone}
    />
  )
}

function BackToChannels() {
  return (
    <Button
      variant="outline"
      className="h-11 w-full md:h-9 md:w-auto"
      render={<Link href="/alerts/channels" />}
      nativeButton={false}
    >
      Back to channels
    </Button>
  )
}

// Header row keys are made fresh for every draft: leave them out.
const serial = (d: Draft) =>
  JSON.stringify({ ...d, headers: d.headers.map(({ key, ...h }) => h) })

function scrollToProblem() {
  requestAnimationFrame(() =>
    document
      .querySelector("[aria-invalid=true], [data-error]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" }),
  )
}

// Where the messages land, in a few words, for the summary.
function targetText(d: Draft, saved: string[]): string {
  const host = (v: string) => {
    try {
      return new URL(v.trim()).host
    } catch {
      return ""
    }
  }
  switch (d.kind) {
    case "email": {
      const to = d.to.split(/[\s,;]+/).filter(Boolean)
      return to.length > 1 ? `${to[0]} +${to.length - 1}` : (to[0] ?? "")
    }
    case "telegram":
    case "bale":
      return d.chatId.trim() ? `Chat ${d.chatId.trim()}` : ""
    case "ntfy":
      return d.topic.trim()
        ? `${host(d.url) || "ntfy.sh"}/${d.topic.trim()}`
        : ""
    case "gotify":
    case "webhook":
      return host(d.url)
    case "pushover":
      return d.userKey || saved.includes("user_key") ? "Your Pushover key" : ""
    default:
      return d.webhookUrl
        ? host(d.webhookUrl)
        : saved.includes("webhook_url")
          ? "Saved webhook"
          : ""
  }
}

function Editor({
  saved,
  kind,
  phone,
}: {
  saved: NotifyChannel | undefined
  kind: ChannelKind | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  useFollowWorkspace(saved?.workspace_id)
  const ws = saved?.workspace_id ?? workspace?.id ?? ""
  const access = useAccess()
  const owner = atLeast(access.workspaceLevel(ws), "owner")
  const leave = useBackOr("/alerts/channels")
  const save = useSaveChannel()
  const test = useTestChannelSettings()
  const secrets = saved?.secrets ?? []

  const [d, setD] = useState<Draft>(() => draftOf(saved, kind))
  const [initial] = useState(() => serial(draftOf(saved, kind)))
  const [errors, setErrors] = useState<Errors>({})
  const [tested, setTested] = useState<{ ok: boolean; message: string }>()
  const dirty = serial(d) !== initial
  const k = d.kind
  const meta = channelMeta[k]

  usePageCrumbs(
    saved
      ? [{ href: editChannelHref(saved.id), label: saved.name }]
      : [{ href: "/alerts/channels/new", label: "New alert channel" }],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }))
    setTested(undefined)
    setErrors({})
  }

  const failed = (err: Error) => {
    const e = fieldErrors(err)
    setErrors(e)
    toast.error(Object.values(e)[0] ?? err.message)
    scrollToProblem()
  }

  const validate = () => {
    const e = check(d, secrets)
    setErrors(e)
    const first = Object.values(e)[0]
    if (first) {
      toast.error(first)
      scrollToProblem()
      return false
    }
    return true
  }

  const submit = () => {
    if (!validate()) return
    save.mutate(
      { id: saved?.id, body: toBody(d) },
      {
        onSuccess: (c) => {
          toast.success(saved ? `${c.name} saved` : `${c.name} added`)
          leave()
        },
        onError: failed,
      },
    )
  }

  const runTest = () => {
    if (!validate()) return
    setTested(undefined)
    test.mutate(
      { ...toBody(d), channel_id: saved?.id },
      {
        onSuccess: (r) => {
          setTested(r)
          if (r.ok) toast.success("Test message sent")
          else toast.error(r.message)
        },
        onError: failed,
      },
    )
  }

  if (!owner) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={BellRing}
          title="You can't change channels here"
          body="Alert channels need Owner access to this workspace."
          action={<BackToChannels />}
        />
      </div>
    )
  }

  const f = (key: string) => errors[key]
  const secretPh = (name: string) =>
    secrets.includes(name) ? "Saved: blank keeps it" : undefined
  const internalHint =
    k === "email" ||
    k === "webhook" ||
    k === "ntfy" ||
    k === "gotify" ||
    k === "telegram" ||
    k === "bale"
  const target = targetText(d, secrets)
  const name = d.name.trim() || meta.label

  const sections = (
    <>
      <Section
        title="Kind"
        hint={
          saved
            ? "A channel keeps its kind. To send somewhere else, add another channel."
            : "Where the messages go. Each kind asks only for what it needs."
        }
        phone={phone}
      >
        {saved ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-subtle px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
              <ChannelIcon kind={k} className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-body-sm font-medium">
                {meta.label}
              </span>
              <span className="block truncate text-caption text-muted-foreground">
                {meta.short}
              </span>
            </span>
          </div>
        ) : (
          <KindGrid value={k} onChange={(kind) => set({ kind })} />
        )}
      </Section>

      <Section
        title="Where it sends"
        hint={setupHint[k] ?? meta.short}
        phone={phone}
      >
        <Field label="Name" hint="How it shows when picking where alerts go.">
          {(p) => (
            <Input
              {...p}
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={`${meta.label}: on-call`}
              maxLength={100}
              className="placeholder:text-ash"
            />
          )}
        </Field>
        <KindFields d={d} set={set} f={f} secretPh={secretPh} phone={phone} />
      </Section>

      <Section
        title="Options"
        hint="Where it's used, and whether it sends at all."
        phone={phone}
      >
        <ToggleRow
          id="channel-default"
          label="Default for new monitors"
          hint="Ticked by itself when someone creates a monitor or an alert rule."
          checked={d.isDefault}
          onChange={(isDefault) => set({ isDefault })}
        />
        <ToggleRow
          id="channel-attach-all"
          label="Add to every monitor now"
          hint={`Every monitor in this workspace sends here too${
            saved ? ` (now ${saved.monitors})` : ""
          }.`}
          checked={d.attachAll}
          onChange={(attachAll) => set({ attachAll })}
        />
        {saved && (
          <ToggleRow
            id="channel-enabled"
            label="On"
            hint="Turned off, nothing is sent; monitors and rules keep it ticked."
            checked={d.enabled}
            onChange={(enabled) => set({ enabled })}
          />
        )}
        {access.admin && internalHint && (
          <ToggleRow
            id="channel-internal"
            label="Allow a private address"
            hint="For an SMTP, ntfy, Gotify, Bot API or webhook server inside your network. Only system admins can allow it."
            checked={d.allowInternal}
            onChange={(allowInternal) => set({ allowInternal })}
          />
        )}
      </Section>

      <Section
        title="Send a test"
        hint="Sends one real message with what's on this page, saved or not. Nothing is saved."
        phone={phone}
      >
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className={phone ? "h-11" : "h-9 self-start"}
            disabled={test.isPending}
            onClick={runTest}
          >
            <FlaskConical />
            {test.isPending ? "Sending…" : `Send a test to ${meta.label}`}
          </Button>
          {tested && (
            <Callout
              icon={tested.ok ? <CircleCheck /> : <CircleAlert />}
              tone={tested.ok ? undefined : "warning"}
            >
              {tested.ok
                ? "Test message sent. Check that it arrived."
                : tested.message}
            </Callout>
          )}
          {saved?.last_error && !tested && (
            <Callout icon={<CircleAlert />} tone="warning">
              The last message failed
              {saved.last_error_at ? ` ${timeAgo(saved.last_error_at)}` : ""}:{" "}
              {saved.last_error}
            </Callout>
          )}
        </div>
      </Section>
    </>
  )

  const label = saved ? "Save" : "Add channel"
  const blocked = save.isPending || (!!saved && !dirty)

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved ? "Edit channel" : "New alert channel"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={blocked}
            onClick={submit}
          >
            {save.isPending ? "Saving…" : saved ? "Save" : "Add"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={<ChannelIcon kind={k} />}
      title={saved ? saved.name : "New alert channel"}
      dirty={dirty}
      status={
        dirty
          ? "Unsaved changes"
          : saved
            ? `Saved ${timeAgo(saved.updated_at)}`
            : "Not saved yet"
      }
      onSave={blocked ? undefined : submit}
      aside={
        <>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                ["Kind", meta.label],
                ["Name", name],
                ["Sends to", target || "Not set yet"],
                ["New monitors", d.isDefault ? "Ticked" : "Not ticked"],
                ...(saved
                  ? ([
                      [
                        "Used by",
                        `${saved.monitors} ${saved.monitors === 1 ? "monitor" : "monitors"} · ${saved.rules} ${saved.rules === 1 ? "rule" : "rules"}`,
                      ],
                      ["State", d.enabled ? "On" : "Off"],
                    ] as [string, string][])
                  : []),
              ]}
            />
          </AsideCard>
          {saved?.last_sent_at && (
            <AsideCard title="Last message">
              <p className="text-body-sm">Sent {timeAgo(saved.last_sent_at)}</p>
            </AsideCard>
          )}
        </>
      }
      actions={
        <>
          <Button variant="outline" className="h-9" onClick={leave}>
            Cancel
          </Button>
          <Button className="h-9" disabled={blocked} onClick={submit}>
            {save.isPending ? "Saving…" : label}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

// One sentence on where to find what this kind asks for.
const setupHint: Partial<Record<ChannelKind, string>> = {
  email: "Your SMTP server's address and login, and who gets the emails.",
  telegram:
    "Make a bot with @BotFather, add it to the chat, group or channel, then paste its token and the chat id.",
  bale: "Make a bot with @botfather in Bale, add it to the chat or channel, then paste its token and the chat id.",
  slack: "Slack › Apps › Incoming Webhooks › Add to a channel, then paste it.",
  discord:
    "Channel settings › Integrations › Webhooks › New webhook › Copy URL.",
  mattermost: "Integrations › Incoming webhooks › Add, then paste it.",
  teams: "A Workflows webhook (or an older connector one) for the channel.",
  ntfy: "A topic on ntfy.sh or your own server; subscribe to it in the ntfy app.",
  gotify: "Your Gotify server and an app token made under Apps.",
  pushover: "An app token from pushover.net and your user or group key.",
  webhook:
    "Morche sends JSON to your address on every alert; headers and signing are optional.",
}

// The fields of one kind (no name, no options).
function KindFields({
  d,
  set,
  f,
  secretPh,
  phone,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  f: (key: string) => string | undefined
  secretPh: (name: string) => string | undefined
  phone: boolean
}) {
  const k = d.kind
  return (
    <>
      {k === "email" && (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="SMTP server" error={f("config.host")}>
              {(p) => (
                <Input
                  {...p}
                  value={d.host}
                  onChange={(e) => set({ host: e.target.value })}
                  placeholder="smtp.example.com"
                  autoCapitalize="none"
                  className="placeholder:text-ash"
                />
              )}
            </Field>
            <Field label="Port" error={f("config.port")}>
              {(p) => (
                <Input
                  {...p}
                  value={d.port}
                  onChange={(e) =>
                    set({ port: e.target.value.replace(/\D/g, "") })
                  }
                  inputMode="numeric"
                  placeholder={
                    d.security === "tls"
                      ? "465"
                      : d.security === "none"
                        ? "25"
                        : "587"
                  }
                  className="tabular-nums placeholder:text-ash"
                />
              )}
            </Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Encryption</span>
            <Segmented
              label="Encryption"
              value={d.security}
              onChange={(security) => set({ security })}
              items={[
                { value: "starttls", label: "STARTTLS" },
                { value: "tls", label: "TLS" },
                { value: "none", label: "None" },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" hint="Blank if the server takes no login.">
              {(p) => (
                <Input
                  {...p}
                  value={d.username}
                  onChange={(e) => set({ username: e.target.value })}
                  autoCapitalize="none"
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Password" error={f("secrets.password")}>
              {(p) => (
                <SecretInput
                  {...p}
                  value={d.password}
                  onChange={(e) => set({ password: e.target.value })}
                  placeholder={secretPh("password")}
                  autoComplete="new-password"
                />
              )}
            </Field>
          </div>
          <Field label="From" error={f("config.from")}>
            {(p) => (
              <Input
                {...p}
                value={d.from}
                onChange={(e) => set({ from: e.target.value })}
                placeholder="Morche <alerts@example.com>"
                autoCapitalize="none"
                className="placeholder:text-ash"
              />
            )}
          </Field>
          <Field
            label="To"
            error={f("config.to")}
            hint="One or more addresses, separated by commas."
          >
            {(p) => (
              <Textarea
                {...p}
                value={d.to}
                onChange={(e) => set({ to: e.target.value })}
                placeholder="ops@example.com, oncall@example.com"
                rows={2}
                autoCapitalize="none"
                className="placeholder:text-ash"
              />
            )}
          </Field>
        </>
      )}

      {(k === "telegram" || k === "bale") && (
        <>
          <Field
            label="Bot token"
            error={f("secrets.token")}
            hint={
              k === "telegram"
                ? "From @BotFather: /newbot."
                : "From @botfather in Bale."
            }
          >
            {(p) => (
              <SecretInput
                {...p}
                label="token"
                value={d.token}
                onChange={(e) => set({ token: e.target.value })}
                placeholder={secretPh("token") ?? "123456:ABC-DEF…"}
                autoComplete="off"
              />
            )}
          </Field>
          <Field
            label="Chat id"
            error={f("config.chat_id")}
            hint="A user, group or channel id (-100…), or @channel. Add the bot to the group or channel first."
          >
            {(p) => (
              <Input
                {...p}
                value={d.chatId}
                onChange={(e) => set({ chatId: e.target.value })}
                placeholder="-1001234567890"
                autoCapitalize="none"
                className="font-mono placeholder:text-ash"
              />
            )}
          </Field>
          <Field
            label="Bot API address"
            error={f("config.api_url")}
            hint={`Optional: a self-hosted or relay Bot API. Blank = ${
              k === "telegram" ? "api.telegram.org" : "tapi.bale.ai"
            }.`}
          >
            {(p) => (
              <Input
                {...p}
                value={d.apiUrl}
                onChange={(e) => set({ apiUrl: e.target.value })}
                placeholder="https://"
                inputMode="url"
                autoCapitalize="none"
                className="placeholder:text-ash"
              />
            )}
          </Field>
        </>
      )}

      {isChat(k) && (
        <Field
          label="Webhook address"
          error={f("secrets.webhook_url")}
          hint={webhookHint[k]}
        >
          {(p) => (
            <SecretInput
              {...p}
              label="webhook address"
              value={d.webhookUrl}
              onChange={(e) => set({ webhookUrl: e.target.value })}
              placeholder={secretPh("webhook_url") ?? "https://"}
              autoComplete="off"
            />
          )}
        </Field>
      )}

      {(k === "ntfy" || k === "gotify") && (
        <Field
          label="Server"
          error={f("config.url")}
          hint={k === "ntfy" ? "Blank = https://ntfy.sh" : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={d.url}
              onChange={(e) => set({ url: e.target.value })}
              placeholder={
                k === "ntfy" ? "https://ntfy.sh" : "https://gotify.example.com"
              }
              inputMode="url"
              autoCapitalize="none"
              className="placeholder:text-ash"
            />
          )}
        </Field>
      )}
      {k === "ntfy" && (
        <Field
          label="Topic"
          error={f("config.topic")}
          hint="Subscribe to it in the ntfy app. On ntfy.sh anyone who knows the name can read it: pick something hard to guess."
        >
          {(p) => (
            <Input
              {...p}
              value={d.topic}
              onChange={(e) => set({ topic: e.target.value })}
              placeholder="morche-alerts-7f3k"
              autoCapitalize="none"
              className="font-mono placeholder:text-ash"
            />
          )}
        </Field>
      )}
      {(k === "ntfy" || k === "gotify" || k === "pushover") && (
        <Field
          label={k === "ntfy" ? "Access token" : "App token"}
          error={f("secrets.token")}
          hint={k === "ntfy" ? "Optional: for a protected topic." : undefined}
        >
          {(p) => (
            <SecretInput
              {...p}
              label="token"
              value={d.token}
              onChange={(e) => set({ token: e.target.value })}
              placeholder={secretPh("token")}
              autoComplete="off"
            />
          )}
        </Field>
      )}
      {k === "pushover" && (
        <Field label="User or group key" error={f("secrets.user_key")}>
          {(p) => (
            <SecretInput
              {...p}
              label="user key"
              value={d.userKey}
              onChange={(e) => set({ userKey: e.target.value })}
              placeholder={secretPh("user_key")}
              autoComplete="off"
            />
          )}
        </Field>
      )}
      {usesPriority(k) && (
        <Field
          label="Priority"
          hint="By the event = higher when something goes down than when it comes back."
        >
          {(p) => (
            <Pick
              {...p}
              phone={phone}
              value={d.priority}
              onChange={(priority) => set({ priority })}
              items={[{ value: "0", label: "By the event" }, ...priorities[k]]}
            />
          )}
        </Field>
      )}

      {k === "webhook" && (
        <>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Field label="Method">
              {(p) => (
                <Pick
                  {...p}
                  phone={phone}
                  value={d.method}
                  onChange={(method) => set({ method })}
                  items={[
                    { value: "POST", label: "POST" },
                    { value: "PUT", label: "PUT" },
                    { value: "PATCH", label: "PATCH" },
                  ]}
                />
              )}
            </Field>
            <Field label="Address" error={f("config.url")}>
              {(p) => (
                <Input
                  {...p}
                  value={d.url}
                  onChange={(e) => set({ url: e.target.value })}
                  placeholder="https://example.com/hooks/morche"
                  inputMode="url"
                  autoCapitalize="none"
                  className="placeholder:text-ash"
                />
              )}
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium">Headers</span>
            <span className="-mt-1 text-caption text-muted-foreground">
              Kept encrypted like the other secrets: values are never shown
              again, only the names.
            </span>
            {d.headers.map((h, i) => (
              <div key={h.key} className="flex items-center gap-2">
                <Input
                  aria-label="Header name"
                  value={h.name}
                  onChange={(e) =>
                    set({
                      headers: d.headers.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Authorization"
                  autoCapitalize="none"
                  className="w-40 placeholder:text-ash"
                />
                <div className="min-w-0 flex-1">
                  <SecretInput
                    label="header value"
                    aria-label="Header value"
                    value={h.value}
                    onChange={(e) =>
                      set({
                        headers: d.headers.map((x, j) =>
                          j === i ? { ...x, value: e.target.value } : x,
                        ),
                      })
                    }
                    placeholder={
                      h.saved && h.saved === h.name.trim()
                        ? "Saved: blank keeps it"
                        : "Value"
                    }
                    autoCapitalize="none"
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="ghost"
                  size={phone ? "icon-lg" : "icon"}
                  aria-label="Remove header"
                  onClick={() =>
                    set({ headers: d.headers.filter((_, j) => j !== i) })
                  }
                >
                  <X />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              className="h-11 self-start md:h-8"
              onClick={() => set({ headers: [...d.headers, header()] })}
            >
              <Plus />
              Add header
            </Button>
            {f("secrets.headers") && (
              <p role="alert" className="text-caption text-destructive">
                {f("secrets.headers")}
              </p>
            )}
          </div>
          <Field
            label="Signing key"
            hint="Optional: each body is signed with HMAC-SHA256 in X-Morche-Signature: sha256=…"
          >
            {(p) => (
              <SecretInput
                {...p}
                label="signing key"
                value={d.signingKey}
                onChange={(e) => set({ signingKey: e.target.value })}
                placeholder={secretPh("signing_key")}
                autoComplete="off"
              />
            )}
          </Field>
        </>
      )}

      {(k === "telegram" || k === "bale" || k === "pushover") && (
        <ToggleRow
          id="channel-silent"
          label="Without a sound"
          hint="Delivered quietly; good for a busy group."
          checked={d.silent}
          onChange={(silent) => set({ silent })}
        />
      )}
    </>
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

const webhookHint: Partial<Record<ChannelKind, string>> = {
  slack: "Slack › Apps › Incoming Webhooks › Add to a channel.",
  discord:
    "Channel settings › Integrations › Webhooks › New webhook › Copy URL.",
  mattermost: "Integrations › Incoming webhooks › Add.",
  teams:
    'A Workflows "Post to a channel when a webhook request is received" address, or an older connector one.',
}

// Every kind as a tile, grouped (Email & chat, Push, Webhook…).
function KindGrid({
  value,
  onChange,
}: {
  value: ChannelKind
  onChange: (k: ChannelKind) => void
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">Kind of channel</legend>
      {channelGroups.map((g) => (
        <div key={g.value} className="flex flex-col gap-2">
          <span className="font-label text-caption tracking-label text-ash uppercase">
            {g.label}
          </span>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
            {channelKinds
              .filter((k) => k.group === g.value)
              .map((k) => (
                <button
                  key={k.value}
                  type="button"
                  aria-pressed={value === k.value}
                  onClick={() => onChange(k.value)}
                  className="group flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-start transition-colors outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-aria-pressed:bg-brand group-aria-pressed:text-primary-foreground">
                    <k.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium group-aria-pressed:text-brand-strong">
                      {k.label}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {k.short}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
