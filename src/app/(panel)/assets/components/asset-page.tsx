"use client"

import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  CircleAlert,
  Copy,
  Ellipsis,
  ExternalLink,
  Eye,
  History,
  Link2,
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  Unlink,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { Asset, AssetDetail, AssetRelation } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAsset, useDeleteRelation, useRevealLicenseKey } from "../api"
import { useAssetActions } from "./asset-actions"
import { NotesTab, PinnedNotes } from "./asset-notes"
import {
  AssetIcon,
  assetHref,
  classificationLabel,
  criticalities,
  dateText,
  dueDates,
  editAssetHref,
  envLabel,
  inDays,
  issueMeta,
  issuesOf,
  kindOf,
  lifecycleLabel,
  money,
  osEndOfLife,
  relationLabel,
  StatusLabel,
  sourceHref,
  sourceLabel,
  yearlyCost,
} from "./meta"
import {
  Avatar,
  CriticalityPips,
  IssuePill,
  Meter,
  OwnerChip,
  Pill,
} from "./parts"
import { useAssetsCan } from "./permissions"

const tabs = ["overview", "notes", "relations", "history"] as const
type Tab = (typeof tabs)[number]
const tabLabels: Record<Tab, string> = {
  overview: "Overview",
  notes: "Notes",
  relations: "Relations",
  history: "History",
}

export function AssetPageFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <AssetPage id={id} />
}

function AssetPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useAsset(id)
  if (phone === null) return null
  if (query.isPending)
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 md:px-6">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  if (!query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={PackageSearch}
          title={gone ? "This asset isn't here" : "Couldn't load the asset"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              render={<Link href="/assets" />}
              nativeButton={false}
            >
              Back to the inventory
            </Button>
          }
        />
      </div>
    )
  }
  return <Page detail={query.data} phone={phone} />
}

function Page({ detail, phone }: { detail: AssetDetail; phone: boolean }) {
  const a = detail.asset
  useFollowWorkspace(a.workspace_id)
  usePageCrumbs([{ href: assetHref(a.id), label: a.name }])
  const can = useAssetsCan(a.workspace_id)
  const actions = useAssetActions()
  const router = useRouter()
  const leave = useBackOr("/assets")
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabs)
      .withDefault("overview")
      .withOptions({ history: "replace" }),
  )
  const [sheet, setSheet] = useOpen("asset-sheet")
  const src = sourceHref(a)
  const issues = issuesOf(a)
  const deletable = !a.source_kind || a.source_gone

  const menu: Item[][] = [
    [
      ...(can.edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => router.push(editAssetHref(a.id)),
            },
          ]
        : []),
      ...(can.review(a)
        ? [
            {
              key: "review",
              label: "Confirm it's still needed",
              icon: <BadgeCheck />,
              onSelect: () => actions.review(a),
            },
          ]
        : []),
      ...(can.edit
        ? [
            {
              key: "relate",
              label: "Add a relation",
              icon: <Link2 />,
              onSelect: () => actions.relate(a),
            },
          ]
        : []),
      {
        key: "copy",
        label: "Copy link",
        icon: <Copy />,
        onSelect: () => {
          navigator.clipboard?.writeText(
            window.location.origin + assetHref(a.id),
          )
          toast.success("Link copied")
        },
      },
    ],
    can.edit && deletable
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => actions.remove(a, () => router.replace("/assets")),
          },
        ]
      : [],
  ]

  const hero = (
    <section
      className={cn(
        "relative overflow-hidden",
        phone
          ? "border-b border-border px-4 pt-4 pb-5"
          : "rounded-3xl border border-border p-6",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -end-16 -top-24 size-72 rounded-full bg-brand-soft opacity-60 blur-3xl"
      />
      <div className="relative flex flex-wrap items-start gap-4">
        <AssetIcon asset={a} className="size-14 rounded-2xl [&>svg]:size-7" />
        <div className="min-w-0 flex-1">
          <p className="font-label text-[11px] tracking-label text-ash uppercase">
            {kindOf(a.kind).label}
            {a.category && ` · ${a.category}`}
            {a.source_kind && " · managed by Morche"}
          </p>
          <h1 className="mt-1 text-heading font-light break-words">{a.name}</h1>
          {a.description && (
            <p className="mt-1 max-w-3xl text-body-sm text-muted-foreground">
              {a.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusLabel asset={a} className="me-1" />
            <Pill
              tone={
                a.lifecycle === "active"
                  ? "success"
                  : a.lifecycle === "retired"
                    ? undefined
                    : "warning"
              }
            >
              {lifecycleLabel(a.lifecycle)}
            </Pill>
            {a.environment && (
              <Pill tone="brand">{envLabel(a.environment)}</Pill>
            )}
            {a.criticality > 0 && (
              <Pill>
                <CriticalityPips value={a.criticality} />
                {criticalities.find((c) => c.value === a.criticality)?.short}
              </Pill>
            )}
            {a.classification && (
              <Pill>{classificationLabel(a.classification)}</Pill>
            )}
            {a.tags.map((t) => (
              <Pill key={t}>#{t}</Pill>
            ))}
          </div>
        </div>
        {!phone && (
          <div className="flex shrink-0 items-center gap-2">
            {src && (
              <Button
                variant="outline"
                className="h-9"
                render={<Link href={src} />}
                nativeButton={false}
              >
                {sourceLabel(a.source_kind)}
                <ArrowRight />
              </Button>
            )}
            {can.edit && (
              <Button
                className="h-9"
                render={<Link href={editAssetHref(a.id)} />}
                nativeButton={false}
              >
                <Pencil />
                Edit
              </Button>
            )}
            <ItemMenu
              groups={menu}
              label="More"
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label="More"
                >
                  <Ellipsis />
                </Button>
              }
            />
          </div>
        )}
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HeroFact label="Owner">
          <OwnerChip asset={a} />
        </HeroFact>
        <HeroFact label="Deputy">
          {a.owner.deputy_name ? (
            <span className="flex items-center gap-2 text-body-sm">
              <Avatar
                name={a.owner.deputy_name}
                className="size-6 text-[10px]"
              />
              {a.owner.deputy_name}
            </span>
          ) : (
            <span className="text-body-sm text-ash">Nobody</span>
          )}
        </HeroFact>
        <HeroFact label="Next date">
          <NextDue asset={a} />
        </HeroFact>
        <HeroFact label="Review">
          <ReviewState asset={a} />
        </HeroFact>
      </div>
    </section>
  )

  const tabBar = (
    <nav
      aria-label="Asset"
      className={cn(
        "no-scrollbar flex gap-1 overflow-x-auto",
        phone
          ? "px-4 py-3"
          : "sticky top-[calc(3rem+1px)] z-10 -mx-6 border-b border-border bg-background/95 px-6 backdrop-blur",
      )}
    >
      {tabs.map((t) => {
        const count =
          t === "notes"
            ? a.note_count
            : t === "relations"
              ? detail.relations.length
              : t === "history"
                ? detail.events.length
                : 0
        return (
          <button
            key={t}
            type="button"
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t === "overview" ? null : t)}
            className={cn(
              phone
                ? "h-10 shrink-0 rounded-full border border-border px-4 text-body-sm aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-strong"
                : "relative h-11 shrink-0 px-3 text-body-sm text-muted-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-brand",
            )}
          >
            {tabLabels[t]}
            {count > 0 && (
              <span className="ms-1.5 text-caption text-ash">{count}</span>
            )}
          </button>
        )
      })}
    </nav>
  )

  const body =
    tab === "notes" ? (
      <NotesTab asset={a} phone={phone} />
    ) : tab === "relations" ? (
      <RelationsTab detail={detail} phone={phone} />
    ) : tab === "history" ? (
      <HistoryTab detail={detail} />
    ) : (
      <Overview
        asset={a}
        issues={issues}
        phone={phone}
        onNotes={() => setTab("notes")}
      />
    )

  if (phone) {
    return (
      <div className="flex flex-col pb-24">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {a.name}
          </h1>
          {can.edit && (
            <Button
              variant="ghost"
              className="h-11 px-3 text-brand"
              render={<Link href={editAssetHref(a.id)} />}
              nativeButton={false}
            >
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="More"
            onClick={() => setSheet(true)}
          >
            <Ellipsis className="size-5" />
          </Button>
        </header>
        {hero}
        {src && (
          <Link
            href={src}
            className="flex min-h-12 items-center gap-3 border-b border-border px-4 text-body-sm text-brand"
          >
            <ExternalLink className="size-4" />
            {sourceLabel(a.source_kind)}
          </Link>
        )}
        {tabBar}
        <div className="px-4">{body}</div>
        <BottomSheet open={sheet} onOpenChange={setSheet} title={a.name}>
          <SheetItems groups={menu} onOpenChange={setSheet} />
        </BottomSheet>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 px-6 pt-5 pb-24">
      {hero}
      {tabBar}
      {body}
    </div>
  )
}

function HeroFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-subtle px-4 py-3">
      <p className="text-caption text-ash">{label}</p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  )
}

function NextDue({ asset }: { asset: Asset }) {
  const d = dueDates(asset)[0]
  if (!d) return <span className="text-body-sm text-ash">None set</span>
  return (
    <span className="block text-body-sm">
      <span
        className={cn(
          "font-medium",
          d.days < 0 ? "text-destructive" : d.days <= 30 ? "text-warning" : "",
        )}
      >
        {d.label} {inDays(d.days)}
      </span>
      <span className="block text-caption text-muted-foreground">
        {dateText(d.date)}
      </span>
    </span>
  )
}

function ReviewState({ asset }: { asset: Asset }) {
  const can = useAssetsCan(asset.workspace_id)
  const actions = useAssetActions()
  const due = dueDates(asset).find((d) => d.key === "review")
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 text-body-sm">
        {asset.review_days === 0 ? (
          <span className="text-ash">Not asked</span>
        ) : due && due.days < 0 ? (
          <span className="font-medium text-warning">
            Overdue {inDays(due.days).replace(" ago", "")}
          </span>
        ) : (
          <span>Due {due ? inDays(due.days) : ""}</span>
        )}
        {asset.reviewed_at && (
          <span className="block truncate text-caption text-muted-foreground">
            Confirmed {timeAgo(asset.reviewed_at)} by {asset.reviewed_by_name}
          </span>
        )}
      </span>
      {asset.review_days > 0 && can.review(asset) && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.review(asset)}
        >
          <BadgeCheck />
          Confirm
        </Button>
      )}
    </div>
  )
}

// ---- Overview ----

function Card({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn("min-w-0 rounded-2xl border border-border p-5", className)}
    >
      <h2 className="font-label text-[11px] tracking-label text-ash uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== "" && v != null && v !== false)
  if (shown.length === 0)
    return <p className="text-body-sm text-ash">Nothing written down yet.</p>
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-caption text-ash">{k}</dt>
          <dd className="text-body-sm break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function factRows(a: Asset): [string, ReactNode][] {
  const f = a.facts
  const s = (k: string) => (f[k] == null || f[k] === "" ? "" : String(f[k]))
  const rows: [string, ReactNode][] = []
  switch (a.kind) {
    case "server": {
      const os = osEndOfLife(a)
      rows.push([
        "Address",
        <span key="h" className="font-mono text-caption">
          {s("host")}
        </span>,
      ])
      rows.push(["Hostname", s("hostname")])
      rows.push([
        "Operating system",
        [s("os_name"), s("os_version")].filter(Boolean).join(" "),
      ])
      if (os)
        rows.push([
          "Security updates",
          <span
            key="eol"
            className={cn(
              os.days < 0
                ? "text-destructive"
                : os.days <= 180
                  ? "text-warning"
                  : "",
            )}
          >
            {os.days < 0
              ? `Ended ${inDays(os.days)}`
              : `Until ${dateText(os.date)}`}
          </span>,
        ])
      rows.push(
        ["Kernel", s("kernel")],
        ["Architecture", s("arch")],
        ["Uptime monitors", s("monitors")],
      )
      break
    }
    case "database":
      rows.push([
        "Engine",
        [s("engine"), s("version")].filter(Boolean).join(" "),
      ])
      rows.push(["Address", s("host") && `${s("host")}:${s("port")}`])
      rows.push([
        "Backup plans",
        s("backups") === "0" ? (
          <span key="b" className="text-warning">
            None
          </span>
        ) : (
          s("backups")
        ),
      ])
      rows.push(["Health", s("health")])
      break
    case "website":
      rows.push([
        "Domains",
        Array.isArray(f.domains) ? f.domains.join(", ") : "",
      ])
      rows.push(
        ["Type", s("site_type")],
        ["Forwards to", s("upstream")],
        ["Proxy on", s("server_name")],
      )
      rows.push([
        "Uptime monitors",
        s("monitors") === "0" ? (
          <span key="m" className="text-warning">
            None
          </span>
        ) : (
          s("monitors")
        ),
      ])
      if (s("cert_expires_at"))
        rows.push(["Certificate", `Expires ${dateText(s("cert_expires_at"))}`])
      break
    case "compose_project":
      rows.push(
        ["Server", s("server_name")],
        ["Containers", `${s("running")} of ${s("total")} running`],
      )
      break
    case "application":
      rows.push(["Server", s("server_name")], ["Version", s("version")])
      if (f.update_available) rows.push(["Update", `${s("latest")} available`])
      break
    default:
      for (const [k, label] of [
        ["host", "Address"],
        ["url", "Address"],
        ["address", "Address"],
        ["engine", "Engine"],
        ["protocol", "Protocol"],
        ["provider", "Provider"],
        ["bucket", "Bucket"],
        ["version", "Version"],
        ["proxy_kind", "Kind"],
        ["server_name", "Server"],
        ["zones", "Zones"],
        ["nodes", "Nodes"],
        ["guests", "Machines"],
        ["servers", "Servers"],
      ] as const)
        if (s(k)) rows.push([label, s(k)])
  }
  return rows
}

function Overview({
  asset: a,
  issues,
  phone,
  onNotes,
}: {
  asset: Asset
  issues: ReturnType<typeof issuesOf>
  phone: boolean
  onNotes: () => void
}) {
  const reveal = useRevealLicenseKey()
  const can = useAssetsCan(a.workspace_id)
  const [key, setKey] = useState<string>()
  const dates = dueDates(a)
  const facts = factRows(a)
  const yearly = yearlyCost(a)
  const showPurchase =
    a.kind === "hardware" ||
    !!(
      a.vendor ||
      a.model ||
      a.serial_number ||
      a.asset_tag ||
      a.location ||
      a.cost != null ||
      a.purchased_on
    )
  const showLicense =
    a.seats != null || a.has_license_key || a.kind === "license"

  return (
    <div
      className={cn(
        "grid gap-4",
        !phone && "xl:grid-cols-[minmax(0,1fr)_22rem]",
        phone && "pt-1",
      )}
    >
      <div className="grid min-w-0 content-start gap-4">
        {issues.length > 0 && (
          <section className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
            <h2 className="flex items-center gap-2 text-body-sm font-medium">
              <CircleAlert className="size-4 text-warning" />
              Needs a look
            </h2>
            <ul className="mt-2 grid gap-1.5">
              {issues.map((k) => (
                <li
                  key={k}
                  className="flex flex-wrap items-center gap-2 text-body-sm"
                >
                  <IssuePill issue={k} />
                  <span className="text-muted-foreground">
                    {issueMeta[k].hint}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {facts.length > 0 && (
          <Card
            title={a.source_gone ? "Last known from Morche" : "From Morche"}
          >
            <Rows rows={facts} />
            {a.last_seen_at && (
              <p className="mt-3 text-caption text-ash">
                Read {timeAgo(a.last_seen_at)}
              </p>
            )}
          </Card>
        )}

        {showPurchase && (
          <Card
            title={
              a.kind === "hardware" ? "Purchase & hardware" : "Vendor & cost"
            }
          >
            <Rows
              rows={[
                ["Vendor", a.vendor],
                ["Model", a.model],
                [
                  "Serial number",
                  a.serial_number && (
                    <span className="font-mono text-caption">
                      {a.serial_number}
                    </span>
                  ),
                ],
                [
                  "Asset tag",
                  a.asset_tag && (
                    <span className="font-mono text-caption">
                      {a.asset_tag}
                    </span>
                  ),
                ],
                ["Location", a.location],
                ["Assigned to", a.assigned_user_name],
                ["Bought", a.purchased_on && dateText(a.purchased_on)],
                [
                  "Cost",
                  money(a.cost, a.currency) &&
                    `${money(a.cost, a.currency)}${a.billing === "monthly" ? " / month" : a.billing === "yearly" ? " / year" : ""}`,
                ],
                [
                  "Per year",
                  yearly && a.billing === "monthly"
                    ? money(yearly, a.currency)
                    : "",
                ],
                ["Cost center", a.cost_center],
              ]}
            />
          </Card>
        )}

        {showLicense && (
          <Card title="Licence">
            {a.seats != null && (
              <div className="mb-4">
                <div className="flex items-baseline justify-between text-body-sm">
                  <span>Seats</span>
                  <span className="tabular-nums">
                    <span className="font-medium">{a.seats_used ?? 0}</span> of{" "}
                    {a.seats} used
                  </span>
                </div>
                <Meter
                  value={a.seats_used ?? 0}
                  max={a.seats}
                  className="mt-2"
                />
              </div>
            )}
            {a.has_license_key && (
              <div className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-caption">
                  {key ?? "••••••••••••••••••••"}
                </span>
                {can.own && !key && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={reveal.isPending}
                    onClick={() =>
                      reveal.mutate(a.id, {
                        onSuccess: setKey,
                        onError: (e) => toast.error(e.message),
                      })
                    }
                  >
                    <Eye />
                    Show
                  </Button>
                )}
                {key && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard?.writeText(key)
                      toast.success("Key copied")
                    }}
                  >
                    <Copy />
                    Copy
                  </Button>
                )}
              </div>
            )}
            {a.has_license_key && !can.own && (
              <p className="mt-2 text-caption text-ash">
                Owners of the workspace can see the key; each look is logged.
              </p>
            )}
            {!a.has_license_key && a.seats == null && (
              <p className="text-body-sm text-ash">
                No seats or key written down.
              </p>
            )}
          </Card>
        )}

        {(Object.keys(a.fields).length > 0 || a.links.length > 0) && (
          <Card title="More">
            <Rows rows={Object.entries(a.fields)} />
            {a.links.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {a.links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-body-sm hover:bg-subtle"
                    >
                      <ExternalLink className="size-3.5" />
                      {l.label || new URL(l.url).host}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <PinnedNotes asset={a} onAll={onNotes} />
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <Card title="Dates">
          {dates.length === 0 ? (
            <p className="text-body-sm text-ash">
              No warranty, expiry or review dates.
            </p>
          ) : (
            <ol className="relative grid gap-4 border-s border-border ps-4">
              {dates.map((d) => (
                <li key={d.key} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -start-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-background",
                      d.days < 0
                        ? "bg-destructive"
                        : d.days <= 30
                          ? "bg-warning"
                          : "bg-brand",
                    )}
                  />
                  <p className="text-body-sm font-medium">{d.label}</p>
                  <p className="text-caption text-muted-foreground">
                    {dateText(d.date)} · {inDays(d.days)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {a.auto_renew && (
            <p className="mt-3 text-caption text-ash">Renews by itself.</p>
          )}
        </Card>
        <Card title="Record">
          <Rows
            rows={[
              [
                "Added",
                `${timeAgo(a.created_at)}${a.created_by_name ? ` by ${a.created_by_name}` : ""}`,
              ],
              [
                "Last changed",
                `${timeAgo(a.updated_at)}${a.updated_by_name ? ` by ${a.updated_by_name}` : ""}`,
              ],
              [
                "Owner from",
                a.owner.from === "rule"
                  ? `Owner rule “${a.owner.rule_name}”`
                  : a.owner.from === "asset"
                    ? "Set on the asset"
                    : "Nobody yet",
              ],
              [
                "Reminders to",
                a.channel_ids.length
                  ? `${a.channel_ids.length} channel${a.channel_ids.length > 1 ? "s" : ""} + workspace`
                  : "Workspace channels",
              ],
            ]}
          />
        </Card>
      </div>
    </div>
  )
}

// ---- Relations ----

function RelationsTab({
  detail,
  phone,
}: {
  detail: AssetDetail
  phone: boolean
}) {
  const a = detail.asset
  const can = useAssetsCan(a.workspace_id)
  const actions = useAssetActions()
  const del = useDeleteRelation()
  const byId = new Map(detail.related.map((x) => [x.id, x]))
  const out = detail.relations.filter((r) => r.from_id === a.id)
  const inc = detail.relations.filter((r) => r.to_id === a.id)

  const row = (r: AssetRelation, outgoing: boolean) => {
    const other = byId.get(outgoing ? r.to_id : r.from_id)
    if (!other) return null
    return (
      <li key={r.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
        <span className="w-28 shrink-0 text-caption text-muted-foreground">
          {relationLabel(r.kind, outgoing)}
        </span>
        <AssetIcon asset={other} className="size-8" />
        <Link href={assetHref(other.id)} className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium hover:underline">
            {other.name}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {kindOf(other.kind).label}
            {r.note && ` · ${r.note}`}
          </span>
        </Link>
        <StatusLabel asset={other} className="hidden sm:inline-flex" />
        {r.origin === "discovered" ? (
          <Pill>Found by Morche</Pill>
        ) : (
          can.edit && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove relation"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(
                  { asset: a.id, relation: r.id },
                  {
                    onSuccess: () => toast.success("Relation removed"),
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              <Unlink />
            </Button>
          )
        )}
      </li>
    )
  }

  // Everything that stops working when this asset does (transitively).
  const impact = detail.related.filter((x) =>
    inc.some((r) => r.from_id === x.id && r.kind !== "backs_up_to"),
  )

  return (
    <div
      className={cn(
        "grid gap-4",
        !phone && "xl:grid-cols-[minmax(0,1fr)_22rem]",
        phone && "pt-1",
      )}
    >
      <div className="grid min-w-0 content-start gap-4">
        <div className="flex items-center gap-2">
          <p className="text-body-sm text-muted-foreground">
            Found by Morche ones stay in step by themselves; add the rest by
            hand.
          </p>
          {can.edit && (
            <Button className="ms-auto h-9" onClick={() => actions.relate(a)}>
              <Plus />
              Add a relation
            </Button>
          )}
        </div>
        <section className="overflow-hidden rounded-2xl border border-border">
          <h2 className="border-b border-border bg-subtle px-4 py-2 text-caption text-ash">
            What {a.name} relies on
          </h2>
          {out.length ? (
            <ul className="divide-y divide-border">
              {out.map((r) => row(r, true))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-body-sm text-ash">Nothing yet.</p>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-border">
          <h2 className="border-b border-border bg-subtle px-4 py-2 text-caption text-ash">
            What relies on {a.name}
          </h2>
          {inc.length ? (
            <ul className="divide-y divide-border">
              {inc.map((r) => row(r, false))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-body-sm text-ash">Nothing yet.</p>
          )}
        </section>
      </div>
      <Card title="If it goes down">
        {impact.length === 0 ? (
          <p className="text-body-sm text-ash">Nothing known depends on it.</p>
        ) : (
          <>
            <p className="text-body-sm">
              <span className="text-subheading font-light">
                {impact.length}
              </span>{" "}
              {impact.length === 1 ? "asset depends" : "assets depend"} on it
              directly.
            </p>
            <ul className="mt-3 grid gap-2">
              {impact.map((x) => (
                <li key={x.id} className="flex items-center gap-2 text-body-sm">
                  <AssetIcon
                    asset={x}
                    className="size-6 rounded-md [&>svg]:size-3.5"
                  />
                  <Link
                    href={assetHref(x.id)}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {x.name}
                  </Link>
                  <span className="truncate text-caption text-muted-foreground">
                    {x.owner.user_name || x.owner.group_name || "No owner"}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={`/assets/map?focus=${a.id}`}
              className="mt-3 inline-flex items-center gap-1 text-body-sm text-brand"
            >
              See the whole chain on the map
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}

// ---- History ----

const actionText: Record<string, string> = {
  created: "Added",
  updated: "Changed",
  found: "Found by Morche",
  gone: "Removed from Morche",
  reviewed: "Confirmed still needed",
  "key-shown": "Licence key shown",
  related: "Relation added",
  unrelated: "Relation removed",
  noted: "Note added",
  unnoted: "Note deleted",
}

function HistoryTab({ detail }: { detail: AssetDetail }) {
  if (detail.events.length === 0)
    return (
      <Empty
        icon={History}
        title="No history yet"
        body="Changes to this asset show here."
      />
    )
  return (
    <ol className="relative grid gap-5 border-s border-border ps-5 pt-1">
      {detail.events.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className="absolute -start-[25px] top-1.5 size-2.5 rounded-full bg-brand ring-4 ring-background"
          />
          <p className="text-body-sm">
            <span className="font-medium">
              {actionText[e.action] ?? e.action}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {e.by_name || "Someone"} · {timeAgo(e.at)}
            </span>
          </p>
          {e.changes.length > 0 && e.action === "updated" && (
            <ul className="mt-1.5 grid gap-1 text-caption">
              {e.changes.map((c) => (
                <li key={c.field} className="min-w-0 break-words">
                  <span className="text-ash">{c.field}: </span>
                  {c.from && (
                    <span className="text-muted-foreground line-through">
                      {c.from}
                    </span>
                  )}
                  {c.from && " → "}
                  <span>{c.to || <span className="text-ash">empty</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
