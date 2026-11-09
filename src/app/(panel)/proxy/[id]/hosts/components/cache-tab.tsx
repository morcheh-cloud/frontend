"use client"

import { Eraser, Info, TriangleAlert } from "lucide-react"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import type { ProxyHost, Proxy as ReverseProxy } from "@/lib/services"
import { useProxyCan } from "../../../components/permissions"
import { usePurgeCache } from "../../../components/proxy-actions"
import { type Draft, type Errors, typeUses } from "./draft"
import { EditorCard as Card } from "./editor-card"
import { NumberInput } from "./rate-limit"

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
  return (
    <Card
      title="Proxy cache"
      hint={`${p.kind_label} keeps the app's answers on its own disk and hands them out again, so a busy page doesn't ask the app every time.`}
      phone={phone}
      action={host && <PurgeButton proxy={p} host={host} />}
    >
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
            id="cache-serve-stale"
            label="Serve the last copy when the app is down"
            hint="Visitors keep getting pages while the app restarts or errors, and an old copy is refreshed in the background."
            checked={draft.serveStale}
            onChange={(serveStale) => set({ serveStale })}
          />
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
          <Callout icon={<Info />}>
            Kept answers live in /var/cache/morcheh-nginx on the proxy's server.
            Clear the cache after a release if pages look old.
          </Callout>
        </>
      )}
    </Card>
  )
}

// Empties the saved site's cache now. Operators can do it from the site's
// menu too, since this form is read-only for them.
function PurgeButton({
  proxy: p,
  host,
}: {
  proxy: ReverseProxy
  host: ProxyHost
}) {
  const can = useProxyCan()
  const purge = usePurgeCache()
  if (!host.config.cache?.enabled || !can(p, "operator")) return null
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 md:h-8"
      disabled={purge.pending}
      onClick={() => purge.run(p, host)}
    >
      <Eraser />
      {purge.pending ? "Clearing…" : "Clear cache"}
    </Button>
  )
}
