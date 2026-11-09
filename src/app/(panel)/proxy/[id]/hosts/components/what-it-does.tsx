"use client"

import {
  ArrowRight,
  ArrowRightLeft,
  Cable,
  Check,
  CornerUpRight,
  FileX,
  FolderOpen,
  FolderSearch,
  Globe,
  Loader2,
  type LucideIcon,
  Plug,
  Route,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { FolderPicker } from "@/components/files/folder-picker"
import { serverLister } from "@/components/files/listers"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useTestUpstream } from "../../../api"
import {
  type HostType,
  hostTypes,
  notFoundText,
} from "../../../components/meta"
import {
  type Draft,
  domainList,
  type Errors,
  httpsUpstream,
  type NotFoundCode,
  type RedirectCode,
  toConfig,
  withMain,
} from "./draft"
import { MainAddress } from "./main-address"
import { StorageFields } from "./storage-fields"
import { PickFromServer } from "./upstream-picker"

export const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

const redirectKinds: {
  code: RedirectCode
  label: string
  hint: string
}[] = [
  {
    code: 301,
    label: "Moved for good",
    hint: "Browsers and search engines remember it. For a site that moved.",
  },
  {
    code: 302,
    label: "Moved for now",
    hint: "Nothing is remembered. For maintenance or a short move.",
  },
  {
    code: 308,
    label: "For good, keeps the method",
    hint: "Like 301, and a sent form is sent again there.",
  },
  {
    code: 307,
    label: "For now, keeps the method",
    hint: "Like 302, and a sent form is sent again there.",
  },
]

// The address with http:// in front, when it was typed without one.
function withScheme(text: string, scheme: "http" | "https") {
  const t = text.trim()
  if (!t || /^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return ""
  return `${scheme}://${t}`
}

function hostOf(text: string) {
  try {
    return new URL(text.trim()).hostname.replace(/^\[|\]$/g, "")
  } catch {
    return ""
  }
}

const local = (host: string) =>
  host === "localhost" || host === "::1" || host.startsWith("127.")

// What the site does with a visitor and where they go: the type, then
// that type's own fields and switches.
export function WhatItDoes({
  draft,
  set,
  errors,
  proxy: p,
  readOnly,
  phone,
  pool,
  defaultTaken,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  proxy: ReverseProxy
  readOnly: boolean
  phone: boolean
  // The other servers of a balanced site, under the address.
  pool?: ReactNode
  // A hand-written site already answers names nobody else does.
  defaultTaken?: string
}) {
  const caps = p.capabilities
  const types = hostTypes.filter((t) => caps.types.includes(t.value))
  return (
    <div className="flex flex-col gap-5">
      {types.length > 1 && (
        <TypeChooser
          types={types}
          value={draft.type}
          onChange={(type) => set({ type })}
          phone={phone}
        />
      )}
      {draft.type === "proxy" && (
        <ProxyFields
          draft={draft}
          set={set}
          errors={errors}
          proxy={p}
          readOnly={readOnly}
          phone={phone}
          pool={pool}
        />
      )}
      {draft.type === "redirect" && (
        <RedirectFields draft={draft} set={set} errors={errors} phone={phone} />
      )}
      {draft.type === "static" && (
        <StaticFields
          draft={draft}
          set={set}
          errors={errors}
          proxy={p}
          readOnly={readOnly}
          phone={phone}
        />
      )}
      {draft.type === "storage" && (
        <StorageFields
          draft={draft}
          set={set}
          errors={errors}
          proxy={p}
          readOnly={readOnly}
          phone={phone}
        />
      )}
      {draft.type === "notfound" && (
        <NotFoundFields
          draft={draft}
          set={set}
          errors={errors}
          defaultTaken={defaultTaken}
        />
      )}
      {draft.type === "stream" && (
        <StreamFields
          draft={draft}
          set={set}
          errors={errors}
          proxy={p}
          readOnly={readOnly}
          pool={pool}
        />
      )}
    </div>
  )
}

// Desktop: one segmented track with the chosen type's line under it.
// Phones: a grid of tappable tiles.
function TypeChooser({
  types,
  value,
  onChange,
  phone,
}: {
  types: typeof hostTypes
  value: HostType
  onChange: (type: HostType) => void
  phone: boolean
}) {
  const current = types.find((t) => t.value === value)
  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="What the site does"
        className={cn(
          "grid gap-1",
          phone
            ? "grid-cols-3 gap-2"
            : "[grid-template-columns:repeat(var(--n),minmax(0,1fr))] rounded-xl bg-muted p-1",
        )}
        style={
          phone ? undefined : ({ "--n": types.length } as React.CSSProperties)
        }
      >
        {types.map((t) => {
          const Icon = t.icon
          const on = t.value === value
          return (
            // biome-ignore lint/a11y/useSemanticElements: segment options; radio inputs can't be styled as segments
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(t.value)}
              className={cn(
                "flex items-center justify-center text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                phone
                  ? "min-h-16 flex-col gap-1 rounded-xl border p-2 text-caption"
                  : "h-9 gap-2 rounded-lg px-3 whitespace-nowrap",
                phone
                  ? on
                    ? "border-brand bg-brand-soft font-medium text-brand-strong ring-1 ring-brand"
                    : "border-input text-muted-foreground active:bg-muted"
                  : on
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  phone && "size-5",
                  on && "text-brand",
                )}
              />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>
      {current && (
        <p className="text-caption text-muted-foreground">{current.short}.</p>
      )}
    </div>
  )
}

// An input with an icon at its start.
export function IconInput({
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Icon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
      <Input {...props} className={cn("ps-9", props.className)} />
    </div>
  )
}

// "You meant http://…": one tap puts the scheme in front.
function SchemeFix({
  value,
  scheme,
  onFix,
}: {
  value: string
  scheme: "http" | "https"
  onFix: (fixed: string) => void
}) {
  const fixed = withScheme(value, scheme)
  if (!fixed) return null
  return (
    <button
      type="button"
      onClick={() => onFix(fixed)}
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-mist px-3 py-1 text-caption text-muted-foreground outline-none hover:border-brand hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-11"
    >
      <Check className="size-3.5" />
      Use <span className="font-mono">{fixed}</span>
    </button>
  )
}

// The type's switches: cards side by side on desktop, a plain list on
// phones.
export function Options({
  phone,
  children,
}: {
  phone: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        phone
          ? "-mx-4 flex flex-col divide-y divide-border border-y border-border last:-mb-5 last:border-b-0"
          : "grid gap-3 lg:grid-cols-2",
      )}
    >
      {children}
    </div>
  )
}

export function Option({
  id,
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
  phone,
}: {
  id: string
  icon: LucideIcon
  label: string
  hint: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  phone: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        phone
          ? "min-h-16 px-4 py-2.5"
          : cn(
              "rounded-xl border p-3 transition-colors",
              checked ? "border-brand/30 bg-brand-soft/40" : "border-border",
            ),
      )}
    >
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            checked
              ? "bg-brand-soft text-brand-strong"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-body-sm font-medium">{label}</span>
          <span className="block text-caption text-muted-foreground">
            {hint}
          </span>
        </span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ProxyFields({
  draft,
  set,
  errors,
  proxy: p,
  readOnly,
  phone,
  pool,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  proxy: ReverseProxy
  readOnly: boolean
  phone: boolean
  pool?: ReactNode
}) {
  // With more servers, every one is a row of the pool, server 1 too.
  const pooled = Boolean(pool) && draft.poolServers.length > 0
  const host = hostOf(draft.upstream)
  const where = !host
    ? ""
    : local(host)
      ? `Runs on ${p.server_name} itself, next to ${p.kind_label}.`
      : `${p.server_name} reaches ${host} over the network.`
  return (
    <>
      {pooled ? (
        pool
      ) : (
        <>
          <MainAddress
            draft={draft}
            set={set}
            error={errors.upstream}
            hint={
              where ||
              "Where the app answers, as the proxy's server sees it. Paste a whole address to fill every part."
            }
          />
          {!readOnly && (
            <TestUpstream proxy={p} draft={draft}>
              <PickFromServer
                id="proxy-host-pick-upstream"
                proxy={p}
                protocol="tcp"
                onPick={({ host, port, scheme }) =>
                  set(withMain(draft, { host, port, scheme }))
                }
              />
            </TestUpstream>
          )}
          {pool}
        </>
      )}
      <Options phone={phone}>
        {p.capabilities.websockets && (
          <Option
            id="host-websockets"
            icon={Zap}
            label="WebSockets"
            hint="Let live connections through: chat, dashboards, terminals."
            checked={draft.websockets}
            onChange={(websockets) => set({ websockets })}
            phone={phone}
          />
        )}
        <Option
          id="host-preserve"
          icon={Globe}
          label="Pass the visitor's domain"
          hint="The app sees the site's name, not its own address. Most apps want this."
          checked={draft.preserveHost}
          onChange={(preserveHost) => set({ preserveHost })}
          phone={phone}
        />
      </Options>
    </>
  )
}

function RedirectFields({
  draft,
  set,
  errors,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const main = domainList(draft.domains)[0] || "example.com"
  const target = draft.redirectTo.trim()
  const from = `${draft.tls ? "https" : "http"}://${main}`
  const to = target.replace(/\/+$/, "")
  return (
    <>
      <Field label="Send visitors to" error={errors.redirect_to}>
        {(f) => (
          <IconInput
            {...f}
            {...typing}
            icon={CornerUpRight}
            inputMode="url"
            enterKeyHint="done"
            value={draft.redirectTo}
            onChange={(e) => set({ redirectTo: e.target.value })}
            placeholder="https://www.example.com"
            className="font-mono"
          />
        )}
      </Field>
      <SchemeFix
        value={draft.redirectTo}
        scheme="https"
        onFix={(redirectTo) => set({ redirectTo })}
      />

      <div className="flex flex-col gap-2">
        <p id="redirect-kind" className="text-body-sm font-medium">
          Kind of redirect
        </p>
        <div
          role="radiogroup"
          aria-labelledby="redirect-kind"
          className={cn(
            phone
              ? "-mx-4 flex flex-col divide-y divide-border border-y border-border"
              : "grid gap-2 lg:grid-cols-2",
          )}
        >
          {redirectKinds.map((k) => {
            const on = draft.redirectCode === k.code
            return (
              // biome-ignore lint/a11y/useSemanticElements: card options; radio inputs can't be styled as cards
              <button
                key={k.code}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ redirectCode: k.code })}
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
                    "flex h-8 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-body-sm tabular-nums",
                    on
                      ? "bg-brand text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {k.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium">
                    {k.label}
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    {k.hint}
                  </span>
                </span>
                {phone && on && (
                  <Check className="mt-1.5 size-4 shrink-0 text-brand" />
                )}
              </button>
            )
          })}
        </div>
        {errors.redirect_code && <FieldError text={errors.redirect_code} />}
      </div>

      <Options phone={phone}>
        <Option
          id="host-keep-path"
          icon={Route}
          label="Keep the path"
          hint="A visit to /blog/post lands on /blog/post there, not on its home page."
          checked={draft.keepPath}
          onChange={(keepPath) => set({ keepPath })}
          phone={phone}
        />
      </Options>

      {to && !withScheme(target, "https") && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-subtle px-3 py-2.5">
          <p className="text-caption text-muted-foreground">For example</p>
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-caption">
            <span className="min-w-0 break-all">{from}/blog/post</span>
            <ArrowRight className="size-3.5 shrink-0 text-ash" />
            <span className="min-w-0 break-all text-foreground">
              {draft.keepPath ? `${to}/blog/post` : target}
            </span>
            <span className="rounded-full bg-muted px-1.5 text-ash">
              {draft.redirectCode}
            </span>
          </p>
        </div>
      )}
    </>
  )
}

function StaticFields({
  draft,
  set,
  errors,
  proxy: p,
  readOnly,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  proxy: ReverseProxy
  readOnly: boolean
  phone: boolean
}) {
  const [browse, setBrowse] = useOpen("proxy-host-folder")
  const [picked, setPicked] = useState("/")
  const open = () => {
    setPicked(draft.root.trim().startsWith("/") ? draft.root.trim() : "/")
    setBrowse(true)
  }
  return (
    <>
      <Field
        label="Folder"
        hint={`A full path on ${p.server_name}. Its index.html is the home page.`}
        error={errors.root}
      >
        {(f) => (
          <div className="flex gap-2">
            <IconInput
              {...f}
              {...typing}
              icon={FolderOpen}
              enterKeyHint="done"
              value={draft.root}
              onChange={(e) => set({ root: e.target.value })}
              placeholder="/var/www/example"
              className="font-mono"
            />
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 md:h-9"
                onClick={open}
              >
                <FolderSearch />
                Browse
              </Button>
            )}
          </div>
        )}
      </Field>
      <Options phone={phone}>
        <Option
          id="host-spa"
          icon={Route}
          label="Single-page app"
          hint="Paths that aren't files get index.html: React, Vue, Angular builds."
          checked={draft.spa}
          onChange={(spa) => set({ spa })}
          phone={phone}
        />
      </Options>

      <ResponsiveDialog
        open={browse}
        onOpenChange={setBrowse}
        title="Pick the folder"
        description={`Folders on ${p.server_name}.`}
        className="sm:max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setBrowse(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                set({ root: picked })
                setBrowse(false)
              }}
            >
              Use this folder
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FolderPicker
            lister={serverLister(p.server_id)}
            value={picked}
            onChange={setPicked}
            rootLabel={p.server_name}
            rootIcon={<Server />}
            className="max-h-80"
          />
          <p className="truncate text-caption text-muted-foreground">
            Picked: <span className="font-mono text-foreground">{picked}</span>
          </p>
        </div>
      </ResponsiveDialog>
    </>
  )
}

const notFoundCodes = [
  { value: "404", label: "404" },
  { value: "410", label: "410" },
  { value: "444", label: "Close (444)" },
] as const

const notFoundHints: Record<NotFoundCode, string> = {
  404: "Not Found: the usual answer for a name that isn't served.",
  410: "Gone: tells search engines the site is gone for good.",
  444: "Closes the connection without an answer. Scanners get nothing back.",
}

function NotFoundFields({
  draft,
  set,
  errors,
  defaultTaken,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  defaultTaken?: string
}) {
  return (
    <>
      <div className="flex gap-3 rounded-xl bg-subtle p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileX className="size-4" />
        </span>
        <div className="min-w-0 text-body-sm">
          <p className="font-medium">
            Every visit gets{" "}
            <span className="font-mono font-normal">
              {notFoundText(draft.notFoundCode)}
            </span>
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Use it to park a domain, or to keep names you don't serve from
            landing on another site.
          </p>
        </div>
      </div>
      <Field
        label="Answer"
        hint={notFoundHints[draft.notFoundCode]}
        error={errors.not_found_code}
      >
        {() => (
          <div>
            <Segmented
              label="Answer"
              items={notFoundCodes}
              value={String(draft.notFoundCode) as "404"}
              onChange={(v) => set({ notFoundCode: Number(v) as NotFoundCode })}
            />
          </div>
        )}
      </Field>
      <ToggleRow
        id="host-catch-all"
        label="Answer every other name too"
        hint="Visits for a name no site has, or by the server's IP address, end here instead of on the first site in the config. Domains become optional."
        checked={draft.catchAll}
        onChange={(catchAll) => set({ catchAll })}
      />
      <FieldError text={errors.catch_all} />
      {draft.catchAll && defaultTaken && (
        <Callout icon={<ArrowRightLeft />}>
          A hand-written site in{" "}
          <span className="font-mono">{defaultTaken}</span> answers other names
          now (default_server). Saving moves that to this site: Morcheh takes
          only the word default_server off that file's listen lines (a copy is
          kept) and puts it back when this site stops answering other names or
          is removed.
        </Callout>
      )}
    </>
  )
}

// Asks the proxy's server to reach the app now, with the TLS settings
// typed so far.
function TestUpstream({
  proxy: p,
  draft,
  children,
}: {
  proxy: ReverseProxy
  draft: Draft
  // Other buttons of the row (Pick from a server).
  children?: ReactNode
}) {
  const test = useTestUpstream()
  const [tested, setTested] = useState("")
  const upstream = draft.upstream.trim()
  const result = tested === upstream ? test.data : undefined
  const failed = tested === upstream ? test.error : null
  const testable = /^https?:\/\/./i.test(upstream)
  const run = () => {
    setTested(upstream)
    test.mutate({
      id: p.id,
      upstream,
      tls: httpsUpstream(draft) ? toConfig(draft).upstream_tls : undefined,
    })
  }
  return (
    <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      {children}
      {testable && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 md:h-8"
          onClick={run}
          disabled={test.isPending}
        >
          {test.isPending ? <Loader2 className="animate-spin" /> : <Plug />}
          Test the address
        </Button>
      )}
      {testable && !test.isPending && result && (
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
      {testable && !test.isPending && failed && (
        <p role="status" className="text-caption text-destructive">
          {failed.message}
        </p>
      )}
    </div>
  )
}

// A port on the proxy's server, forwarded as is to another address.
function StreamFields({
  draft,
  set,
  errors,
  proxy: p,
  readOnly,
  pool,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  proxy: ReverseProxy
  readOnly: boolean
  pool?: ReactNode
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-[minmax(0,12rem)_auto]">
        <Field
          label="Port"
          hint={`Opened on ${p.server_name}.`}
          error={errors.listen_port}
        >
          {(f) => (
            <IconInput
              {...f}
              icon={Cable}
              type="number"
              inputMode="numeric"
              enterKeyHint="next"
              min={1}
              max={65535}
              value={draft.listenPort}
              onChange={(e) => set({ listenPort: e.target.value })}
              placeholder="5432"
              className="font-mono tabular-nums"
            />
          )}
        </Field>
        <Field label="Protocol" error={errors.protocol}>
          {() => (
            <Segmented
              label="Protocol"
              value={draft.protocol}
              onChange={(protocol) => set({ protocol })}
              items={[
                { value: "tcp", label: "TCP" },
                { value: "udp", label: "UDP" },
              ]}
            />
          )}
        </Field>
      </div>
      {pool && draft.poolServers.length > 0 ? (
        pool
      ) : (
        <>
          <MainAddress
            draft={draft}
            set={set}
            error={errors.stream_to}
            hint="As the proxy's server reaches it."
          />
          {!readOnly && (
            <div className="-mt-2">
              <PickFromServer
                id="proxy-host-pick-stream"
                proxy={p}
                protocol={draft.protocol === "udp" ? "udp" : "tcp"}
                onPick={({ host, port }) =>
                  set(withMain(draft, { host, port }))
                }
              />
            </div>
          )}
          {pool}
        </>
      )}
      <div className="flex gap-3 rounded-xl bg-subtle p-4 text-body-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-ash" />
        <p className="min-w-0 text-muted-foreground">
          {p.kind_label} passes the connection through untouched: no domains, no
          https of its own. Open the port in{" "}
          <Link
            href={`/servers/${p.server_id}/firewall`}
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            {p.server_name}'s firewall
          </Link>{" "}
          too.
        </p>
      </div>
    </>
  )
}
