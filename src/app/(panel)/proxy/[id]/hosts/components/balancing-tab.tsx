"use client"

import {
  Activity,
  Check,
  Fingerprint,
  Hash,
  Info,
  Loader2,
  type LucideIcon,
  Plug,
  Plus,
  Repeat,
  Shuffle,
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
  mainServer,
  noBackup,
  type PoolServerDraft,
  retryConditions,
  splitList,
  toConfig,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { Choice, NumberInput } from "./rate-limit"

// Load balancing: the site's requests (or a stream's connections) spread
// over several servers running the same app. The main address from General
// is always the first server.

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
  onGeneral: () => void
}

export function BalancingTab(props: Props) {
  const { draft, set, phone, errors } = props
  const pooled = keptServers(draft).length > 0
  const stream = draft.type === "stream"
  return (
    <>
      <ServersCard {...props} />
      {pooled ? (
        <>
          <MethodCard {...props} />
          <Card
            title="When a server fails"
            hint={`A server that keeps failing is taken out for a while, then tried again. ${props.proxy.kind_label} learns this from real ${stream ? "connections" : "requests"}: it doesn't check servers on its own.`}
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
          </Card>
          <RetryCard {...props} />
          {!stream && (
            <Card
              title="Connections to the servers"
              hint="Idle connections kept open to the servers, so a request doesn't wait for a new one. Saves time and ports on busy sites."
              phone={phone}
            >
              <Field
                label="Idle connections kept"
                hint="Per worker process. 16–64 suits most sites; empty = a new connection for every request."
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
            </Card>
          )}
        </>
      ) : (
        <Callout icon={<Info />}>
          Add a server above to choose how {stream ? "connections" : "requests"}{" "}
          are spread, what happens when one fails, and the rest.
        </Callout>
      )}
    </>
  )
}

// Adding, pasting and removing the other servers, shared by General's short
// list and the tab's full one.
function usePoolRows(
  draft: Draft,
  set: (patch: Partial<Draft>) => void,
  focusKey: { current: string },
) {
  const servers = draft.poolServers
  const setServer = (key: string, patch: Partial<PoolServerDraft>) =>
    set({
      poolServers: servers.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    })
  const add = (addresses: string[] = [""]) => {
    const room = MAX_SERVERS - servers.length
    const rows = addresses
      .slice(0, room)
      .map((address) => freshPoolServer({ address }))
    if (!rows.length) return
    focusKey.current = rows[0].key
    set({ poolServers: [...servers, ...rows] })
  }
  // A pasted list (one per line, or comma separated) becomes rows.
  const paste = (key: string, e: ClipboardEvent<HTMLInputElement>) => {
    const list = splitList(e.clipboardData.getData("text"))
      .map(cleanAddress)
      .filter(Boolean)
    if (list.length < 2) return
    e.preventDefault()
    const [first, ...rest] = list
    const room = MAX_SERVERS - servers.length
    set({
      poolServers: [
        ...servers.map((s) => (s.key === key ? { ...s, address: first } : s)),
        ...rest.slice(0, room).map((address) => freshPoolServer({ address })),
      ],
    })
  }
  const remove = (key: string) =>
    set({ poolServers: servers.filter((x) => x.key !== key) })
  return { setServer, add, paste, remove }
}

function ServersCard({
  proxy: p,
  draft,
  set,
  errors,
  phone,
  onGeneral,
}: Props) {
  const stream = draft.type === "stream"
  const main = mainServer(draft)
  const [testAll, setTestAll] = useState(0)
  const servers = draft.poolServers
  const share = shares(
    draft.poolMain,
    servers.filter((s) => s.address.trim()),
  )
  const focusKey = useRef("")
  const testable = !stream && /^https?:\/\/./i.test(draft.upstream.trim())

  const { setServer, add, paste, remove } = usePoolRows(draft, set, focusKey)

  return (
    <Card
      title="Servers"
      count={main ? 1 + keptServers(draft).length : undefined}
      hint={
        stream
          ? "Every server should run the same service. The address from General is the first one."
          : "Every server should run the same app and answer the same way. The address from General is the first one; its scheme and path are used for all."
      }
      phone={phone}
      action={
        testable &&
        keptServers(draft).length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 md:h-8"
            onClick={() => setTestAll((n) => n + 1)}
          >
            <Plug />
            Test all
          </Button>
        )
      }
    >
      <ul
        className={cn(
          "flex flex-col",
          phone
            ? "-mx-4 divide-y divide-border border-y border-border"
            : "gap-3",
        )}
      >
        <ServerRow
          server={draft.poolMain}
          main
          address={main}
          index={1}
          draft={draft}
          share={share.get(draft.poolMain.key) ?? 0}
          pooled={keptServers(draft).length > 0}
          errors={errors}
          phone={phone}
          proxy={p}
          testAll={testable ? testAll : 0}
          onChange={(patch) =>
            set({ poolMain: { ...draft.poolMain, ...patch } })
          }
          onGeneral={onGeneral}
        />
        {servers.map((s, i) => (
          <ServerRow
            key={s.key}
            server={s}
            address={s.address}
            index={i + 2}
            draft={draft}
            share={share.get(s.key) ?? 0}
            pooled
            errors={errors}
            phone={phone}
            proxy={p}
            testAll={testable ? testAll : 0}
            autoFocus={focusKey.current === s.key}
            onChange={(patch) => setServer(s.key, patch)}
            onPaste={(e) => paste(s.key, e)}
            onRemove={() => {
              remove(s.key)
              // The tab only shows while there are other servers.
              if (servers.length === 1) onGeneral()
            }}
          />
        ))}
      </ul>
      <FieldError text={errors["balance.servers"]} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => add()}
          disabled={!main || servers.length >= MAX_SERVERS}
        >
          <Plus />
          Add a server
        </Button>
        <p className="text-caption text-ash">
          {main
            ? "Paste a list into an address to add several at once."
            : stream
              ? "Set where the port forwards to in General first."
              : "Set the app's address in General first."}
        </p>
      </div>
    </Card>
  )
}

function ServerRow({
  server: s,
  main,
  address,
  index,
  draft,
  share,
  pooled,
  errors,
  phone,
  proxy,
  testAll,
  autoFocus,
  onChange,
  onPaste,
  onRemove,
  onGeneral,
}: {
  server: PoolServerDraft
  main?: boolean
  address: string
  index: number
  draft: Draft
  share: number
  // Other servers are listed, so the main one's options count.
  pooled: boolean
  errors: Errors
  phone: boolean
  proxy: ReverseProxy
  testAll: number
  autoFocus?: boolean
  onChange: (patch: Partial<PoolServerDraft>) => void
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void
  onRemove?: () => void
  onGeneral?: () => void
}) {
  const err = (f: string) =>
    main
      ? f === "backup"
        ? errors["balance.main.backup"]
        : undefined
      : errors[`pool.${s.key}.${f}`]
  const role = roleOf(s)
  const id = `pool-${s.key}`
  const focus = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches)
      focus.current?.focus()
  }, [autoFocus])

  return (
    <li
      className={cn(
        "flex flex-col gap-3",
        phone ? "p-4" : "rounded-xl border border-border p-4",
      )}
    >
      <div className="flex min-h-6 items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            role === "on" ? "bg-brand" : role === "backup" ? "bg-mist" : "",
            role === "off" && "border border-mist",
          )}
          aria-hidden
        />
        <span className="text-body-sm font-medium">
          {main ? "Server 1 (main)" : `Server ${index}`}
        </span>
        {pooled && (
          <span className="text-caption text-muted-foreground">
            {role === "off"
              ? "Gets nothing"
              : role === "backup"
                ? "Only when the others are down"
                : `≈ ${Math.round(share * 100)}% of the traffic`}
          </span>
        )}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-my-1 ms-auto size-11 text-muted-foreground md:size-8"
            aria-label={`Remove server ${index}`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <div
        className={cn(
          "grid gap-3",
          !phone && "lg:grid-cols-[minmax(0,1fr)_7rem_9rem]",
        )}
      >
        {main ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-body-sm font-medium">Address</span>
            <div className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-input bg-subtle px-3 md:h-9">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-mono text-body-sm",
                  !address && "text-ash",
                )}
              >
                {address || "Not set yet"}
              </span>
              <button
                type="button"
                onClick={onGeneral}
                className="shrink-0 text-caption font-medium text-brand underline-offset-4 hover:underline"
              >
                Change in General
              </button>
            </div>
          </div>
        ) : (
          <Field label="Address" error={err("address")}>
            {(f) => (
              <Input
                {...f}
                ref={focus}
                value={s.address}
                onChange={(e) => onChange({ address: e.target.value })}
                onBlur={(e) => {
                  const v = cleanAddress(e.target.value)
                  if (v !== s.address) onChange({ address: v })
                }}
                onPaste={onPaste}
                placeholder="10.0.0.6:3000"
                className="font-mono"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
              />
            )}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3 lg:contents">
          <Field label="Weight" error={err("weight")}>
            {(f) => (
              <NumberInput
                {...f}
                value={s.weight}
                onChange={(weight) => onChange({ weight })}
                placeholder="1"
              />
            )}
          </Field>
          <Field label="Most connections" error={err("max_conns")}>
            {(f) => (
              <NumberInput
                {...f}
                value={s.maxConns}
                onChange={(maxConns) => onChange({ maxConns })}
                placeholder="No limit"
              />
            )}
          </Field>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3",
          !phone && "lg:flex-row lg:items-start",
        )}
      >
        <div className="flex flex-col gap-1.5">
          <Segmented
            label={`Server ${index}: in use, backup or off`}
            items={roleItems(draft.lbMethod, s)}
            value={role}
            onChange={(r) =>
              onChange({ backup: r === "backup", down: r === "off" })
            }
          />
          <FieldError text={err("backup")} />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            id={`${id}-note`}
            aria-label={`Server ${index} note`}
            aria-invalid={err("note") ? true : undefined}
            value={s.note}
            onChange={(e) => onChange({ note: e.target.value })}
            maxLength={200}
            placeholder="Note (optional): which machine it is"
          />
          <FieldError text={err("note")} />
        </div>
      </div>

      {(main || address.trim()) && (
        <ServerTest
          proxy={proxy}
          draft={draft}
          address={address}
          main={main}
          testAll={testAll}
        />
      )}
    </li>
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

// Asks one server for the site's address from the proxy's machine.
function ServerTest({
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
        : upstreamOn(draft.upstream, cleanAddress(address))
      : ""
  const ok = /^https?:\/\/[^/?#]+/i.test(upstream)
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

  if (!ok) return null
  const result = tested === upstream ? test.data : undefined
  const failed = tested === upstream ? test.error : null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ms-2 h-9 text-muted-foreground md:h-8"
        onClick={run}
        disabled={test.isPending}
      >
        {test.isPending ? <Loader2 className="animate-spin" /> : <Plug />}
        Test
      </Button>
      {!test.isPending && result && (
        <p
          role="status"
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-caption",
            result.ok ? "text-success" : "text-destructive",
          )}
        >
          {result.ok && <Check className="size-3.5 shrink-0" />}
          {result.ok
            ? `Answered ${result.status} in ${result.millis} ms`
            : result.error ||
              `Answered ${result.status} in ${result.millis} ms`}
        </p>
      )}
      {!test.isPending && failed && (
        <p role="status" className="text-caption text-destructive">
          {failed.message}
        </p>
      )}
    </div>
  )
}

function MethodCard({ draft, set, errors, phone }: Props) {
  const stream = draft.type === "stream"
  const methods = lbMethods.filter(
    (m) => !(stream && m.sitesOnly) || draft.lbMethod === m.value,
  )
  const backups = [draft.poolMain, ...keptServers(draft)].some((s) => s.backup)
  const key = stream ? "ip" : draft.lbHashKey
  return (
    <Card
      title="How a server is picked"
      hint={
        stream
          ? "For each new connection."
          : "For each request. Weights count with every way."
      }
      phone={phone}
    >
      <div
        role="radiogroup"
        aria-label="How a server is picked"
        className={cn(
          phone
            ? "-mx-4 flex flex-col divide-y divide-border border-y border-border"
            : "grid gap-2 lg:grid-cols-2",
        )}
      >
        {methods.map((m) => {
          const on = draft.lbMethod === m.value
          const Icon = m.icon
          return (
            // biome-ignore lint/a11y/useSemanticElements: card options; radio inputs can't be styled as cards
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ lbMethod: m.value })}
              className={cn(
                "flex items-start gap-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                phone
                  ? "min-h-16 px-4 py-3 active:bg-muted"
                  : cn(
                      "rounded-xl border p-3",
                      on
                        ? "border-brand bg-brand-soft/40 ring-1 ring-brand"
                        : "border-border hover:bg-subtle",
                    ),
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
                  on
                    ? "bg-brand text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium">
                  {m.label}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {m.hint}
                </span>
              </span>
              {phone && on && (
                <Check className="mt-1.5 size-4 shrink-0 text-brand" />
              )}
            </button>
          )
        })}
      </div>
      <FieldError text={errors["balance.method"]} />

      {backups && noBackup(draft.lbMethod) && (
        <Callout icon={<TriangleAlert />} tone="warning">
          Backup servers only work with Take turns and Fewest connections. Pick
          one of those, or set the backups to In use or Off.
        </Callout>
      )}

      {draft.lbMethod === "ip_hash" && (
        <Callout icon={<Info />}>
          Visitors from the same network (the first three parts of an IPv4
          address) all land on the same server. Visitors behind one company
          proxy count as one visitor.
        </Callout>
      )}

      {draft.lbMethod === "hash" && (
        <div className="flex flex-col gap-4">
          {stream ? (
            <p className="text-caption text-muted-foreground">
              Forwards are picked by the client's address.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
          )}
          <ToggleRow
            id="lb-consistent"
            label="Move few keys when servers change"
            hint="Adding or removing a server sends only its share of keys elsewhere, instead of reshuffling them all. Keeps caches and sessions warm."
            checked={draft.lbConsistent}
            onChange={(lbConsistent) => set({ lbConsistent })}
          />
        </div>
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
    </Card>
  )
}

function RetryCard({ draft, set, errors, phone }: Props) {
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
    <Card
      title="Try another server"
      hint={
        stream
          ? "When a server can't be reached, the connection is tried on the next one."
          : "When a server fails before anything was sent to the visitor, the request is tried on the next one. The visitor only sees an error when every server failed."
      }
      phone={phone}
    >
      <ToggleRow
        id="lb-retry"
        label={on ? "Tries the next server" : "Never tries another server"}
        hint={
          on
            ? undefined
            : "A failed request shows the visitor an error at once."
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
    </Card>
  )
}

// Under General's address: the other servers, by address only, and the
// way into the tab for weights, backups and failover.
export function PoolInline({
  draft,
  set,
  errors,
  readOnly,
  phone,
  onOpen,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  readOnly: boolean
  phone: boolean
  onOpen: () => void
}) {
  const stream = draft.type === "stream"
  const focusKey = useRef("")
  const { setServer, add, paste, remove } = usePoolRows(draft, set, focusKey)
  const servers = draft.poolServers
  const kept = keptServers(draft).length
  const main = mainServer(draft)
  if (readOnly && !servers.length) return null
  return (
    <div className="flex flex-col gap-3">
      {servers.length > 0 && (
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1 text-body-sm font-medium">
            {stream ? "Also forwarded to" : "Also on these servers (same app)"}
          </legend>
          <p className="-mt-1 text-caption text-muted-foreground">
            {stream
              ? "Connections are shared between all of them, and keep working when one is down."
              : "Requests are shared between all of them, and the site stays up when one is down. They get the same scheme and path as the address above."}
          </p>
          <ul className="flex flex-col gap-2">
            {servers.map((s, i) => (
              <InlineRow
                key={s.key}
                server={s}
                index={i + 2}
                error={errors[`pool.${s.key}.address`]}
                autoFocus={focusKey.current === s.key}
                onChange={(address) => setServer(s.key, { address })}
                onPaste={(e) => paste(s.key, e)}
                onRemove={() => remove(s.key)}
              />
            ))}
          </ul>
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 md:h-8"
            onClick={() => add()}
            disabled={!main || servers.length >= MAX_SERVERS}
          >
            <Plus />
            Add another server
          </Button>
        )}
        {kept > 0 ? (
          <p className="text-caption text-muted-foreground">
            {kept + 1} servers · {lbMethodLabel(draft.lbMethod)} ·{" "}
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                "font-medium text-brand underline-offset-4 hover:underline",
                phone && "min-h-11",
              )}
            >
              Weights, backups and failover
            </button>
          </p>
        ) : (
          !servers.length && (
            <p className="text-caption text-ash">
              {stream
                ? "The same service on more servers? Connections get shared between them."
                : "The same app on more servers? Requests get shared between them (load balancing)."}
            </p>
          )
        )}
      </div>
    </div>
  )
}

function InlineRow({
  server: s,
  index,
  error,
  autoFocus,
  onChange,
  onPaste,
  onRemove,
}: {
  server: PoolServerDraft
  index: number
  error?: string
  autoFocus: boolean
  onChange: (address: string) => void
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches)
      ref.current?.focus()
  }, [autoFocus])
  const role = roleOf(s)
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center text-caption text-ash tabular-nums">
          {index}
        </span>
        <Input
          ref={ref}
          aria-label={`Server ${index} address`}
          aria-invalid={error ? true : undefined}
          value={s.address}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const v = cleanAddress(e.target.value)
            if (v !== s.address) onChange(v)
          }}
          onPaste={onPaste}
          placeholder="10.0.0.6:3000"
          className="min-w-0 flex-1 font-mono"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
        />
        {role !== "on" && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
            {role === "backup" ? "Backup" : "Off"}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground md:size-8"
          aria-label={`Remove server ${index}`}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="ms-8">
        <FieldError text={error} />
      </div>
    </li>
  )
}
