"use client"

import {
  ArrowUpCircle,
  ChevronRight,
  CircleCheck,
  RotateCw,
  ShieldAlert,
} from "lucide-react"
import { useRef, useState } from "react"
import { Th } from "@/app/(panel)/scripts/components/scripts-view"
import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useOpen } from "@/hooks/useOpen"
import type { Recipe, SoftwareHost, SoftwareInstall } from "@/lib/services"
import { cn } from "@/lib/utils"
import { InstallRows, InstallsTable, sortInstalls } from "./installed"
import { Layer, LayerBody, LayerFooter } from "./parts"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

export function hostNeedsWork(h: SoftwareHost) {
  return h.upgradable > 0 || h.reboot_required
}

// How many things on the Updates tab want a look.
export function updateCount(items: SoftwareInstall[], hosts: SoftwareHost[]) {
  return (
    items.filter((i) => i.update_available).length +
    hosts.filter((h) => h.upgradable > 0).length
  )
}

export function UpdatesPanel({
  phone,
  items,
  hosts,
  recipes,
}: {
  phone: boolean
  items: SoftwareInstall[]
  hosts: SoftwareHost[]
  recipes: Recipe[]
}) {
  const a = useSoftwareActions()
  const can = useSoftwareCan()
  const apps = sortInstalls(items.filter((i) => i.update_available))
  const updatable = apps.filter((i) => can.updateOn(i))
  const servers = hosts
    .filter(hostNeedsWork)
    .sort(
      (x, y) =>
        y.security - x.security ||
        y.upgradable - x.upgradable ||
        x.server_name.localeCompare(y.server_name),
    )

  if (apps.length === 0 && servers.length === 0) {
    return (
      <Empty
        icon={CircleCheck}
        title="Everything is up to date"
        body={
          hosts.length
            ? `As of the last check of ${hosts.length} ${hosts.length === 1 ? "server" : "servers"}. Morcheh looks again every few hours.`
            : "No server has been checked yet: Check servers looks for applications and package updates."
        }
        action={
          <Button
            variant="outline"
            className="h-11 w-full md:h-9 md:w-auto"
            disabled={a.scanning}
            onClick={() => a.scan()}
          >
            <RotateCw />
            Check servers
          </Button>
        }
      />
    )
  }

  return (
    <div className={cn("flex flex-col", phone ? "gap-6" : "gap-8")}>
      {apps.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading
            phone={phone}
            title="Applications"
            count={apps.length}
            action={
              updatable.length > 0 && (
                <Button
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => a.update(updatable)}
                >
                  <ArrowUpCircle />
                  Update all
                </Button>
              )
            }
          />
          {phone ? (
            <InstallRows items={apps} recipes={recipes} />
          ) : (
            <InstallsTable items={apps} recipes={recipes} />
          )}
        </section>
      )}
      {servers.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading
            phone={phone}
            title="System packages"
            count={servers.length}
            hint="Updates the servers' package managers have waiting."
          />
          <Hosts phone={phone} hosts={servers} />
        </section>
      )}
    </div>
  )
}

function Heading({
  phone,
  title,
  count,
  hint,
  action,
}: {
  phone: boolean
  title: string
  count: number
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className={cn("flex items-center gap-3", phone && "px-4")}>
      <div className="min-w-0 flex-1">
        <h2 className="text-body font-medium">
          {title} <span className="font-normal text-ash">{count}</span>
        </h2>
        {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

function Hosts({ phone, hosts }: { phone: boolean; hosts: SoftwareHost[] }) {
  const a = useSoftwareActions()
  const can = useSoftwareCan()
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const allowed = (h: SoftwareHost) =>
    can.updateOn({ server_id: h.server_id, workspace_id: ws })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [open, setOpen] = useOpen("software-packages")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<SoftwareHost | null>(null)
  const current = hosts.find((h) => h.server_id === id) ?? last.current
  if (current) last.current = current
  const show = (h: SoftwareHost) => {
    setId(h.server_id)
    setOpen(true)
  }
  const chosen = hosts.filter((h) => picked.has(h.server_id) && allowed(h))
  const upgrade = (list: SoftwareHost[], securityOnly?: boolean) =>
    a.upgradeSystem(
      list.map((h) => ({ server_id: h.server_id, server_name: h.server_name })),
      securityOnly,
    )

  const layer = (
    <PackagesLayer
      open={open}
      onOpenChange={setOpen}
      host={current}
      canUpgrade={current ? allowed(current) : false}
      onUpgrade={(securityOnly) => {
        if (!current) return
        window.addEventListener(
          "popstate",
          () => upgrade([current], securityOnly),
          { once: true },
        )
        setOpen(false)
      }}
    />
  )

  if (phone) {
    return (
      <>
        <ul className="divide-y divide-border border-y border-border">
          {hosts.map((h) => (
            <li key={h.server_id}>
              <button
                type="button"
                onClick={() => show(h)}
                className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-medium">
                    {h.server_name}
                  </span>
                  <HostSummary h={h} />
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          ))}
        </ul>
        {layer}
      </>
    )
  }

  const all =
    chosen.length > 0 && chosen.length === hosts.filter(allowed).length
  return (
    <div className="flex flex-col gap-2">
      <div className="@container overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 ps-4">
                <Checkbox
                  aria-label="Select all"
                  checked={all}
                  indeterminate={chosen.length > 0 && !all}
                  onCheckedChange={() =>
                    setPicked(
                      all
                        ? new Set()
                        : new Set(
                            hosts.filter(allowed).map((h) => h.server_id),
                          ),
                    )
                  }
                />
              </th>
              <Th>Server</Th>
              <Th>Updates</Th>
              <Th className="hidden @3xl:table-cell">Package manager</Th>
              <Th className="hidden @4xl:table-cell">Checked</Th>
              <th scope="col" className="w-40">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hosts.map((h) => (
              <tr
                key={h.server_id}
                className="h-14 cursor-pointer hover:bg-subtle"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return
                  show(h)
                }}
              >
                <td className="ps-4">
                  <Checkbox
                    aria-label={`Select ${h.server_name}`}
                    disabled={!allowed(h)}
                    checked={picked.has(h.server_id)}
                    onCheckedChange={() =>
                      setPicked((p) => {
                        const n = new Set(p)
                        if (n.has(h.server_id)) n.delete(h.server_id)
                        else n.add(h.server_id)
                        return n
                      })
                    }
                  />
                </td>
                <td className="max-w-56 truncate px-3 font-medium">
                  {h.server_name}
                </td>
                <td className="px-3">
                  <HostSummary h={h} />
                </td>
                <td className="hidden px-3 text-muted-foreground @3xl:table-cell">
                  {h.pm || "—"}
                </td>
                <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
                  {timeAgo(h.checked_at)}
                </td>
                <td className="pe-3 text-end">
                  {allowed(h) && h.upgradable > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => upgrade([h])}
                    >
                      <ArrowUpCircle />
                      Upgrade
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chosen.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 self-center rounded-2xl border border-border bg-card px-4 py-2 shadow-md">
          <span className="text-body-sm font-medium">
            {chosen.length} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => upgrade(chosen, true)}
          >
            <ShieldAlert />
            Security only
          </Button>
          <Button size="sm" onClick={() => upgrade(chosen)}>
            <ArrowUpCircle />
            Upgrade
          </Button>
        </div>
      )}
      {layer}
    </div>
  )
}

function HostSummary({ h }: { h: SoftwareHost }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-caption">
      {h.upgradable > 0 && (
        <span className="text-muted-foreground">
          {h.upgradable} {h.upgradable === 1 ? "package" : "packages"}
        </span>
      )}
      {h.security > 0 && (
        <span className="text-warning">{h.security} security</span>
      )}
      {h.reboot_required && <span className="text-warning">Reboot needed</span>}
    </span>
  )
}

// The packages one server has waiting, and its Upgrade buttons.
function PackagesLayer({
  open,
  onOpenChange,
  host: h,
  canUpgrade,
  onUpgrade,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  host: SoftwareHost | null
  canUpgrade: boolean
  onUpgrade: (securityOnly: boolean) => void
}) {
  const [q, setQ] = useState("")
  if (!h) return null
  const t = q.trim().toLowerCase()
  const list = [...h.packages]
    .sort(
      (a, b) =>
        Number(!!b.security) - Number(!!a.security) ||
        a.name.localeCompare(b.name),
    )
    .filter((p) => !t || p.name.toLowerCase().includes(t))
  const more = h.upgradable - h.packages.length

  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={`Updates on ${h.server_name}`}
      description={`${h.pm || "Package manager"} · checked ${timeAgo(h.checked_at)}`}
    >
      <LayerBody className="gap-4">
        {h.reboot_required && (
          <p className="rounded-2xl border border-border bg-subtle px-4 py-3 text-body-sm">
            <span className="font-medium text-warning">Reboot needed.</span>{" "}
            <span className="text-muted-foreground">
              Something installed earlier asks for a restart: use Power on the
              server's page when it suits you.
            </span>
          </p>
        )}
        {h.packages.length > 8 && (
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search packages"
            label="Search packages"
            className="md:w-full"
          />
        )}
        {list.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            {h.upgradable
              ? "No package matches."
              : "No package update waiting."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {list.map((p) => (
              <li
                key={p.name}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-body-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                </span>
                {p.security && (
                  <span className="text-caption text-warning">Security</span>
                )}
                <span className="w-full truncate font-mono text-caption text-muted-foreground md:w-auto">
                  {p.version ? `${p.version} → ` : ""}
                  {p.latest}
                </span>
              </li>
            ))}
          </ul>
        )}
        {more > 0 && !t && (
          <p className="text-caption text-ash">and {more} more</p>
        )}
      </LayerBody>
      {canUpgrade && h.upgradable > 0 && (
        <LayerFooter>
          {h.security > 0 && (
            <Button
              variant="outline"
              className="h-11 flex-1 md:h-9 md:flex-none"
              onClick={() => onUpgrade(true)}
            >
              <ShieldAlert />
              Security only
            </Button>
          )}
          <Button
            className="ms-auto h-11 flex-1 md:h-9 md:flex-none"
            onClick={() => onUpgrade(false)}
          >
            <ArrowUpCircle />
            Upgrade all
          </Button>
        </LayerFooter>
      )}
    </Layer>
  )
}
