"use client"

import { BadgeCheck, Loader2, RefreshCw, ShieldPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatSize } from "@/lib/format"
import type {
  CDNAcceleration,
  CDNCaching,
  CDNRedirect,
  CDNSSL,
  DNSServer,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type CdnSettingKind,
  useCdnSetting,
  useIssueCdnCertificate,
  usePurgeCdn,
  useSaveCdnSetting,
} from "../../../../../api"
import { ChoiceSelect } from "../../../../../components/fields"
import { Tag } from "../../../../../components/parts"
import { cacheTimes, durationLabel } from "./meta"
import {
  Choices,
  SaveBar,
  SettingCard,
  SettingsSkeleton,
  ToggleRow,
  useDraft,
} from "./parts"

type TabProps = {
  server: DNSServer
  zone: string
  canEdit: boolean
  phone: boolean
}

function useSetting<K extends CdnSettingKind>(p: TabProps, kind: K) {
  const q = useCdnSetting(p.server.id, p.zone, kind)
  const save = useSaveCdnSetting(p.server.id, p.zone, kind)
  return { q, save }
}

function Failed({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Empty
      icon={RefreshCw}
      title="Couldn't read these settings"
      body={error.message}
      action={
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      }
    />
  )
}

const tlsItems = [
  { value: "", label: "ArvanCloud's default" },
  { value: "TLSv1.2", label: "TLS 1.2 and up (recommended)" },
  { value: "TLSv1.3", label: "TLS 1.3 only" },
  { value: "TLSv1.1", label: "TLS 1.1 and up (old browsers)" },
  { value: "TLSv1", label: "TLS 1.0 and up (not safe)" },
] as const

const hstsAges = [
  "1mo",
  "2mo",
  "3mo",
  "4mo",
  "5mo",
  "6mo",
  "12mo",
  "24mo",
] as const

export function HttpsTab(p: TabProps) {
  const { q, save } = useSetting(p, "ssl")
  const d = useDraft<CDNSSL>(q.data)
  const issue = useIssueCdnCertificate(p.server.id, p.zone)
  if (q.isPending) return <SettingsSkeleton phone={p.phone} />
  if (!d.value) return <Failed error={q.error as Error} retry={q.refetch} />
  const v = d.value
  const off = !p.canEdit
  const active = v.certificates.filter((c) => c.active && !c.is_revoked)
  const waiting = v.orders.filter(
    (o) =>
      !["valid", "invalid", "canceled", "terminated", "killed"].includes(
        o.status,
      ),
  )
  const failed = v.orders.find((o) => o.status === "invalid" && o.error)

  return (
    <div className={cn("flex flex-col", !p.phone && "gap-4")}>
      <SettingCard
        phone={p.phone}
        title="Certificate"
        hint="The certificate ArvanCloud shows visitors. The free one renews by itself."
        action={
          p.canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={issue.isPending}
              onClick={() =>
                issue.mutate(undefined, {
                  onSuccess: () =>
                    toast.success("Certificate requested", {
                      description:
                        "ArvanCloud checks the domain and installs it in a few minutes.",
                    }),
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              {issue.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShieldPlus />
              )}
              Get a free certificate
            </Button>
          )
        }
      >
        {active.length === 0 && waiting.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No certificate yet. Visitors on https see an error until one is
            installed.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {active.map((c) => {
              const days = c.expiry_date
                ? Math.round((Date.parse(c.expiry_date) - Date.now()) / 864e5)
                : null
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <BadgeCheck className="size-4 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-body-sm">
                      {c.domain_names.join(", ")}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {c.issuer || c.type}
                      {c.key_type && ` · ${c.key_type.toUpperCase()}`}
                      {days != null && ` · ${days} days left`}
                    </p>
                  </div>
                  {days != null && days < 14 && (
                    <Tag tone="warning">Expires soon</Tag>
                  )}
                </li>
              )
            })}
            {waiting.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                <Loader2 className="size-4 shrink-0 animate-spin text-ash" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-body-sm">
                    {o.domain_names.join(", ")}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Being issued ({o.status})
                    {o.created_at &&
                      ` · asked ${timeAgo(o.created_at).toLowerCase()}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {failed && (
          <p className="rounded-lg bg-destructive/5 px-3 py-2 text-caption text-destructive">
            The last request failed: {failed.error}
          </p>
        )}
        <ToggleRow
          label="Renew and issue by itself"
          hint="Keep a free certificate on the domain without asking."
          checked={v.auto_issue}
          disabled={off}
          onChange={(auto_issue) => d.set({ auto_issue })}
        />
      </SettingCard>

      <SettingCard phone={p.phone} title="HTTPS">
        <ToggleRow
          label="HTTPS on"
          hint="Answer on https with the certificate above."
          checked={v.ssl_status}
          disabled={off}
          onChange={(ssl_status) => d.set({ ssl_status })}
        />
        <ToggleRow
          label="Send http visitors to https"
          checked={v.https_redirect}
          disabled={off || !v.ssl_status}
          onChange={(https_redirect) => d.set({ https_redirect })}
        />
        <ToggleRow
          label="Rewrite http:// links in pages"
          hint="Fixes mixed-content warnings on sites that still link over http."
          checked={v.replace_http}
          disabled={off || !v.ssl_status}
          onChange={(replace_http) => d.set({ replace_http })}
        />
        <ToggleRow
          label="HTTP/3 (QUIC)"
          hint="Faster on phones and lossy networks."
          checked={v.quic_status}
          disabled={off || !v.ssl_status}
          onChange={(quic_status) => d.set({ quic_status })}
        />
        <Field label="Lowest TLS version">
          {(f) => (
            <ChoiceSelect
              id={f.id}
              value={
                (v.tls_version ?? "") as (typeof tlsItems)[number]["value"]
              }
              onChange={(tls_version) => d.set({ tls_version })}
              items={tlsItems.map((t) => ({ ...t }))}
            />
          )}
        </Field>
      </SettingCard>

      <SettingCard
        phone={p.phone}
        title="HSTS"
        hint="Browsers remember to use https only. Hard to undo: turn it on once https works everywhere."
      >
        <ToggleRow
          label="Send HSTS"
          checked={v.hsts_status}
          disabled={off || !v.ssl_status}
          onChange={(hsts_status) => d.set({ hsts_status })}
        />
        {v.hsts_status && (
          <>
            <Field label="Remember for">
              {() => (
                <Choices
                  label="HSTS age"
                  value={
                    (hstsAges as readonly string[]).includes(v.hsts_max_age)
                      ? (v.hsts_max_age as (typeof hstsAges)[number])
                      : "6mo"
                  }
                  onChange={(hsts_max_age) => d.set({ hsts_max_age })}
                  disabled={off}
                  items={hstsAges.map((a) => ({
                    value: a,
                    label: a.replace("mo", " mo"),
                  }))}
                />
              )}
            </Field>
            <ToggleRow
              label="Include sub-names"
              checked={v.hsts_subdomain}
              disabled={off}
              onChange={(hsts_subdomain) => d.set({ hsts_subdomain })}
            />
            <ToggleRow
              label="Ask to be preloaded"
              hint="Lets browsers ship with the rule. Only with every sub-name on https."
              checked={v.hsts_preload}
              disabled={off}
              onChange={(hsts_preload) => d.set({ hsts_preload })}
            />
          </>
        )}
      </SettingCard>

      <SaveBar
        phone={p.phone}
        dirty={d.dirty}
        pending={save.isPending}
        onDiscard={d.reset}
        onSave={() =>
          save.mutate(d.patch as never, {
            onSuccess: () => {
              d.reset()
              toast.success("HTTPS settings saved")
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  )
}

const cacheModes = [
  { value: "off", label: "Off" },
  { value: "uri", label: "By path" },
  { value: "query_string", label: "By path and query" },
] as const

export function CacheTab(p: TabProps) {
  const { q, save } = useSetting(p, "caching")
  const d = useDraft<CDNCaching>(q.data)
  if (q.isPending) return <SettingsSkeleton phone={p.phone} />
  if (!d.value) return <Failed error={q.error as Error} retry={q.refetch} />
  const v = d.value
  const off = !p.canEdit
  const on = v.cache_status !== "off"
  // The short list, plus whatever the domain has now.
  const times = [
    ...new Set<string>([
      ...cacheTimes,
      v.cache_page_200,
      v.cache_page_any,
      ...(v.cache_browser === "default" ? [] : [v.cache_browser]),
    ]),
  ].filter(Boolean)
  const timeItems = times.map((t) => ({ value: t, label: durationLabel(t) }))
  const pick = (val: string) => val

  return (
    <div className={cn("flex flex-col", !p.phone && "gap-4")}>
      <SettingCard
        phone={p.phone}
        title="Cache"
        hint="ArvanCloud keeps copies of answers near visitors, so the origin does less."
      >
        <Field
          label="Keep copies"
          hint={
            v.cache_status === "query_string"
              ? "Each address with its query (?page=2) is a separate copy."
              : on
                ? "The query is ignored: /a?x=1 and /a?x=2 share one copy."
                : "Every request goes to the origin."
          }
        >
          {() => (
            <Choices
              label="Cache mode"
              value={v.cache_status as (typeof cacheModes)[number]["value"]}
              onChange={(cache_status) => d.set({ cache_status })}
              disabled={off}
              items={cacheModes}
            />
          )}
        </Field>
        {on && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Keep good answers (200)">
              {(f) => (
                <ChoiceSelect
                  id={f.id}
                  value={pick(v.cache_page_200)}
                  onChange={(cache_page_200) => d.set({ cache_page_200 })}
                  items={timeItems}
                />
              )}
            </Field>
            <Field label="Keep other answers">
              {(f) => (
                <ChoiceSelect
                  id={f.id}
                  value={pick(v.cache_page_any)}
                  onChange={(cache_page_any) => d.set({ cache_page_any })}
                  items={timeItems}
                />
              )}
            </Field>
            <Field label="Tell browsers to keep">
              {(f) => (
                <ChoiceSelect
                  id={f.id}
                  value={
                    v.cache_browser === "default"
                      ? "default"
                      : pick(v.cache_browser)
                  }
                  onChange={(cache_browser) => d.set({ cache_browser })}
                  items={[
                    { value: "default", label: durationLabel("default") },
                    ...timeItems,
                  ]}
                />
              )}
            </Field>
          </div>
        )}
        <ToggleRow
          label="Development mode"
          hint="Nothing is cached while it's on: see changes at once while you work on the site."
          checked={v.cache_developer_mode}
          disabled={off}
          onChange={(cache_developer_mode) => d.set({ cache_developer_mode })}
        />
        <ToggleRow
          label="Always online"
          hint="Serve the kept copy while the origin is down."
          checked={v.cache_consistent_uptime}
          disabled={off || !on}
          onChange={(cache_consistent_uptime) =>
            d.set({ cache_consistent_uptime })
          }
        />
      </SettingCard>

      {on && (
        <SettingCard
          phone={p.phone}
          title="Separate copies"
          hint="What makes two visitors get different copies."
        >
          <ToggleRow
            label="Cache answers that set a cookie"
            hint="Off is safer: a page that sets a cookie is often someone's own."
            checked={v.cache_ignore_sc}
            disabled={off}
            onChange={(cache_ignore_sc) => d.set({ cache_ignore_sc })}
          />
          <Field
            label="By these cookies"
            hint="Cookie names, separated by commas: a different value = a different copy."
          >
            {(f) => (
              <Input
                {...f}
                value={v.cache_cookie}
                disabled={off}
                onChange={(e) => d.set({ cache_cookie: e.target.value })}
                placeholder="lang, currency"
                className="font-mono"
              />
            )}
          </Field>
          {v.cache_status === "query_string" && (
            <>
              <ToggleRow
                label="Only some query arguments count"
                checked={v.cache_args}
                disabled={off}
                onChange={(cache_args) => d.set({ cache_args })}
              />
              {v.cache_args && (
                <Field label="These arguments" hint="Separated by commas.">
                  {(f) => (
                    <Input
                      {...f}
                      value={v.cache_arg}
                      disabled={off}
                      onChange={(e) => d.set({ cache_arg: e.target.value })}
                      placeholder="page, sort"
                      className="font-mono"
                    />
                  )}
                </Field>
              )}
            </>
          )}
          <p className="text-caption text-muted-foreground">
            Files over {formatSize(v.cache_max_size)} aren't cached.
          </p>
        </SettingCard>
      )}

      <SaveBar
        phone={p.phone}
        dirty={d.dirty}
        pending={save.isPending}
        onDiscard={d.reset}
        onSave={() =>
          save.mutate(d.patch as never, {
            onSuccess: () => {
              d.reset()
              toast.success("Cache settings saved")
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  )
}

export function PurgeDialog({
  open,
  onOpenChange,
  server,
  zone,
  urls: startUrls,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Pick<DNSServer, "id">
  zone: string
  // Addresses to suggest (the proxy's site).
  urls?: string[]
}) {
  const [mode, setMode] = useState<"all" | "some">(
    startUrls?.length ? "some" : "all",
  )
  const [text, setText] = useState((startUrls ?? []).join("\n"))
  const purge = usePurgeCdn()
  const urls = text
    .split(/\s+/)
    .map((u) => u.trim())
    .filter(Boolean)
  const bad = urls.find((u) => !/^https?:\/\//i.test(u))
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Clear ${zone}'s CDN cache`}
      description="The next visitors are served by the origin until the cache fills again."
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:hidden"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="md:h-9"
            disabled={
              purge.isPending ||
              (mode === "some" &&
                (urls.length === 0 || urls.length > 50 || !!bad))
            }
            onClick={() =>
              purge.mutate(
                {
                  id: server.id,
                  zone,
                  urls: mode === "some" ? urls : undefined,
                },
                {
                  onSuccess: () => {
                    toast.success(
                      mode === "all"
                        ? "CDN cache cleared"
                        : `Cleared ${urls.length} address${urls.length === 1 ? "" : "es"}`,
                    )
                    onOpenChange(false)
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {purge.isPending && <Loader2 className="animate-spin" />}
            {mode === "all" ? "Clear everything" : "Clear these"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Choices
          label="What to clear"
          value={mode}
          onChange={setMode}
          items={[
            { value: "all", label: "Everything" },
            { value: "some", label: "Some addresses" },
          ]}
        />
        {mode === "some" && (
          <Field
            label="Addresses"
            hint={
              bad
                ? `Start with https:// — ${bad}`
                : `One per line, up to 50 (${urls.length}).`
            }
            error={bad ? "Whole addresses, starting with https://" : undefined}
          >
            {(f) => (
              <Textarea
                {...f}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                spellCheck={false}
                className="font-mono text-body-sm"
                placeholder={`https://${zone}/assets/app.css`}
              />
            )}
          </Field>
        )}
      </div>
    </ResponsiveDialog>
  )
}

const redirectItems = [
  { value: "off", label: "Off" },
  { value: "www", label: "To www" },
  { value: "root", label: "Without www" },
] as const

const accelExts = ["css", "js", "png", "jpeg", "gif"] as const

export function SpeedTab(p: TabProps) {
  const r = useSetting(p, "redirect")
  const a = useSetting(p, "acceleration")
  const rd = useDraft<CDNRedirect>(r.q.data)
  const ad = useDraft<CDNAcceleration>(a.q.data)
  if (r.q.isPending || a.q.isPending)
    return <SettingsSkeleton phone={p.phone} />
  const off = !p.canEdit
  const dirty = rd.dirty || ad.dirty
  const pending = r.save.isPending || a.save.isPending

  async function saveAll() {
    try {
      if (rd.dirty) await r.save.mutateAsync(rd.patch as CDNRedirect)
      if (ad.dirty && ad.value)
        await a.save.mutateAsync({
          status: ad.value.status,
          extensions: ad.value.extensions,
        })
      rd.reset()
      ad.reset()
      toast.success("Settings saved")
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className={cn("flex flex-col", !p.phone && "gap-4")}>
      <SettingCard
        phone={p.phone}
        title="www redirect"
        hint="Keep one address for the site: search engines and cookies like that."
      >
        {rd.value ? (
          <>
            <Choices
              label="www redirect"
              value={rd.value.www_redirect}
              onChange={(www_redirect) => rd.set({ www_redirect })}
              disabled={off}
              items={redirectItems}
            />
            <p className="font-mono text-caption text-muted-foreground">
              {rd.value.www_redirect === "www"
                ? `${p.zone} → www.${p.zone}`
                : rd.value.www_redirect === "root"
                  ? `www.${p.zone} → ${p.zone}`
                  : `${p.zone} and www.${p.zone} both answer`}
            </p>
          </>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            {(r.q.error as Error | null)?.message ?? "Couldn't read it."}
          </p>
        )}
      </SettingCard>

      <SettingCard
        phone={p.phone}
        title="Optimise files"
        hint="ArvanCloud minifies code and compresses images on the way."
      >
        {ad.value ? (
          <>
            <Choices
              label="Optimise files"
              value={ad.value.status}
              onChange={(status) => ad.set({ status })}
              disabled={off}
              items={[
                { value: "off", label: "Off" },
                { value: "on", label: "On" },
                { value: "inherit", label: "As the plan says" },
              ]}
            />
            {ad.value.status === "on" && (
              <fieldset disabled={off} className="flex flex-wrap gap-2">
                <legend className="mb-2 text-body-sm font-medium">
                  Which files
                </legend>
                {accelExts.map((ext) => {
                  const picked = ad.value?.extensions.includes(ext) ?? false
                  return (
                    <button
                      key={ext}
                      type="button"
                      aria-pressed={picked}
                      onClick={() =>
                        ad.set({
                          extensions: picked
                            ? (ad.value?.extensions ?? []).filter(
                                (e) => e !== ext,
                              )
                            : [...(ad.value?.extensions ?? []), ext],
                        })
                      }
                      className="h-9 rounded-full border border-border px-3.5 font-mono text-body-sm text-muted-foreground outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                    >
                      .{ext}
                    </button>
                  )
                })}
              </fieldset>
            )}
          </>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            {(a.q.error as Error | null)?.message ?? "Couldn't read it."}
          </p>
        )}
      </SettingCard>

      <SaveBar
        phone={p.phone}
        dirty={dirty}
        pending={pending}
        onDiscard={() => {
          rd.reset()
          ad.reset()
        }}
        onSave={saveAll}
      />
    </div>
  )
}
