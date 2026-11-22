"use client"

import {
  Cloud,
  Copy,
  Ellipsis,
  Eraser,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { toast } from "sonner"

import { ItemMenu, Notices } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import { useBack } from "@/hooks/useBack"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { DNSServer, DNSZone } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCdnRecords,
  useCheckCdnDomain,
  useCheckingDnsServers,
} from "../../../../../api"
import {
  useDnsActions,
  useZoneMenu,
} from "../../../../../components/dns-actions"
import {
  cdnPending,
  serverHref,
  zoneHref,
  zoneProblem,
} from "../../../../../components/meta"
import {
  ActionSheet,
  AppBar,
  chipClass,
  Missing,
  PageLoading,
  ServerBanner,
  Tag,
} from "../../../../../components/parts"
import { useDnsCan, useDnsWrite } from "../../../../../components/permissions"
import { FirewallTab } from "./firewall-tab"
import { cdnTabLabels, cdnTabs } from "./meta"
import { RateLimitTab } from "./rate-limit-tab"
import { RecordsTab, useRecordLayers } from "./records-tab"
import { CacheTab, HttpsTab, PurgeDialog, SpeedTab } from "./settings-tabs"
import { TrafficTab } from "./traffic-tab"
import { WafTab } from "./waf-tab"

// Keep the current tab's chip in view (links can open a late tab).
function scrollToCurrent(nav: HTMLElement | null) {
  nav
    ?.querySelector("[aria-current=page]")
    ?.scrollIntoView({ inline: "center", block: "nearest" })
}

const tabParser = parseAsStringLiteral(cdnTabs).withDefault("records")

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`, { description: text })
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

// An ArvanCloud domain: its DNS records and CDN settings.
export function CdnZonePage({
  server: s,
  zoneName,
  phone,
}: {
  server: DNSServer
  zoneName: string
  phone: boolean
}) {
  const records = useCdnRecords(s.id, zoneName)
  const [tab, setTab] = useQueryState("tab", tabParser)
  const can = useDnsCan()
  const write = useDnsWrite()
  const actions = useDnsActions()
  const zoneMenu = useZoneMenu()
  const router = useRouter()
  const back = useBack(serverHref(s.id))
  const checking = useCheckingDnsServers().has(s.id)
  const layers = useRecordLayers(s, zoneName)
  const [purgeOpen, setPurgeOpen] = useOpen("cdn-purge-header")
  const [menuOpen, setMenuOpen] = useOpen("cdn-zone-menu")

  const data = records.data
  if (!data && records.error) {
    const gone =
      records.error instanceof ApiError && records.error.status === 404
    return (
      <Missing
        title={gone ? "Domain not found" : "Couldn't load this domain"}
        body={
          gone
            ? `${zoneName} isn't on this ArvanCloud account any more, or the key can't see it.`
            : records.error.message
        }
        href={serverHref(s.id)}
        label={`Domains on ${s.name}`}
        onRetry={gone ? undefined : () => records.refetch()}
      />
    )
  }
  if (!data) return <PageLoading />

  const zone = data.zone
  const canEdit = write(s, "engineer") && s.status === "online"
  const canPurge = write(s, "operator")
  const active = zone.cdn?.status === "active"
  const info = { name: zone.name, type: zone.type, disabled: zone.disabled }
  const menu = zoneMenu(s, info, {
    onDeleted: () => router.replace(serverHref(s.id)),
  })

  const notes = (
    <div className={cn("flex flex-col gap-3", phone ? "" : "px-6")}>
      <ServerBanner server={s} checking={checking} />
      <PendingBanner server={s} zone={zone} phone={phone} />
      {!s.allow_changes && (
        <Notices
          notes={[
            {
              key: "read-only",
              title: "Read only",
              body: "Changes from Morche are off for this ArvanCloud connection: you see everything, and nothing is changed.",
              action: can(s, "owner") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.editServer(s)}
                >
                  Allow changes
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  )

  const body = (
    <div className={cn(!phone && "px-6 pt-4")}>
      {tab === "records" && (
        <RecordsTab
          server={s}
          zone={zoneName}
          data={data}
          fetching={records.isFetching}
          refetch={() => records.refetch()}
          canEdit={canEdit}
          phone={phone}
          layers={layers}
        />
      )}
      {tab === "traffic" && (
        <TrafficTab server={s} zone={zoneName} active={active} phone={phone} />
      )}
      {tab === "https" && (
        <HttpsTab server={s} zone={zoneName} canEdit={canEdit} phone={phone} />
      )}
      {tab === "cache" && (
        <CacheTab server={s} zone={zoneName} canEdit={canEdit} phone={phone} />
      )}
      {tab === "firewall" && (
        <FirewallTab
          server={s}
          zone={zoneName}
          canEdit={canEdit}
          phone={phone}
        />
      )}
      {tab === "waf" && (
        <WafTab server={s} zone={zoneName} canEdit={canEdit} phone={phone} />
      )}
      {tab === "rate-limit" && (
        <RateLimitTab
          server={s}
          zone={zoneName}
          canEdit={canEdit}
          phone={phone}
        />
      )}
      {tab === "speed" && (
        <SpeedTab server={s} zone={zoneName} canEdit={canEdit} phone={phone} />
      )}
    </div>
  )

  const tags = (
    <>
      {zoneProblem(zone) && <Tag tone="destructive">{zoneProblem(zone)}</Tag>}
      {cdnPending(zone) && <Tag tone="warning">Not active yet</Tag>}
      {!s.allow_changes && (
        <Tag>
          <Lock className="me-1 size-3" />
          Read only
        </Tag>
      )}
    </>
  )

  if (phone) {
    return (
      <div className="flex min-h-svh flex-col pb-[calc(--spacing(24)+env(safe-area-inset-bottom))]">
        <AppBar
          title={zoneName}
          subtitle={<>ArvanCloud · {s.name}</>}
          path={zoneHref(s.id, zoneName)}
          onBack={back}
          onMenu={() => setMenuOpen(true)}
          menuLabel="Domain actions"
        >
          <nav
            ref={scrollToCurrent}
            aria-label="Domain sections"
            className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2"
          >
            {cdnTabs.map((t) => (
              <button
                key={t}
                type="button"
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t === "records" ? null : t)}
                className={chipClass}
              >
                {cdnTabLabels[t]}
              </button>
            ))}
          </nav>
        </AppBar>
        {notes}
        {body}
        {tab === "records" && canEdit && (
          <Button
            size="lg"
            aria-label="Add record"
            className="fixed end-4 bottom-[calc(--spacing(20)+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-md"
            onClick={layers.add}
          >
            <Plus className="size-6" />
          </Button>
        )}
        <ActionSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title={zoneName}
          groups={[
            canPurge
              ? [
                  {
                    key: "purge",
                    label: "Clear CDN cache",
                    icon: <Eraser />,
                    onSelect: () => setPurgeOpen(true),
                  },
                ]
              : [],
            ...menu,
          ]}
        />
        {layers.layers}
        <PurgeDialog
          open={purgeOpen}
          onOpenChange={setPurgeOpen}
          server={s}
          zone={zoneName}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <Cloud className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-mono text-subheading font-medium">
              {zoneName}
            </h1>
            {tags}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span>
              {zone.cdn?.setup === "partial"
                ? "ArvanCloud · CNAME setup"
                : "ArvanCloud"}
            </span>
            <Link
              href={serverHref(s.id)}
              className="hover:text-brand hover:underline"
            >
              on {s.name}
            </Link>
            <span>
              {data.records.filter((r) => r.cloud).length} of{" "}
              {data.records.length} records through the CDN
            </span>
            {zone.last_modified && (
              <span>changed {timeAgo(zone.last_modified).toLowerCase()}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canPurge && (
            <Button variant="outline" onClick={() => setPurgeOpen(true)}>
              <Eraser />
              Clear cache
            </Button>
          )}
          {tab === "records" && canEdit && (
            <Button onClick={layers.add}>
              <Plus />
              Add record
            </Button>
          )}
          <ItemMenu
            groups={menu}
            label="Domain actions"
            trigger={
              <Button variant="outline" size="icon" aria-label="Domain actions">
                <Ellipsis />
              </Button>
            }
          />
        </div>
      </div>
      {notes}
      <nav
        aria-label="Domain sections"
        className="sticky top-[calc(3rem+1px)] z-20 mt-3 flex gap-1 border-b border-border bg-background/95 px-6 backdrop-blur-md"
      >
        {cdnTabs.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t === "records" ? null : t)}
            className="-mb-px h-11 border-b-2 border-transparent px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground aria-[current=page]:border-brand aria-[current=page]:font-medium aria-[current=page]:text-foreground"
          >
            {cdnTabLabels[t]}
          </button>
        ))}
      </nav>
      {body}
      {layers.layers}
      <PurgeDialog
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        server={s}
        zone={zoneName}
      />
    </div>
  )
}

// A domain that doesn't serve yet: what to set at the registrar.
function PendingBanner({
  server,
  zone,
  phone,
}: {
  server: DNSServer
  zone: DNSZone
  phone: boolean
}) {
  const check = useCheckCdnDomain()
  const can = useDnsCan()
  const pending = cdnPending(zone)
  if (!pending || !zone.cdn) return null
  const partial = zone.cdn.setup === "partial"
  return (
    <section
      className={cn(
        "flex flex-col gap-3 border-warning/25 bg-warning/5 p-4",
        phone ? "border-y" : "rounded-2xl border px-5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium">{pending}</p>
          <p className="text-body-sm text-muted-foreground">
            {partial
              ? `Point each name you want through ArvanCloud at the target below by CNAME, at the DNS that answers for ${zone.name} now.`
              : `At the registrar of ${zone.name}, replace its nameservers with these two. It can take a few hours to be seen.`}
          </p>
        </div>
        {can(server, "operator") && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 max-md:h-9"
            disabled={check.isPending}
            onClick={() =>
              check.mutate(
                { id: server.id, zone: zone.name },
                {
                  onSuccess: (z) =>
                    z.cdn?.status === "active"
                      ? toast.success(`${zone.name} is active`)
                      : toast.message("Not seen yet", {
                          description:
                            "ArvanCloud doesn't see the change yet. Changes at the registrar can take a few hours.",
                        }),
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {check.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Check now
          </Button>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {(partial ? [zone.cdn.cname_target ?? ""] : zone.cdn.ns_keys)
          .filter(Boolean)
          .map((ns) => (
            <button
              key={ns}
              type="button"
              onClick={() => copy(ns, partial ? "Target" : "Nameserver")}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-start font-mono text-body-sm outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1 truncate">{ns}</span>
              <Copy className="size-3.5 shrink-0 text-ash" />
            </button>
          ))}
      </div>
      {!partial && zone.cdn.current_ns.length > 0 && (
        <p className="text-caption text-muted-foreground">
          Now:{" "}
          <span className="font-mono">{zone.cdn.current_ns.join(", ")}</span>
        </p>
      )}
    </section>
  )
}
