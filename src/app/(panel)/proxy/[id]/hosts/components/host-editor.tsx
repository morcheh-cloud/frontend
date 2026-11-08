"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  ChevronLeft,
  Ellipsis,
  FileCode,
  Globe,
  Info,
  Lock,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChoiceSelect, ListInput } from "@/app/(panel)/dns/components/fields"
import { Empty, ItemMenu } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api } from "@/lib/api"
import type {
  Certificate,
  ProxyHost,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { proxyKeys, useInspection, useProxy, useSaveHost } from "../../../api"
import {
  canWrite,
  domainsText,
  type HostType,
  hostHref,
  hostTypes,
  newHostHref,
  proxyHref,
  proxyStatusMeta,
} from "../../../components/meta"
import { ActionSheet, Missing, PageLoading } from "../../../components/parts"
import { useProxyCan } from "../../../components/permissions"
import { useHostMenu } from "../../../components/proxy-actions"
import { inspectable } from "../../components/toolbar"
import {
  bestCertificate,
  clearErrors,
  type Draft,
  domainList,
  draftFromHost,
  type Errors,
  freshDraft,
  problemsToErrors,
  type RedirectCode,
  sameDraft,
  toBody,
  toConfig,
} from "./draft"
import { NginxCode } from "./nginx-code"
import { ConfigPreview } from "./preview"
import { HeaderRows, PathRows } from "./rows"

const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

const redirectCodes: { value: `${RedirectCode}`; label: string }[] = [
  { value: "301", label: "301 · Moved for good" },
  { value: "302", label: "302 · Moved for now" },
  { value: "308", label: "308 · Moved for good, keeps the method" },
  { value: "307", label: "307 · Moved for now, keeps the method" },
]

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
                label: host ? domainsText(host.domains) : "Site",
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
          href="/proxy?tab=proxies"
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
      phone={phone}
    />
  )
}

function Editor({
  proxy: p,
  host,
  phone,
}: {
  proxy: ReverseProxy
  host: ProxyHost | undefined
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

  const [draft, setDraft] = useState<Draft>(() =>
    host ? draftFromHost(host) : freshDraft(types[0]?.value),
  )
  const [revision, setRevision] = useState(host?.updated_at)
  const [errors, setErrors] = useState<Errors>({})
  const [refusal, setRefusal] = useState("")
  const [touched, setTouched] = useState(false)
  const [more, setMore] = useState(() => {
    const d = host ? draftFromHost(host) : null
    return !!d && hasMore(d)
  })
  const [conflict, setConflict] = useOpen("proxy-host-conflict")
  const [previewOpen, setPreviewOpen] = useOpen("proxy-host-preview")
  const [menuOpen, setMenuOpen] = useOpen("proxy-host-sheet")
  const save = useSaveHost()

  const config = useMemo(() => toConfig(draft), [draft])
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

  function submit(opts?: { overwrite?: boolean }) {
    const body = toBody(draft)
    if (body.config.domains.length === 0) {
      setErrors({ domains: "Add at least one domain" })
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
        onSuccess: () => {
          setTouched(false)
          toast.success(
            host
              ? "Saved and loaded"
              : `${domainsText(body.config.domains)} is live`,
          )
          router.replace(proxyHref(p.id))
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
            if (Object.keys(mapped).some(isMore)) setMore(true)
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

  const title = host ? domainsText(host.domains) : "New site"
  const siteMenu = host
    ? hostMenu(p, host, {
        onDeleted: () => router.replace(proxyHref(p.id)),
      }).map((g) => g.filter((i) => i.key !== "edit" && i.key !== "toggle"))
    : []
  const notices = (
    <>
      {why && <Callout icon={<Info />}>{why}</Callout>}
      {host?.redacted && !why && (
        <Callout icon={<Info />}>
          Header values and raw directives are hidden from you.
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

  const sections = (
    <>
      <Card
        title="Domains"
        hint="One per line. *.example.com covers every name under it. Point each one's DNS at this server."
        phone={phone}
      >
        <Field label="Domains" error={errors.domains}>
          {(f) => (
            <ListInput
              {...f}
              value={draft.domains}
              onChange={(domains) => set({ domains })}
              placeholder={"example.com\nwww.example.com"}
            />
          )}
        </Field>
      </Card>

      <Card title="Where it goes" phone={phone}>
        {types.length > 1 && (
          <TypePicker
            types={types}
            value={draft.type}
            onChange={(type) => set({ type })}
          />
        )}
        {draft.type === "proxy" && (
          <>
            <Field
              label="App address"
              hint="Where the app answers, as the proxy's server sees it."
              error={errors.upstream}
            >
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  inputMode="url"
                  value={draft.upstream}
                  onChange={(e) => set({ upstream: e.target.value })}
                  placeholder="http://127.0.0.1:3000"
                  className="font-mono"
                />
              )}
            </Field>
            {caps.websockets && (
              <ToggleRow
                id="host-websockets"
                label="WebSockets"
                hint="Let live connections through (chat, dashboards, terminals)."
                checked={draft.websockets}
                onChange={(websockets) => set({ websockets })}
              />
            )}
            <ToggleRow
              id="host-preserve"
              label="Pass the visitor's domain"
              hint="The app sees example.com, not its own address. Most apps want this."
              checked={draft.preserveHost}
              onChange={(preserveHost) => set({ preserveHost })}
            />
          </>
        )}
        {draft.type === "redirect" && (
          <>
            <Field label="Send visitors to" error={errors.redirect_to}>
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  inputMode="url"
                  value={draft.redirectTo}
                  onChange={(e) => set({ redirectTo: e.target.value })}
                  placeholder="https://www.example.com"
                  className="font-mono"
                />
              )}
            </Field>
            <Field
              label="Kind of redirect"
              hint="Moved for good is remembered by browsers and search engines."
              error={errors.redirect_code}
            >
              {(f) => (
                <ChoiceSelect
                  id={f.id}
                  value={`${draft.redirectCode}` as `${RedirectCode}`}
                  onChange={(v) =>
                    set({ redirectCode: Number(v) as RedirectCode })
                  }
                  items={redirectCodes}
                />
              )}
            </Field>
            <ToggleRow
              id="host-keep-path"
              label="Keep the path"
              hint="/blog/post goes to the same /blog/post there, not to its home page."
              checked={draft.keepPath}
              onChange={(keepPath) => set({ keepPath })}
            />
          </>
        )}
        {draft.type === "static" && (
          <>
            <Field
              label="Folder"
              hint="A full path on the proxy's server. Its index.html is the home page."
              error={errors.root}
            >
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  value={draft.root}
                  onChange={(e) => set({ root: e.target.value })}
                  placeholder="/var/www/example"
                  className="font-mono"
                />
              )}
            </Field>
            <ToggleRow
              id="host-spa"
              label="Single-page app"
              hint="Paths that aren't files get index.html (React, Vue, Angular builds)."
              checked={draft.spa}
              onChange={(spa) => set({ spa })}
            />
          </>
        )}
      </Card>

      <Card
        title="HTTPS"
        hint="Uses a certificate that's already on the server."
        phone={phone}
      >
        <ToggleRow
          id="host-tls"
          label="Serve over https"
          checked={draft.tls}
          onChange={setTls}
        />
        {draft.tls ? (
          <>
            {certs.length > 0 && (
              <CertificatePicker
                certs={certs}
                domains={domainList(draft.domains)}
                value={draft.certificate}
                onPick={(c) => set({ certificate: c.certificate, key: c.key })}
              />
            )}
            <Field
              label="Certificate file"
              hint="The full chain (fullchain.pem)."
              error={errors["tls.certificate"]}
            >
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  value={draft.certificate}
                  onChange={(e) => set({ certificate: e.target.value })}
                  placeholder="/etc/letsencrypt/live/example.com/fullchain.pem"
                  className="font-mono"
                />
              )}
            </Field>
            <Field label="Key file" error={errors["tls.key"]}>
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  value={draft.key}
                  onChange={(e) => set({ key: e.target.value })}
                  placeholder="/etc/letsencrypt/live/example.com/privkey.pem"
                  className="font-mono"
                />
              )}
            </Field>
            <ToggleRow
              id="host-force-https"
              label="Send http visitors to https"
              checked={draft.forceHttps}
              onChange={(forceHttps) => set({ forceHttps })}
            />
            <ToggleRow
              id="host-http2"
              label="HTTP/2"
              hint="Faster pages. Leave on unless the app has trouble with it."
              checked={draft.http2}
              onChange={(http2) => set({ http2 })}
            />
            <ToggleRow
              id="host-hsts"
              label="HSTS"
              hint="Browsers refuse plain http for this name for a year."
              checked={draft.hsts}
              onChange={(hsts) => set({ hsts })}
            />
            {draft.hsts && (
              <Callout icon={<TriangleAlert />} tone="warning">
                Hard to take back: if https stops working, visitors who came
                before can't reach the site until the certificate is fixed.
              </Callout>
            )}
          </>
        ) : (
          <p className="text-caption text-muted-foreground">
            Plain http only. Turn it on once a certificate for these names is on
            the server.
          </p>
        )}
      </Card>

      <MoreToggle open={more} onToggle={() => setMore(!more)} draft={draft} />

      {more && (
        <>
          {caps.paths && draft.type !== "redirect" && (
            <Card
              title="Paths"
              hint="Send a path and everything under it to another app, like /api to a backend."
              phone={phone}
            >
              <PathRows
                rows={draft.paths}
                onChange={(paths) => set({ paths })}
                errors={errors}
                websockets={caps.websockets}
              />
            </Card>
          )}
          {caps.headers && (
            <Card
              title="Headers"
              hint="Added to what visitors get back, or to what the app receives."
              phone={phone}
            >
              <HeaderRows
                rows={draft.headers}
                onChange={(headers) => set({ headers })}
                errors={errors}
                hidden={host?.redacted}
              />
            </Card>
          )}
          {caps.allow && (
            <Card
              title="Only from"
              hint="Leave empty for everyone. Others get 403 Forbidden."
              phone={phone}
            >
              <Field
                label="Addresses and ranges"
                hint="One per line, like 10.0.0.0/8 or 203.0.113.7."
                error={errors.allow}
              >
                {(f) => (
                  <ListInput
                    {...f}
                    value={draft.allow}
                    onChange={(allow) => set({ allow })}
                    placeholder="Everyone"
                  />
                )}
              </Field>
            </Card>
          )}
          <Card title="Limits" phone={phone}>
            <div className="grid gap-4 md:grid-cols-2">
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
              {draft.type === "proxy" && (
                <Field
                  label="Wait for the app (seconds)"
                  hint="Empty = 60. Raise it for slow reports or exports."
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
                      placeholder="60"
                      className="tabular-nums"
                    />
                  )}
                </Field>
              )}
            </div>
          </Card>
          {caps.advanced && (
            <Card
              title="Raw directives"
              hint={`Added as they are inside this site's block. The whole config is tested before it's loaded, so a mistake can't take ${p.kind_label} down.`}
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
      )}

      <Card title="Note and state" phone={phone}>
        <Field label="Note" hint="Optional: what it is, who it's for.">
          {(f) => (
            <Textarea
              {...f}
              value={draft.note}
              onChange={(e) => set({ note: e.target.value })}
              maxLength={2000}
              rows={2}
            />
          )}
        </Field>
        <ToggleRow
          id="host-enabled"
          label="On"
          hint="Off keeps the site here but takes it off the server."
          checked={draft.enabled}
          onChange={(enabled) => set({ enabled })}
        />
      </Card>
    </>
  )

  const form = (
    <fieldset
      disabled={readOnly}
      className={cn("flex min-w-0 flex-col", phone ? "" : "gap-6")}
    >
      {sections}
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
  const saveLabel = save.isPending ? "Saving…" : host ? "Save" : "Add site"

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
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {title}
          </h1>
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
        {(why || refusal || host?.redacted) && (
          <div className="flex flex-col gap-3 px-4 pt-4">{notices}</div>
        )}
        {form}
        <div className="flex flex-col gap-2 px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => setPreviewOpen(true)}
            disabled={!!host?.redacted}
          >
            <FileCode />
            Show the {p.kind_label} config
          </Button>
        </div>
        <BottomSheet
          full
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={p.capabilities.config_label || `${p.kind_label} config`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {previewOpen && (
              <ConfigPreview proxy={p} hostId={host?.id} config={config} bare />
            )}
          </div>
        </BottomSheet>
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

  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {draft.tls ? (
            <Lock className="size-5" />
          ) : (
            <Globe className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">
            {domainList(draft.domains)[0] ?? title}
          </h1>
          <p className="truncate text-caption text-ash">
            {dirty
              ? "Unsaved changes"
              : host
                ? `Saved ${timeAgo(host.updated_at).toLowerCase()}${host.updated_by_name ? ` by ${host.updated_by_name}` : ""}`
                : `On ${p.server_name}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>
      {(why || refusal || host?.redacted) && (
        <div className="flex max-w-3xl flex-col gap-3">{notices}</div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        {form}
        {!host?.redacted && (
          <ConfigPreview
            proxy={p}
            hostId={host?.id}
            config={config}
            className="xl:sticky xl:top-[calc(3rem+1px+1.25rem)]"
          />
        )}
      </div>
      {conflictDialog}
    </div>
  )
}

// A titled block: a card on desktop, a plain full-width group on phones.
function Card({
  title,
  hint,
  phone,
  children,
}: {
  title: string
  hint?: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6",
      )}
    >
      <div>
        <h2 className="text-body font-medium">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

function TypePicker({
  types,
  value,
  onChange,
}: {
  types: typeof hostTypes
  value: HostType
  onChange: (type: HostType) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="What the site does"
      className="grid gap-2 md:grid-cols-3"
    >
      {types.map((t) => {
        const Icon = t.icon
        const on = t.value === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: tile options; radio inputs can't be styled as tiles
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex min-h-14 items-start gap-3 rounded-lg border p-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              on
                ? "border-brand bg-brand-soft/60"
                : "border-input hover:bg-subtle active:bg-muted",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                on ? "text-brand" : "text-muted-foreground",
              )}
            />
            <span className="min-w-0">
              <span className="block text-body-sm font-medium">{t.label}</span>
              <span className="block text-caption text-muted-foreground">
                {t.short}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function certLabel(c: Certificate) {
  return c.domains.length ? domainsText(c.domains) : c.name
}

function certNote(c: Certificate) {
  if (!c.expires) return ""
  const days = Math.floor((new Date(c.expires).getTime() - Date.now()) / 864e5)
  if (days < 0) return "expired"
  return `${days} days left`
}

// Certificates found on the server, the ones covering these names first.
function CertificatePicker({
  certs,
  domains,
  value,
  onPick,
}: {
  certs: Certificate[]
  domains: string[]
  value: string
  onPick: (c: Certificate) => void
}) {
  const best = bestCertificate(certs, domains)
  const sorted = [...certs].sort(
    (a, b) =>
      Number(b.certificate === best?.certificate) -
        Number(a.certificate === best?.certificate) ||
      certLabel(a).localeCompare(certLabel(b)),
  )
  const items = sorted.map((c) => ({
    value: c.certificate,
    label: certLabel(c),
  }))
  const current = certs.find((c) => c.certificate === value)
  return (
    <Field
      label="Found on the server"
      hint={
        best && best.certificate !== value
          ? `${certLabel(best)} covers these names.`
          : "Fills in both files."
      }
    >
      {(f) => (
        <Select
          items={items}
          value={current ? current.certificate : null}
          onValueChange={(v) => {
            const c = certs.find((x) => x.certificate === v)
            if (c) onPick(c)
          }}
        >
          <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
            <SelectValue placeholder="Pick a certificate" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-72">
            {sorted.map((c) => (
              <SelectItem key={c.certificate} value={c.certificate}>
                <span className="truncate">{certLabel(c)}</span>
                <span
                  className={cn(
                    "ms-auto shrink-0 text-caption",
                    certNote(c) === "expired" ? "text-destructive" : "text-ash",
                  )}
                >
                  {c.certificate === best?.certificate
                    ? "Covers these names"
                    : certNote(c)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}

const isMore = (key: string) =>
  key.startsWith("headers") ||
  key.startsWith("paths") ||
  ["allow", "advanced", "max_body_mb", "timeout_seconds"].includes(key)

function hasMore(d: Draft) {
  return (
    d.headers.length > 0 ||
    d.paths.length > 0 ||
    !!d.allow.trim() ||
    !!d.advanced.trim() ||
    !!d.maxBody ||
    !!d.timeout
  )
}

// Folded by default; when closed it says what's set inside.
function MoreToggle({
  open,
  onToggle,
  draft: d,
}: {
  open: boolean
  onToggle: () => void
  draft: Draft
}) {
  const set = [
    d.paths.length &&
      `${d.paths.length} path${d.paths.length === 1 ? "" : "s"}`,
    d.headers.length &&
      `${d.headers.length} header${d.headers.length === 1 ? "" : "s"}`,
    d.allow.trim() && "only from some addresses",
    (d.maxBody || d.timeout) && "limits",
    d.advanced.trim() && "raw directives",
  ].filter(Boolean)
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="flex min-h-12 items-center gap-2 px-4 text-start text-body-sm font-medium outline-none hover:text-brand focus-visible:text-brand md:px-0"
    >
      <ChevronDown
        className={cn(
          "size-4 shrink-0 transition-transform",
          !open && "-rotate-90",
        )}
      />
      More options
      {!open && set.length > 0 && (
        <span className="truncate font-normal text-muted-foreground">
          · {set.join(", ")}
        </span>
      )}
    </button>
  )
}
