"use client"

import {
  Activity,
  Check,
  Fingerprint,
  Hash,
  Loader2,
  type LucideIcon,
  Network,
  Plug,
  Plus,
  Repeat,
  Shuffle,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { type ClipboardEvent, useEffect, useRef, useState } from "react"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useTestUpstream } from "../../../api"
import {
  type Draft,
  type Errors,
  freshPoolServer,
  httpsUpstream,
  keptServers,
  type LbHashKey,
  type LbMethod,
  mainParts,
  mainPort,
  mainServer,
  noBackup,
  type PoolServerDraft,
  retryConditions,
  serverAddress,
  splitHostPort,
  splitList,
  toConfig,
  withMain,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { Choice, NumberInput } from "./rate-limit"
import { PickFromServer } from "./upstream-picker"

// Load balancing: the site's requests (or a stream's connections) spread
// over several servers running the same app. Server 1's address is the
// site's upstream (or Forward to); its row edits that.

const MAX_SERVERS = 50

export const lbMethods: {
  value: LbMethod
  label: string
  hint: string
  icon: LucideIcon
  sitesOnly?: boolean
}[] = [
  {
    value: "round_robin",
    label: "Take turns",
    hint: "Each server gets the next request in turn; a higher weight gets more of them. The usual choice.",
    icon: Repeat,
  },
  {
    value: "least_conn",
    label: "Fewest connections",
    hint: "The server with the fewest open connections. Best when some requests take much longer than others.",
    icon: Activity,
  },
  {
    value: "ip_hash",
    label: "Same visitor, same server",
    hint: "Picked by the visitor's address, so a visitor stays on one server. For apps that keep sessions in memory.",
    icon: Fingerprint,
    sitesOnly: true,
  },
  {
    value: "hash",
    label: "By a key",
    hint: "Picked by the address, the page, a cookie, a header or a query value: the same key always lands on the same server.",
    icon: Hash,
  },
  {
    value: "random",
    label: "Random",
    hint: "Any server at random, weights counted. Spreads well when there are several proxies in front of the same servers.",
    icon: Shuffle,
  },
]

export const lbMethodLabel = (m: LbMethod) =>
  lbMethods.find((x) => x.value === m)?.label ?? m

const hashKeys: { value: LbHashKey; label: string }[] = [
  { value: "ip", label: "Visitor's address" },
  { value: "uri", label: "Page address (path and query)" },
  { value: "cookie", label: "A cookie" },
  { value: "header", label: "A request header" },
  { value: "arg", label: "A query argument" },
]

const hashPlaceholder: Partial<Record<LbHashKey, string>> = {
  cookie: "session_id",
  header: "X-Tenant",
  arg: "tenant",
}

const retryLabels: Record<(typeof retryConditions)[number], string> = {
  error: "Can't connect",
  timeout: "Timed out",
  invalid_header: "Broken answer",
  http_500: "500",
  http_502: "502",
  http_503: "503",
  http_504: "504",
  http_403: "403",
  http_404: "404",
  http_429: "429",
  non_idempotent: "Also POST and PATCH",
}
const defaultRetry = ["error", "timeout"]

type Role = "on" | "backup" | "off"
const roleOf = (s: PoolServerDraft): Role =>
  s.down ? "off" : s.backup ? "backup" : "on"
const roleItems = (method: LbMethod, s: PoolServerDraft) => [
  { value: "on" as const, label: "In use" },
  // A backup only works with round robin and least_conn; one already set
  // stays pickable so it can be changed.
  ...(noBackup(method) && !s.backup
    ? []
    : [{ value: "backup" as const, label: "Backup" }]),
  { value: "off" as const, label: "Off" },
]

// host:port out of whatever was typed or pasted (a URL, a trailing slash).
export function cleanAddress(v: string) {
  return v
    .trim()
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/[/?#].*$/, "")
}

// The share of requests each server gets, by weight; backups and servers
// that are off get none.
function shares(main: PoolServerDraft, servers: PoolServerDraft[]) {
  const w = (s: PoolServerDraft) =>
    s.down || s.backup ? 0 : Math.max(1, Number(s.weight) || 1)
  const all = [main, ...servers]
  const total = all.reduce((n, s) => n + w(s), 0)
  return new Map(all.map((s) => [s.key, total ? w(s) / total : 0]))
}

type Props = {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}

// In General, under What it does, once there are several servers: what
// happens when one fails, and the connections kept open to them.
export function FailoverCard({ proxy, draft, set, errors, phone }: Props) {
  const stream = draft.type === "stream"
  return (
    <Card
      title="When a server fails"
      hint={`A server that keeps failing is taken out for a while, then tried again. ${proxy.kind_label} learns this from real ${stream ? "connections" : "requests"}: it doesn't check servers on its own.`}
      phone={phone}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Failures before it's taken out"
          hint="Counted within the time on the right. Empty = 1."
          error={errors["balance.max_fails"]}
        >
          {(f) => (
            <NumberInput
              {...f}
              value={draft.lbMaxFails}
              onChange={(lbMaxFails) => set({ lbMaxFails })}
              placeholder="1"
            />
          )}
        </Field>
        <Field
          label="Taken out for"
          hint="Also the time failures are counted in. Empty = 10 seconds."
          error={errors["balance.fail_timeout"]}
        >
          {(f) => (
            <NumberInput
              {...f}
              value={draft.lbFailTimeout}
              onChange={(lbFailTimeout) => set({ lbFailTimeout })}
              unit="seconds"
              placeholder="10"
            />
          )}
        </Field>
      </div>
      <RetryFields draft={draft} set={set} errors={errors} />
      {!stream && (
        <Field
          label="Idle connections kept to the servers"
          hint="So a request doesn't wait for a new connection; saves time and ports on busy sites. Per worker process: 16–64 suits most sites, empty = a new connection for every request."
          error={errors["balance.keepalive"]}
        >
          {(f) => (
            <NumberInput
              {...f}
              value={draft.lbKeepalive}
              onChange={(lbKeepalive) => set({ lbKeepalive })}
              placeholder="None"
            />
          )}
        </Field>
      )}
    </Card>
  )
}

// Adding, pasting, editing and removing servers, shared by General's list
// and the tab's. Server 1's address lives in the site's upstream (or
// Forward to), so its row edits that.
function usePoolRows(
  draft: Draft,
  set: (patch: Partial<Draft>) => void,
  focusKey: { current: string },
) {
  const servers = draft.poolServers
  const isMain = (key: string) => key === draft.poolMain.key
  const at = (s: PoolServerDraft) => (isMain(s.key) ? mainParts(draft) : s)
  const patchOf = (
    key: string,
    patch: Partial<PoolServerDraft>,
  ): Partial<Draft> => {
    if (!isMain(key))
      return {
        poolServers: servers.map((s) =>
          s.key === key ? { ...s, ...patch } : s,
        ),
      }
    const { host, port, ...rest } = patch
    return {
      ...withMain(draft, { host, port }),
      poolMain: { ...draft.poolMain, ...rest },
    }
  }
  const setServer = (key: string, patch: Partial<PoolServerDraft>) =>
    set(patchOf(key, patch))
  const add = () => {
    if (servers.length >= MAX_SERVERS) return
    const row = freshPoolServer()
    focusKey.current = row.key
    set({ poolServers: [...servers, row] })
  }
  // A server picked from what listens on a server (Ports).
  const addPicked = (a: { host: string; port: string }) => {
    if (servers.length >= MAX_SERVERS) return
    set({ poolServers: [...servers, freshPoolServer(a)] })
  }
  // A pasted list (one per line, or comma separated) becomes rows; one
  // address with its port fills both fields.
  const paste = (key: string, e: ClipboardEvent<HTMLInputElement>) => {
    const list = splitList(e.clipboardData.getData("text"))
      .map(cleanAddress)
      .filter(Boolean)
      .map(splitHostPort)
    if (list.length === 1) {
      if (!list[0].port || e.currentTarget.value) return
      e.preventDefault()
      setServer(key, list[0])
      return
    }
    if (list.length < 2) return
    e.preventDefault()
    const [first, ...rest] = list
    const room = MAX_SERVERS - servers.length
    const base = patchOf(key, first)
    set({
      ...base,
      poolServers: [
        ...(base.poolServers ?? servers),
        ...rest.slice(0, room).map((a) => freshPoolServer(a)),
      ],
    })
  }
  // Leaving the address field: a URL or host:port typed there is taken
  // apart.
  const tidy = (s: PoolServerDraft, text?: string) => {
    const cur = at(s)
    const clean = cleanAddress(text ?? cur.host)
    const split = splitHostPort(clean)
    const next = split.port ? split : { host: clean, port: cur.port }
    if (next.host !== cur.host || next.port !== cur.port) setServer(s.key, next)
  }
  // Removing server 1 makes the next one server 1.
  const remove = (key: string) => {
    if (!isMain(key)) {
      set({ poolServers: servers.filter((x) => x.key !== key) })
      return
    }
    const [next, ...rest] = servers
    if (!next) return
    // Rows with an empty port meant the old server 1's: keep it written.
    const old = mainPort(draft)
    set({
      ...withMain(draft, { host: next.host, port: next.port.trim() || old }),
      poolMain: { ...next, host: "", port: "" },
      poolServers: rest.map((r) =>
        r.port.trim() || !old ? r : { ...r, port: old },
      ),
    })
  }
  return { at, isMain, setServer, add, addPicked, paste, tidy, remove }
}

// What server 1's port shows when empty: the scheme's own.
export function mainPortHint(draft: Draft) {
  if (draft.type === "stream") return "5432"
  return mainParts(draft).scheme.toLowerCase() === "https://" ? "443" : "80"
}

// Server 1's address problems come from the upstream (or Forward to).
function addressError(draft: Draft, errors: Errors, s: PoolServerDraft) {
  if (s.key !== draft.poolMain.key) return errors[`pool.${s.key}.address`]
  return draft.type === "stream" ? errors.stream_to : errors.upstream
}

// Server 1's address lives inside the upstream URL, where a half-typed
// host:port or a pasted URL would read as an IPv6 address: such text waits
// in the field and is taken apart when the field is left.
const held = (v: string) =>
  /:\/\/|[/?#]/.test(v) || (v.match(/:/g)?.length ?? 0) === 1

export function useHeldText(
  value: string,
  onChange: (v: string) => void,
  onLeave: (v: string) => void,
  enabled = true,
) {
  const [typed, setTyped] = useState<string | null>(null)
  return {
    value: typed ?? value,
    onChange: (v: string) => {
      if (enabled && held(v)) return setTyped(v)
      setTyped(null)
      onChange(v)
    },
    onBlur: () => {
      setTyped(null)
      onLeave(typed ?? value)
    },
    clear: () => setTyped(null),
  }
}

// Focuses a row's address once, when it was just added.
function useAutoFocus(on: boolean | undefined) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (on && window.matchMedia("(pointer: fine)").matches) ref.current?.focus()
  }, [on])
  return ref
}

// What a row says it gets: a share by weight, or its role.
function ShareText({
  server,
  share,
  long,
}: {
  server: PoolServerDraft
  share: number
  long?: boolean
}) {
  const role = roleOf(server)
  if (role !== "on")
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
        {role === "backup" ? "Backup" : "Off"}
      </span>
    )
  const pct = `${Math.round(share * 100)}%`
  return (
    <span className="text-caption text-muted-foreground tabular-nums">
      {long ? `≈ ${pct} of the traffic` : pct}
    </span>
  )
}

// The scheme and path every server is asked with (sites only).
function SchemePath({
  draft,
  set,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
}) {
  if (draft.type !== "proxy") return null
  const parts = mainParts(draft)
  const scheme =
    parts.scheme.toLowerCase() === "https://" ? "https://" : "http://"
  return (
    <div className="grid gap-3 @xl:grid-cols-[auto_minmax(0,1fr)] @xl:items-start">
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-body-sm font-medium">Protocol</span>
        <Segmented
          label="Protocol the servers are asked with"
          items={[
            { value: "http://", label: "http" },
            { value: "https://", label: "https" },
          ]}
          value={scheme}
          onChange={(v) => set(withMain(draft, { scheme: v }))}
        />
      </div>
      <Field
        label="Path (optional)"
        hint="Added after every server's address, like /api."
      >
        {(f) => (
          <Input
            {...f}
            value={parts.rest}
            onChange={(e) => set(withMain(draft, { rest: e.target.value }))}
            onBlur={(e) => {
              const v = e.target.value.trim()
              const rest = v && !/^[/?#]/.test(v) ? `/${v}` : v
              if (rest !== parts.rest) set(withMain(draft, { rest }))
            }}
            placeholder="/"
            className="font-mono"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
          />
        )}
      </Field>
    </div>
  )
}

// Digits only, up to 65535.
export function PortInput({
  value,
  onChange,
  ...props
}: {
  id?: string
  "aria-invalid"?: true
  "aria-describedby"?: string
  "aria-label"?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
      inputMode="numeric"
      autoComplete="off"
      className="font-mono tabular-nums"
    />
  )
}

// The address the main upstream would be asked at, on another server: same
// scheme, path and query.
function upstreamOn(upstream: string, address: string) {
  const m = /^(https?:\/\/)([^/?#]+)(.*)$/i.exec(upstream.trim())
  return m ? `${m[1]}${address}${m[3]}` : ""
}

function hostnameOf(upstream: string) {
  try {
    return new URL(upstream.trim()).hostname.replace(/^\[|\]$/g, "")
  } catch {
    return ""
  }
}

// Asks one server for the site's address from the proxy's machine. Sites
// only: a stream has nothing to ask.
function useServerTest({
  proxy: p,
  draft,
  address,
  main,
  testAll,
}: {
  proxy: ReverseProxy
  draft: Draft
  address: string
  main?: boolean
  testAll: number
}) {
  const test = useTestUpstream()
  const [tested, setTested] = useState("")
  const upstream =
    draft.type === "proxy"
      ? main
        ? draft.upstream.trim()
        : upstreamOn(draft.upstream, address)
      : ""
  const ok = /^https?:\/\/[^/?#:]+/i.test(upstream)
  const run = () => {
    if (!ok) return
    setTested(upstream)
    const tls = httpsUpstream(draft) ? toConfig(draft).upstream_tls : undefined
    test.mutate({
      id: p.id,
      upstream,
      // The servers are reached under the main address's name, as nginx
      // does with a pool.
      tls: upstream.toLowerCase().startsWith("https://")
        ? { ...tls, name: tls?.name || hostnameOf(draft.upstream) }
        : undefined,
    })
  }
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    if (testAll) runRef.current()
  }, [testAll])
  const current = tested === upstream
  return {
    ok,
    run,
    pending: test.isPending,
    result: current && !test.isPending ? test.data : undefined,
    failed: current && !test.isPending ? test.error : null,
  }
}

type ServerTestState = ReturnType<typeof useServerTest>

function TestButton({
  t,
  label,
  className,
}: {
  t: ServerTestState
  label: string
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-11 md:h-8", className)}
      aria-label={label}
      onClick={t.run}
      disabled={!t.ok || t.pending}
    >
      {t.pending ? <Loader2 className="animate-spin" /> : <Plug />}
      Test
    </Button>
  )
}

function TestResult({ t }: { t: ServerTestState }) {
  if (t.result)
    return (
      <p
        role="status"
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-caption",
          t.result.ok ? "text-success" : "text-destructive",
        )}
      >
        {t.result.ok && <Check className="size-3.5 shrink-0" />}
        {t.result.ok
          ? `Answered ${t.result.status} in ${t.result.millis} ms`
          : t.result.error ||
            `Answered ${t.result.status} in ${t.result.millis} ms`}
      </p>
    )
  if (t.failed)
    return (
      <p role="status" className="text-caption text-destructive">
        {t.failed.message}
      </p>
    )
  return null
}

function RetryFields({
  draft,
  set,
  errors,
}: Pick<Props, "draft" | "set" | "errors">) {
  const stream = draft.type === "stream"
  const on = draft.lbRetry
  const chosen = draft.lbRetryOn.length ? draft.lbRetryOn : defaultRetry
  const toggle = (c: string) => {
    const next = chosen.includes(c)
      ? chosen.filter((x) => x !== c)
      : retryConditions.filter((x) => x === c || chosen.includes(x))
    const same =
      next.length === defaultRetry.length &&
      defaultRetry.every((x) => next.includes(x))
    set({ lbRetryOn: same ? [] : [...next] })
  }
  return (
    <div className="flex flex-col gap-4">
      <ToggleRow
        id="lb-retry"
        label={on ? "Tries the next server" : "Never tries another server"}
        hint={
          !on
            ? `A failed ${stream ? "connection" : "request"} shows an error at once.`
            : stream
              ? "When a server can't be reached, the connection is tried on the next one."
              : "When a server fails before anything was sent to the visitor, the request is tried on the next one. The visitor only sees an error when every server failed."
        }
        checked={on}
        onChange={(lbRetry) => set({ lbRetry })}
      />
      {on && (
        <>
          {!stream && (
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-body-sm font-medium">When</legend>
              <div className="flex flex-wrap gap-2">
                {retryConditions.map((c) => {
                  const picked = chosen.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={picked}
                      // The last one can't go: nginx needs at least one.
                      disabled={picked && chosen.length === 1}
                      onClick={() => toggle(c)}
                      className={cn(
                        "flex h-11 items-center gap-1.5 rounded-full border px-3 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 md:h-8",
                        picked
                          ? "border-brand/40 bg-brand-soft text-brand-strong"
                          : "border-border text-muted-foreground hover:bg-subtle hover:text-foreground",
                      )}
                    >
                      {picked && <Check className="size-3.5" />}
                      {retryLabels[c]}
                    </button>
                  )
                })}
              </div>
              <p className="text-caption text-muted-foreground">
                Codes = the server answered with that error. Can't connect and
                Timed out are on by default.
              </p>
              <FieldError text={errors["balance.retry_on"]} />
              {chosen.includes("non_idempotent") && (
                <Callout icon={<TriangleAlert />} tone="warning">
                  A form sent with POST may then reach two servers, so an order
                  or a payment can happen twice. Only for apps where sending
                  again is safe.
                </Callout>
              )}
            </fieldset>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Servers tried at most"
              hint="Counting the first. Empty = all of them."
              error={errors["balance.tries"]}
            >
              {(f) => (
                <NumberInput
                  {...f}
                  value={draft.lbTries}
                  onChange={(lbTries) => set({ lbTries })}
                  placeholder="All"
                />
              )}
            </Field>
            <Field
              label="Stop trying after"
              hint="Empty = no limit."
              error={errors["balance.retry_timeout"]}
            >
              {(f) => (
                <NumberInput
                  {...f}
                  value={draft.lbRetryTimeout}
                  onChange={(lbRetryTimeout) => set({ lbRetryTimeout })}
                  unit="seconds"
                  placeholder="No limit"
                />
              )}
            </Field>
          </div>
        </>
      )}
    </div>
  )
}

// In General: with no other server, just the way to add one under the App
// address. Once there are more, they replace that field: every server is a
// row alike (address, port, weight, test; role, limit and note behind its
// More), with the scheme and path above and how one is picked below. What
// happens when one fails is FailoverCard, right under the card.
export function PoolInline({
  proxy,
  draft,
  set,
  errors,
  readOnly,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  readOnly: boolean
}) {
  const stream = draft.type === "stream"
  const focusKey = useRef("")
  const rows = usePoolRows(draft, set, focusKey)
  const [testAll, setTestAll] = useState(0)
  const servers = draft.poolServers
  const kept = keptServers(draft)
  const main = mainServer(draft)
  const share = shares(draft.poolMain, kept)
  const testable = !stream && /^https?:\/\/./i.test(draft.upstream.trim())
  if (readOnly && !servers.length) return null

  const addButton = !readOnly && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-11 md:h-8"
      onClick={rows.add}
      disabled={!main || servers.length >= MAX_SERVERS}
    >
      <Plus />
      Add another server
    </Button>
  )

  if (!servers.length)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {addButton}
        <p className="text-caption text-ash">
          {!main
            ? stream
              ? "Set where the port forwards to first, to add more servers."
              : "Set the app's address first, to add more servers."
            : stream
              ? "The same service on more servers? Connections get shared between them."
              : "The same app on more servers? Requests get shared between them (load balancing)."}
        </p>
      </div>
    )

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-4">
      <legend className="sr-only">
        {stream ? "Forward to" : "App address"}, load balanced
      </legend>
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-body-sm font-medium">
          <Network className="size-4 text-muted-foreground" />
          {stream ? "Forward to" : "App servers"} · {kept.length + 1} servers,
          load balanced
        </p>
        <p className="text-caption text-muted-foreground">
          {stream
            ? "host and port of each server, as the proxy's server reaches them. Connections are shared between them and keep working when one is down."
            : "Where the app answers on each server, as the proxy's server sees it. Requests are shared between them, and the site stays up when one is down."}{" "}
          An empty port = server 1's.
        </p>
      </div>

      <SchemePath draft={draft} set={set} />

      <div className="flex flex-col gap-3 @xl:gap-2">
        <div
          aria-hidden
          className={cn(
            rowGrid,
            "hidden text-caption text-muted-foreground @xl:grid",
          )}
        >
          <span className="text-center">#</span>
          <span>Address</span>
          <span>Port</span>
          <span>Weight</span>
          <span>Share</span>
        </div>
        <ul className="flex flex-col gap-4 @xl:gap-2">
          {[draft.poolMain, ...servers].map((s, i) => (
            <PoolRow
              key={s.key}
              server={s}
              at={rows.at(s)}
              main={i === 0}
              index={i + 1}
              draft={draft}
              proxy={proxy}
              share={share.get(s.key) ?? 0}
              error={addressError(draft, errors, s)}
              errors={errors}
              testAll={testable ? testAll : 0}
              autoFocus={focusKey.current === s.key}
              onChange={(patch) => rows.setServer(s.key, patch)}
              onPaste={(e) => rows.paste(s.key, e)}
              onTidy={(text) => rows.tidy(s, text)}
              onRemove={readOnly ? undefined : () => rows.remove(s.key)}
            />
          ))}
        </ul>
        <FieldError text={errors["balance.servers"]} />
        <div className="flex flex-wrap items-center gap-2">
          {addButton}
          {!readOnly && (
            <PickFromServer
              id="proxy-host-pick-pool"
              proxy={proxy}
              protocol={draft.protocol === "udp" ? "udp" : "tcp"}
              label="Add from a server"
              className="h-11 md:h-8"
              disabled={servers.length >= MAX_SERVERS}
              onPick={rows.addPicked}
            />
          )}
          {testable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 text-muted-foreground md:h-8"
              onClick={() => setTestAll((n) => n + 1)}
            >
              <Plug />
              Test all
            </Button>
          )}
          <p className="text-caption text-ash">
            Paste a list into an address to add several at once.
          </p>
        </div>
      </div>

      <MethodInline draft={draft} set={set} errors={errors} />
    </fieldset>
  )
}

// #, address, port, weight, share, test, more, remove.
const rowGrid =
  "@xl:grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_5rem_4.5rem_5rem_2rem_2rem] @xl:items-center @xl:gap-x-2"

function PoolRow({
  server: s,
  at,
  main,
  index,
  draft,
  proxy,
  share,
  error,
  errors,
  testAll,
  autoFocus,
  onChange,
  onPaste,
  onTidy,
  onRemove,
}: {
  server: PoolServerDraft
  at: { host: string; port: string }
  main?: boolean
  index: number
  draft: Draft
  proxy: ReverseProxy
  share: number
  error?: string
  errors: Errors
  testAll: number
  autoFocus?: boolean
  onChange: (patch: Partial<PoolServerDraft>) => void
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void
  onTidy?: (text?: string) => void
  onRemove?: () => void
}) {
  const ref = useAutoFocus(autoFocus)
  const host = useHeldText(
    at.host,
    (v) => onChange({ host: v }),
    (v) => onTidy?.(v),
    main,
  )
  const id = `pool-inline-${s.key}`
  const address = main ? mainServer(draft) : serverAddress(draft, s)
  const t = useServerTest({ proxy, draft, address, main, testAll })
  const label = "text-caption text-muted-foreground @xl:sr-only"
  // Server 1's own fields are checked as the upstream; only its role has a
  // key of its own.
  const err = (f: string) =>
    main
      ? f === "backup"
        ? errors["balance.main.backup"]
        : undefined
      : errors[`pool.${s.key}.${f}`]
  const weightError = err("weight")
  const extraError = err("backup") || err("max_conns") || err("note")
  const role = roleOf(s)
  const extras = role !== "on" || !!s.maxConns.trim() || !!s.note.trim()
  const [more, setMore] = useState(false)
  const open = more || !!extraError
  return (
    <li className="flex flex-col gap-1">
      <div className={cn("grid gap-2", rowGrid)}>
        <div className="flex min-h-6 items-center gap-2 @xl:contents">
          <span className="text-body-sm font-medium @xl:order-1 @xl:text-center @xl:text-caption @xl:font-normal @xl:text-ash @xl:tabular-nums">
            <span className="@xl:hidden">Server {index}</span>
            <span className="hidden @xl:inline">{index}</span>
          </span>
          <span className="@xl:order-5">
            <ShareText server={s} share={share} />
          </span>
          <span className="ms-auto @xl:order-7 @xl:ms-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "relative -my-2 size-11 md:size-8 @xl:my-0",
                open ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
              aria-label={`More for server ${index}: role, connection limit, note`}
              aria-expanded={open}
              aria-controls={`${id}-more`}
              onClick={() => setMore(!open)}
            >
              <SlidersHorizontal />
              {extras && !open && (
                <span className="absolute end-2 top-2 size-1.5 rounded-full bg-brand md:end-1 md:top-1" />
              )}
            </Button>
          </span>
          <span className="@xl:order-8">
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-my-2 size-11 text-muted-foreground md:size-8 @xl:my-0"
                aria-label={`Remove server ${index}`}
                onClick={onRemove}
              >
                <Trash2 />
              </Button>
            )}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2 @xl:contents">
          <div className="flex min-w-0 flex-col gap-1 @xl:order-2">
            <label htmlFor={`${id}-host`} className={label}>
              Address
            </label>
            <Input
              ref={ref}
              id={`${id}-host`}
              aria-label={`Server ${index} address`}
              aria-invalid={error ? true : undefined}
              value={host.value}
              onChange={(e) => host.onChange(e.target.value)}
              onBlur={host.onBlur}
              onPaste={onPaste}
              placeholder={main ? "127.0.0.1" : "10.0.0.6"}
              className="font-mono"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1 @xl:order-3">
            <label htmlFor={`${id}-port`} className={label}>
              Port
            </label>
            <PortInput
              id={`${id}-port`}
              aria-label={`Server ${index} port`}
              aria-invalid={error ? true : undefined}
              value={at.port}
              onChange={(port) => onChange({ port })}
              placeholder={main ? mainPortHint(draft) : mainPort(draft)}
            />
          </div>
        </div>

        <div className="flex items-end gap-2 @xl:contents">
          <div className="flex w-24 flex-col gap-1 @xl:order-4 @xl:w-auto">
            <label htmlFor={`${id}-weight`} className={label}>
              Weight
            </label>
            <NumberInput
              id={`${id}-weight`}
              aria-label={`Server ${index} weight`}
              aria-invalid={weightError ? true : undefined}
              value={s.weight}
              onChange={(weight) => onChange({ weight })}
              placeholder="1"
            />
          </div>
          <div className="@xl:order-6">
            {t.ok && (
              <TestButton
                t={t}
                label={`Test server ${index}`}
                className="@xl:w-full"
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 @xl:ms-8">
        <TestResult t={t} />
        <FieldError text={error ?? weightError} />
      </div>
      {open && (
        <div
          id={`${id}-more`}
          className="mt-1 flex flex-col gap-3 rounded-xl bg-subtle p-3 @xl:ms-8"
        >
          <div className="grid gap-3 @xl:grid-cols-[auto_9rem_minmax(0,1fr)] @xl:items-end">
            <div className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">Role</span>
              <Segmented
                label={`Server ${index}: in use, backup or off`}
                items={roleItems(draft.lbMethod, s)}
                value={role}
                onChange={(r) =>
                  onChange({ backup: r === "backup", down: r === "off" })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${id}-max`}
                className="text-caption text-muted-foreground"
              >
                Most connections
              </label>
              <NumberInput
                id={`${id}-max`}
                aria-invalid={err("max_conns") ? true : undefined}
                value={s.maxConns}
                onChange={(maxConns) => onChange({ maxConns })}
                placeholder="No limit"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor={`${id}-note`}
                className="text-caption text-muted-foreground"
              >
                Note
              </label>
              <Input
                id={`${id}-note`}
                aria-invalid={err("note") ? true : undefined}
                value={s.note}
                onChange={(e) => onChange({ note: e.target.value })}
                maxLength={200}
                placeholder="Which machine it is"
              />
            </div>
          </div>
          <p className="text-caption text-muted-foreground">
            Backup = gets traffic only while every server in use is down (Take
            turns and Fewest connections only). Off = kept in the list, gets
            nothing.
          </p>
          <FieldError text={extraError} />
        </div>
      )}
    </li>
  )
}

// How a server is picked, under the list, with its options in place.
function MethodInline({
  draft,
  set,
  errors,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
}) {
  const stream = draft.type === "stream"
  const methods = lbMethods.filter(
    (m) => !(stream && m.sitesOnly) || draft.lbMethod === m.value,
  )
  const method = lbMethods.find((m) => m.value === draft.lbMethod)
  const backups = [draft.poolMain, ...keptServers(draft)].some((s) => s.backup)
  const key = stream ? "ip" : draft.lbHashKey
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-3">
        <label
          htmlFor="lb-method-inline"
          className="shrink-0 text-body-sm font-medium"
        >
          How a server is picked
        </label>
        <div className="@xl:w-72">
          <Choice
            id="lb-method-inline"
            label="How a server is picked"
            items={methods}
            value={draft.lbMethod}
            onChange={(lbMethod) => set({ lbMethod })}
          />
        </div>
      </div>
      {method && (
        <p className="text-caption text-muted-foreground">
          {method.hint} {stream ? "Per new connection." : "Per request."}
        </p>
      )}
      <FieldError text={errors["balance.method"]} />
      {backups && noBackup(draft.lbMethod) && (
        <Callout icon={<TriangleAlert />} tone="warning">
          Backup servers only work with Take turns and Fewest connections. Pick
          one of those, or set the backups to In use or Off.
        </Callout>
      )}
      {draft.lbMethod === "hash" &&
        (stream ? (
          <p className="text-caption text-muted-foreground">
            Forwards are picked by the client's address.
          </p>
        ) : (
          <div className="grid gap-3 @xl:grid-cols-2">
            <Field label="Picked by" error={errors["balance.hash_key"]}>
              {(f) => (
                <Choice
                  id={f.id}
                  label="Picked by"
                  items={hashKeys}
                  value={key}
                  onChange={(lbHashKey) => set({ lbHashKey })}
                />
              )}
            </Field>
            {(key === "cookie" || key === "header" || key === "arg") && (
              <Field
                label={
                  key === "cookie"
                    ? "Cookie name"
                    : key === "header"
                      ? "Header name"
                      : "Argument name"
                }
                hint={
                  key === "cookie"
                    ? "Visitors without it are all sent to one server."
                    : key === "header"
                      ? "Requests without it are all sent to one server."
                      : "Pages without it are all sent to one server."
                }
                error={errors["balance.hash_name"]}
              >
                {(f) => (
                  <Input
                    {...f}
                    value={draft.lbHashName}
                    onChange={(e) => set({ lbHashName: e.target.value })}
                    placeholder={hashPlaceholder[key]}
                    className="font-mono"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              </Field>
            )}
          </div>
        ))}
      {draft.lbMethod === "hash" && (
        <ToggleRow
          id="lb-consistent"
          label="Move few keys when servers change"
          hint="Adding or removing a server sends only its share of keys elsewhere, instead of reshuffling them all. Keeps caches and sessions warm."
          checked={draft.lbConsistent}
          onChange={(lbConsistent) => set({ lbConsistent })}
        />
      )}
      {draft.lbMethod === "random" && (
        <ToggleRow
          id="lb-random-two"
          label="Pick the less busy of two"
          hint="Two servers are drawn at random and the one with fewer connections gets it. Spreads load more evenly."
          checked={draft.lbRandomTwo}
          onChange={(lbRandomTwo) => set({ lbRandomTwo })}
        />
      )}
    </div>
  )
}
