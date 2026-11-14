"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpFromLine,
  Cable,
  Copy,
  Disc,
  Disc3,
  HardDrive,
  Network,
  Pencil,
  Plus,
  Trash2,
  Unplug,
} from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"

import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { PVEGuestDetail } from "@/lib/services"
import { cn } from "@/lib/utils"

import type { Item } from "../../../../servers/[id]/components/parts"
import {
  useCreateOptions,
  useResizeDisk,
  useSetConfig,
  vmKeys,
} from "../../../api"
import { Callout, CheckRow, Pick } from "../../../components/form-parts"
import {
  errorText,
  Footer,
  freeText,
  storagesFor,
} from "../../../components/guest-dialogs"
import { guestState, kindNoun } from "../../../components/meta"
import { copy } from "../../../components/vm-actions"
import {
  busLabels,
  type Disk,
  disksOf,
  mib,
  type Nic,
  nextKey,
  nicsOf,
  osLabel,
  osLabels,
  parseProps,
  sizeToBytes,
  yes,
} from "./config"
import { useGuestPage } from "./guest-page"
import { MenuRow, Pairs, Panel, TabBody, Tag } from "./kit"

type Layer =
  | { kind: "compute" }
  | { kind: "options" }
  | { kind: "add-disk" }
  | { kind: "resize"; disk: Disk }
  | { kind: "cd"; disk: Disk }
  | { kind: "detach"; disk: Disk }
  | { kind: "attach"; disk: Disk }
  | { kind: "destroy"; disk: Disk }
  | { kind: "nic"; nic?: Nic }
  | { kind: "remove-nic"; nic: Nic }

export function HardwareTab() {
  const { guest: g, phone, can } = useGuestPage()
  const edit = can("engineer")
  const owner = can("owner")
  const config = g.config ?? {}
  const disks = disksOf(config)
  const nics = nicsOf(config, g.kind)
  const qemu = g.kind === "qemu"
  const [layer, setLayer] = useState<Layer | null>(null)
  const [open, setOpen] = useOpen("vm-hardware")
  const show = (l: Layer) => {
    setLayer(l)
    setOpen(true)
  }

  const editButton = (l: Layer, label = "Edit") =>
    edit && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => show(l)}
        className="max-md:hidden"
      >
        <Pencil />
        {label}
      </Button>
    )
  const phoneEdit = (l: Layer, label: string) =>
    edit && (
      <Button
        variant="outline"
        size="lg"
        onClick={() => show(l)}
        className="mt-3 w-full md:hidden"
      >
        <Pencil />
        {label}
      </Button>
    )

  const diskMenu = (d: Disk): Item[][] => {
    const work: Item[] = []
    const danger: Item[] = []
    if (edit && d.grows)
      work.push({
        key: "resize",
        label: "Make bigger…",
        icon: <ArrowUpFromLine />,
        onSelect: () => show({ kind: "resize", disk: d }),
      })
    if (edit && d.cdrom && !d.cloudinit)
      work.push({
        key: "cd",
        label:
          d.volume && d.volume !== "none"
            ? "Change the ISO…"
            : "Insert an ISO…",
        icon: <Disc3 />,
        onSelect: () => show({ kind: "cd", disk: d }),
      })
    if (edit && d.bus === "unused" && qemu)
      work.push({
        key: "attach",
        label: "Attach again…",
        icon: <Cable />,
        onSelect: () => show({ kind: "attach", disk: d }),
      })
    if (edit && d.bus !== "unused" && d.key !== "rootfs" && !d.cloudinit)
      danger.push({
        key: "detach",
        label: d.cdrom ? "Remove the drive" : "Detach",
        icon: <Unplug />,
        onSelect: () => show({ kind: "detach", disk: d }),
      })
    if (owner && d.bus === "unused")
      danger.push({
        key: "destroy",
        label: "Delete the disk…",
        icon: <Trash2 />,
        destructive: true,
        onSelect: () => show({ kind: "destroy", disk: d }),
      })
    const info: Item[] = d.volume
      ? [
          {
            key: "copy",
            label: "Copy volume ID",
            icon: <Copy />,
            onSelect: () => copy(d.volume, "Volume ID"),
          },
        ]
      : []
    return [work, info, danger]
  }

  const nicMenu = (n: Nic): Item[][] => [
    edit
      ? [
          {
            key: "edit",
            label: "Edit…",
            icon: <Pencil />,
            onSelect: () => show({ kind: "nic", nic: n }),
          },
        ]
      : [],
    n.mac
      ? [
          {
            key: "mac",
            label: "Copy MAC address",
            icon: <Copy />,
            onSelect: () => copy(n.mac, "MAC address"),
          },
        ]
      : [],
    edit
      ? [
          {
            key: "remove",
            label: "Remove",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => show({ kind: "remove-nic", nic: n }),
          },
        ]
      : [],
  ]

  return (
    <TabBody>
      {g.pending?.length > 0 && <PendingPanel guest={g} />}
      <div className="grid gap-4 max-md:gap-0 xl:grid-cols-2">
        <Panel
          title="Processor and memory"
          aside={editButton({ kind: "compute" })}
        >
          <Pairs
            items={
              qemu
                ? [
                    {
                      label: "Processor",
                      value: cpuText(config),
                    },
                    {
                      label: "CPU type",
                      value: config.cpu || "kvm64 (default)",
                      mono: true,
                    },
                    { label: "Memory", value: mib(config.memory) || "512 MiB" },
                    {
                      label: "Ballooning",
                      value:
                        config.balloon === "0"
                          ? "Off"
                          : config.balloon
                            ? `Down to ${mib(config.balloon)}`
                            : "On",
                    },
                  ]
                : [
                    {
                      label: "Cores",
                      value: config.cores || "All of the node's",
                    },
                    {
                      label: "CPU limit",
                      value:
                        config.cpulimit && config.cpulimit !== "0"
                          ? `${config.cpulimit} cores`
                          : "",
                    },
                    { label: "Memory", value: mib(config.memory) || "512 MiB" },
                    { label: "Swap", value: mib(config.swap) || "512 MiB" },
                  ]
            }
          />
          {phoneEdit({ kind: "compute" }, "Change processor and memory")}
        </Panel>

        <Panel title="Options" aside={editButton({ kind: "options" })}>
          <Pairs
            items={[
              {
                label: qemu ? "Name" : "Hostname",
                value: qemu ? config.name : config.hostname,
              },
              {
                label: "Start at boot",
                value: yes(config.onboot) ? "Yes" : "No",
              },
              {
                label: "Protected",
                value: yes(config.protection) ? "Yes, can't be deleted" : "No",
              },
              {
                label: qemu ? "Guest OS" : "Distribution",
                value: osLabel(config.ostype),
              },
              qemu && {
                label: "Firmware",
                value:
                  config.bios === "ovmf" ? "UEFI (OVMF)" : "BIOS (SeaBIOS)",
              },
              qemu && {
                label: "Guest agent",
                value:
                  yes(parseProps(config.agent ?? "").head) ||
                  yes(parseProps(config.agent ?? "").props.enabled)
                    ? "On"
                    : "Off",
              },
              qemu && {
                label: "Boot order",
                value: bootText(config.boot),
                mono: true,
              },
              !qemu && {
                label: "Unprivileged",
                value: yes(config.unprivileged) ? "Yes" : "No",
              },
              !qemu && {
                label: "Features",
                value: config.features,
                mono: true,
              },
              {
                label: "Tags",
                value: g.tags?.length ? (
                  <span className="flex flex-wrap gap-1">
                    {g.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </span>
                ) : (
                  ""
                ),
              },
            ]}
          />
          {phoneEdit({ kind: "options" }, "Change options")}
        </Panel>

        <Panel
          title={`Disks · ${disks.length}`}
          flush
          className="xl:col-span-2"
          aside={
            edit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => show({ kind: "add-disk" })}
              >
                <Plus />
                {qemu ? "Add disk" : "Add mount point"}
              </Button>
            )
          }
        >
          <div className="divide-y divide-border pb-2">
            {disks.map((d) => (
              <MenuRow
                key={d.key}
                id={`disk-${d.key}`}
                phone={phone}
                label={`${diskTitle(d)} actions`}
                icon={d.cdrom ? <Disc /> : <HardDrive />}
                title={
                  <>
                    <span>{diskTitle(d)}</span>
                    <span className="font-mono text-caption text-ash">
                      {d.key}
                    </span>
                    {d.cloudinit && <Tag tone="brand">Cloud-init</Tag>}
                    {d.cdrom && !d.cloudinit && <Tag>CD/DVD</Tag>}
                    {d.bus === "unused" && (
                      <Tag tone="warning">Not attached</Tag>
                    )}
                    {isBootDisk(config, d.key) && <Tag>Boots from</Tag>}
                  </>
                }
                sub={diskSub(d)}
                aside={d.size && !d.cdrom ? sizeText(d.size) : undefined}
                groups={diskMenu(d)}
              />
            ))}
            {disks.length === 0 && (
              <p className="px-5 py-4 text-body-sm text-muted-foreground">
                No disks.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title={`Network · ${nics.length}`}
          flush
          className="xl:col-span-2"
          aside={
            edit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => show({ kind: "nic" })}
              >
                <Plus />
                Add network device
              </Button>
            )
          }
        >
          <div className="divide-y divide-border pb-2">
            {nics.map((n) => (
              <MenuRow
                key={n.key}
                id={`nic-${n.key}`}
                phone={phone}
                label={`${n.key} actions`}
                icon={<Network />}
                title={
                  <>
                    <span>{qemu ? n.key : n.name}</span>
                    <span className="text-caption font-normal text-muted-foreground">
                      {qemu ? n.model : n.key}
                    </span>
                    {n.firewall && <Tag>Firewall</Tag>}
                    {n.vlan && <Tag>VLAN {n.vlan}</Tag>}
                    {n.disconnected && <Tag tone="warning">Unplugged</Tag>}
                  </>
                }
                sub={[
                  n.bridge && `on ${n.bridge}`,
                  !qemu &&
                    (n.ip ? `IPv4 ${n.ip === "dhcp" ? "DHCP" : n.ip}` : ""),
                  !qemu && n.gw && `gateway ${n.gw}`,
                  n.rate && `limit ${n.rate} MB/s`,
                  n.mac,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                groups={nicMenu(n)}
              />
            ))}
            {nics.length === 0 && (
              <p className="px-5 py-4 text-body-sm text-muted-foreground">
                No network devices: it can't reach the network.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {layer && (
        <HardwareLayer
          guest={g}
          layer={layer}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </TabBody>
  )
}

// ---- display helpers

function cpuText(config: Record<string, string>) {
  const sockets = Number(config.sockets || 1)
  const cores = Number(config.cores || 1)
  const total = sockets * cores
  return sockets > 1
    ? `${total} vCPUs (${sockets} sockets × ${cores} cores)`
    : `${total} vCPU${total === 1 ? "" : "s"}`
}

function bootText(boot?: string) {
  if (!boot) return ""
  const order = parseProps(boot).props.order
  return order ? order.split(";").join(" → ") : boot
}

function isBootDisk(config: Record<string, string>, key: string) {
  const order = parseProps(config.boot ?? "").props.order
  if (order) return order.split(";")[0] === key
  return config.bootdisk === key
}

function diskTitle(d: Disk) {
  if (d.bus === "rootfs") return "Root disk"
  if (d.bus === "mp")
    return d.mountpoint ? `Mounted at ${d.mountpoint}` : "Mount point"
  const n = d.key.slice(d.bus.length)
  return `${busLabels[d.bus] ?? d.bus} ${n}`.trim()
}

function diskSub(d: Disk) {
  if (d.cdrom && !d.cloudinit)
    return !d.volume || d.volume === "none" || d.volume === "cdrom"
      ? "Empty"
      : d.volume
  const flags = [
    d.props.discard === "on" && "discard",
    d.props.ssd === "1" && "SSD",
    d.props.iothread === "1" && "IO thread",
    d.props.cache && `cache ${d.props.cache}`,
    d.props.backup === "0" && "left out of backups",
  ].filter(Boolean)
  return [d.volume, ...flags].join(" · ")
}

// "32G" → "32 GiB"
function sizeText(size: string) {
  const bytes = sizeToBytes(size)
  return bytes ? formatSize(bytes) : size
}

// ---- pending changes

function PendingPanel({ guest: g }: { guest: PVEGuestDetail }) {
  return (
    <Panel
      title="Waiting for a restart"
      aside={
        <span>
          {g.pending.length} change{g.pending.length === 1 ? "" : "s"}
        </span>
      }
    >
      <p className="mb-2 text-body-sm text-muted-foreground">
        These take effect the next time the {kindNoun(g.kind)} starts. A restart
        from inside the guest isn't enough: use Reboot here.
      </p>
      <dl className="divide-y divide-border text-body-sm">
        {g.pending.map((p) => (
          <div
            key={p.key}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2"
          >
            <dt className="w-28 shrink-0 font-mono text-caption">{p.key}</dt>
            <dd className="min-w-0 flex-1 font-mono text-caption break-all">
              {p.delete ? (
                <span className="text-destructive">
                  {p.value || "(set)"} → removed
                </span>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {p.value || "(not set)"}
                  </span>
                  {" → "}
                  <span className="text-foreground">{p.pending}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

// ---- saving

// One save for every dialog: sends the digest, so a change made elsewhere in
// the meantime comes back as 409 instead of being overwritten.
function useSave(g: PVEGuestDetail) {
  const set = useSetConfig(g.cluster_id, g.vmid)
  const queryClient = useQueryClient()
  const [error, setError] = useState<ReactNode>("")
  const reload = () =>
    queryClient.invalidateQueries({
      queryKey: vmKeys.guest(g.cluster_id, g.vmid),
    })

  const save = (
    body: { set?: Record<string, string>; delete?: string[] },
    done: () => void,
  ) => {
    setError("")
    const empty =
      !Object.keys(body.set ?? {}).length && !(body.delete ?? []).length
    if (empty) return done()
    set.mutate(
      {
        set: Object.keys(body.set ?? {}).length ? body.set : undefined,
        delete: body.delete?.length ? body.delete : undefined,
        digest: g.digest || undefined,
      },
      {
        onSuccess: () => {
          done()
          reload()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setError(
              <span>
                {err.message}{" "}
                <button
                  type="button"
                  className="font-medium text-brand underline-offset-2 hover:underline"
                  onClick={() => {
                    reload()
                    setError("")
                  }}
                >
                  Reload
                </button>
              </span>,
            )
            return
          }
          setError(errorText(err))
        },
      },
    )
  }
  return { save, pending: set.isPending, error }
}

// What changed between the saved config and the form.
function diff(
  config: Record<string, string>,
  next: Record<string, string>,
): { set: Record<string, string>; delete: string[] } {
  const set: Record<string, string> = {}
  const del: string[] = []
  for (const [k, v] of Object.entries(next)) {
    const now = config[k] ?? ""
    if (v === now) continue
    if (v === "") {
      if (k in config) del.push(k)
    } else set[k] = v
  }
  return { set, delete: del }
}

const positive = (v: string) => /^[1-9][0-9]*$/.test(v.trim())

function ErrorLine({ error }: { error: ReactNode }) {
  if (!error) return null
  return (
    <p role="alert" className="text-body-sm text-destructive">
      {error}
    </p>
  )
}

function RunningNote({
  guest: g,
  children,
}: {
  guest: PVEGuestDetail
  children?: ReactNode
}) {
  if (guestState(g) !== "running") return null
  return (
    <Callout tone="muted">
      {children ??
        `It's running: what can't change live waits for the next start and shows under "Waiting for a restart".`}
    </Callout>
  )
}

// ---- dialogs

function HardwareLayer({
  guest,
  layer,
  open,
  onOpenChange,
}: {
  guest: PVEGuestDetail
  layer: Layer
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const props = { guest, open, onOpenChange }
  switch (layer.kind) {
    case "compute":
      return <ComputeDialog {...props} />
    case "options":
      return <OptionsDialog {...props} />
    case "add-disk":
      return <AddDiskDialog {...props} />
    case "resize":
      return <ResizeDialog {...props} disk={layer.disk} />
    case "cd":
      return <CdDialog {...props} disk={layer.disk} />
    case "detach":
      return <DetachDialog {...props} disk={layer.disk} />
    case "attach":
      return <AttachDialog {...props} disk={layer.disk} />
    case "destroy":
      return <DestroyDialog {...props} disk={layer.disk} />
    case "nic":
      return <NicDialog {...props} nic={layer.nic} />
    case "remove-nic":
      return <RemoveNicDialog {...props} nic={layer.nic} />
  }
}

type DialogProps = {
  guest: PVEGuestDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

const memoryPresets = [1024, 2048, 4096, 8192, 16384, 32768]

function MemoryField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
}) {
  return (
    <Field
      label={label}
      error={error}
      hint={hint ?? (positive(value) ? mib(value) : undefined)}
    >
      {(p) => (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Input
              {...p}
              inputMode="numeric"
              value={value}
              onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
              className="pe-12 tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
              MiB
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {memoryPresets.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={value === String(m)}
                onClick={() => onChange(String(m))}
                className="h-8 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-9"
              >
                {mib(String(m))}
              </button>
            ))}
          </div>
        </div>
      )}
    </Field>
  )
}

const cpuTypes = [
  {
    value: "host",
    label: "host",
    detail: "Fastest; can't move to a different CPU",
  },
  {
    value: "x86-64-v2-AES",
    label: "x86-64-v2-AES",
    detail: "Proxmox's default",
  },
  { value: "x86-64-v3", label: "x86-64-v3", detail: "Newer CPUs (AVX2)" },
  { value: "kvm64", label: "kvm64", detail: "Oldest, most compatible" },
  { value: "qemu64", label: "qemu64", detail: "No KVM extras" },
]

function ComputeDialog({ guest: g, open, onOpenChange }: DialogProps) {
  const config = g.config ?? {}
  const qemu = g.kind === "qemu"
  const cpuHead = parseProps(config.cpu ?? "").head || (qemu ? "kvm64" : "")
  const [cores, setCores] = useState(config.cores || "1")
  const [sockets, setSockets] = useState(config.sockets || "1")
  const [cpu, setCpu] = useState(cpuHead)
  const [memory, setMemory] = useState(config.memory || "512")
  const [balloonOn, setBalloonOn] = useState(config.balloon !== "0")
  const [balloon, setBalloon] = useState(
    config.balloon && config.balloon !== "0" ? config.balloon : "",
  )
  const [swap, setSwap] = useState(config.swap || "512")
  const [cpulimit, setCpulimit] = useState(
    config.cpulimit && config.cpulimit !== "0" ? config.cpulimit : "",
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { save, pending, error } = useSave(g)

  const types = cpuTypes.some((t) => t.value === cpu)
    ? cpuTypes
    : [{ value: cpu, label: cpu, detail: "Set now" }, ...cpuTypes]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad: Record<string, string> = {}
    if (!positive(cores)) bad.cores = "A whole number, 1 or more."
    if (qemu && !positive(sockets)) bad.sockets = "A whole number, 1 or more."
    if (!positive(memory) || Number(memory) < 16)
      bad.memory = "At least 16 MiB."
    if (
      qemu &&
      balloonOn &&
      balloon &&
      (!positive(balloon) || Number(balloon) > Number(memory))
    )
      bad.balloon = "Between 1 and the memory above."
    if (!qemu && swap && !/^[0-9]+$/.test(swap))
      bad.swap = "A number of MiB (0 = none)."
    if (!qemu && cpulimit && !/^[0-9]+(\.[0-9]+)?$/.test(cpulimit))
      bad.cpulimit = "A number of cores, e.g. 1.5."
    setErrors(bad)
    if (Object.keys(bad).length) return
    const cpuProps = parseProps(config.cpu ?? "")
    const next: Record<string, string> = qemu
      ? {
          cores,
          sockets: sockets === "1" && !config.sockets ? "" : sockets,
          cpu:
            cpu === cpuHead
              ? (config.cpu ?? "")
              : [
                  cpu,
                  ...Object.entries(cpuProps.props).map(
                    ([k, v]) => `${k}=${v}`,
                  ),
                ].join(","),
          memory,
          balloon: balloonOn
            ? balloon && balloon !== memory
              ? balloon
              : config.balloon === "0"
                ? ""
                : (config.balloon ?? "")
            : "0",
        }
      : { cores, memory, swap, cpulimit }
    save(diff(config, next), () => onOpenChange(false))
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Processor and memory"
      footer={
        <Footer
          form="vm-compute"
          pending={pending}
          label="Save"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="vm-compute" onSubmit={submit} className="grid gap-4">
        <div className={cn("grid gap-4", qemu && "grid-cols-2")}>
          {qemu && (
            <Field label="Sockets" error={errors.sockets}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={sockets}
                  onChange={(e) => setSockets(e.target.value)}
                />
              )}
            </Field>
          )}
          <Field
            label="Cores"
            error={errors.cores}
            hint={
              qemu && positive(cores) && positive(sockets)
                ? `${Number(cores) * Number(sockets)} vCPUs in all`
                : undefined
            }
          >
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={cores}
                onChange={(e) => setCores(e.target.value)}
              />
            )}
          </Field>
        </div>
        {qemu && (
          <Field
            label="CPU type"
            hint="host is fastest, but a machine on it can only move live to a node with the same CPU."
          >
            {(p) => (
              <Pick id={p.id} value={cpu} onChange={setCpu} items={types} />
            )}
          </Field>
        )}
        {!qemu && (
          <Field
            label="CPU limit"
            error={errors.cpulimit}
            hint="How many cores' worth of time it may use. Empty = no limit."
          >
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={cpulimit}
                placeholder="No limit"
                onChange={(e) => setCpulimit(e.target.value)}
              />
            )}
          </Field>
        )}
        <MemoryField
          label="Memory"
          value={memory}
          onChange={setMemory}
          error={errors.memory}
        />
        {qemu && (
          <div className="grid gap-3">
            <CheckRow
              checked={balloonOn}
              onChange={setBalloonOn}
              label="Ballooning"
              text="Lets Proxmox take back memory the guest isn't using. Needs the balloon driver inside."
            />
            {balloonOn && (
              <Field
                label="Least memory"
                error={errors.balloon}
                hint="Empty = the same as Memory (only reports usage)."
              >
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    value={balloon}
                    placeholder={memory}
                    onChange={(e) =>
                      setBalloon(e.target.value.replace(/[^0-9]/g, ""))
                    }
                  />
                )}
              </Field>
            )}
          </div>
        )}
        {!qemu && (
          <Field
            label="Swap"
            error={errors.swap}
            hint={swap === "0" ? "No swap" : mib(swap)}
          >
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={swap}
                onChange={(e) => setSwap(e.target.value.replace(/[^0-9]/g, ""))}
              />
            )}
          </Field>
        )}
        <RunningNote guest={g} />
        <ErrorLine error={error} />
      </form>
    </ResponsiveDialog>
  )
}

const qemuOs = [
  "l26",
  "win11",
  "win10",
  "win8",
  "win7",
  "wxp",
  "w2k",
  "solaris",
  "other",
]

function OptionsDialog({ guest: g, open, onOpenChange }: DialogProps) {
  const config = g.config ?? {}
  const qemu = g.kind === "qemu"
  const nameKey = qemu ? "name" : "hostname"
  const [name, setName] = useState(config[nameKey] ?? "")
  const [onboot, setOnboot] = useState(yes(config.onboot))
  const [protection, setProtection] = useState(yes(config.protection))
  const [ostype, setOstype] = useState(config.ostype ?? "")
  const [tags, setTags] = useState((g.tags ?? []).join(", "))
  const [description, setDescription] = useState(config.description ?? "")
  const [nameError, setNameError] = useState("")
  const { save, pending, error } = useSave(g)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!/^[A-Za-z0-9]([A-Za-z0-9.-]{0,62})$/.test(n)) {
      setNameError("Letters, digits, - and . only; it becomes the hostname.")
      return
    }
    const tagList = tags
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const next: Record<string, string> = {
      [nameKey]: n,
      onboot: onboot ? "1" : config.onboot ? "0" : "",
      protection: protection ? "1" : config.protection ? "0" : "",
      tags: tagList.join(";"),
      description: description.replace(/\r?\n/g, "\n"),
    }
    if (qemu) next.ostype = ostype
    // Proxmox keeps the note with line breaks; the API takes them escaped.
    const changes = diff(config, next)
    if (changes.set.description !== undefined)
      changes.set.description = encodeURIComponent(
        changes.set.description,
      ).replace(/%20/g, " ")
    save(changes, () => onOpenChange(false))
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Options"
      className="sm:max-w-lg"
      footer={
        <Footer
          form="vm-options"
          pending={pending}
          label="Save"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="vm-options" onSubmit={submit} className="grid gap-4">
        <Field label={qemu ? "Name" : "Hostname"} error={nameError}>
          {(p) => (
            <Input
              {...p}
              value={name}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setName(e.target.value)
                setNameError("")
              }}
            />
          )}
        </Field>
        {qemu && (
          <Field label="Guest OS" hint="Proxmox tunes a few defaults for it.">
            {(p) => (
              <Pick
                id={p.id}
                value={ostype}
                onChange={setOstype}
                placeholder="Not set"
                items={qemuOs.map((o) => ({
                  value: o,
                  label: osLabels[o] ?? o,
                }))}
              />
            )}
          </Field>
        )}
        <Field label="Tags" hint="Separated by commas, e.g. prod, web.">
          {(p) => (
            <Input
              {...p}
              value={tags}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setTags(e.target.value)}
            />
          )}
        </Field>
        <CheckRow
          checked={onboot}
          onChange={setOnboot}
          label="Start at boot"
          text="Starts when its node starts."
        />
        <CheckRow
          checked={protection}
          onChange={setProtection}
          label="Protect it"
          text="Can't be deleted (or its disks removed) until this is off."
        />
        <Field
          label="Notes"
          hint="Shown on the Overview. Markdown works in Proxmox."
        >
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        <ErrorLine error={error} />
      </form>
    </ResponsiveDialog>
  )
}

function AddDiskDialog({ guest: g, open, onOpenChange }: DialogProps) {
  const config = g.config ?? {}
  const qemu = g.kind === "qemu"
  const options = useCreateOptions(g.cluster_id, open)
  const stores = storagesFor(
    options.data?.storages ?? [],
    g.node,
    qemu ? "images" : "rootdir",
  )
  const [bus, setBus] = useState<"scsi" | "virtio" | "sata">("scsi")
  const [storage, setStorage] = useState("")
  const [size, setSize] = useState("32")
  const [path, setPath] = useState("/mnt/data")
  const [discard, setDiscard] = useState(true)
  const [ssd, setSsd] = useState(true)
  const [backup, setBackup] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { save, pending, error } = useSave(g)
  const store = storage || stores[0]?.storage || ""
  const key = nextKey(config, qemu ? bus : "mp")

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad: Record<string, string> = {}
    if (!store) bad.storage = "Pick where it goes."
    if (!positive(size)) bad.size = "A whole number of GiB."
    if (!qemu && !/^\/[^\s,=]*$/.test(path))
      bad.path = "An absolute path, like /mnt/data."
    setErrors(bad)
    if (Object.keys(bad).length) return
    const parts = [`${store}:${size}`]
    if (qemu) {
      if (discard) parts.push("discard=on")
      if (ssd && bus !== "virtio") parts.push("ssd=1")
      if (bus === "scsi" || bus === "virtio") parts.push("iothread=1")
    } else parts.push(`mp=${path}`)
    if (!backup) parts.push("backup=0")
    save({ set: { [key]: parts.join(",") } }, () => onOpenChange(false))
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={qemu ? "Add a disk" : "Add a mount point"}
      description={
        qemu
          ? "A new, empty disk. Partition and format it inside the guest."
          : "A new volume mounted into the container."
      }
      footer={
        <Footer
          form="vm-add-disk"
          pending={pending}
          label={qemu ? "Add disk" : "Add mount point"}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="vm-add-disk" onSubmit={submit} className="grid gap-4">
        {qemu && (
          <Field label="Bus" hint={`It becomes ${key}.`}>
            {(p) => (
              <Pick
                id={p.id}
                value={bus}
                onChange={setBus}
                items={[
                  { value: "scsi", label: "SCSI", detail: "Recommended" },
                  {
                    value: "virtio",
                    label: "VirtIO block",
                    detail: "Older guests",
                  },
                  { value: "sata", label: "SATA", detail: "No drivers needed" },
                ]}
              />
            )}
          </Field>
        )}
        {!qemu && (
          <Field
            label="Path inside"
            error={errors.path}
            hint={`It becomes ${key}.`}
          >
            {(p) => (
              <Input
                {...p}
                value={path}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
                onChange={(e) => setPath(e.target.value)}
              />
            )}
          </Field>
        )}
        <Field
          label="Storage"
          error={errors.storage}
          hint={
            options.isLoading
              ? "Loading…"
              : stores.length
                ? undefined
                : "No storage on this node takes disks."
          }
        >
          {(p) => (
            <Pick
              id={p.id}
              value={store}
              onChange={setStorage}
              placeholder="Pick a storage"
              items={stores.map((s) => ({
                value: s.storage,
                label: s.storage,
                detail: freeText(s),
              }))}
            />
          )}
        </Field>
        <Field label="Size" error={errors.size}>
          {(p) => (
            <div className="relative">
              <Input
                {...p}
                inputMode="numeric"
                value={size}
                onChange={(e) => setSize(e.target.value.replace(/[^0-9]/g, ""))}
                className="pe-12 tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
                GiB
              </span>
            </div>
          )}
        </Field>
        {qemu && (
          <>
            <CheckRow
              checked={discard}
              onChange={setDiscard}
              label="Discard"
              text="Frees space on thin storage when files are deleted inside."
            />
            {bus !== "virtio" && (
              <CheckRow
                checked={ssd}
                onChange={setSsd}
                label="Show as an SSD"
                text="The guest treats it as solid state."
              />
            )}
          </>
        )}
        <CheckRow
          checked={backup}
          onChange={setBackup}
          label="Include in backups"
        />
        <ErrorLine error={error} />
      </form>
    </ResponsiveDialog>
  )
}

function ResizeDialog({
  guest: g,
  open,
  onOpenChange,
  disk,
}: DialogProps & { disk: Disk }) {
  const resize = useResizeDisk(g.cluster_id, g.vmid)
  const queryClient = useQueryClient()
  const current = disk.bytes / 1024 ** 3
  const [size, setSize] = useState(String(Math.ceil(current) + 8))
  const [error, setError] = useState("")
  const next = Number(size)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!positive(size) || next <= current) {
      setError(
        `More than the ${formatSize(disk.bytes)} it has now: disks only grow.`,
      )
      return
    }
    resize.mutate(
      { disk: disk.key, size: `${next}G` },
      {
        onSuccess: () => {
          onOpenChange(false)
          queryClient.invalidateQueries({
            queryKey: vmKeys.guest(g.cluster_id, g.vmid),
          })
        },
        onError: (err) => setError(errorText(err)),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Make ${diskTitle(disk)} bigger`}
      description={`It has ${formatSize(disk.bytes)} now.`}
      footer={
        <Footer
          form="vm-resize"
          pending={resize.isPending}
          label="Make bigger"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="vm-resize" onSubmit={submit} className="grid gap-4">
        <Field
          label="New size"
          error={error}
          hint={
            positive(size) && next > current
              ? `${Math.round((next - current) * 10) / 10} GiB more`
              : undefined
          }
        >
          {(p) => (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Input
                  {...p}
                  inputMode="numeric"
                  value={size}
                  onChange={(e) => {
                    setSize(e.target.value.replace(/[^0-9]/g, ""))
                    setError("")
                  }}
                  className="pe-12 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
                  GiB
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[8, 16, 32, 64, 128].map((more) => (
                  <button
                    key={more}
                    type="button"
                    onClick={() => setSize(String(Math.ceil(current) + more))}
                    className="h-8 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-9"
                  >
                    +{more} GiB
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>
        <Callout tone="muted">
          {g.kind === "lxc"
            ? "The container's filesystem grows with it, straight away."
            : "Only the disk grows: grow the partition and filesystem inside too (cloud-init images do it on the next boot; elsewhere growpart + resize2fs, or Disk Management on Windows)."}
        </Callout>
      </form>
    </ResponsiveDialog>
  )
}

function CdDialog({
  guest: g,
  open,
  onOpenChange,
  disk,
}: DialogProps & { disk: Disk }) {
  const options = useCreateOptions(g.cluster_id, open)
  const isos = (options.data?.isos ?? []).filter(
    (i) => i.shared || i.node === g.node,
  )
  const has = disk.volume && disk.volume !== "none" && disk.volume !== "cdrom"
  const [iso, setIso] = useState(has ? disk.volume : "")
  const { save, pending, error } = useSave(g)
  const rest = Object.entries(disk.props)
    .filter(([k]) => k !== "media" && k !== "file")
    .map(([k, v]) => (v ? `${k}=${v}` : k))

  const write = (volume: string) =>
    save(
      { set: { [disk.key]: [volume, "media=cdrom", ...rest].join(",") } },
      () => onOpenChange(false),
    )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={has ? "Change the ISO" : "Insert an ISO"}
      description={`In ${diskTitle(disk)} (${disk.key}).`}
      footer={
        <>
          {has && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => write("none")}
            >
              Eject
            </Button>
          )}
          <Footer
            form="vm-cd"
            pending={pending}
            label="Insert"
            disabled={!iso}
            onCancel={() => onOpenChange(false)}
          />
        </>
      }
    >
      <form
        id="vm-cd"
        onSubmit={(e) => {
          e.preventDefault()
          if (iso) write(iso)
        }}
        className="grid gap-4"
      >
        <Field
          label="ISO image"
          hint={
            options.isLoading
              ? "Loading…"
              : isos.length
                ? undefined
                : "No ISO images on this node yet: upload or download one under Storage."
          }
        >
          {(p) => (
            <Pick
              id={p.id}
              value={iso}
              onChange={setIso}
              placeholder="Pick an image"
              items={isos.map((i) => ({
                value: i.volid,
                label: i.name,
                detail: `${i.storage} · ${formatSize(i.size)}`,
              }))}
            />
          )}
        </Field>
        <ErrorLine error={error} />
      </form>
    </ResponsiveDialog>
  )
}

function DetachDialog({
  guest: g,
  open,
  onOpenChange,
  disk,
}: DialogProps & { disk: Disk }) {
  const { save, pending, error } = useSave(g)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={disk.cdrom ? `Remove ${disk.key}?` : `Detach ${diskTitle(disk)}?`}
      description={
        <>
          {disk.cdrom
            ? "The CD/DVD drive goes away."
            : "The guest loses it, but its data stays: it shows here as Not attached, and you can attach it again or delete it."}
          {guestState(g) === "running" &&
            !disk.cdrom &&
            " Unmount it inside first."}
          {error && (
            <span className="mt-2 block text-destructive">{error}</span>
          )}
        </>
      }
      confirmLabel={disk.cdrom ? "Remove" : "Detach"}
      pending={pending}
      onConfirm={() => save({ delete: [disk.key] }, () => onOpenChange(false))}
    />
  )
}

function AttachDialog({
  guest: g,
  open,
  onOpenChange,
  disk,
}: DialogProps & { disk: Disk }) {
  const config = g.config ?? {}
  const [bus, setBus] = useState<"scsi" | "virtio" | "sata">("scsi")
  const { save, pending, error } = useSave(g)
  const key = nextKey(config, bus)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Attach it again"
      description={disk.volume}
      footer={
        <Footer
          form="vm-attach"
          pending={pending}
          label="Attach"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form
        id="vm-attach"
        onSubmit={(e) => {
          e.preventDefault()
          save({ set: { [key]: disk.volume } }, () => onOpenChange(false))
        }}
        className="grid gap-4"
      >
        <Field label="Bus" hint={`It becomes ${key}.`}>
          {(p) => (
            <Pick
              id={p.id}
              value={bus}
              onChange={setBus}
              items={[
                { value: "scsi", label: "SCSI" },
                { value: "virtio", label: "VirtIO block" },
                { value: "sata", label: "SATA" },
              ]}
            />
          )}
        </Field>
        <ErrorLine error={error} />
      </form>
    </ResponsiveDialog>
  )
}

function DestroyDialog({
  guest: g,
  open,
  onOpenChange,
  disk,
}: DialogProps & { disk: Disk }) {
  const { save, pending, error } = useSave(g)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this disk?"
      description={
        <>
          <span className="font-mono text-caption">{disk.volume}</span> and
          everything on it are deleted from the storage. This can't be undone.
          {error && (
            <span className="mt-2 block text-destructive">{error}</span>
          )}
        </>
      }
      confirmLabel="Delete disk"
      pending={pending}
      onConfirm={() => save({ delete: [disk.key] }, () => onOpenChange(false))}
    />
  )
}

const nicModels = [
  { value: "virtio", label: "VirtIO", detail: "Fastest" },
  { value: "e1000", label: "Intel E1000", detail: "No drivers needed" },
  { value: "e1000e", label: "Intel E1000E" },
  { value: "vmxnet3", label: "VMware vmxnet3" },
  { value: "rtl8139", label: "Realtek RTL8139" },
]

type IpMode = "dhcp" | "static" | "none"

function NicDialog({
  guest: g,
  open,
  onOpenChange,
  nic,
}: DialogProps & { nic?: Nic }) {
  const config = g.config ?? {}
  const qemu = g.kind === "qemu"
  const options = useCreateOptions(g.cluster_id, open)
  const bridges = options.data?.bridges?.[g.node] ?? []
  const key = nic?.key ?? nextKey(config, "net")
  const [model, setModel] = useState(nic?.model || "virtio")
  const [name, setName] = useState(
    nic?.name && nic.name !== nic.key ? nic.name : `eth${key.slice(3)}`,
  )
  const [bridge, setBridge] = useState(nic?.bridge || "")
  const [vlan, setVlan] = useState(nic?.vlan ?? "")
  const [firewall, setFirewall] = useState(nic ? nic.firewall : true)
  const [down, setDown] = useState(nic?.disconnected ?? false)
  const [rate, setRate] = useState(nic?.rate ?? "")
  const [ipMode, setIpMode] = useState<IpMode>(
    !nic ? "dhcp" : nic.ip === "dhcp" ? "dhcp" : nic.ip ? "static" : "none",
  )
  const [ip, setIp] = useState(nic?.ip && nic.ip !== "dhcp" ? nic.ip : "")
  const [gw, setGw] = useState(nic?.gw ?? "")
  const [ip6, setIp6] = useState(nic?.ip6 ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { save, pending, error } = useSave(g)
  const theBridge = bridge || bridges[0]?.name || "vmbr0"

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad: Record<string, string> = {}
    if (
      vlan &&
      !(/^[0-9]+$/.test(vlan) && Number(vlan) >= 1 && Number(vlan) <= 4094)
    )
      bad.vlan = "1 to 4094, or empty."
    if (rate && !/^[0-9]+(\.[0-9]+)?$/.test(rate)) bad.rate = "MB/s, e.g. 12.5."
    if (!qemu && !/^[a-z][a-z0-9_.-]{0,14}$/i.test(name))
      bad.name = "Like eth0."
    if (!qemu && ipMode === "static" && !/^[0-9.]+\/[0-9]{1,2}$/.test(ip))
      bad.ip = "An address with its prefix, like 10.0.0.5/24."
    setErrors(bad)
    if (Object.keys(bad).length) return

    // Keep what the form doesn't show (queues, mtu, hwaddr…).
    const known = new Set([
      ...nicModels.map((m) => m.value),
      "rtl8139",
      "ne2k_pci",
      "pcnet",
      "i82551",
      "i82557b",
      "i82559er",
      "ne2k_isa",
      "bridge",
      "tag",
      "firewall",
      "link_down",
      "rate",
      "name",
      "ip",
      "gw",
      "ip6",
      "type",
    ])
    const rest = Object.entries(nic?.props ?? {})
      .filter(([k]) => !known.has(k))
      .map(([k, v]) => (v ? `${k}=${v}` : k))
    const parts: string[] = []
    if (qemu) parts.push(nic?.mac ? `${model}=${nic.mac}` : model)
    else parts.push(`name=${name}`)
    parts.push(`bridge=${theBridge}`)
    if (vlan) parts.push(`tag=${vlan}`)
    if (firewall) parts.push("firewall=1")
    if (down) parts.push("link_down=1")
    if (rate) parts.push(`rate=${rate}`)
    if (!qemu) {
      if (ipMode === "dhcp") parts.push("ip=dhcp")
      if (ipMode === "static") {
        parts.push(`ip=${ip}`)
        if (gw) parts.push(`gw=${gw}`)
      }
      if (ip6) parts.push(`ip6=${ip6}`)
    }
    parts.push(...rest)
    if (!qemu && !rest.some((r) => r.startsWith("type=")))
      parts.push("type=veth")
    const value = parts.join(",")
    if (nic && value === config[key]) return onOpenChange(false)
    save({ set: { [key]: value } }, () => onOpenChange(false))
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={nic ? `Edit ${qemu ? key : nic.name}` : "Add a network device"}
      description={nic ? undefined : `It becomes ${key}.`}
      className="sm:max-w-lg"
      footer={
        <Footer
          form="vm-nic"
          pending={pending}
          label={nic ? "Save" : "Add"}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="vm-nic" onSubmit={submit} className="grid gap-4">
        {qemu ? (
          <Field label="Model">
            {(p) => (
              <Pick
                id={p.id}
                value={model}
                onChange={setModel}
                items={
                  nicModels.some((m) => m.value === model)
                    ? nicModels
                    : [{ value: model, label: model }, ...nicModels]
                }
              />
            )}
          </Field>
        ) : (
          <Field label="Name inside" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                value={name}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Bridge"
            hint={options.isLoading ? "Loading…" : undefined}
          >
            {(p) => (
              <Pick
                id={p.id}
                value={theBridge}
                onChange={setBridge}
                items={
                  bridges.length
                    ? bridges.map((b) => ({
                        value: b.name,
                        label: b.name,
                        detail: b.cidr || b.comment || undefined,
                      }))
                    : [{ value: theBridge, label: theBridge }]
                }
              />
            )}
          </Field>
          <Field label="VLAN tag" error={errors.vlan}>
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={vlan}
                placeholder="None"
                onChange={(e) => setVlan(e.target.value)}
              />
            )}
          </Field>
        </div>
        {!qemu && (
          <>
            <Field label="IPv4">
              {(p) => (
                <Pick
                  id={p.id}
                  value={ipMode}
                  onChange={setIpMode}
                  items={[
                    { value: "dhcp", label: "DHCP" },
                    { value: "static", label: "Fixed address" },
                    { value: "none", label: "None" },
                  ]}
                />
              )}
            </Field>
            {ipMode === "static" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Address" error={errors.ip}>
                  {(p) => (
                    <Input
                      {...p}
                      value={ip}
                      placeholder="10.0.0.5/24"
                      spellCheck={false}
                      className="font-mono"
                      onChange={(e) => setIp(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Gateway">
                  {(p) => (
                    <Input
                      {...p}
                      value={gw}
                      placeholder="10.0.0.1"
                      spellCheck={false}
                      className="font-mono"
                      onChange={(e) => setGw(e.target.value)}
                    />
                  )}
                </Field>
              </div>
            )}
            <Field
              label="IPv6"
              hint="dhcp, auto, an address with its prefix, or empty for none."
            >
              {(p) => (
                <Input
                  {...p}
                  value={ip6}
                  placeholder="None"
                  spellCheck={false}
                  className="font-mono"
                  onChange={(e) => setIp6(e.target.value)}
                />
              )}
            </Field>
          </>
        )}
        <Field label="Speed limit" error={errors.rate}>
          {(p) => (
            <div className="relative">
              <Input
                {...p}
                inputMode="decimal"
                value={rate}
                placeholder="No limit"
                onChange={(e) => setRate(e.target.value)}
                className="pe-14"
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
                MB/s
              </span>
            </div>
          )}
        </Field>
        <CheckRow
          checked={firewall}
          onChange={setFirewall}
          label="Proxmox firewall"
          text="The rules under Firewall apply to this device."
        />
        <CheckRow
          checked={down}
          onChange={setDown}
          label="Unplugged"
          text="Like pulling the cable: the device stays, with no link."
        />
        {nic && qemu && nic.mac && (
          <p className="text-caption text-muted-foreground">
            MAC address <span className="font-mono">{nic.mac}</span> stays the
            same.
          </p>
        )}
        <RunningNote guest={g} />
        <ErrorLine error={error} />
      </form>
    </ResponsiveDialog>
  )
}

function RemoveNicDialog({
  guest: g,
  open,
  onOpenChange,
  nic,
}: DialogProps & { nic: Nic }) {
  const { save, pending, error } = useSave(g)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${g.kind === "qemu" ? nic.key : nic.name}?`}
      description={
        <>
          The {kindNoun(g.kind)} loses this network device
          {nic.bridge ? ` on ${nic.bridge}` : ""}.
          {error && (
            <span className="mt-2 block text-destructive">{error}</span>
          )}
        </>
      }
      confirmLabel="Remove"
      pending={pending}
      onConfirm={() => save({ delete: [nic.key] }, () => onOpenChange(false))}
    />
  )
}
