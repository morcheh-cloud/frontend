"use client"

import { Cable, ChevronDown, Pencil, Wifi } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DiffLines, lineDiff } from "@/components/diff"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import type {
  IfaceConfig,
  NetworkOverview,
  NetworkPreview,
  ServerIface,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useConfigWrite,
  useNetwork,
  usePreviewNetwork,
} from "../../components/config/api"
import {
  clean,
  isCIDR,
  isHostname,
  isIP,
  ListEdit,
} from "../../components/config/fields"
import { HistoryButton, PendingBanner } from "../../components/config/history"
import { Notices, Segmented, StateDot } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { ConfigBar, NetworkTabs } from "./network-view"
import { NotYet, RefreshButton } from "./refresh"

const backendText: Record<string, string> = {
  netplan: "netplan",
  networkmanager: "NetworkManager",
  ifupdown: "/etc/network/interfaces",
  networkd: "systemd-networkd",
  unknown: "unknown",
}

const configOf = (i: ServerIface) => (i.config as IfaceConfig | null) ?? null

export function InterfacesTab() {
  const { server, can } = useServerPage()
  const q = useNetwork(server.id)
  const [editing, setEditing] = useState<ServerIface | null>(null)
  const [open, setOpen] = useOpen("network-iface")
  const refresh = (
    <RefreshButton busy={q.isFetching} onClick={() => q.refetch()} />
  )
  const o = q.data
  if (!o)
    return (
      <>
        <ConfigBar tabs={<NetworkTabs />} actions={refresh} />
        <NotYet error={q.error} what="the network" retry={() => q.refetch()} />
      </>
    )
  const real = o.interfaces.filter((i) => !i.virtual)
  const virtual = o.interfaces.filter((i) => i.virtual)
  const canEdit = o.editable && can("engineer") && !o.pending

  return (
    <>
      <ConfigBar
        tabs={<NetworkTabs />}
        status={
          <>
            Set up by {backendText[o.backend] ?? o.backend}
            {o.backend === "netplan" && ` (${o.renderer})`}
          </>
        }
        actions={
          <>
            <HistoryButton area="network" />
            {refresh}
          </>
        }
      />
      {o.pending && <PendingBanner area="network" pending={o.pending} />}
      <Notices notes={o.note ? [{ key: "note", title: o.note }] : []} />
      <div className="grid gap-4 max-md:gap-0 max-md:divide-y max-md:divide-border md:grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]">
        {real.map((i) => (
          <IfaceCard
            key={i.name}
            i={i}
            o={o}
            onEdit={
              canEdit && configOf(i)
                ? () => {
                    setEditing(i)
                    setOpen(true)
                  }
                : undefined
            }
          />
        ))}
      </div>
      {virtual.length > 0 && <VirtualList list={virtual} />}
      {editing && (
        <IfaceEditor
          key={editing.name}
          o={o}
          iface={editing}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}

function IfaceCard({
  i,
  o,
  onEdit,
}: {
  i: ServerIface
  o: NetworkOverview
  onEdit?: () => void
}) {
  const cfg = configOf(i)
  const Icon = i.kind === "wifi" ? Wifi : Cable
  const how = !cfg
    ? "Not in the config Morche reads"
    : [cfg.dhcp4 && "DHCP", cfg.addresses.length > 0 && "Fixed address"]
        .filter(Boolean)
        .join(" + ") || "No address set"
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-5 max-md:rounded-none max-md:border-0 max-md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-body font-medium">
            <StateDot
              tone={i.state === "up" ? "success" : "muted"}
              label={i.state === "up" ? "Up" : "Down"}
            />
            <span className="truncate">{i.name}</span>
            {i.carries_morche && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 font-label text-caption tracking-label text-brand-strong uppercase">
                Morche
              </span>
            )}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {how}
            {i.connection && ` · ${i.connection}`}
          </span>
        </div>
        {onEdit && (
          <Button
            variant="outline"
            size="icon"
            className="max-md:size-11"
            aria-label={`Change ${i.name}`}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-muted-foreground">Addresses</dt>
        <dd className="min-w-0 font-mono text-caption leading-6 break-all">
          {i.addresses.join(", ") || "—"}
        </dd>
        <dt className="text-muted-foreground">Gateway</dt>
        <dd className="font-mono text-caption leading-6">{i.gateway || "—"}</dd>
        {cfg && cfg.dns.length > 0 && (
          <>
            <dt className="text-muted-foreground">DNS</dt>
            <dd className="font-mono text-caption leading-6 break-all">
              {cfg.dns.join(", ")}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">MAC · MTU</dt>
        <dd className="font-mono text-caption leading-6">
          {i.mac || "—"} · {i.mtu}
        </dd>
      </dl>
      {i.carries_morche && (
        <p className="text-caption text-ash">
          Morche connects through here ({o.morche_at}). A change that cuts it
          off undoes itself.
        </p>
      )}
    </section>
  )
}

function VirtualList({ list }: { list: ServerIface[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2 max-md:px-4 max-md:pt-4">
      <button
        type="button"
        className="flex items-center gap-1 self-start text-caption text-muted-foreground hover:text-foreground max-md:min-h-11"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown
          className={cn("size-4 transition-transform", !open && "-rotate-90")}
        />
        {list.length} virtual interfaces (Docker, bridges) — shown, not edited
      </button>
      {open && (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {list.map((i) => (
            <li
              key={i.name}
              className="flex min-w-0 items-center gap-3 px-4 py-2"
            >
              <StateDot
                tone={i.state === "up" ? "success" : "muted"}
                label={i.state === "up" ? "Up" : "Down"}
              />
              <span className="w-40 truncate font-mono text-caption">
                {i.name}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">
                {i.addresses.join(", ") || "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IfaceEditor({
  o,
  iface,
  open,
  onOpenChange,
}: {
  o: NetworkOverview
  iface: ServerIface
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { server } = useServerPage()
  const start = configOf(iface) ?? (iface.config as IfaceConfig)
  const [mode, setMode] = useState<"dhcp" | "static">(
    start.dhcp4 ? "dhcp" : "static",
  )
  const [addresses, setAddresses] = useState(start.addresses)
  const [gateway, setGateway] = useState(start.gateway4)
  const [dns, setDns] = useState(start.dns)
  const [search, setSearch] = useState(start.search)
  const [mtu, setMtu] = useState(start.mtu ? String(start.mtu) : "")
  const [more, setMore] = useState(!!start.mtu || start.search.length > 0)
  const [review, setReview] = useState<NetworkPreview | null>(null)
  const [confirm, setConfirm] = useState(false)
  const preview = usePreviewNetwork(server.id)
  const write = useConfigWrite(server.id)

  const cfg: IfaceConfig = {
    name: iface.name,
    dhcp4: mode === "dhcp",
    dhcp6: start.dhcp6,
    addresses: clean(addresses),
    gateway4: mode === "static" ? gateway.trim() : "",
    gateway6: start.gateway6,
    dns: clean(dns),
    search: clean(search),
    mtu: mtu ? Number(mtu) : 0,
  }
  const problem = cfg.addresses.some((a) => !isCIDR(a))
    ? "Write each address with its prefix, like 192.168.1.10/24"
    : mode === "static" && cfg.addresses.length === 0
      ? "Give at least one address, or use DHCP"
      : cfg.gateway4 && !isIP(cfg.gateway4)
        ? "The gateway is not an IP address"
        : cfg.dns.some((d) => !isIP(d))
          ? "A DNS server is not an IP address"
          : cfg.search.some((d) => !isHostname(d))
            ? "A search domain is not valid"
            : mtu &&
                (!/^\d+$/.test(mtu) || Number(mtu) < 576 || Number(mtu) > 9216)
              ? "MTU is 576 to 9216"
              : ""

  const body = (needs?: NetworkPreview["needs"]) => ({
    revision: o.revision,
    iface: cfg,
    confirm_address_change: needs === "confirm_address_change" && confirm,
    disable_cloud_init: needs === "disable_cloud_init" && confirm,
  })

  const toReview = () =>
    preview.mutate(body(), {
      onSuccess: (p) => {
        setReview(p)
        setConfirm(false)
      },
      onError: (e) => toast.error(e.message),
    })

  const apply = () =>
    write.mutate(
      { kind: "network", body: body(review?.needs) },
      {
        onSuccess: () => {
          toast.success(
            "Applied. Check the server still answers, then press Keep it.",
          )
          onOpenChange(false)
        },
        onError: (e) => toast.error(e.message),
      },
    )

  const blocked = !!review?.needs && !confirm

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={review ? `Review ${iface.name}` : `Change ${iface.name}`}
      className="md:max-w-2xl"
      footer={
        review ? (
          <>
            <Button variant="outline" onClick={() => setReview(null)}>
              Back
            </Button>
            <Button disabled={blocked || write.isPending} onClick={apply}>
              {write.isPending ? "Applying…" : "Apply"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!!problem || preview.isPending}
              onClick={toReview}
            >
              Review
            </Button>
          </>
        )
      }
    >
      {review ? (
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-body-sm text-muted-foreground">
            After Apply you have 90 seconds to press Keep it. If you don't, or
            Morche can't reach the server, it goes back by itself.
          </p>
          {review.warnings.map((w) => (
            <p key={w} className="rounded-lg bg-warning/10 p-3 text-body-sm">
              {w}
            </p>
          ))}
          {review.needs && (
            // biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control
            <label className="flex items-start gap-3 rounded-lg border border-destructive/40 p-3 text-body-sm">
              <Checkbox
                checked={confirm}
                onCheckedChange={(v) => setConfirm(!!v)}
                className="mt-0.5"
              />
              <span>
                {review.problem}{" "}
                <strong className="font-medium">
                  {review.needs === "disable_cloud_init"
                    ? "Also turn off cloud-init's network config."
                    : "I understand, go ahead."}
                </strong>
              </span>
            </label>
          )}
          {review.files.map((f) => (
            <div key={f.path} className="flex min-w-0 flex-col gap-1.5">
              <span className="truncate font-mono text-caption text-muted-foreground">
                {f.path}
              </span>
              <DiffLines
                lines={lineDiff(f.before, f.after)}
                className="[contain:inline-size]"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground">
              Then runs
            </span>
            <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-caption [contain:inline-size]">
              {review.commands.join("\n")}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          <Segmented
            label="How it gets an address"
            items={[
              { value: "dhcp", label: "Automatic (DHCP)" },
              { value: "static", label: "Fixed address" },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === "static" && (
            <>
              <Field
                label="Addresses"
                hint="With the prefix: 192.168.1.10/24 means the 192.168.1.x network."
              >
                {() => (
                  <ListEdit
                    values={addresses}
                    onChange={setAddresses}
                    placeholder="192.168.1.10/24"
                    addLabel="Add an address"
                    check={isCIDR}
                    problem="Like 192.168.1.10/24"
                  />
                )}
              </Field>
              <Field
                label="Gateway"
                hint="The router to the rest of the network. Empty = none."
              >
                {(p) => (
                  <Input
                    {...p}
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    placeholder="192.168.1.1"
                    className="font-mono"
                    inputMode="decimal"
                  />
                )}
              </Field>
            </>
          )}
          <Field
            label="DNS servers"
            hint="Set on this interface. Empty = what DHCP or the DNS tab gives."
          >
            {() => (
              <ListEdit
                values={dns}
                onChange={setDns}
                placeholder="1.1.1.1"
                addLabel="Add a DNS server"
                check={isIP}
                problem="Not an IP address"
                inputMode="decimal"
              />
            )}
          </Field>
          <button
            type="button"
            className="flex items-center gap-1 self-start text-body-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMore(!more)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                !more && "-rotate-90",
              )}
            />
            More options
          </button>
          {more && (
            <>
              <Field label="Search domains">
                {() => (
                  <ListEdit
                    values={search}
                    onChange={setSearch}
                    placeholder="corp.lan"
                    addLabel="Add a domain"
                    check={isHostname}
                    problem="Not a domain"
                  />
                )}
              </Field>
              <Field
                label="MTU"
                hint="Empty = the default (usually 1500). Clearing a set MTU takes effect after a reboot."
              >
                {(p) => (
                  <Input
                    {...p}
                    value={mtu}
                    onChange={(e) => setMtu(e.target.value)}
                    placeholder="1500"
                    inputMode="decimal"
                    className="w-32"
                  />
                )}
              </Field>
            </>
          )}
          {problem && (
            <p className="text-body-sm text-destructive">{problem}</p>
          )}
        </div>
      )}
    </ResponsiveDialog>
  )
}
