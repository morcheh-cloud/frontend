"use client"

import {
  ChevronRight,
  CloudOff,
  FileQuestion,
  FileText,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  SignpostBig,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type {
  Certificate,
  ProxyDetail,
  ProxyHost,
  Proxy as ReverseProxy,
  Site,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useInspection } from "../../api"
import {
  catchAllHost,
  domainsText,
  holdsDefault,
  hostHref,
  hostName,
  hostTarget,
  newHostHref,
  proxyStatusMeta,
  useProxyPageFilters,
} from "../../components/meta"
import { Tag, Th } from "../../components/parts"
import { useProxyCan } from "../../components/permissions"
import { useProxyActions } from "../../components/proxy-actions"
import { inspectable, Toolbar } from "./toolbar"

// What the server already serves that Morche didn't write, the
// certificates it found, and files it couldn't read. Read-only, except that
// a catch-all site of Morche's takes the default server over (see
// DefaultSection).
export function ExistingTab({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const phone = useIsPhone()
  const inspection = useInspection(p.id, inspectable(p))
  const [{ q }, setFilters] = useProxyPageFilters()
  const needle = q.trim().toLowerCase()
  const data = inspection.data
  const released = data?.released_default ?? []
  const sites = (data?.sites ?? [])
    .filter((s) => !s.managed)
    .filter(
      (s) =>
        !needle ||
        s.domains.some((d) => d.toLowerCase().includes(needle)) ||
        s.file.toLowerCase().includes(needle) ||
        (s.upstream ?? "").toLowerCase().includes(needle),
    )
  const certs = (data?.certificates ?? []).filter(
    (c) =>
      !needle ||
      c.name.toLowerCase().includes(needle) ||
      c.domains.some((d) => d.toLowerCase().includes(needle)),
  )

  return (
    <>
      <Toolbar proxy={p}>
        <SearchBox
          value={q}
          onChange={(v) => setFilters({ q: v || null })}
          placeholder="Search domains and files"
          label="Search domains and files"
          className={cn(phone && "min-w-0 flex-1")}
        />
        {!phone && (
          <>
            <span className="text-caption text-ash">
              Read-only: Morche only takes over the default site
            </span>
            <span className="flex-1" />
          </>
        )}
        <Button
          variant="ghost"
          size={phone ? "icon-lg" : "icon"}
          aria-label="Read the server again"
          disabled={inspection.isFetching || !inspectable(p)}
          onClick={() => inspection.refetch()}
          className={cn(phone && "rounded-full")}
        >
          <RefreshCw className={cn(inspection.isFetching && "animate-spin")} />
        </Button>
      </Toolbar>

      {!inspectable(p) ? (
        <Empty
          icon={CloudOff}
          title="Nothing to read yet"
          body={
            p.status === "not_installed"
              ? `${p.kind_label} isn't installed on this server.`
              : `Morche can't reach this server right now (${proxyStatusMeta[p.status].label.toLowerCase()}).`
          }
        />
      ) : inspection.isPending ? (
        <Loading phone={!!phone} />
      ) : inspection.isError && !data ? (
        <Empty
          icon={CloudOff}
          title="Couldn't read the server"
          body={inspection.error.message}
          action={
            <Button variant="outline" onClick={() => inspection.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8 max-md:gap-6">
          <DefaultSection
            proxy={p}
            hosts={detail.hosts}
            sites={data?.sites ?? []}
            released={data?.released_default ?? []}
            phone={!!phone}
          />

          <Section
            title="Other sites"
            count={sites.length}
            hint="Written by hand or by another tool. They keep working next to Morche's sites."
          >
            {sites.length === 0 ? (
              <Quiet>
                {q
                  ? "No site matches."
                  : "Only Morche's sites are on this server."}
              </Quiet>
            ) : phone ? (
              <SiteRows proxy={p} sites={sites} released={released} />
            ) : (
              <SitesTable proxy={p} sites={sites} released={released} />
            )}
          </Section>

          <Section
            title="Certificates"
            count={certs.length}
            hint="The certificate files the configuration uses. Pick one for a site's HTTPS."
          >
            {certs.length === 0 ? (
              <Quiet>
                {q ? "No certificate matches." : "No certificate found."}
              </Quiet>
            ) : (
              <CertRows certs={certs} phone={!!phone} />
            )}
          </Section>

          {(data?.unknown.length ?? 0) > 0 && (
            <Section
              title="Couldn't read"
              count={data?.unknown.length ?? 0}
              hint="Included files Morche couldn't make sense of. They're still loaded."
            >
              <ul
                className={cn(
                  "divide-y divide-border border-y border-border",
                  !phone && "rounded-2xl border",
                )}
              >
                {data?.unknown.map((f) => (
                  <li
                    key={f}
                    className="flex min-h-12 items-center gap-3 px-4 font-mono text-caption"
                  >
                    <FileQuestion className="size-4 shrink-0 text-ash" />
                    <span className="truncate">{f}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </>
  )
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string
  count?: number
  hint: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="max-md:px-4">
        <h2 className="flex items-center gap-2 text-body font-medium">
          {title}
          {count !== undefined && (
            <span className="text-body-sm font-normal text-ash tabular-nums">
              {count}
            </span>
          )}
        </h2>
        <p className="text-body-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  )
}

// Who answers a name no site has, or the server's bare IP address: a
// catch-all site of Morche's, a hand-written default_server, or nobody
// (nginx then uses the first site it read). Saving a catch-all site takes
// the role over from a hand-written one; the backend puts it back when that
// site is turned off or removed.
function DefaultSection({
  proxy: p,
  hosts,
  sites,
  released,
  phone,
}: {
  proxy: ReverseProxy
  hosts: ProxyHost[]
  sites: Site[]
  released: string[]
  phone: boolean
}) {
  const can = useProxyCan()
  const mine = catchAllHost(hosts)
  const hand = sites.find(holdsDefault)
  const manage = can(p, "engineer") && (
    <Button
      variant={hand ? "default" : "outline"}
      size={phone ? "lg" : "default"}
      className={cn(phone && "w-full")}
      render={<Link href={newHostHref(p.id, "notfound")} />}
      nativeButton={false}
    >
      {hand ? "Manage in Morche" : "Set up a default site"}
    </Button>
  )

  return (
    <Section
      title="Default site"
      hint="Answers visits for names no site here has, and visits to the server's IP address."
    >
      <div
        className={cn(
          "flex gap-3 border-border",
          phone
            ? "flex-col border-y px-4 py-3"
            : "items-center rounded-2xl border px-4 py-3",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              mine
                ? "bg-brand-soft text-brand-strong"
                : "bg-muted text-muted-foreground",
            )}
          >
            {mine ? (
              <ShieldCheck className="size-4" />
            ) : (
              <SignpostBig className="size-4" />
            )}
          </span>
          {mine ? (
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <Link
                  href={hostHref(p.id, mine.id)}
                  className="truncate font-medium outline-none hover:text-brand focus-visible:text-brand"
                >
                  {hostName(mine)}
                </Link>
                <Tag tone="brand">Morche</Tag>
              </span>
              <span className="block truncate text-caption text-muted-foreground">
                Every visit gets {hostTarget(mine.config)}
              </span>
            </span>
          ) : hand ? (
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">
                  {hand.domains.length
                    ? domainsText(hand.domains)
                    : "A hand-written site"}
                </span>
                <Tag>Hand-written</Tag>
              </span>
              <span className="block truncate font-mono text-caption text-muted-foreground">
                {hand.file}:{hand.line}
                {siteTarget(hand) && ` · ${siteTarget(hand)}`}
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Not set</span>
              <span className="block text-caption text-muted-foreground">
                {p.kind_label} uses the first site it reads, so another site's
                page shows up.
              </span>
            </span>
          )}
        </div>
        {mine ? (
          <Button
            variant="outline"
            size={phone ? "lg" : "default"}
            className={cn(phone && "w-full")}
            render={<Link href={hostHref(p.id, mine.id)} />}
            nativeButton={false}
          >
            Open
          </Button>
        ) : (
          manage
        )}
      </div>
      {mine && released.length > 0 && (
        <p className="text-caption text-muted-foreground max-md:px-4">
          Taken over from{" "}
          <span className="font-mono">{released.join(", ")}</span>: only the
          word default_server was removed there. It goes back when this site
          stops answering other names or is removed.
        </p>
      )}
      {!mine && hand && can(p, "engineer") && (
        <p className="text-caption text-muted-foreground max-md:px-4">
          Saving one takes only the word default_server off that file's listen
          lines (a copy is kept) and puts it back if that site is turned off or
          removed.
        </p>
      )}
    </Section>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground max-md:mx-4">
      {children}
    </p>
  )
}

// Where a hand-written site sends its visitors.
function siteTarget(s: Site) {
  if (s.upstream) return `→ ${s.upstream}`
  if (s.redirect) return `↪ ${s.redirect}`
  if (s.root) return s.root
  return ""
}

// A hand-written site's name, and a tag when it is (or was) the default.
function SiteLabel({ site: s, released }: { site: Site; released: string[] }) {
  const tag = holdsDefault(s)
    ? "Default"
    : released.includes(s.file)
      ? "Default moved to Morche"
      : ""
  return (
    <>
      <span className="truncate font-mono font-medium">
        {s.domains.length ? domainsText(s.domains) : "No name"}
      </span>
      {tag && <Tag>{tag}</Tag>}
    </>
  )
}

function SitesTable({
  proxy: p,
  sites,
  released,
}: {
  proxy: ReverseProxy
  sites: Site[]
  released: string[]
}) {
  const actions = useProxyActions()
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Domain</Th>
            <Th>Goes to</Th>
            <Th>Listens on</Th>
            <Th className="hidden @3xl:table-cell">File</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sites.map((s) => (
            <tr
              key={`${s.file}:${s.line}`}
              className="h-14 cursor-pointer hover:bg-subtle"
              onClick={() => actions.viewSite(p, s)}
            >
              <td className="max-w-80 px-3">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-start outline-none hover:text-brand focus-visible:text-brand"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.viewSite(p, s)
                  }}
                >
                  {s.tls ? (
                    <Lock
                      aria-label="https"
                      className="size-3.5 shrink-0 text-success"
                    />
                  ) : (
                    <Globe
                      aria-label="http only"
                      className="size-3.5 shrink-0 text-ash"
                    />
                  )}
                  <SiteLabel site={s} released={released} />
                </button>
              </td>
              <td className="max-w-72 truncate px-3 font-mono text-caption text-muted-foreground">
                {siteTarget(s)}
              </td>
              <td className="px-3 font-mono text-caption whitespace-nowrap text-muted-foreground">
                {s.listen.join(", ")}
              </td>
              <td className="hidden max-w-72 truncate px-3 font-mono text-caption text-ash @3xl:table-cell">
                {s.file}:{s.line}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SiteRows({
  proxy: p,
  sites,
  released,
}: {
  proxy: ReverseProxy
  sites: Site[]
  released: string[]
}) {
  const actions = useProxyActions()
  return (
    <ul className="divide-y divide-border border-y border-border">
      {sites.map((s) => (
        <li key={`${s.file}:${s.line}`}>
          <button
            type="button"
            onClick={() => actions.viewSite(p, s)}
            className="flex min-h-16 w-full items-center gap-3 py-3 ps-4 pe-3 text-start outline-none active:bg-muted"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                {s.tls ? (
                  <Lock className="size-3.5 shrink-0 text-success" />
                ) : (
                  <Globe className="size-3.5 shrink-0 text-ash" />
                )}
                <span className="flex min-w-0 items-center gap-2 text-body">
                  <SiteLabel site={s} released={released} />
                </span>
              </span>
              <span className="truncate font-mono text-caption text-muted-foreground">
                {siteTarget(s) || s.file}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function expiry(c: Certificate) {
  if (!c.expires) return null
  const days = Math.floor((new Date(c.expires).getTime() - Date.now()) / 864e5)
  if (days < 0) return { text: "Expired", tone: "destructive" as const }
  if (days <= 14) return { text: `${days} days left`, tone: "warning" as const }
  return {
    text: `Until ${new Date(c.expires).toLocaleDateString()}`,
    tone: "muted" as const,
  }
}

function CertRows({ certs, phone }: { certs: Certificate[]; phone: boolean }) {
  return (
    <ul
      className={cn(
        "divide-y divide-border border-y border-border",
        !phone && "rounded-2xl border",
      )}
    >
      {certs.map((c) => {
        const left = expiry(c)
        return (
          <li
            key={c.certificate}
            className="flex min-h-16 items-center gap-3 px-4 py-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <KeyRound className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {c.domains.length ? domainsText(c.domains) : c.name}
                </span>
                {left && <Tag tone={left.tone}>{left.text}</Tag>}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 font-mono text-caption text-ash">
                <FileText className="size-3 shrink-0" />
                <span className="truncate">{c.certificate}</span>
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        phone ? "border-y border-border" : "rounded-2xl border border-border",
      )}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-44" />
          <Skeleton className="ms-auto h-4 w-28" />
        </div>
      ))}
    </div>
  )
}
