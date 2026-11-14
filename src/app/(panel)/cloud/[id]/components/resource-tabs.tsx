"use client"

import {
  CalendarClock,
  CircleAlert,
  HardDrive,
  History,
  Network,
  Shield,
  ShieldCheck,
  SquarePlus,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { newCronjobHref } from "@/app/(panel)/cronjobs/components/meta"
import { Tag } from "@/app/(panel)/dns/components/parts"
import {
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import type { CloudResourcesOutputBody, CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCloudActions } from "../../components/cloud-actions"
import { mainAddress } from "../../components/meta"
import {
  asShow,
  type FirewallGroup,
  type Model,
  textMatches,
  useAccountFilters,
} from "./model"
import {
  Blank,
  Count,
  dateText,
  GridSkeleton,
  Panel,
  PhoneChips,
  PhoneEmpty,
  PhoneGroup,
  PhoneRow,
  PhoneSkeleton,
  plural,
  Row,
  ShareBar,
  Toolbar,
  useServerLink,
  zonesText,
} from "./parts"

// Disks, firewalls, private networks and backup schedules: what the
// provider holds for the account besides its servers. Read only.

type Res = CloudResourcesOutputBody
type Volume = Res["volumes"][number]
type Backup = Res["backups"][number]

// The states every resource tab shares before it has something to show.
function Gate({
  model: m,
  phone,
  children,
}: {
  model: Model
  phone?: boolean
  children: (r: Res) => ReactNode
}) {
  if (m.resPending) {
    return phone ? (
      <PhoneGroup title="Reading…">
        <PhoneSkeleton />
        <PhoneSkeleton />
      </PhoneGroup>
    ) : (
      <GridSkeleton n={3} h="h-40" />
    )
  }
  const r = m.res
  if (!r) {
    const body = m.resError?.message ?? "Something went wrong."
    return phone ? (
      <PhoneGroup title="Couldn't read">
        <PhoneEmpty>{body}</PhoneEmpty>
      </PhoneGroup>
    ) : (
      <Blank icon={<CircleAlert />} title="Couldn't read this" body={body} />
    )
  }
  if (!r.supported) {
    const body = `${m.account.provider_label} doesn't share disks, firewalls or networks with Morche yet.`
    return phone ? (
      <PhoneGroup title="Not available">
        <PhoneEmpty>{body}</PhoneEmpty>
      </PhoneGroup>
    ) : (
      <Blank icon={<CircleAlert />} title="Not available" body={body} />
    )
  }
  return children(r)
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// ── Disks ────────────────────────────────────────────────────────────────

const diskShows = ["all", "attached", "loose"] as const
type DiskShow = (typeof diskShows)[number]
const diskShowLabel: Record<DiskShow, string> = {
  all: "All",
  attached: "Attached",
  loose: "Not attached",
}

function useDisks(r: Res) {
  const f = useAccountFilters()
  const show = asShow(diskShows, f.show)
  const n = {
    all: r.volumes.length,
    attached: r.volumes.filter((v) => v.server_id).length,
    loose: r.volumes.filter((v) => !v.server_id).length,
  }
  const list = r.volumes
    .filter((v) =>
      show === "attached"
        ? v.server_id
        : show === "loose"
          ? !v.server_id
          : true,
    )
    .filter((v) =>
      textMatches(f.q, v.name, v.id, v.server_name, v.type, v.zone_name),
    )
    .sort(
      (a, b) =>
        Number(!!a.server_id) - Number(!!b.server_id) || b.size_gb - a.size_gb,
    )
  const items = diskShows.map((v) => ({
    value: v,
    label: diskShowLabel[v],
    n: n[v],
  }))
  return { f, show, list, items, n }
}

export function DisksTab({
  model: m,
  phone,
}: {
  model: Model
  phone: boolean
}) {
  return (
    <Gate model={m} phone={phone}>
      {(r) =>
        phone ? (
          <DisksPhone model={m} r={r} />
        ) : (
          <DisksDesktop model={m} r={r} />
        )
      }
    </Gate>
  )
}

function DisksDesktop({ model: m, r }: { model: Model; r: Res }) {
  const { f, show, list, items, n } = useDisks(r)
  const t = m.totals
  if (r.volumes.length === 0) {
    return (
      <Blank
        icon={<HardDrive />}
        title="No extra disks"
        body="Disks added to servers in the provider's panel show up here. The servers' own disks are counted on Overview."
      />
    )
  }
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-x-10 gap-y-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
        <p className="flex flex-col">
          <span className="text-heading font-light tabular-nums">
            {t.volumes}
            <span className="ms-1.5 text-body-sm text-muted-foreground">
              GB
            </span>
          </span>
          <span className="text-caption text-muted-foreground">
            on {plural(n.all, "disk")}
          </span>
        </p>
        <div className="flex min-w-60 flex-1 flex-col gap-2">
          <span className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className="h-full bg-brand"
              style={{
                width: `${((t.volumes - t.volumesLoose) / Math.max(1, t.volumes)) * 100}%`,
              }}
            />
            <span
              className="h-full bg-warning"
              style={{
                width: `${(t.volumesLoose / Math.max(1, t.volumes)) * 100}%`,
              }}
            />
          </span>
          <p className="flex flex-wrap gap-x-5 text-caption text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" />
              {t.volumes - t.volumesLoose} GB attached
            </span>
            {t.volumesLoose > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-warning" />
                {t.volumesLoose} GB not attached, still billed
              </span>
            )}
          </p>
        </div>
      </section>

      <Toolbar>
        <SearchBox
          value={f.q}
          onChange={f.setQ}
          placeholder="Search disks"
          label="Search disks"
        />
        <Segmented
          label="Show"
          value={show}
          onChange={f.setShow}
          items={items.map((i) => ({
            value: i.value,
            label: (
              <>
                {i.label}
                <Count n={i.n} />
              </>
            ),
          }))}
        />
      </Toolbar>

      {list.length === 0 ? (
        <Blank
          icon={<HardDrive />}
          title="No disk matches"
          body="Try other words, or show every disk."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {list.map((v) => (
            <DiskCard key={`${v.region}-${v.id}`} model={m} disk={v} />
          ))}
        </div>
      )}
    </div>
  )
}

function DiskCard({ model: m, disk: v }: { model: Model; disk: Volume }) {
  const link = useServerLink(m)
  const largest = Math.max(1, ...(m.res?.volumes.map((x) => x.size_gb) ?? []))
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
            v.server_id
              ? "bg-brand-soft text-brand-strong"
              : "bg-warning/10 text-warning",
          )}
        >
          <HardDrive />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p dir="auto" className="truncate text-body-sm font-medium">
            {v.name || v.id}
          </p>
          <p className="truncate text-caption text-muted-foreground">
            {[v.type, v.zone_name || v.region].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="shrink-0 text-subheading font-light tabular-nums">
          {v.size_gb}
          <span className="ms-1 text-caption text-muted-foreground">GB</span>
        </p>
      </div>
      <ShareBar
        share={v.size_gb / largest}
        tone={v.server_id ? "bg-brand" : "bg-warning"}
      />
      <div className="flex items-center gap-2 text-caption">
        {v.server_id ? (
          <span className="min-w-0 truncate text-muted-foreground">
            On {link(v.server_id, v.server_name)}
          </span>
        ) : (
          <Tag tone="warning">Not attached</Tag>
        )}
        <span className="ms-auto shrink-0 text-ash">
          {v.status && cap(v.status)}
          {v.created_at && ` · ${dateText(v.created_at)}`}
        </span>
      </div>
    </article>
  )
}

function DisksPhone({ model: m, r }: { model: Model; r: Res }) {
  const { f, show, list, items } = useDisks(r)
  const link = useServerLink(m)
  return (
    <>
      {r.volumes.length > 0 && (
        <div className="pt-4">
          <PhoneChips
            label="Show"
            items={items}
            value={show}
            onChange={f.setShow}
          />
        </div>
      )}
      <PhoneGroup
        title={`${m.totals.volumes} GB`}
        count={list.length}
        className="mt-5"
      >
        {r.volumes.length === 0 ? (
          <PhoneEmpty>No extra disks in this account.</PhoneEmpty>
        ) : list.length === 0 ? (
          <PhoneEmpty>No disk matches.</PhoneEmpty>
        ) : (
          list.map((v) => (
            <PhoneRow
              key={`${v.region}-${v.id}`}
              icon={<HardDrive />}
              title={v.name || v.id}
              sub={
                v.server_id ? (
                  <>On {link(v.server_id, v.server_name)}</>
                ) : (
                  <span className="text-warning">Not attached</span>
                )
              }
              end={`${v.size_gb} GB`}
            />
          ))
        )}
      </PhoneGroup>
    </>
  )
}

// ── Firewalls ────────────────────────────────────────────────────────────

const firewallShows = ["all", "own", "builtin"] as const
type FirewallShow = (typeof firewallShows)[number]
const firewallShowLabel: Record<FirewallShow, string> = {
  all: "All",
  own: "Yours",
  builtin: "Built in",
}

const rulesText = (f: FirewallGroup) =>
  f.min === f.max ? plural(f.max, "rule") : `${f.min}–${f.max} rules`

function useFirewalls(m: Model) {
  const f = useAccountFilters()
  const show = asShow(firewallShows, f.show)
  const n = {
    all: m.firewalls.length,
    own: m.firewalls.filter((x) => !x.builtin).length,
    builtin: m.firewalls.filter((x) => x.builtin).length,
  }
  const list = m.firewalls
    .filter((x) =>
      show === "own" ? !x.builtin : show === "builtin" ? x.builtin : true,
    )
    .filter((x) => textMatches(f.q, x.name, ...x.zones))
  const items = firewallShows.map((v) => ({
    value: v,
    label: firewallShowLabel[v],
    n: n[v],
  }))
  return { f, show, list, items }
}

export function FirewallsTab({
  model: m,
  phone,
}: {
  model: Model
  phone: boolean
}) {
  return (
    <Gate model={m} phone={phone}>
      {() =>
        phone ? <FirewallsPhone model={m} /> : <FirewallsDesktop model={m} />
      }
    </Gate>
  )
}

function FirewallsDesktop({ model: m }: { model: Model }) {
  const { f, show, list, items } = useFirewalls(m)
  if (m.firewalls.length === 0) {
    return (
      <Blank
        icon={<Shield />}
        title="No firewalls"
        body="Firewalls made in the provider's panel show up here."
      />
    )
  }
  const own = list.filter((x) => !x.builtin)
  const builtin = list.filter((x) => x.builtin)
  return (
    <div className="flex flex-col gap-5">
      <Toolbar>
        <SearchBox
          value={f.q}
          onChange={f.setQ}
          placeholder="Search firewalls or zones"
          label="Search firewalls"
        />
        <Segmented
          label="Show"
          value={show}
          onChange={f.setShow}
          items={items.map((i) => ({
            value: i.value,
            label: (
              <>
                {i.label}
                <Count n={i.n} />
              </>
            ),
          }))}
        />
        <span className="ms-auto text-caption text-ash">
          The same firewall in several zones is one row.
        </span>
      </Toolbar>
      {list.length === 0 ? (
        <Blank
          icon={<Shield />}
          title="No firewall matches"
          body="Try other words, or show every firewall."
        />
      ) : (
        <div className="grid items-start gap-6 2xl:grid-cols-2">
          {own.length > 0 && (
            <FirewallPanel title="Yours" icon={<ShieldCheck />} list={own} />
          )}
          {builtin.length > 0 && (
            <FirewallPanel
              title="Built in by the provider"
              icon={<Shield />}
              list={builtin}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FirewallPanel({
  title,
  icon,
  list,
}: {
  title: string
  icon: ReactNode
  list: FirewallGroup[]
}) {
  const most = Math.max(1, ...list.map((f) => f.max))
  return (
    <Panel icon={icon} title={title} count={list.length}>
      <ul className="divide-y divide-border">
        {list.map((f) => (
          <Row
            key={f.key}
            title={f.name}
            tags={f.default && <Tag tone="brand">Default</Tag>}
            sub={zonesText(f.zones)}
            end={
              <span className="flex w-28 flex-col items-end gap-1.5">
                <span className="text-muted-foreground tabular-nums">
                  {rulesText(f)}
                </span>
                <ShareBar share={f.max / most} className="w-full" />
              </span>
            }
          />
        ))}
      </ul>
    </Panel>
  )
}

function FirewallsPhone({ model: m }: { model: Model }) {
  const { f, show, list, items } = useFirewalls(m)
  return (
    <>
      {m.firewalls.length > 0 && (
        <div className="pt-4">
          <PhoneChips
            label="Show"
            items={items}
            value={show}
            onChange={f.setShow}
          />
        </div>
      )}
      <PhoneGroup title="Firewalls" count={list.length} className="mt-5">
        {m.firewalls.length === 0 ? (
          <PhoneEmpty>No firewalls in this account.</PhoneEmpty>
        ) : list.length === 0 ? (
          <PhoneEmpty>No firewall matches.</PhoneEmpty>
        ) : (
          list.map((x) => (
            <PhoneRow
              key={x.key}
              icon={x.builtin ? <Shield /> : <ShieldCheck />}
              title={x.name}
              sub={[
                x.default && "Default",
                x.builtin && "Built in",
                zonesText(x.zones),
              ]
                .filter(Boolean)
                .join(" · ")}
              end={rulesText(x)}
            />
          ))
        )}
      </PhoneGroup>
    </>
  )
}

// ── Private networks ─────────────────────────────────────────────────────

export function NetworksTab({
  model: m,
  phone,
}: {
  model: Model
  phone: boolean
}) {
  const f = useAccountFilters()
  return (
    <Gate model={m} phone={phone}>
      {(r) => {
        const list = r.networks.filter((n) =>
          textMatches(f.q, n.name, n.id, n.region, ...n.subnets),
        )
        if (phone) {
          return (
            <PhoneGroup title="Private networks" count={list.length}>
              {list.length === 0 ? (
                <PhoneEmpty>No private networks in this account.</PhoneEmpty>
              ) : (
                list.map((n) => (
                  <PhoneRow
                    key={`${n.region}-${n.id}`}
                    icon={<Network />}
                    title={n.name || n.id}
                    sub={
                      <span className="font-mono">
                        {n.subnets.join(", ") || "No ranges"}
                      </span>
                    }
                    end={n.status && cap(n.status)}
                  />
                ))
              )}
            </PhoneGroup>
          )
        }
        if (r.networks.length === 0) {
          return (
            <Blank
              icon={<Network />}
              title="No private networks"
              body="Private networks let servers talk to each other without the internet. Ones made in the provider's panel show up here."
            />
          )
        }
        return (
          <div className="flex flex-col gap-5">
            {r.networks.length > 6 && (
              <Toolbar>
                <SearchBox
                  value={f.q}
                  onChange={f.setQ}
                  placeholder="Search name or range"
                  label="Search networks"
                />
              </Toolbar>
            )}
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {list.map((n) => (
                <article
                  key={`${n.region}-${n.id}`}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong [&_svg]:size-5">
                      <Network />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p
                        dir="auto"
                        className="truncate text-body-sm font-medium"
                      >
                        {n.name || n.id}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {n.region}
                      </p>
                    </div>
                    {n.status && (
                      <span className="shrink-0 text-caption text-muted-foreground">
                        {cap(n.status)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-caption text-ash">
                      {n.subnets.length === 1
                        ? "Address range"
                        : plural(n.subnets.length, "address range")}
                    </p>
                    <p className="flex flex-wrap gap-1.5">
                      {n.subnets.length === 0 ? (
                        <span className="text-caption text-ash">None</span>
                      ) : (
                        n.subnets.map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-muted px-2 py-0.5 font-mono text-caption"
                          >
                            {c}
                          </span>
                        ))
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )
      }}
    </Gate>
  )
}

// ── Backup schedules ─────────────────────────────────────────────────────

export function BackupsTab({
  model: m,
  phone,
}: {
  model: Model
  phone: boolean
}) {
  return (
    <Gate model={m} phone={phone}>
      {(r) =>
        phone ? (
          <BackupsPhone model={m} r={r} />
        ) : (
          <BackupsDesktop model={m} r={r} />
        )
      }
    </Gate>
  )
}

// Running servers no schedule (and no provider backup switch) covers.
function uncovered(m: Model, r: Res) {
  const covered = new Set(r.backups.map((b) => b.server_id).filter(Boolean))
  return (m.servers ?? []).filter(
    (s) => s.state === "running" && !s.backups && !covered.has(s.id),
  )
}

function BackupsDesktop({ model: m, r }: { model: Model; r: Res }) {
  const bare = uncovered(m, r)
  const link = useServerLink(m)
  return (
    <div className="flex flex-col gap-6">
      {r.backups.length === 0 ? (
        <Blank
          icon={<History />}
          title="No backup schedules"
          body="The provider can copy a server's disk on a schedule. Schedules made in its panel show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {r.backups.map((b) => (
            <BackupCard key={`${b.region}-${b.id}`} model={m} backup={b} />
          ))}
        </div>
      )}
      {bare.length > 0 && (
        <Panel
          icon={<CircleAlert />}
          title="Running servers without backups"
          count={bare.length}
        >
          <p className="px-5 pt-3 text-caption text-muted-foreground">
            No schedule here covers them. Turn backups on in the{" "}
            {m.account.provider_label} panel, or copy their files with a Morche
            cron job.
          </p>
          <ul className="divide-y divide-border">
            {bare.map((s) => (
              <Row
                key={`${s.region}-${s.id}`}
                title={link(s.id, s.name)}
                sub={s.region_name || s.region}
                end={<CopyAction server={s} />}
              />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

// What can be done for a server without backups: a Morche cron job once
// it's in Morche, else adding it first (nothing is sent to the provider).
function CopyAction({ server: s }: { server: CloudServer }) {
  const actions = useCloudActions()
  const linked = s.linked[0]
  if (linked)
    return (
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={
          <Link
            href={newCronjobHref({
              action: "sync",
              server: linked.id,
              serverName: linked.name,
            })}
          />
        }
      >
        <History />
        Schedule a copy
      </Button>
    )
  if (!actions.canAddToMorche || !mainAddress(s)) return null
  return (
    <Button variant="ghost" size="sm" onClick={() => actions.addToMorche(s)}>
      <SquarePlus />
      Add to Morche first
    </Button>
  )
}

function BackupCard({ model: m, backup: b }: { model: Model; backup: Backup }) {
  const link = useServerLink(m)
  const full = b.max > 0 && b.used >= b.max
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong [&_svg]:size-5">
          <History />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p dir="auto" className="truncate text-body-sm font-medium">
            {b.name || b.id}
          </p>
          <p className="truncate text-caption text-muted-foreground">
            {b.server_id || b.server_name ? (
              <>For {link(b.server_id, b.server_name)}</>
            ) : (
              b.zone_name || b.region
            )}
          </p>
        </div>
        {full && <Tag tone="warning">Full</Tag>}
      </div>
      {b.max > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-baseline justify-between text-caption">
            <span className="text-ash">Copies kept</span>
            <span className="tabular-nums">
              <span className="text-body-sm">{b.used}</span>
              <span className="text-muted-foreground"> of {b.max}</span>
            </span>
          </p>
          <ShareBar
            share={b.used / b.max}
            tone={full ? "bg-warning" : "bg-brand"}
          />
        </div>
      )}
      <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <CalendarClock className="size-3.5" />
        {b.next_at ? `Next copy ${timeAgo(b.next_at)}` : "No next copy planned"}
      </p>
    </article>
  )
}

function BackupsPhone({ model: m, r }: { model: Model; r: Res }) {
  const bare = uncovered(m, r)
  const actions = useCloudActions()
  return (
    <>
      <PhoneGroup title="Backup schedules" count={r.backups.length}>
        {r.backups.length === 0 ? (
          <PhoneEmpty>No backup schedules in this account.</PhoneEmpty>
        ) : (
          r.backups.map((b) => (
            <PhoneRow
              key={`${b.region}-${b.id}`}
              icon={<History />}
              title={b.name || b.id}
              sub={
                <>
                  {b.server_name || b.zone_name}
                  {b.next_at && <> · next {timeAgo(b.next_at)}</>}
                </>
              }
              end={b.max > 0 ? `${b.used}/${b.max}` : undefined}
            />
          ))
        )}
      </PhoneGroup>
      {bare.length > 0 && (
        <PhoneGroup title="Running without backups" count={bare.length}>
          {bare.map((s) => (
            <PhoneRow
              key={`${s.region}-${s.id}`}
              icon={<CircleAlert />}
              title={s.name}
              sub={s.region_name || s.region}
              onClick={() => actions.details(s)}
            />
          ))}
        </PhoneGroup>
      )}
    </>
  )
}
