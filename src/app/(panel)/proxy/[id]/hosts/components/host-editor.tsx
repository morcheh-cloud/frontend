"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowDown,
  ChevronLeft,
  Copy,
  Ellipsis,
  Globe,
  Info,
  Lock,
  PencilLine,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Empty, ItemMenu } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api } from "@/lib/api"
import type { ProxyHost, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { proxyKeys, useInspection, useProxy, useSaveHost } from "../../../api"
import {
  canWrite,
  type HostType,
  holdsDefault,
  hostHref,
  hostName,
  hostTypeMeta,
  hostTypes,
  newHostHref,
  notFoundText,
  proxyHref,
  proxyStatusMeta,
  streamLabel,
} from "../../../components/meta"
import { ActionSheet, Missing, PageLoading } from "../../../components/parts"
import { useProxyCan } from "../../../components/permissions"
import { useHostMenu } from "../../../components/proxy-actions"
import { inspectable } from "../../components/toolbar"
import { AccessEditor } from "./access-editor"
import { FailoverCard, PoolInline } from "./balancing-tab"
import { CacheTab } from "./cache-tab"
import { ConfigTab } from "./config-tab"
import { DomainsEditor, type DomainUse } from "./domains-editor"
import {
  bestCertificate,
  clearErrors,
  type Draft,
  domainList,
  draftFromCopy,
  draftFromHost,
  type Errors,
  freshDraft,
  keptServers,
  problemsToErrors,
  sameDraft,
  toBody,
  toConfig,
  typeUses,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import {
  EditorChips,
  type EditorTab,
  EditorTabBar,
  ProtectionHeaders,
  tabInfo,
  tabOfError,
  tabsFor,
  useEditorTab,
  viewTabs,
} from "./editor-tabs"
import { HardeningCard } from "./hardening-card"
import { HttpsTab } from "./https-tab"
import { ImagesCard } from "./images-card"
import { LoginTab } from "./login-tab"
import { LogsTab } from "./logs-tab"
import { NginxCode } from "./nginx-code"
import { PagesTab } from "./pages-tab"
import { RateLimitEditor } from "./rate-limit"
import { RedirectsTab } from "./redirects-tab"
import { ReportTab } from "./report-tab"
import { HeaderRows, PathRows } from "./rows"
import { SiteTraffic } from "./site-traffic"
import { TemplatePicker } from "./templates"
import {
  MirrorCard,
  PerformanceCard,
  ProxyProtocolCard,
  RealIpCard,
  TracingCard,
} from "./tuning-cards"
import { UpstreamTlsCard } from "./upstream-tls"
import { WafCard } from "./waf-card"
import { WhatItDoes } from "./what-it-does"

// /proxy/[id]/hosts/new and /proxy/[id]/hosts/[host].
export function HostEditorPage() {
  const { id, host: hostId } = useParams<{ id: string; host?: string }>()
  const phone = useIsPhone()
  const query = useProxy(id)
  const detail = query.data
  const host = hostId ? detail?.hosts.find((h) => h.id === hostId) : undefined

  usePageCrumbs(
    detail
      ? [
          { href: proxyHref(id), label: detail.proxy.server_name },
          hostId
            ? {
                href: hostHref(id, hostId),
                label: host ? hostName(host) : "Site",
              }
            : { href: newHostHref(id), label: "New site" },
        ]
      : [],
  )
  useFollowWorkspace(detail?.proxy.workspace_id)

  if (phone === null) return null
  if (!detail) {
    if (query.error) {
      const gone = query.error instanceof ApiError && query.error.status === 404
      return (
        <Missing
          title={gone ? "Proxy not found" : "Couldn't load this proxy"}
          body={
            gone
              ? "It was removed, or you don't have access to it."
              : query.error.message
          }
          href="/proxy"
          label="All proxies"
          onRetry={gone ? undefined : () => query.refetch()}
        />
      )
    }
    return <PageLoading />
  }
  if (hostId && !host) {
    return (
      <Missing
        title="Site not found"
        body="It was removed from this proxy."
        href={proxyHref(id)}
        label="All sites"
      />
    )
  }
  return (
    <Editor
      key={host?.id ?? "new"}
      proxy={detail.proxy}
      host={host}
      others={detail.hosts.filter((h) => h.id !== host?.id)}
      phone={phone}
    />
  )
}

function Editor({
  proxy: p,
  host,
  others,
  phone,
}: {
  proxy: ReverseProxy
  host: ProxyHost | undefined
  // The proxy's other sites, to warn about a name both would answer.
  others: ProxyHost[]
  phone: boolean
}) {
  const can = useProxyCan()
  const router = useRouter()
  const qc = useQueryClient()
  const back = useBack(proxyHref(p.id))
  const hostMenu = useHostMenu()
  const caps = p.capabilities
  const types = hostTypes.filter((t) => caps.types.includes(t.value))
  const inspection = useInspection(p.id, inspectable(p))
  const certs = inspection.data?.certificates ?? []
  const handSites = (inspection.data?.sites ?? []).filter((x) => !x.managed)
  const usedElsewhere = (d: string): DomainUse | undefined => {
    const h = others.find((x) => x.domains.includes(d))
    if (h) return { label: hostName(h), where: "another site on this proxy" }
    const site = handSites.find((x) => x.domains.includes(d))
    if (site) {
      return {
        label: "a site written on the server",
        where: `${site.file}:${site.line}`,
      }
    }
  }
  // A hand-written site that answers every other name now: saving a
  // catch-all site takes that over from it.
  const defaultSite = handSites.find(holdsDefault)
  // New sites start as the kind the list's tab was showing, or as a copy
  // of another site (?from=).
  const params = useSearchParams()
  const asked = params.get("type")
  const from = params.get("from")
  const source = host ? undefined : others.find((x) => x.id === from)
  const startType =
    types.find((t) => t.value === asked)?.value ?? types[0]?.value

  const [draft, setDraft] = useState<Draft>(() =>
    host
      ? draftFromHost(host)
      : source
        ? draftFromCopy(source)
        : freshDraft(startType),
  )
  const [revision, setRevision] = useState(host?.updated_at)
  const [errors, setErrors] = useState<Errors>({})
  const [refusal, setRefusal] = useState("")
  const [touched, setTouched] = useState(!!source)
  const [template, setTemplate] = useState("")
  const tabs = tabsFor(draft.type, caps, !!host)
  const { tab, setTab } = useEditorTab(tabs)
  const [conflict, setConflict] = useOpen("proxy-host-conflict")
  const [menuOpen, setMenuOpen] = useOpen("proxy-host-sheet")
  const save = useSaveHost()

  const config = useMemo(() => toConfig(draft), [draft])
  const uses = typeUses(draft.type)
  const stream = draft.type === "stream"
  const done = () => router.replace(proxyHref(p.id))
  const dirty = host ? !sameDraft(draft, draftFromHost(host)) : touched
  const readOnly =
    !can(p, "engineer") || !canWrite(p) || !!host?.redacted || save.isPending
  const why = !can(p, "engineer")
    ? "You can look, but changing sites needs Engineer access on this server."
    : !canWrite(p)
      ? `${p.kind_label} can't take changes right now (${proxyStatusMeta[p.status].label.toLowerCase()}). Fix that on the proxy's page first.`
      : ""

  // Don't lose a half-made site to a closed tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setRefusal("")
    setDraft((d) => ({ ...d, ...patch }))
    setErrors((e) => clearErrors(e, patch))
  }

  // Turning https on fills in a certificate the server already has for
  // these names, when there is one.
  const setTls = (on: boolean) => {
    if (on && !draft.certificate && !draft.key) {
      const c = bestCertificate(certs, domainList(draft.domains))
      if (c) return set({ tls: true, certificate: c.certificate, key: c.key })
    }
    set({ tls: on })
  }

  // Stay on this tab when it has a refused field, else go to the first
  // tab that does.
  function showProblem(keys: string[]) {
    const wrong = new Set<EditorTab>(keys.map(tabOfError))
    if (wrong.has(tab)) return
    const first = tabs.find((t) => wrong.has(t))
    if (first) {
      setTab(first)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function submit(opts?: { overwrite?: boolean }) {
    const body = toBody(draft)
    const catchAll = draft.type === "notfound" && draft.catchAll
    if (uses.domains && !catchAll && body.config.domains.length === 0) {
      setErrors({ domains: "Add at least one domain" })
      setTab("general")
      toast.error("Add at least one domain")
      return
    }
    save.mutate(
      {
        id: p.id,
        host: host?.id,
        body: {
          ...body,
          revision: host && !opts?.overwrite ? revision : undefined,
        },
      },
      {
        // Saving keeps the editor open: an existing site takes the saved
        // copy (and its new revision), a new one moves to its own page on
        // the same tab.
        onSuccess: (d) => {
          setTouched(false)
          setErrors({})
          setRefusal("")
          if (host) {
            const saved = d.hosts.find((h) => h.id === host.id)
            if (saved) {
              setRevision(saved.updated_at)
              setDraft(draftFromHost(saved))
            }
            toast.success("Saved and loaded")
            return
          }
          toast.success(
            `${hostName({ config: body.config, domains: body.config.domains })} is live`,
          )
          const created = d.hosts.find(
            (h) => !others.some((o) => o.id === h.id),
          )
          if (created) router.replace(hostHref(p.id, created.id, tab))
          else done()
        },
        onError: (err) => {
          if (
            err instanceof ApiError &&
            err.status === 409 &&
            host &&
            err.message.startsWith("Someone else")
          ) {
            setConflict(true)
            return
          }
          const details =
            err instanceof ApiError ? (err.body?.errors ?? []) : []
          const mapped = problemsToErrors(details, draft)
          if (Object.keys(mapped).length > 0) {
            setErrors(mapped)
            showProblem(Object.keys(mapped))
            toast.error(Object.values(mapped)[0])
            return
          }
          setRefusal(err.message)
          toast.error("Not saved")
          window.scrollTo({ top: 0, behavior: "smooth" })
        },
      },
    )
  }

  // Writes the saved site again as it is, so nginx switches it to the
  // detailed log format (response times, domain, cache).
  const canRewrite =
    !!host && can(p, "engineer") && canWrite(p) && !host.redacted && !dirty
  function rewrite() {
    if (!host) return
    save.mutate(
      {
        id: p.id,
        host: host.id,
        body: {
          config: host.config,
          enabled: host.enabled,
          note: host.note,
          revision,
        },
      },
      {
        onSuccess: (d) => {
          setRevision(d.hosts.find((h) => h.id === host.id)?.updated_at)
          toast.success("Written again: new lines carry the details")
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.error("Someone else saved this site: reload the page first")
            return
          }
          toast.error(err.message)
        },
      },
    )
  }
  const operator = can(p, "operator")
  const viewing = viewTabs.includes(tab)
  const needOperator = (
    <Empty
      icon={Lock}
      title="You need Operator access"
      body="The site's log and report are open to people with Operator access (or more) on this server."
    />
  )

  function loadTheirs() {
    setConflict(false)
    if (!host) return
    api.reverseProxy.getProxy(p.id).then(
      (d) => {
        qc.setQueryData(proxyKeys.proxy(p.id), d)
        const h = d.hosts.find((x) => x.id === host.id)
        if (!h) return
        setDraft(draftFromHost(h))
        setRevision(h.updated_at)
        setErrors({})
        setRefusal("")
      },
      (err: Error) => toast.error(err.message),
    )
  }

  if (!host && why) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Globe}
          title="You can't add a site here"
          body={why}
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href={proxyHref(p.id)} />}
              nativeButton={false}
            >
              Back
            </Button>
          }
        />
      </div>
    )
  }

  const title = host ? hostName(host) : stream ? "New stream" : "New site"
  const siteMenu = host
    ? hostMenu(p, host, {
        onDeleted: () => router.replace(proxyHref(p.id)),
      }).map((g) => g.filter((i) => i.key !== "edit" && i.key !== "toggle"))
    : []
  const notices = (
    <>
      {why && <Callout icon={<Info />}>{why}</Callout>}
      {source && !why && (
        <Callout icon={<Copy />}>
          A copy of {hostName(source)}. Add its own domains
          {source.config.tls?.enabled ? " and certificate" : ""}
          {source.config.auth?.users?.length
            ? ", and type the accounts' passwords again"
            : ""}
          .
        </Callout>
      )}
      {host?.redacted && !why && (
        <Callout icon={<Info />}>
          Header values and raw directives are hidden from you.
        </Callout>
      )}
      {draft.custom.trim() && tab !== "config" && (
        <Callout icon={<PencilLine />} tone="warning">
          The config is written by hand, so these settings don't change the file
          on the server.{" "}
          <button
            type="button"
            onClick={() => setTab("config")}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open Config
          </button>
        </Callout>
      )}
      {refusal && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-body-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Not saved: nothing changed</p>
            <pre className="mt-1 max-h-48 overflow-auto font-mono text-caption whitespace-pre-wrap text-muted-foreground">
              {refusal}
            </pre>
          </div>
        </div>
      )}
    </>
  )

  // One tab's cards at a time; the tab bar says which tabs have something
  // set or a problem.
  const tuning = {
    proxy: p,
    draft,
    set,
    errors,
    phone,
    inspection: inspection.data,
  }
  const openTab = (t: EditorTab) => {
    setTab(t)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const sections: Record<EditorTab, ReactNode> = {
    report:
      host && operator ? (
        <ReportTab
          proxy={p}
          host={host}
          phone={phone}
          rewrite={canRewrite ? rewrite : undefined}
          rewriting={save.isPending}
        />
      ) : (
        needOperator
      ),
    logs:
      host && operator ? (
        <LogsTab
          proxy={p}
          host={host}
          phone={phone}
          rewrite={canRewrite ? rewrite : undefined}
          rewriting={save.isPending}
        />
      ) : (
        needOperator
      ),
    general: (
      <div
        className={cn(
          "flex min-w-0 flex-col",
          !phone &&
            "gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start",
        )}
      >
        <div className={cn("flex min-w-0 flex-col", !phone && "gap-6")}>
          {uses.domains && (
            <Card
              title="Domains"
              hint="The names visitors type to reach this site. The first one is its main name."
              count={domainList(draft.domains).length}
              phone={phone}
            >
              <DomainsEditor
                value={draft.domains}
                onChange={(domains) => set({ domains })}
                certs={certs}
                usedElsewhere={usedElsewhere}
                serverHost={p.server_host}
                error={errors.domains}
                readOnly={readOnly}
                phone={phone}
              />
            </Card>
          )}

          <Card
            title={stream ? "The port" : "What it does"}
            hint={
              stream
                ? "A port on the proxy's server, passed on to another address."
                : "What happens to a visitor, and where they end up."
            }
            phone={phone}
          >
            {!host && !source && !readOnly && draft.type === "proxy" && (
              <TemplatePicker
                draft={draft}
                set={set}
                picked={template}
                onPick={setTemplate}
              />
            )}
            <WhatItDoes
              draft={draft}
              set={set}
              errors={errors}
              proxy={p}
              readOnly={readOnly}
              phone={phone}
              pool={
                caps.balancing &&
                uses.balance && (
                  <PoolInline
                    proxy={p}
                    draft={draft}
                    set={set}
                    errors={errors}
                    readOnly={readOnly}
                  />
                )
              }
              defaultTaken={
                defaultSite
                  ? `${defaultSite.file}:${defaultSite.line}`
                  : undefined
              }
            />
          </Card>
          {caps.balancing && uses.balance && draft.poolServers.length > 0 && (
            <FailoverCard
              proxy={p}
              draft={draft}
              set={set}
              errors={errors}
              phone={phone}
            />
          )}
          <UpstreamTlsCard {...tuning} />
        </div>

        <div className={cn("flex min-w-0 flex-col", !phone && "gap-6")}>
          <Card title="State" phone={phone}>
            <ToggleRow
              id="host-enabled"
              label={draft.enabled ? "On" : "Off"}
              hint={
                draft.enabled
                  ? "Live on the server once saved."
                  : "Kept here but taken off the server."
              }
              checked={draft.enabled}
              onChange={(enabled) => set({ enabled })}
            />
            <Field label="Note" hint="Optional: what it is, who it's for.">
              {(f) => (
                <Textarea
                  {...f}
                  value={draft.note}
                  onChange={(e) => set({ note: e.target.value })}
                  maxLength={2000}
                  rows={3}
                />
              )}
            </Field>
          </Card>
          {host && <SiteTraffic proxy={p} host={host} phone={phone} />}
          <Card title="Route" phone={phone}>
            <Route
              draft={draft}
              proxy={p}
              onTab={openTab}
              https={tabs.includes("https")}
            />
          </Card>
        </div>
      </div>
    ),
    https: uses.tls ? (
      <HttpsTab
        proxy={p}
        draft={draft}
        set={set}
        setTls={setTls}
        errors={errors}
        certs={certs}
        inspection={inspection.data}
        phone={phone}
      />
    ) : null,
    security: (
      <>
        <AccessEditor
          proxy={p}
          draft={draft}
          set={set}
          errors={errors}
          phone={phone}
        />
        <WafCard {...tuning} host={host} />
        {caps.hardening && (
          <HardeningCard
            draft={draft}
            set={set}
            errors={errors}
            phone={phone}
          />
        )}
        {caps.headers && uses.headers && (
          <Card
            title="Browser protections"
            hint="Common safety headers sent with every answer. Each one is an ordinary row in Routing › Headers, where you can change its value."
            phone={phone}
          >
            <ProtectionHeaders
              draft={draft}
              set={set}
              hidden={host?.redacted}
            />
          </Card>
        )}
        {caps.tuning && uses.hideVersion && (
          <Card title="Server details" phone={phone}>
            <ToggleRow
              id="tune-hide-version"
              label={`Hide the ${p.kind_label} version`}
              hint="Error pages and the Server header stop naming the exact version, so scanners can't match it against known holes."
              checked={draft.hideVersion}
              onChange={(hideVersion) => set({ hideVersion })}
            />
          </Card>
        )}
      </>
    ),
    cache: (
      <CacheTab
        proxy={p}
        host={host}
        draft={draft}
        set={set}
        errors={errors}
        phone={phone}
      />
    ),
    ratelimit: (
      <RateLimitEditor
        proxy={p}
        draft={draft}
        set={set}
        errors={errors}
        phone={phone}
      />
    ),
    login: (
      <LoginTab
        proxy={p}
        draft={draft}
        set={set}
        errors={errors}
        phone={phone}
        inspection={inspection.data}
      />
    ),
    redirects: (
      <RedirectsTab
        proxy={p}
        host={host}
        geo={inspection.data?.geo}
        draft={draft}
        set={set}
        errors={errors}
        phone={phone}
        readOnly={readOnly}
      />
    ),
    pages: (
      <PagesTab
        proxy={p}
        draft={draft}
        set={set}
        errors={errors}
        phone={phone}
      />
    ),
    routing: (
      <>
        {caps.paths && uses.paths && (
          <Card
            title="Paths"
            hint={
              caps.path_actions
                ? "Rules for part of the site: send it to another app, redirect it, serve files, block it or answer it directly. The most exact match wins."
                : "Send a path and everything under it to another app, like /api to a backend."
            }
            count={draft.paths.length}
            phone={phone}
          >
            <PathRows
              rows={draft.paths}
              onChange={(paths) => set({ paths })}
              errors={errors}
              websockets={caps.websockets}
              actions={caps.path_actions}
              login={
                draft.authMode && caps.auth && uses.auth
                  ? draft.authOnlyPaths
                    ? "paths"
                    : "site"
                  : ""
              }
              access={caps.allow}
            />
          </Card>
        )}
        {caps.headers && uses.headers && (
          <Card
            title="Headers"
            hint="Added to what visitors get back or to what the app receives, or removed from the app's answer."
            count={draft.headers.length}
            phone={phone}
          >
            <HeaderRows
              rows={draft.headers}
              onChange={(headers) => set({ headers })}
              errors={errors}
              hidden={host?.redacted}
              canHide={draft.type === "proxy"}
            />
          </Card>
        )}
      </>
    ),
    advanced: (
      <>
        {caps.tuning && (
          <>
            <PerformanceCard {...tuning} />
            <RealIpCard {...tuning} />
            <ProxyProtocolCard {...tuning} />
            <TracingCard {...tuning} />
          </>
        )}
        <MirrorCard {...tuning} />
        <ImagesCard {...tuning} />
        {(uses.maxBody ||
          uses.timeout ||
          (caps.tuning && uses.connectTimeout)) && (
          <Card title="Limits" phone={phone}>
            <div className="grid gap-4 md:grid-cols-2">
              {uses.maxBody && (
                <Field
                  label="Largest upload (MB)"
                  hint={`Empty = ${p.kind_label}'s default (1 MB on nginx).`}
                  error={errors.max_body_mb}
                >
                  {(f) => (
                    <Input
                      {...f}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100000}
                      value={draft.maxBody}
                      onChange={(e) => set({ maxBody: e.target.value })}
                      placeholder="1"
                      className="tabular-nums"
                    />
                  )}
                </Field>
              )}
              {uses.timeout && (
                <Field
                  label={
                    stream
                      ? "Idle timeout (seconds)"
                      : "Wait for the app (seconds)"
                  }
                  hint={
                    stream
                      ? "Empty = 600. A connection quiet this long is closed."
                      : "Empty = 60. Raise it for slow reports or exports."
                  }
                  error={errors.timeout_seconds}
                >
                  {(f) => (
                    <Input
                      {...f}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={86400}
                      value={draft.timeout}
                      onChange={(e) => set({ timeout: e.target.value })}
                      placeholder={stream ? "600" : "60"}
                      className="tabular-nums"
                    />
                  )}
                </Field>
              )}
              {caps.tuning && uses.connectTimeout && (
                <Field
                  label="Give up connecting after (seconds)"
                  hint="Empty = 60. A few seconds shows an error fast when the app is down, instead of a long wait."
                  error={errors.connect_timeout_seconds}
                >
                  {(f) => (
                    <Input
                      {...f}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={75}
                      value={draft.connectTimeout}
                      onChange={(e) => set({ connectTimeout: e.target.value })}
                      placeholder="60"
                      className="tabular-nums"
                    />
                  )}
                </Field>
              )}
            </div>
          </Card>
        )}
        {caps.advanced && (
          <Card
            title="Raw directives"
            hint={`Added as they are inside this ${stream ? "stream" : "site"}'s block. The whole config is tested before it's loaded, so a mistake can't take ${p.kind_label} down.`}
            phone={phone}
          >
            {host?.redacted ? (
              <p className="text-body-sm text-muted-foreground">Hidden.</p>
            ) : (
              <>
                <NginxCode
                  value={draft.advanced}
                  onChange={
                    readOnly ? undefined : (advanced) => set({ advanced })
                  }
                  placeholder="# client_body_buffer_size 64k;"
                  label="Raw directives"
                  className="min-h-28"
                />
                <FieldError text={errors.advanced} />
              </>
            )}
          </Card>
        )}
      </>
    ),
    config: (
      <ConfigTab
        proxy={p}
        host={host}
        draft={draft}
        config={config}
        set={set}
        errors={errors}
        onProblems={(mapped) => {
          setErrors(mapped)
          showProblem(Object.keys(mapped))
        }}
        readOnly={readOnly}
        phone={phone}
      />
    ),
  }

  const infos = tabInfo(tabs, draft, errors)
  const showNotices =
    !viewing &&
    ((!!source && !why) ||
      !!why ||
      !!refusal ||
      !!host?.redacted ||
      (!!draft.custom.trim() && tab !== "config"))
  const form = viewing ? (
    sections[tab]
  ) : (
    <fieldset
      disabled={readOnly}
      className={cn("flex min-w-0 flex-col", phone ? "" : "gap-6")}
    >
      {sections[tab]}
    </fieldset>
  )

  const conflictDialog = (
    <ResponsiveDialog
      open={conflict}
      onOpenChange={setConflict}
      title="Someone else saved this site"
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={loadTheirs}
          >
            Load theirs
          </Button>
          <Button
            variant="destructive"
            className="h-11 md:h-9"
            onClick={() => {
              setConflict(false)
              submit({ overwrite: true })
            }}
          >
            Overwrite
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-muted-foreground">
        It changed after you opened it. Load their version (your changes go), or
        save yours over it.
      </p>
    </ResponsiveDialog>
  )

  const canSave = !why && !host?.redacted && (!host || dirty)
  const saveLabel = save.isPending
    ? "Saving…"
    : host
      ? "Save"
      : stream
        ? "Add stream"
        : "Add site"
  const status = dirty
    ? "Unsaved changes"
    : host
      ? `Saved ${timeAgo(host.updated_at).toLowerCase()}${host.updated_by_name ? ` by ${host.updated_by_name}` : ""}`
      : ""

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-body font-medium">{title}</h1>
            {status && (
              <p className="truncate text-caption text-ash">{status}</p>
            )}
          </div>
          {host && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Site actions"
              onClick={() => setMenuOpen(true)}
            >
              <Ellipsis className="size-5" />
            </Button>
          )}
          {!why && !host?.redacted && (
            <Button
              variant="ghost"
              className="h-11 px-3 text-brand"
              disabled={save.isPending || !canSave}
              onClick={() => submit()}
            >
              {saveLabel}
            </Button>
          )}
        </header>
        {tabs.length > 1 && (
          <EditorChips tabs={infos} current={tab} onChange={setTab} />
        )}
        {showNotices && (
          <div className="flex flex-col gap-3 px-4 pt-4">{notices}</div>
        )}
        {form}
        <div className="pb-[calc(1.5rem+env(safe-area-inset-bottom))]" />
        {host && (
          <ActionSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            title={title}
            groups={siteMenu}
          />
        )}
        {conflictDialog}
      </div>
    )
  }

  const TypeIcon = hostTypeMeta[draft.type].icon
  const heading = stream
    ? draft.listenPort
      ? streamLabel({
          protocol: draft.protocol,
          listen_port: Number(draft.listenPort),
        })
      : title
    : (domainList(draft.domains)[0] ?? title)
  const extra = stream ? 0 : domainList(draft.domains).length - 1

  return (
    <div className="flex flex-col pb-12">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <TypeIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-baseline gap-2 text-subheading font-medium">
            <span className="truncate">{heading}</span>
            {extra > 0 && (
              <span className="shrink-0 text-body-sm font-normal text-muted-foreground">
                +{extra} more
              </span>
            )}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="text-foreground">
              {hostTypeMeta[draft.type].label}
            </span>
            {host && !draft.enabled && <span>Off</span>}
            <span>
              on{" "}
              <Link
                href={proxyHref(p.id)}
                className="hover:text-brand hover:underline"
              >
                {p.server_name}
              </Link>{" "}
              ({p.kind_label})
            </span>
            {host && !dirty && status && (
              <span className="text-caption text-ash">{status}</span>
            )}
          </p>
        </div>
        {host && siteMenu.some((g) => g.length > 0) && (
          <ItemMenu
            groups={siteMenu}
            label="Site actions"
            trigger={
              <Button variant="outline" size="icon" aria-label="Site actions">
                <Ellipsis />
              </Button>
            }
          />
        )}
      </div>
      <EditorTabBar
        tabs={infos}
        current={tab}
        onChange={setTab}
        end={
          <>
            {dirty && (
              <span className="text-caption text-ash">Unsaved changes</span>
            )}
            <Button
              variant="outline"
              className="h-9"
              render={<Link href={proxyHref(p.id)} />}
              nativeButton={false}
            >
              {why || host?.redacted ? "Back" : "Cancel"}
            </Button>
            {!why && !host?.redacted && (
              <Button
                className="h-9"
                disabled={save.isPending || !canSave}
                onClick={() => submit()}
              >
                {saveLabel}
              </Button>
            )}
          </>
        }
      />
      {showNotices && (
        <div className="flex max-w-3xl flex-col gap-3 px-6 pt-5">{notices}</div>
      )}
      <div className="px-6 pt-5">{form}</div>
      {conflictDialog}
    </div>
  )
}

// How a visit travels, in order: the address visitors use, the proxy, and
// where it ends up.
function Route({
  draft: d,
  proxy: p,
  https,
  onTab,
}: {
  draft: Draft
  proxy: ReverseProxy
  // The type can be served over https (not a stream).
  https: boolean
  onTab: (tab: EditorTab) => void
}) {
  const domains = domainList(d.domains)
  const scheme = d.tls ? "https" : "http"
  const from =
    d.type === "stream"
      ? d.listenPort
        ? `${p.server_host}:${d.listenPort} (${d.protocol.toUpperCase()})`
        : ""
      : domains[0]
        ? `${scheme}://${domains[0]}`
        : d.type === "notfound" && d.catchAll
          ? "Any other name"
          : ""
  const to: Record<HostType, [string, string]> = {
    proxy: ["Passed on to", d.upstream.trim()],
    redirect: ["Sent to", d.redirectTo.trim()],
    static: ["Files from", d.root.trim()],
    storage: [
      "Files from the bucket",
      d.bucket.trim() ? `${d.bucket.trim()}${d.folder.trim()}` : "",
    ],
    notfound: ["Answered with", notFoundText(d.notFoundCode)],
    stream: ["Forwarded to", d.streamTo.trim()],
  }
  const [toLabel, toValue] = to[d.type]
  const pool = keptServers(d).length
  const steps: { label: string; value: string; more?: string }[] = [
    {
      label: d.type === "stream" ? "Clients connect to" : "Visitors open",
      value: from,
      more:
        domains.length > 1 && d.type !== "stream"
          ? `+${domains.length - 1} more`
          : undefined,
    },
    { label: p.kind_label, value: `on ${p.server_name}` },
    {
      label: toLabel,
      value: toValue,
      more:
        [
          pool ? `+${pool} more server${pool === 1 ? "" : "s"}` : "",
          d.paths.length
            ? `${d.paths.length} path${d.paths.length === 1 ? "" : "s"} go elsewhere`
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
    },
  ]
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col">
        {steps.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  i === 1 ? "bg-mist" : "bg-brand",
                )}
              />
              {i < steps.length - 1 && (
                <span className="my-1 flex flex-1 flex-col items-center text-mist">
                  <span className="w-px flex-1 bg-mist" />
                  <ArrowDown className="size-3" />
                </span>
              )}
            </div>
            <div
              className={cn("min-w-0 flex-1", i < steps.length - 1 && "pb-3")}
            >
              <p className="text-caption text-muted-foreground">{s.label}</p>
              <p
                className={cn(
                  "truncate text-body-sm",
                  i === 1 ? "text-foreground" : "font-mono",
                  !s.value && "text-ash",
                )}
                title={s.value}
              >
                {s.value || "Not set yet"}
              </p>
              {s.more && <p className="text-caption text-ash">{s.more}</p>}
            </div>
          </li>
        ))}
      </ol>
      {https && !d.tls && (
        <button
          type="button"
          onClick={() => onTab("https")}
          className="self-start text-caption font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-11"
        >
          Plain http. Set up HTTPS
        </button>
      )}
      {d.custom.trim() && (
        <button
          type="button"
          onClick={() => onTab("config")}
          className="self-start text-caption font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-11"
        >
          The config is written by hand
        </button>
      )}
    </div>
  )
}
