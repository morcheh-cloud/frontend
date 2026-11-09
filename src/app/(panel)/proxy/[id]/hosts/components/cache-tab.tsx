"use client"

import {
  ArrowDown,
  ArrowUp,
  Check,
  Eraser,
  Info,
  List,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import {
  AddButton,
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { ProxyHost, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCacheCount } from "../../../api"
import { useProxyCan } from "../../../components/permissions"
import { useProxyActions } from "../../../components/proxy-actions"
import { minutesText } from "../../../components/purge-layer"
import {
  type CacheGroupDraft,
  type CacheQuery,
  type Draft,
  type Errors,
  keptGroups,
  type OnlineMode,
  onlineStart,
  onlineStatuses,
  type RuleKeep,
  rowKey,
  typeUses,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { KeptPagesLayer, useKeptCopies } from "./kept-pages"
import { Choice, NumberInput } from "./rate-limit"
import { RemoveButton, typing } from "./rows"

// The Cache tab: how long browsers keep files, and (proxy sites) the
// proxy keeping the app's answers so it isn't asked every time.

// Ready-made "don't cache" lists for common apps.
const skipPresets: { label: string; paths: string[]; cookies: string[] }[] = [
  {
    label: "WordPress",
    paths: ["/wp-admin/", "/wp-login.php", "/wp-json/", "/cart/", "/checkout/"],
    cookies: [
      "wordpress_logged_in",
      "wp-postpass",
      "woocommerce_items_in_cart",
    ],
  },
  {
    label: "Admin and API",
    paths: ["/admin/", "/api/", "/login"],
    cookies: [],
  },
]

const queryChoices: { value: CacheQuery; label: string }[] = [
  { value: "", label: "Every query string counts" },
  { value: "none", label: "Ignore the query string" },
  { value: "only", label: "Only these parameters count" },
]

const queryHints: Record<CacheQuery, string> = {
  "": "/list?page=2 and /list?page=3 are kept apart. Safest choice.",
  none: "/page?utm_source=x is served the copy of /page. Only when the app never changes a page by its query string.",
  only: "Other parameters (utm_*, fbclid…) are ignored, so tracking links don't fill the cache.",
}

// Ready-made cache rules.
const rulePresets: Omit<CacheGroupDraft, "key">[] = [
  {
    name: "Images",
    paths: "*.png\n*.jpg\n*.jpeg\n*.gif\n*.webp\n*.svg\n*.avif\n*.ico",
    header: "",
    value: "",
    keep: "time",
    minutes: "10080",
  },
  {
    name: "Styles and scripts",
    paths: "*.css\n*.js",
    header: "",
    value: "",
    keep: "time",
    minutes: "1440",
  },
  {
    name: "API",
    paths: "/api/",
    header: "",
    value: "",
    keep: "never",
    minutes: "",
  },
  {
    name: "Tagged by the app",
    paths: "",
    header: "Cache-Tag",
    value: "",
    keep: "",
    minutes: "",
  },
]

const blankRule: Omit<CacheGroupDraft, "key"> = {
  name: "",
  paths: "",
  header: "",
  value: "",
  keep: "time",
  minutes: "60",
}

const addLines = (text: string, more: string[]) => {
  const have = text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return [...have, ...more.filter((m) => !have.includes(m))].join("\n")
}

export function CacheTab({
  proxy: p,
  host,
  draft,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  host?: ProxyHost
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const uses = typeUses(draft.type)
  return (
    <>
      <Card
        title="Browsers"
        hint="Tell visitors' browsers to keep files, so pages come back faster and fewer requests reach the server."
        phone={phone}
      >
        <Field
          label="Keep images, styles, scripts and fonts"
          hint="Empty or 0 = leave it to the app. 7–30 days suits files whose names change with each release."
          error={errors["cache.asset_days"]}
        >
          {(f) => (
            <NumberInput
              {...f}
              value={draft.assetDays}
              onChange={(assetDays) => set({ assetDays })}
              unit="days"
              placeholder="Don't set"
            />
          )}
        </Field>
        <ToggleRow
          id="cache-pages-fresh"
          label="Always check pages again"
          hint="HTML pages are never kept, so visitors see a change at once."
          checked={draft.pagesFresh}
          onChange={(pagesFresh) => set({ pagesFresh })}
        />
      </Card>
      {uses.proxyCache && (
        <ProxyCacheCard
          proxy={p}
          host={host}
          draft={draft}
          set={set}
          errors={errors}
          phone={phone}
        />
      )}
      {uses.proxyCache && (
        <AlwaysOnlineCard
          proxy={p}
          host={host}
          draft={draft}
          set={set}
          errors={errors}
          phone={phone}
        />
      )}
      {uses.proxyCache && draft.cache && (
        <VaryCard draft={draft} set={set} errors={errors} phone={phone} />
      )}
      {uses.proxyCache && draft.cache && (
        <RulesCard
          proxy={p}
          host={host}
          draft={draft}
          set={set}
          errors={errors}
          phone={phone}
        />
      )}
    </>
  )
}

function ProxyCacheCard({
  proxy: p,
  host,
  draft,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  host?: ProxyHost
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const kept = useKept(p, host)
  return (
    <Card
      title="Proxy cache"
      hint={`${p.kind_label} keeps the app's answers on its own disk and hands them out again, so a busy page doesn't ask the app every time.`}
      phone={phone}
      action={
        kept.operator && <PurgeButton proxy={p} host={host} kept={kept} />
      }
    >
      {kept.operator && (
        <CacheStats host={host} kept={kept} turning={draft.cache} />
      )}
      <ToggleRow
        id="cache-enabled"
        label="Keep the app's answers"
        hint="Only plain GET and HEAD answers. Signed-in requests and answers that set a cookie are never kept."
        checked={draft.cache}
        onChange={(cache) =>
          set(cache ? { cache, noBuffering: false } : { cache })
        }
      />
      <FieldError text={errors["cache.enabled"]} />
      {draft.cache && (
        <>
          {draft.noBuffering && (
            <Callout icon={<TriangleAlert />} tone="warning">
              Turning this on turns off "Pass answers straight through" in
              Advanced; the two can't work together.
            </Callout>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Keep each answer for"
              hint="Empty = 10 minutes. Longer means fewer trips to the app but older pages."
              error={errors["cache.minutes"]}
            >
              {(f) => (
                <NumberInput
                  {...f}
                  value={draft.cacheMinutes}
                  onChange={(cacheMinutes) => set({ cacheMinutes })}
                  unit="minutes"
                  placeholder="10"
                />
              )}
            </Field>
            <Field
              label="Largest size on disk"
              hint="Empty = 1024 MB. The least-used answers go first when full."
              error={errors["cache.max_size_mb"]}
            >
              {(f) => (
                <NumberInput
                  {...f}
                  value={draft.cacheSizeMb}
                  onChange={(cacheSizeMb) => set({ cacheSizeMb })}
                  unit="MB"
                  placeholder="1024"
                />
              )}
            </Field>
          </div>
          <ToggleRow
            id="cache-ignore-upstream"
            label="Ignore the app's own cache headers"
            hint="Keep answers even when the app says not to (Cache-Control, Expires)."
            checked={draft.ignoreUpstream}
            onChange={(ignoreUpstream) => set({ ignoreUpstream })}
          />
          {draft.ignoreUpstream && (
            <Callout icon={<TriangleAlert />} tone="warning">
              Pages made for one person (a cart, an account page) may then be
              shown to others. List them below so they're never kept.
            </Callout>
          )}
          <ToggleRow
            id="cache-status"
            label="Show whether an answer came from the cache"
            hint="Adds X-Cache-Status (HIT, MISS, EXPIRED…) to answers, handy to check it works."
            checked={draft.cacheStatus}
            onChange={(cacheStatus) => set({ cacheStatus })}
          />
          <NeverKeep draft={draft} set={set} errors={errors} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Query string"
              hint={queryHints[draft.cacheQuery]}
              error={
                draft.cacheQuery === "only"
                  ? undefined
                  : errors["cache.query_params"]
              }
            >
              {(f) => (
                <Choice
                  id={f.id}
                  label="Query string"
                  items={queryChoices}
                  value={draft.cacheQuery}
                  onChange={(cacheQuery) => set({ cacheQuery })}
                />
              )}
            </Field>
            {draft.cacheQuery === "only" && (
              <Field
                label="Parameters that count"
                hint="Names, one per line, like page or id."
                error={errors["cache.query_params"]}
              >
                {(f) => (
                  <ListInput
                    {...f}
                    value={draft.cacheParams}
                    onChange={(cacheParams) => set({ cacheParams })}
                    placeholder={"page\nid"}
                  />
                )}
              </Field>
            )}
          </div>
          {host && keyChanged(host, draft) && (
            <Callout icon={<Info />}>
              Answers kept so far aren't used after this change; the cache fills
              again as visitors come.
            </Callout>
          )}
          <Callout icon={<Info />}>
            Kept answers live in /var/cache/morcheh-nginx on the proxy's server.
            Clear the cache after a release if pages look old.
          </Callout>
        </>
      )}
    </Card>
  )
}

const onlineModes: {
  value: OnlineMode
  label: string
  hint: string
  tag?: string
}[] = [
  {
    value: "",
    label: "Off",
    hint: "Visitors get an error page while the app is down.",
  },
  {
    value: "backup",
    label: "Backup only",
    tag: "Recommended",
    hint: "Every visit still goes to the app. Its last good answer is kept, and handed out only when the app fails.",
  },
  {
    value: "fast",
    label: "Fast, with backup",
    hint: "Visitors get the copy at once while it's refreshed in the background, so a page can be one visit old. Fewer trips to the app.",
  },
  {
    value: "copies",
    label: "Copies only",
    hint: "For maintenance: the app isn't asked at all. Pages without a copy show an error.",
  },
]

const statusLabels: Record<number, string> = {
  500: "Server error",
  502: "Bad gateway",
  503: "Unavailable",
  504: "Gateway timeout",
  429: "Too many requests",
}

// Always online: the last good copy of each page is handed out while the
// app is down or failing, and replaced in the background once it works.
// Works with or without the proxy cache.
// The slow-page limit only matters below the site's own timeout (60 s when
// unset); pages only, so POSTs and signed-in requests still wait.
function slowHint(slow: string, timeout: string) {
  const s = Number(slow)
  const site = Number(timeout) || 60
  if (s > 0 && s >= site)
    return `Has no effect: Wait for the app in Limits is ${site} seconds.`
  return "Pages (GET) only; a page with no copy gets an error then. Forms, uploads, WebSockets and signed-in requests still wait. Empty = off."
}

function AlwaysOnlineCard({
  proxy: p,
  host,
  draft,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  host?: ProxyHost
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const can = useProxyCan()
  const operator = can(p, "operator")
  const saved = host?.config.cache
  const savedOn = !!saved?.enabled || !!saved?.always_online?.mode
  const copies = useKeptCopies(p, host, operator && savedOn)
  const [listOpen, setListOpen] = useOpen("proxy-kept-pages")
  const mode = draft.onlineMode
  const statusError = Object.entries(errors).find(([k]) =>
    k.startsWith("cache.always_online.statuses"),
  )?.[1]
  const pick = (next: OnlineMode) => {
    if (next === mode) return
    if (!next) set({ onlineMode: "" })
    else if (!mode)
      set({ ...onlineStart(), onlineMode: next, noBuffering: false })
    else set({ onlineMode: next })
  }
  const toggleStatus = (code: number) =>
    set({
      onlineStatuses: draft.onlineStatuses.includes(code)
        ? draft.onlineStatuses.filter((c) => c !== code)
        : [...draft.onlineStatuses, code],
    })

  const r = copies.data
  const note = !host
    ? "Listed once the site is saved."
    : !savedOn
      ? mode
        ? "Copies start once you save."
        : "Nothing is kept."
      : r && !r.ok
        ? "Couldn't read the copies."
        : copies.error
          ? "Couldn't read the copies."
          : undefined
  const counting = savedOn && copies.isPending
  const value = (v: string) => (counting ? "–" : v)

  return (
    <Card
      title="Always online"
      hint="When the app is down, visitors get the last good copy of each page instead of an error. Once it works again, copies are brought up to date in the background."
      phone={phone}
      action={
        operator && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 md:h-8"
            disabled={!host || !savedOn}
            title={
              !host
                ? "Save the site first"
                : !savedOn
                  ? "Nothing is kept"
                  : undefined
            }
            onClick={() => setListOpen(true)}
          >
            <List />
            Pages with a copy
          </Button>
        )
      }
    >
      {operator && (
        <div className="flex items-center gap-6 rounded-xl border border-border px-4 py-3">
          <Stat
            label="Pages with a copy"
            value={value((savedOn && r?.ok ? r.total : 0).toLocaleString())}
          />
          <Stat
            label="On disk"
            value={value(formatSize(savedOn && r?.ok ? r.bytes : 0))}
          />
          <div className="ms-auto flex min-w-0 items-center gap-2">
            {note && (
              <p className="text-end text-caption text-muted-foreground">
                {note}
              </p>
            )}
            {host && savedOn && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 md:size-8"
                aria-label="Read again"
                title="Read again"
                disabled={copies.isFetching}
                onClick={() => copies.refetch()}
              >
                <RefreshCw
                  className={cn(copies.isFetching && "animate-spin")}
                />
              </Button>
            )}
          </div>
        </div>
      )}
      {!mode && draft.noBuffering && (
        <Callout icon={<Info />}>
          Turning this on turns off "Pass answers straight through" in Advanced;
          the two can't work together.
        </Callout>
      )}
      <div
        role="radiogroup"
        aria-label="Always online"
        className="flex flex-col overflow-hidden rounded-xl border border-border"
      >
        {onlineModes.map((m) => {
          const on = mode === m.value
          return (
            // biome-ignore lint/a11y/useSemanticElements: row options; radio inputs can't be styled as rows
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(m.value)}
              className={cn(
                "flex min-h-14 items-start gap-3 border-b border-border px-3 py-2.5 text-start outline-none last:border-b-0 focus-visible:bg-subtle",
                on ? "bg-brand-soft/40" : "hover:bg-subtle active:bg-muted",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  on
                    ? "border-brand bg-brand text-primary-foreground"
                    : "border-mist",
                )}
              >
                {on && <Check className="size-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-body-sm font-medium">
                  {m.label}
                  {m.tag && (
                    <span className="rounded-full bg-brand-soft px-2 text-caption font-normal text-brand-strong">
                      {m.tag}
                    </span>
                  )}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {m.hint}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <FieldError text={errors["cache.always_online.mode"]} />
      {mode && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Keep each copy for"
              hint="A copy no one asks for is dropped after this. Empty = 7 days, up to 365."
              error={errors["cache.always_online.keep_days"]}
            >
              {(f) => (
                <NumberInput
                  {...f}
                  value={draft.onlineDays}
                  onChange={(onlineDays) => set({ onlineDays })}
                  unit="days"
                  placeholder="7"
                />
              )}
            </Field>
            {mode !== "copies" && (
              <Field
                label="Wait for the app"
                hint="How long to try reaching it before the copy is used. Empty = 5 seconds."
                error={errors["cache.always_online.wait_seconds"]}
              >
                {(f) => (
                  <NumberInput
                    {...f}
                    value={draft.onlineWait}
                    onChange={(onlineWait) => set({ onlineWait })}
                    unit="seconds"
                    placeholder="5"
                  />
                )}
              </Field>
            )}
            {mode !== "copies" && (
              <Field
                label="Use the copy if the app is slower than"
                hint={slowHint(draft.onlineSlow, draft.timeout)}
                error={errors["cache.always_online.slow_seconds"]}
              >
                {(f) => (
                  <NumberInput
                    {...f}
                    value={draft.onlineSlow}
                    onChange={(onlineSlow) => set({ onlineSlow })}
                    unit="seconds"
                    placeholder="Off"
                  />
                )}
              </Field>
            )}
          </div>
          {mode !== "copies" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body-sm font-medium">
                Also count as down
              </legend>
              <div className="flex flex-wrap gap-2">
                {onlineStatuses.map((code) => {
                  const on = draft.onlineStatuses.includes(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleStatus(code)}
                      className={cn(
                        "flex h-11 items-center gap-1.5 rounded-full border px-3 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
                        on
                          ? "border-brand bg-brand-soft/40 text-foreground"
                          : "border-border text-muted-foreground hover:bg-subtle",
                      )}
                    >
                      {on && <Check className="size-3.5 text-brand" />}
                      <span className="font-medium tabular-nums">{code}</span>
                      <span>{statusLabels[code]}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-caption text-muted-foreground">
                No answer at all, a refused connection or a timeout always
                counts. Ticked codes from the app count too.
              </p>
              <FieldError text={statusError} />
            </fieldset>
          )}
          {draft.cache ? (
            <Callout icon={<Info />}>
              With the proxy cache on, its own lists and times decide what is
              kept; its copies are handed out while the app is down, even after
              they expire.
            </Callout>
          ) : (
            <>
              <NeverKeep draft={draft} set={set} errors={errors} />
              <ToggleRow
                id="online-keep-private"
                label="Keep pages the app marks private"
                hint="Copies are made even when the app sends Cache-Control: private or no-store."
                checked={draft.onlinePrivate}
                onChange={(onlinePrivate) => set({ onlinePrivate })}
              />
              {draft.onlinePrivate && (
                <Callout icon={<TriangleAlert />} tone="warning">
                  A page made for one person (an account page, a cart) may then
                  be shown to others while the app is down. List the sign-in
                  cookies above so those visitors are never served a copy.
                </Callout>
              )}
            </>
          )}
          {mode === "copies" ? (
            <Callout icon={<TriangleAlert />} tone="warning">
              The app gets no visits at all while this is on: pages without a
              copy fail, and nothing new is kept. Switch back once the work is
              done.
            </Callout>
          ) : (
            <Callout icon={<Info />}>
              Only pages visitors opened while the app worked have a copy.
              Sign-ins, forms and anything sent to the app still fail while it's
              down.
            </Callout>
          )}
        </>
      )}
      {host && (
        <KeptPagesLayer
          proxy={p}
          host={host}
          open={listOpen}
          onOpenChange={setListOpen}
          phone={phone}
        />
      )}
    </Card>
  )
}

// Pages and visitors whose answers are never kept: by the cache, and by
// Always online when the cache is off.
function NeverKeep({
  draft,
  set,
  errors,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-foreground">
          Never keep, for:
        </span>
        {skipPresets.map((s) => (
          <Button
            key={s.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-9 md:h-8"
            onClick={() =>
              set({
                skipPaths: addLines(draft.skipPaths, s.paths),
                skipCookies: addLines(draft.skipCookies, s.cookies),
              })
            }
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Never keep these paths"
          hint="One per line. /admin covers /admin and everything under it."
          error={errors["cache.skip_paths"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={draft.skipPaths}
              onChange={(skipPaths) => set({ skipPaths })}
              placeholder={"/admin\n/cart"}
            />
          )}
        </Field>
        <Field
          label="Never keep for visitors with these cookies"
          hint="Cookie names, one per line: signed-in visitors always reach the app."
          error={errors["cache.skip_cookies"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={draft.skipCookies}
              onChange={(skipCookies) => set({ skipCookies })}
              placeholder={"sessionid\nwordpress_logged_in"}
            />
          )}
        </Field>
      </div>
    </>
  )
}

// Whether answers kept so far stop being used: the key (query string or
// the separate copies) changed from the saved site.
function keyChanged(host: ProxyHost, d: Draft) {
  const c = host.config.cache
  const list = (l?: string[]) => (l ?? []).join("\n")
  const tidy = (t: string) =>
    t
      .split(/[\s,]+/)
      .filter(Boolean)
      .join("\n")
  return (
    (c?.query ?? "") !== d.cacheQuery ||
    !!c?.vary_device !== d.varyDevice ||
    !!c?.vary_os !== d.varyOs ||
    !!c?.vary_language !== d.varyLanguage ||
    list(c?.vary_headers) !== tidy(d.varyHeaders).replace(/:(?=\n|$)/g, "") ||
    list(c?.vary_cookies) !== tidy(d.varyCookies)
  )
}

// Separate copies of one address, by the visitor's device, system,
// language, a request header or a cookie.
function VaryCard({
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
  const splits = [
    draft.varyDevice,
    draft.varyOs,
    draft.varyLanguage,
    !!draft.varyHeaders.trim(),
    !!draft.varyCookies.trim(),
  ].filter(Boolean).length
  return (
    <Card
      title="Separate copies"
      hint="Keep a different copy of the same page per kind of visitor, when the app answers them differently."
      count={splits || undefined}
      phone={phone}
    >
      <ToggleRow
        id="cache-vary-device"
        label="By device type"
        hint="Phones, tablets and computers each get their own copy."
        checked={draft.varyDevice}
        onChange={(varyDevice) => set({ varyDevice })}
      />
      <ToggleRow
        id="cache-vary-os"
        label="By operating system"
        hint="Windows, macOS, Linux, Android, iOS, ChromeOS and other."
        checked={draft.varyOs}
        onChange={(varyOs) => set({ varyOs })}
      />
      <ToggleRow
        id="cache-vary-language"
        label="By language"
        hint="The visitor's first browser language, like en or fa."
        checked={draft.varyLanguage}
        onChange={(varyLanguage) => set({ varyLanguage })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="By request headers"
          hint="Up to 3, one per line, like X-Country (set by a CDN)."
          error={errors["cache.vary_headers"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={draft.varyHeaders}
              onChange={(varyHeaders) => set({ varyHeaders })}
              placeholder={"X-Country"}
            />
          )}
        </Field>
        <Field
          label="By cookies"
          hint="Up to 3 cookie names, like lang or currency."
          error={errors["cache.vary_cookies"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={draft.varyCookies}
              onChange={(varyCookies) => set({ varyCookies })}
              placeholder={"lang\ncurrency"}
            />
          )}
        </Field>
      </div>
      {splits > 0 && (
        <Callout icon={<Info />}>
          Each choice multiplies the copies kept, and the app is asked once per
          copy, so pick only what really changes the page.
          {draft.cacheStatus &&
            " Answers carry X-Cache-Variant (like phone,android) to show which copy was used."}
        </Callout>
      )}
    </Card>
  )
}

const units = [
  { value: 1, label: "minutes" },
  { value: 60, label: "hours" },
  { value: 1440, label: "days" },
] as const

type Unit = (typeof units)[number]["value"]

const unitOf = (minutes: string): Unit => {
  const m = Number(minutes) || 0
  return m && m % 1440 === 0 ? 1440 : m && m % 60 === 0 ? 60 : 1
}

// A time in minutes, typed as minutes, hours or days.
function DurationInput({
  id,
  value,
  onChange,
  ...props
}: {
  id?: string
  "aria-invalid"?: true
  "aria-describedby"?: string
  value: string
  onChange: (minutes: string) => void
}) {
  const [unit, setUnit] = useState<Unit>(() => unitOf(value))
  const shown = value === "" ? "" : String((Number(value) || 0) / unit)
  const write = (n: string, u: Unit) =>
    onChange(n.trim() === "" ? "" : String(Math.round(Number(n) * u)))
  return (
    <div className="grid grid-cols-[1fr_8rem] gap-2">
      <Input
        {...props}
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        value={shown}
        onChange={(e) => write(e.target.value, unit)}
        placeholder="60"
        className="tabular-nums"
      />
      <Choice
        label="Unit"
        items={units}
        value={unit}
        onChange={(u) => {
          setUnit(u)
          write(shown, u)
        }}
      />
    </div>
  )
}

const keepChoices: { value: RuleKeep; label: string }[] = [
  { value: "time", label: "For its own time" },
  { value: "never", label: "Never keep" },
  { value: "", label: "As the rest of the site" },
]

// Cache rules: named parts of the site with their own cache time (or never
// kept), each cleared on its own from here or from the Clear cache layer.
function RulesCard({
  proxy: p,
  host,
  draft,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  host?: ProxyHost
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const rules = draft.cacheGroups
  const saved = host?.config.cache?.groups ?? []
  const can = useProxyCan()
  const a = useProxyActions()
  const operator = can(p, "operator")
  const clearable = !!host?.config.cache?.enabled && operator
  const siteTime = minutesText(Number(draft.cacheMinutes) || 10)
  const update = (key: string, patch: Partial<CacheGroupDraft>) =>
    set({
      cacheGroups: rules.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    })
  const add = (g: Omit<CacheGroupDraft, "key">) =>
    set({ cacheGroups: [...rules, { ...g, key: rowKey() }] })
  const move = (from: number, to: number) => {
    const next = [...rules]
    const [g] = next.splice(from, 1)
    next.splice(to, 0, g)
    set({ cacheGroups: next })
  }
  const unused = rulePresets.filter(
    (g) => !rules.some((h) => h.name.trim() === g.name),
  )
  return (
    <Card
      title="Cache rules"
      hint={`Give parts of the site their own cache time, like images for a week and the API never; the rest keeps ${siteTime}. Each rule can be cleared on its own.`}
      count={keptGroups(draft).length || undefined}
      phone={phone}
    >
      {rules.map((g, i) => {
        const e = (f: string) => errors[`cache.groups.${g.key}.${f}`]
        // Only a saved rule with the same addresses can be cleared here.
        const was = saved.find((s) => s.name === g.name.trim())
        const same =
          !!was &&
          (was.paths ?? []).join("\n") ===
            g.paths
              .split(/[\s,]+/)
              .filter(Boolean)
              .join("\n") &&
          (was.header ?? "") === g.header.trim() &&
          (was.value ?? "") === g.value.trim()
        const headerShown = g.keep === "" || !!g.header.trim()
        return (
          <RuleRow
            key={g.key}
            title={g.name.trim() || `Rule ${i + 1}`}
            action={
              <>
                {operator && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 md:h-8"
                    disabled={!(clearable && same && host && was)}
                    title={
                      clearable && same
                        ? undefined
                        : !clearable
                          ? "Nothing is kept while the cache is off"
                          : "Save the site to clear this rule"
                    }
                    onClick={() =>
                      host && was && a.purgeCache(p, host, { group: was.name })
                    }
                  >
                    <Eraser />
                    Clear
                  </Button>
                )}
                {rules.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 md:size-8"
                      aria-label={`Move ${g.name || "rule"} up`}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 md:size-8"
                      aria-label={`Move ${g.name || "rule"} down`}
                      disabled={i === rules.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                  </>
                )}
                <RemoveButton
                  label={`Remove ${g.name || "rule"}`}
                  onClick={() =>
                    set({ cacheGroups: rules.filter((h) => h.key !== g.key) })
                  }
                />
              </>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" error={e("name")}>
                {(f) => (
                  <Input
                    {...f}
                    value={g.name}
                    onChange={(ev) => update(g.key, { name: ev.target.value })}
                    placeholder="Product pages"
                  />
                )}
              </Field>
              <Field
                label="Keep answers"
                error={g.keep === "time" ? undefined : e("minutes")}
              >
                {(f) => (
                  <Choice
                    id={f.id}
                    label="Keep answers"
                    items={keepChoices}
                    value={g.keep}
                    onChange={(keep) =>
                      update(g.key, {
                        keep,
                        minutes: keep === "time" ? g.minutes || "60" : "",
                      })
                    }
                  />
                )}
              </Field>
            </div>
            {g.keep === "time" && (
              <Field
                label="Fresh for"
                hint="Up to 30 days. The app's own Cache-Control still wins unless “Ignore the app's own cache headers” is on."
                error={e("minutes")}
              >
                {(f) => (
                  <DurationInput
                    {...f}
                    value={g.minutes}
                    onChange={(minutes) => update(g.key, { minutes })}
                  />
                )}
              </Field>
            )}
            <Field
              label="Addresses"
              hint={
                g.keep
                  ? "Paths, one per line: /shop covers it and everything under it, * = any characters (*.css)."
                  : "One per line: /shop/ covers everything under it, * = any characters. A domain in front narrows clearing to it."
              }
              error={e("paths")}
            >
              {(f) => (
                <ListInput
                  {...f}
                  value={g.paths}
                  onChange={(paths) => update(g.key, { paths })}
                  placeholder={"/products/\n*.css"}
                />
              )}
            </Field>
            {headerShown && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Or answers with header"
                  hint="For clearing only: answers the app tagged. With addresses too, both must match."
                  error={e("header")}
                >
                  {(f) => (
                    <Input
                      {...f}
                      {...typing}
                      value={g.header}
                      onChange={(ev) =>
                        update(g.key, { header: ev.target.value })
                      }
                      placeholder="Cache-Tag"
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field
                  label="Header value"
                  hint="Or one item of its list. Empty = any."
                  error={e("value")}
                >
                  {(f) => (
                    <Input
                      {...f}
                      {...typing}
                      value={g.value}
                      disabled={!g.header.trim()}
                      onChange={(ev) =>
                        update(g.key, { value: ev.target.value })
                      }
                      placeholder="product"
                      className="font-mono"
                    />
                  )}
                </Field>
              </div>
            )}
          </RuleRow>
        )
      })}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <AddButton onClick={() => add(blankRule)}>Add rule</AddButton>
        {unused.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-muted-foreground">Or:</span>
            {unused.map((g) => (
              <Button
                key={g.name}
                type="button"
                variant="outline"
                size="sm"
                className="h-9 md:h-8"
                onClick={() => add(g)}
              >
                {g.name}
                {g.keep === "time" && ` · ${minutesText(Number(g.minutes))}`}
                {g.keep === "never" && " · never"}
              </Button>
            ))}
          </div>
        )}
      </div>
      {rules.length > 0 && (
        <p className="text-caption text-muted-foreground">
          When an address fits several rules, the first one wins. Rules work on
          the site's main address, not on Routing paths. Save the site, then
          clear a rule here or from the site's menu › Clear cache.
        </p>
      )}
    </Card>
  )
}

function RuleRow({
  title,
  action,
  children,
}: {
  title: string
  action: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-body-sm font-medium">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-1">{action}</div>
      </div>
      {children}
    </div>
  )
}

type Kept = ReturnType<typeof useKept>

// What the saved site keeps now. 0 while nothing is kept or the site isn't
// saved yet, so the numbers and Clear stay where people look for them.
// Counting runs the purge endpoint as a dry run (Operator).
function useKept(p: ReverseProxy, host?: ProxyHost) {
  const can = useProxyCan()
  const operator = can(p, "operator")
  const c = host?.config.cache
  // Always online keeps copies in the same cache, also with it off.
  const on = !!c?.enabled || !!c?.always_online?.mode
  const query = useCacheCount(
    p.id,
    host?.id ?? "",
    {},
    !!host && on && operator,
  )
  const d = on && query.data?.ok ? query.data : undefined
  return {
    operator,
    on,
    query,
    counting: on && query.isPending,
    failed: on && (!!query.error || query.data?.ok === false),
    matched: d?.matched ?? 0,
    bytes: d?.bytes ?? 0,
  }
}

function CacheStats({
  host,
  kept,
  turning,
}: {
  host?: ProxyHost
  kept: Kept
  // The form has the cache on (maybe not saved yet).
  turning: boolean
}) {
  const note = !host
    ? "Counted once the site is saved."
    : !kept.on
      ? turning
        ? "Starts once you save."
        : "The cache is off."
      : kept.failed
        ? "Couldn't look at the cache."
        : undefined
  const value = (v: string) => (kept.counting ? "–" : v)
  return (
    <div className="flex items-center gap-6 rounded-xl border border-border px-4 py-3">
      <Stat label="Kept answers" value={value(kept.matched.toLocaleString())} />
      <Stat label="On disk" value={value(formatSize(kept.bytes))} />
      <div className="ms-auto flex min-w-0 items-center gap-2">
        {note && (
          <p className="text-end text-caption text-muted-foreground">{note}</p>
        )}
        {host && kept.on && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 md:size-8"
            aria-label="Count again"
            title="Count again"
            disabled={kept.query.isFetching}
            onClick={() => kept.query.refetch()}
          >
            <RefreshCw
              className={cn(kept.query.isFetching && "animate-spin")}
            />
          </Button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-subheading font-light tabular-nums",
          value === "0" || value === "0 B" ? "text-ash" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  )
}

// Opens the Clear cache layer for the saved site; there but off while
// nothing is kept. Operators reach it from the site's menu too, since this
// form is read-only for them.
function PurgeButton({
  proxy: p,
  host,
  kept,
}: {
  proxy: ReverseProxy
  host?: ProxyHost
  kept: Kept
}) {
  const a = useProxyActions()
  const ready = !!host && kept.on && (kept.matched > 0 || kept.failed)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 md:h-8"
      disabled={!ready}
      title={
        ready
          ? undefined
          : !host
            ? "Save the site first"
            : !kept.on
              ? "The cache is off"
              : kept.counting
                ? "Counting…"
                : "Nothing is kept yet"
      }
      onClick={() => host && a.purgeCache(p, host)}
    >
      <Eraser />
      Clear cache…
    </Button>
  )
}
