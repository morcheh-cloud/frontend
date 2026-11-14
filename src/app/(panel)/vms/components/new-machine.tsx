"use client"

import {
  Box,
  Check,
  ChevronLeft,
  CircleAlert,
  Info,
  LoaderCircle,
  Monitor,
  Server,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useQueryStates } from "nuqs"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"
import {
  Callout,
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { TagInput } from "@/app/(panel)/servers/components/fields"
import { Field } from "@/components/field"
import { isActive, useJobList, useJobLog } from "@/components/jobs/api"
import { JobBar, progressText, StateText } from "@/components/jobs/meta"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  Job,
  PVECreateBody,
  PVECreateOptions,
  PVEGuest,
} from "@/lib/services"
import { cn } from "@/lib/utils"

import { useClusters, useCreateGuest, useCreateOptions } from "../api"
import { Pick } from "./form-parts"
import { errorText, freeText, storagesFor } from "./guest-dialogs"
import { guestName, kindNoun, newVmParsers, vmHref } from "./meta"
import { useVmCan } from "./permissions"

type Kind = "qemu" | "lxc"
type Source = "clone" | "iso" | "ostemplate"

type Draft = {
  cluster: string
  kind: Kind
  source: Source | ""
  template: string
  full: boolean
  iso: string
  ostemplate: string
  node: string
  vmid: string
  name: string
  storage: string
  cores: string
  memory: string
  disk: string
  swap: string
  bridge: string
  vlan: string
  ipMode: "dhcp" | "static"
  address: string
  gateway: string
  nameserver: string
  user: string
  password: string
  sshKeys: string
  unprivileged: boolean
  nesting: boolean
  tags: string[]
  onboot: boolean
  start: boolean
  addServer: boolean
  serverName: string
  serverTags: string[]
}

const NAME_RE = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,61}[A-Za-z0-9])?$/
const USER_RE = /^[a-z_][a-z0-9_-]{0,31}$/
const TAG_RE = /^[a-z0-9_][a-z0-9_+.-]{0,59}$/
const CIDR_RE = /^[0-9.]+\/\d{1,2}$/
const IP_RE = /^[0-9.]+$/
const DNS_RE = /^[0-9a-fA-F.: ]+$/

const memoryPresets = [512, 1024, 2048, 3072, 4096, 6144, 8192, 12288, 16384]
const memText = (mib: number) =>
  mib < 1024 ? `${mib} MB` : `${+(mib / 1024).toFixed(1)} GB`

const sourceLabels: Record<Source, string> = {
  clone: "From a template",
  iso: "Install from an ISO",
  ostemplate: "From a container image",
}

const home = "/vms"

export function NewMachine() {
  const phone = useIsPhone()
  const [params] = useQueryStates(newVmParsers)
  const clusters = useClusters()
  const can = useVmCan()
  const [d, setD] = useState<Draft>(() => ({
    cluster: params.cluster ?? "",
    kind: params.kind ?? "qemu",
    source: "",
    template: params.template ?? "",
    full: true,
    iso: "",
    ostemplate: "",
    node: params.node ?? "",
    vmid: "",
    name: "",
    storage: "",
    cores: "",
    memory: "",
    disk: "",
    swap: "512",
    bridge: "",
    vlan: "",
    ipMode: "dhcp",
    address: "",
    gateway: "",
    nameserver: "",
    user: "",
    password: "",
    sshKeys: "",
    unprivileged: true,
    nesting: true,
    tags: [],
    onboot: false,
    start: true,
    addServer: false,
    serverName: "",
    serverTags: [],
  }))
  const set = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [job, setJob] = useState<Job | null>(null)

  usePageCrumbs([{ href: "/vms/new", label: "New machine" }])

  const mine = (clusters.data?.items ?? []).filter((c) => can(c, "engineer"))
  const cluster = mine.some((c) => c.id === d.cluster)
    ? d.cluster
    : (mine[0]?.id ?? "")
  const opts = useCreateOptions(cluster)
  const create = useCreateGuest(cluster)

  if (phone === null) return null

  if (job) {
    return (
      <Shell phone={phone} title="New machine">
        <Progress
          start={job}
          phone={phone}
          onEdit={() => setJob(null)}
          kind={d.kind}
        />
      </Shell>
    )
  }

  if (clusters.isPending) return <Loading phone={phone} />
  if (mine.length === 0) {
    return (
      <Shell phone={phone} title="New machine">
        <Empty
          icon={Monitor}
          title={
            (clusters.data?.items.length ?? 0) > 0
              ? "You can't create machines here"
              : "No Proxmox cluster yet"
          }
          body={
            (clusters.data?.items.length ?? 0) > 0
              ? "Creating a VM or container needs Engineer access to a cluster's workspace."
              : "Connect a Proxmox cluster first; then its templates, images and storages show up here."
          }
          action={
            <Button
              variant="outline"
              render={<Link href="/vms?tab=clusters" />}
              nativeButton={false}
            >
              Go to clusters
            </Button>
          }
        />
      </Shell>
    )
  }

  const o = opts.data
  const m = model(d, o)
  const shown = { ...errors }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const problems = check(d, m)
    setErrors(problems)
    if (Object.keys(problems).length) {
      toast.error("Check the marked fields")
      return
    }
    create.mutate(bodyOf(d, m), {
      onSuccess: (j) => setJob(j),
      onError: (err) => {
        const f: Record<string, string> = {}
        for (const [k, v] of Object.entries(fieldErrors(err)))
          f[k.replace(/\[\d+\]$/, "")] ??= v
        setErrors(f)
        if (!Object.keys(f).length) toast.error(errorText(err))
        else toast.error("Check the marked fields")
      },
    })
  }

  const pending = create.isPending
  const label = pending ? "Creating…" : `Create ${kindNoun(d.kind)}`

  const sections = (
    <>
      <Section
        title="What to make"
        hint="A VM runs its own kernel; a container shares the node's, starts in a second and uses less memory."
        phone={phone}
      >
        <KindTiles
          value={d.kind}
          onChange={(kind) =>
            set({ kind, source: "", template: "", storage: "", disk: "" })
          }
        />
        {mine.length > 1 && (
          <Field label="Cluster">
            {(p) => (
              <Pick
                id={p.id}
                value={cluster}
                onChange={(c) =>
                  set({
                    cluster: c,
                    template: "",
                    node: "",
                    storage: "",
                    bridge: "",
                    iso: "",
                    ostemplate: "",
                  })
                }
                items={mine.map((c) => ({
                  value: c.id,
                  label: c.name,
                  detail: c.cluster_name || undefined,
                }))}
              />
            )}
          </Field>
        )}
        {opts.isPending ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : opts.isError ? (
          <Callout icon={<CircleAlert />} tone="warning">
            Couldn't read the cluster: {opts.error.message}{" "}
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => opts.refetch()}
            >
              Try again
            </button>
          </Callout>
        ) : (
          <SourcePicker d={d} m={m} set={set} errors={shown} />
        )}
      </Section>

      {o && (
        <>
          <Section
            title="Name and place"
            hint="The name becomes the host name too."
            phone={phone}
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field label="Name" error={shown.name}>
                {(p) => (
                  <Input
                    {...p}
                    value={d.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder={d.kind === "lxc" ? "web-1" : "app-1"}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                )}
              </Field>
              <Field
                label="ID"
                error={shown.vmid}
                hint={shown.vmid ? undefined : "Blank = next free"}
              >
                {(p) => (
                  <Input
                    {...p}
                    value={d.vmid}
                    inputMode="numeric"
                    placeholder={String(o.next_id)}
                    onChange={(e) =>
                      set({ vmid: e.target.value.replace(/\D/g, "") })
                    }
                  />
                )}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Node" error={shown.node}>
                {(p) => (
                  <Pick
                    id={p.id}
                    value={m.node}
                    onChange={(node) =>
                      set({ node, storage: "", bridge: "", iso: "" })
                    }
                    placeholder="Choose a node"
                    items={o.nodes.map((n) => ({
                      value: n.node,
                      label: n.node,
                      detail:
                        n.status !== "online"
                          ? "offline"
                          : `${n.running} running · ${formatSize(n.max_mem - n.mem)} free`,
                      disabled: n.status !== "online",
                    }))}
                  />
                )}
              </Field>
              {(m.source !== "clone" || d.full) && (
                <Field
                  label={d.kind === "lxc" ? "Disk storage" : "Disk storage"}
                  error={shown.storage}
                  hint={
                    m.disks.length === 0
                      ? `No storage on ${m.node || "this node"} holds ${d.kind === "lxc" ? "container" : "VM"} disks.`
                      : undefined
                  }
                >
                  {(p) => (
                    <Pick
                      id={p.id}
                      value={m.storage}
                      onChange={(storage) => set({ storage })}
                      placeholder="Choose a storage"
                      items={[
                        ...(m.source === "clone"
                          ? [{ value: "", label: "Same as the template" }]
                          : []),
                        ...m.disks.map((s) => ({
                          value: s.storage,
                          label: s.storage,
                          detail: freeText(s),
                        })),
                      ]}
                    />
                  )}
                </Field>
              )}
            </div>
          </Section>

          <Section
            title="Size"
            hint={
              m.source === "clone"
                ? "Blank keeps what the template has. A disk can only grow."
                : "You can change these later on the Hardware tab."
            }
            phone={phone}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="CPU cores" error={shown.cores}>
                {(p) => (
                  <Input
                    {...p}
                    value={d.cores}
                    inputMode="numeric"
                    placeholder={
                      m.template ? String(m.template.cpus) : String(m.defCores)
                    }
                    onChange={(e) =>
                      set({ cores: e.target.value.replace(/\D/g, "") })
                    }
                  />
                )}
              </Field>
              <Field label="Memory" error={shown.memory}>
                {(p) => (
                  <Pick
                    id={p.id}
                    value={d.memory}
                    onChange={(memory) => set({ memory })}
                    items={[
                      {
                        value: "",
                        label: m.template
                          ? `As the template (${formatSize(m.template.maxmem)})`
                          : memText(m.defMemory),
                      },
                      ...memoryPresets
                        .filter((v) => v !== (m.template ? 0 : m.defMemory))
                        .map((v) => ({ value: String(v), label: memText(v) })),
                    ]}
                  />
                )}
              </Field>
              <Field
                label="Disk (GB)"
                error={shown.disk_gb}
                hint={
                  m.template && m.template.maxdisk > 0
                    ? `The template has ${formatSize(m.template.maxdisk)}`
                    : undefined
                }
              >
                {(p) => (
                  <Input
                    {...p}
                    value={d.disk}
                    inputMode="numeric"
                    placeholder={
                      m.template
                        ? String(Math.ceil(m.template.maxdisk / 1024 ** 3))
                        : String(m.defDisk)
                    }
                    onChange={(e) =>
                      set({ disk: e.target.value.replace(/\D/g, "") })
                    }
                  />
                )}
              </Field>
            </div>
            {d.kind === "lxc" && m.source === "ostemplate" && (
              <Field label="Swap (MB)" error={shown.swap} className="max-w-60">
                {(p) => (
                  <Input
                    {...p}
                    value={d.swap}
                    inputMode="numeric"
                    onChange={(e) =>
                      set({ swap: e.target.value.replace(/\D/g, "") })
                    }
                  />
                )}
              </Field>
            )}
          </Section>

          <Section
            title="Network"
            hint="The bridge is the node's network the machine plugs into."
            phone={phone}
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field label="Network" error={shown.bridge}>
                {(p) => (
                  <Pick
                    id={p.id}
                    value={m.bridge}
                    onChange={(bridge) => set({ bridge })}
                    placeholder="Choose a bridge"
                    items={[
                      ...(m.source === "clone"
                        ? [{ value: "", label: "As the template" }]
                        : []),
                      ...m.bridges.map((b) => ({
                        value: b.name,
                        label: b.name,
                        detail:
                          [b.cidr, b.comment].filter(Boolean).join(" · ") ||
                          (b.active ? undefined : "down"),
                      })),
                    ]}
                  />
                )}
              </Field>
              <Field label="VLAN" error={shown.vlan} hint="Blank = none">
                {(p) => (
                  <Input
                    {...p}
                    value={d.vlan}
                    inputMode="numeric"
                    onChange={(e) =>
                      set({ vlan: e.target.value.replace(/\D/g, "") })
                    }
                  />
                )}
              </Field>
            </div>
            {m.source === "iso" ? (
              <p className="text-caption text-muted-foreground">
                The address is set by the installer you run from the ISO.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-body-sm font-medium">Address</span>
                  <Segmented
                    label="Address"
                    value={d.ipMode}
                    onChange={(ipMode) => set({ ipMode })}
                    items={[
                      { value: "dhcp", label: "Automatic (DHCP)" },
                      { value: "static", label: "Fixed" },
                    ]}
                  />
                </div>
                {d.ipMode === "static" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Address / prefix"
                      error={shown.address ?? shown.ip_config}
                    >
                      {(p) => (
                        <Input
                          {...p}
                          value={d.address}
                          onChange={(e) => set({ address: e.target.value })}
                          placeholder="10.0.0.20/24"
                          inputMode="decimal"
                          spellCheck={false}
                        />
                      )}
                    </Field>
                    <Field label="Gateway" error={shown.gateway}>
                      {(p) => (
                        <Input
                          {...p}
                          value={d.gateway}
                          onChange={(e) => set({ gateway: e.target.value })}
                          placeholder={gatewayGuess(d.address) ?? "10.0.0.1"}
                          inputMode="decimal"
                          spellCheck={false}
                        />
                      )}
                    </Field>
                  </div>
                )}
                <Field
                  label="DNS servers"
                  error={shown.nameserver}
                  hint="Blank = the node's. Several are separated by spaces."
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={d.nameserver}
                      onChange={(e) => set({ nameserver: e.target.value })}
                      placeholder="1.1.1.1 9.9.9.9"
                      inputMode="decimal"
                      spellCheck={false}
                    />
                  )}
                </Field>
              </>
            )}
          </Section>

          {m.source !== "iso" && (
            <Section
              title="Login"
              hint={
                d.kind === "lxc"
                  ? m.source === "clone"
                    ? "A cloned container keeps the template's logins; these are only for a new one."
                    : "The container's root user."
                  : "Written by cloud-init on first boot. The template needs a cloud-init drive."
              }
              phone={phone}
            >
              {d.kind === "lxc" && m.source === "clone" ? (
                <p className="text-body-sm text-muted-foreground">
                  Log in as you do on the template.
                </p>
              ) : (
                <>
                  {d.kind === "qemu" && (
                    <Field
                      label="User"
                      error={shown.user}
                      hint="Blank = the image's default user."
                      className="max-w-72"
                    >
                      {(p) => (
                        <Input
                          {...p}
                          value={d.user}
                          onChange={(e) => set({ user: e.target.value })}
                          placeholder={d.addServer ? "morche" : "ubuntu"}
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                        />
                      )}
                    </Field>
                  )}
                  <Field
                    label={d.kind === "lxc" ? "Root password" : "Password"}
                    error={shown.password}
                    className="max-w-72"
                  >
                    {(p) => (
                      <SecretInput
                        {...p}
                        value={d.password}
                        onChange={(e) => set({ password: e.target.value })}
                        autoComplete="new-password"
                      />
                    )}
                  </Field>
                  <Field
                    label="SSH public keys"
                    error={shown.ssh_keys}
                    hint="One per line. Safer than a password."
                  >
                    {(p) => (
                      <Textarea
                        {...p}
                        value={d.sshKeys}
                        onChange={(e) => set({ sshKeys: e.target.value })}
                        placeholder="ssh-ed25519 AAAA… you@laptop"
                        rows={3}
                        spellCheck={false}
                        className="font-mono text-caption"
                      />
                    )}
                  </Field>
                  {!d.password && !d.sshKeys.trim() && !d.addServer && (
                    <Callout icon={<Info />}>
                      No password and no key: only the Console will get you in,
                      unless{" "}
                      {d.kind === "lxc" ? "you set one" : "the image has one"}.
                    </Callout>
                  )}
                </>
              )}
            </Section>
          )}

          {d.kind === "lxc" && m.source === "ostemplate" && (
            <Section
              title="Container"
              hint="How the container is kept apart from the node."
              phone={phone}
            >
              <ToggleRow
                id="vm-new-unprivileged"
                label="Unprivileged"
                hint="Root inside isn't root on the node. Leave it on unless an app really needs otherwise."
                checked={d.unprivileged}
                onChange={(unprivileged) => set({ unprivileged })}
              />
              <ToggleRow
                id="vm-new-nesting"
                label="Nesting"
                hint="Needed by systemd in newer distros and by Docker inside the container."
                checked={d.nesting}
                onChange={(nesting) => set({ nesting })}
              />
            </Section>
          )}

          <Section title="When it's made" phone={phone}>
            <Field
              label="Proxmox tags"
              error={shown.tags}
              hint="Lowercase letters, digits, - _ . +"
            >
              {(p) => (
                <TagInput
                  id={p.id}
                  value={d.tags}
                  onChange={(tags) => set({ tags })}
                  invalid={!!shown.tags}
                />
              )}
            </Field>
            <ToggleRow
              id="vm-new-start"
              label="Start it"
              hint="Right after it's made."
              checked={d.start}
              onChange={(start) =>
                set({ start, addServer: start ? d.addServer : false })
              }
            />
            <ToggleRow
              id="vm-new-onboot"
              label="Start with the node"
              hint="Comes back by itself after the node restarts."
              checked={d.onboot}
              onChange={(onboot) => set({ onboot })}
            />
            <ToggleRow
              id="vm-new-server"
              label="Add it to Servers"
              hint={
                m.serverBlock ??
                "Morche waits for its address, puts its own key in and adds it, linked to this machine."
              }
              checked={d.addServer && !m.serverBlock}
              disabled={!!m.serverBlock}
              onChange={(addServer) => set({ addServer })}
            />
            <FieldError text={shown.add_server} />
            {d.addServer && !m.serverBlock && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Server name" error={shown.server_name}>
                  {(p) => (
                    <Input
                      {...p}
                      value={d.serverName}
                      onChange={(e) => set({ serverName: e.target.value })}
                      placeholder={d.name || "Same as the machine"}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field label="Server tags" error={shown.server_tags}>
                  {(p) => (
                    <TagInput
                      id={p.id}
                      value={d.serverTags}
                      onChange={(serverTags) => set({ serverTags })}
                    />
                  )}
                </Field>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  )

  if (phone) {
    return (
      <form
        onSubmit={submit}
        className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col"
      >
        <PhoneBar
          title={`New ${kindNoun(d.kind)}`}
          action={
            <Button
              type="submit"
              variant="ghost"
              className="h-11 px-3 text-brand"
              disabled={pending || !o}
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          }
        />
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {d.kind === "lxc" ? (
            <Box className="size-5" />
          ) : (
            <Monitor className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">
            New {kindNoun(d.kind)}
          </h1>
          <p className="truncate text-caption text-ash">
            {mine.find((c) => c.id === cluster)?.name}
            {m.node ? ` · ${m.node}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            className="h-9"
            render={<Link href={home} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-9" disabled={pending || !o}>
            {label}
          </Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,64rem)_18rem]">
        <div className="grid min-w-0 gap-6">{sections}</div>
        {o && (
          <aside className="hidden xl:block">
            <Summary d={d} m={m} />
          </aside>
        )}
      </div>
    </form>
  )
}

// ---- model

function model(d: Draft, o: PVECreateOptions | undefined) {
  const templates = (o?.templates ?? [])
    .filter((t) => t.kind === d.kind)
    .sort((a, b) => guestName(a).localeCompare(guestName(b)))
  const sources: Source[] =
    d.kind === "qemu"
      ? templates.length
        ? ["clone", "iso"]
        : ["iso", "clone"]
      : ["ostemplate", "clone"]
  const source: Source = sources.includes(d.source as Source)
    ? (d.source as Source)
    : sources[0]
  const template =
    source === "clone"
      ? (templates.find((t) => String(t.vmid) === d.template) ?? templates[0])
      : undefined
  const online = (o?.nodes ?? []).filter((n) => n.status === "online")
  const node = online.some((n) => n.node === d.node)
    ? d.node
    : template && online.some((n) => n.node === template.node)
      ? template.node
      : (online[0]?.node ?? "")
  const onNode = <T extends { node: string; shared: boolean }>(xs: T[]) =>
    xs.filter((x) => x.shared || x.node === node)
  const disks = o
    ? storagesFor(o.storages, node, d.kind === "lxc" ? "rootdir" : "images")
    : []
  const storage =
    source === "clone"
      ? disks.some((s) => s.storage === d.storage)
        ? d.storage
        : ""
      : disks.some((s) => s.storage === d.storage)
        ? d.storage
        : (disks[0]?.storage ?? "")
  const bridges = o?.bridges[node] ?? []
  const bridge = bridges.some((b) => b.name === d.bridge)
    ? d.bridge
    : source === "clone"
      ? ""
      : ((bridges.find((b) => b.name === "vmbr0") ?? bridges[0])?.name ?? "")
  const isos = onNode(o?.isos ?? [])
  const ctTemplates = onNode(o?.ct_templates ?? [])
  const iso = isos.some((x) => x.volid === d.iso) ? d.iso : ""
  const ostemplate = ctTemplates.some((x) => x.volid === d.ostemplate)
    ? d.ostemplate
    : (ctTemplates[0]?.volid ?? "")
  const serverBlock = !d.start
    ? "Start it too, so Morche can log in."
    : d.kind === "qemu" && source !== "clone"
      ? "Only a VM made from a cloud-init template can be added by itself."
      : d.kind === "lxc" && source === "clone"
        ? "A cloned container keeps its template's keys: add it to Servers by hand."
        : null
  return {
    templates,
    sources,
    source,
    template,
    node,
    disks,
    storage,
    bridges,
    bridge,
    isos,
    ctTemplates,
    iso,
    ostemplate,
    serverBlock,
    defCores: d.kind === "lxc" ? 1 : 2,
    defMemory: d.kind === "lxc" ? 1024 : 2048,
    defDisk: d.kind === "lxc" ? 8 : 32,
  }
}
type Model = ReturnType<typeof model>

function check(d: Draft, m: Model) {
  const e: Record<string, string> = {}
  const name = d.name.trim()
  if (!name) e.name = "Give it a name"
  else if (!NAME_RE.test(name))
    e.name = "Letters, digits, dots and dashes (a host name)"
  if (d.vmid && Number(d.vmid) < 100) e.vmid = "From 100 up"
  if (!m.node) e.node = "Pick a node"
  if (m.source === "clone" && !m.template) e.template = "Pick a template"
  if (m.source === "ostemplate" && !m.ostemplate)
    e.ostemplate = "Pick a container image"
  if (m.source !== "clone" && !m.storage) e.storage = "Pick a storage"
  if (m.source !== "clone" && !m.bridge) e.bridge = "Pick a network"
  if (d.cores && (Number(d.cores) < 1 || Number(d.cores) > 512))
    e.cores = "1 to 512"
  if (d.disk && m.template) {
    const has = Math.ceil(m.template.maxdisk / 1024 ** 3)
    if (Number(d.disk) < has) e.disk_gb = `At least ${has}: a disk can't shrink`
  }
  if (d.vlan && Number(d.vlan) > 4094) e.vlan = "1 to 4094"
  if (m.source !== "iso" && d.ipMode === "static") {
    if (!CIDR_RE.test(d.address.trim()))
      e.address = "Write it like 10.0.0.20/24"
    if (d.gateway.trim() && !IP_RE.test(d.gateway.trim()))
      e.gateway = "An address like 10.0.0.1"
  }
  if (d.nameserver.trim() && !DNS_RE.test(d.nameserver.trim()))
    e.nameserver = "Addresses separated by spaces"
  if (d.kind === "qemu" && d.user.trim()) {
    if (!USER_RE.test(d.user.trim()))
      e.user = "Lowercase letters, digits, - and _"
    else if (d.user.trim() === "root")
      e.user = "Cloud images usually lock root: pick another user"
  }
  if (d.tags.some((t) => !TAG_RE.test(t)))
    e.tags = "Lowercase letters, digits, - _ . + only"
  return e
}

function bodyOf(d: Draft, m: Model): PVECreateBody {
  const num = (v: string) => (v ? Number(v) : undefined)
  const login =
    m.source !== "iso" && !(d.kind === "lxc" && m.source === "clone")
  const ip =
    m.source === "iso"
      ? undefined
      : d.ipMode === "dhcp"
        ? "ip=dhcp"
        : `ip=${d.address.trim()}${d.gateway.trim() ? `,gw=${d.gateway.trim()}` : ""}`
  const add = d.addServer && !m.serverBlock
  return {
    kind: d.kind,
    source: m.source,
    name: d.name.trim(),
    node: m.node,
    vmid: num(d.vmid),
    template: m.source === "clone" ? m.template?.vmid : undefined,
    full: m.source === "clone" ? d.full : undefined,
    iso: m.source === "iso" && m.iso ? m.iso : undefined,
    ostemplate: m.source === "ostemplate" ? m.ostemplate : undefined,
    storage:
      m.source !== "clone" || d.full ? m.storage || undefined : undefined,
    cores: num(d.cores) ?? (m.template ? undefined : m.defCores),
    memory: num(d.memory) ?? (m.template ? undefined : m.defMemory),
    disk_gb: num(d.disk) ?? (m.template ? undefined : m.defDisk),
    swap:
      d.kind === "lxc" && m.source === "ostemplate" ? num(d.swap) : undefined,
    bridge: m.bridge || undefined,
    vlan: num(d.vlan),
    ip_config: ip,
    nameserver:
      m.source !== "iso" && d.nameserver.trim()
        ? d.nameserver.trim().replace(/\s+/g, " ")
        : undefined,
    user:
      login && d.kind === "qemu" && d.user.trim() ? d.user.trim() : undefined,
    password: login && d.password ? d.password : undefined,
    ssh_keys: login && d.sshKeys.trim() ? d.sshKeys.trim() : undefined,
    unprivileged:
      d.kind === "lxc" && m.source === "ostemplate"
        ? d.unprivileged
        : undefined,
    nesting:
      d.kind === "lxc" && m.source === "ostemplate" ? d.nesting : undefined,
    tags: d.tags.length ? d.tags : undefined,
    onboot: d.onboot || undefined,
    start: d.start || undefined,
    add_server: add || undefined,
    server_name: add && d.serverName.trim() ? d.serverName.trim() : undefined,
    server_tags: add && d.serverTags.length ? d.serverTags : undefined,
  }
}

// 10.0.0.20/24 → 10.0.0.1, as a placeholder only.
function gatewayGuess(address: string) {
  const ip = address.split("/")[0]
  const parts = ip.split(".")
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return null
  return [...parts.slice(0, 3), "1"].join(".")
}

// ---- pieces

function KindTiles({
  value,
  onChange,
}: {
  value: Kind
  onChange: (k: Kind) => void
}) {
  const tiles: { kind: Kind; icon: ReactNode; title: string; text: string }[] =
    [
      {
        kind: "qemu",
        icon: <Monitor />,
        title: "Virtual machine",
        text: "Any OS, its own kernel. From a cloud-init template or an ISO.",
      },
      {
        kind: "lxc",
        icon: <Box />,
        title: "Container",
        text: "Linux only, light and fast. From a container image.",
      },
    ]
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Kind</legend>
      {tiles.map((t) => (
        <button
          key={t.kind}
          type="button"
          aria-pressed={value === t.kind}
          onClick={() => onChange(t.kind)}
          className="flex items-start gap-3 rounded-lg border border-border p-3 text-start outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft/50"
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5",
              value === t.kind
                ? "bg-brand-soft text-brand-strong"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-body-sm font-medium">{t.title}</span>
            <span className="block text-caption text-muted-foreground">
              {t.text}
            </span>
          </span>
        </button>
      ))}
    </fieldset>
  )
}

function SourcePicker({
  d,
  m,
  set,
  errors,
}: {
  d: Draft
  m: Model
  set: (p: Partial<Draft>) => void
  errors: Record<string, string>
}) {
  return (
    <>
      <div className="[scrollbar-width:none] overflow-x-auto">
        <Segmented<Source>
          label="Start from"
          value={m.source}
          onChange={(source) => set({ source, storage: "", bridge: "" })}
          items={m.sources.map((s) => ({ value: s, label: sourceLabels[s] }))}
        />
      </div>

      {m.source === "clone" &&
        (m.templates.length === 0 ? (
          <Callout icon={<Info />}>
            No {kindNoun(d.kind)} template on this cluster yet. Make one from a
            machine with its ⋯ menu › Turn into template
            {d.kind === "qemu"
              ? ", ideally a cloud image with a cloud-init drive."
              : "."}
          </Callout>
        ) : (
          <>
            <Field label="Template" error={errors.template}>
              {(p) => (
                <Pick
                  id={p.id}
                  value={m.template ? String(m.template.vmid) : ""}
                  onChange={(template) => set({ template, node: "" })}
                  items={m.templates.map((t: PVEGuest) => ({
                    value: String(t.vmid),
                    label: guestName(t),
                    detail: `${t.vmid} · ${t.node}${t.maxdisk ? ` · ${formatSize(t.maxdisk)}` : ""}`,
                  }))}
                />
              )}
            </Field>
            <ToggleRow
              id="vm-new-full"
              label="Full copy"
              hint="Off = a linked clone: made at once and small, but it needs the template to stay."
              checked={d.full}
              onChange={(full) => set({ full })}
            />
          </>
        ))}

      {m.source === "iso" && (
        <Field
          label="ISO image"
          error={errors.iso}
          hint={
            m.isos.length === 0
              ? "No ISO on this node yet: upload or download one from the Storage tab."
              : "Blank = an empty drive; add an ISO later."
          }
        >
          {(p) => (
            <Pick
              id={p.id}
              value={m.iso}
              onChange={(iso) => set({ iso })}
              items={[
                { value: "", label: "No ISO for now" },
                ...m.isos.map((x) => ({
                  value: x.volid,
                  label: x.name,
                  detail: `${x.storage} · ${formatSize(x.size)}`,
                })),
              ]}
            />
          )}
        </Field>
      )}

      {m.source === "ostemplate" &&
        (m.ctTemplates.length === 0 ? (
          <Callout icon={<TriangleAlert />} tone="warning">
            No container image on this node yet. Download one (Debian, Ubuntu,
            Alpine…) from the Storage tab, on a storage that holds container
            templates.
          </Callout>
        ) : (
          <Field label="Container image" error={errors.ostemplate}>
            {(p) => (
              <Pick
                id={p.id}
                value={m.ostemplate}
                onChange={(ostemplate) => set({ ostemplate })}
                items={m.ctTemplates.map((x) => ({
                  value: x.volid,
                  label: x.name,
                  detail: `${x.storage} · ${formatSize(x.size)}`,
                }))}
              />
            )}
          </Field>
        ))}
    </>
  )
}

function Summary({ d, m }: { d: Draft; m: Model }) {
  const rows: [string, string][] = [
    ["Kind", d.kind === "lxc" ? "Container" : "Virtual machine"],
    [
      "From",
      m.source === "clone"
        ? m.template
          ? `${guestName(m.template)}${d.full ? "" : " (linked)"}`
          : "—"
        : m.source === "iso"
          ? m.isos.find((x) => x.volid === m.iso)?.name || "Empty drive"
          : m.ctTemplates.find((x) => x.volid === m.ostemplate)?.name || "—",
    ],
    ["Name", d.name.trim() || "—"],
    ["Node", m.node || "—"],
    [
      "Size",
      [
        `${d.cores || (m.template ? m.template.cpus : m.defCores)} cores`,
        d.memory
          ? memText(Number(d.memory))
          : m.template
            ? formatSize(m.template.maxmem)
            : memText(m.defMemory),
        d.disk
          ? `${d.disk} GB`
          : m.template
            ? formatSize(m.template.maxdisk)
            : `${m.defDisk} GB`,
      ].join(" · "),
    ],
    [
      "Network",
      [
        m.bridge || "As the template",
        d.vlan ? `VLAN ${d.vlan}` : "",
        m.source === "iso"
          ? ""
          : d.ipMode === "dhcp"
            ? "DHCP"
            : d.address || "fixed",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Then",
      [
        d.start ? "Start" : "Leave off",
        d.addServer && !m.serverBlock ? "add to Servers" : "",
      ]
        .filter(Boolean)
        .join(", "),
    ],
  ]
  return (
    <div className="sticky top-[calc(3rem+1px+1.25rem)] rounded-2xl border border-border p-5">
      <h2 className="text-body-sm font-medium">Summary</h2>
      <dl className="mt-3 grid gap-2.5">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-caption text-ash">{k}</dt>
            <dd className="truncate text-body-sm">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ---- after Create: follow the job here

function Progress({
  start,
  phone,
  kind,
  onEdit,
}: {
  start: Job
  phone: boolean
  kind: Kind
  onEdit: () => void
}) {
  const list = useJobList()
  const job = list.data?.find((j) => j.id === start.id) ?? start
  const log = useJobLog(job.id, job.state)
  const lines = (log.data?.log ?? "").trim().split("\n").filter(Boolean)
  const tail = lines.slice(-12)
  const r = (job.result ?? {}) as {
    vmid?: number
    ip?: string
    server_id?: string
    note?: string
  }
  const cluster = job.target?.cluster_id ?? ""
  const vmid = r.vmid ?? job.target?.vmid
  const running = isActive(job)
  const ok = job.state === "succeeded"

  return (
    <div
      className={cn(
        "flex max-w-3xl flex-col gap-5",
        phone ? "px-4 py-5" : "rounded-2xl border border-border p-6",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5",
            running && "bg-brand-soft text-brand-strong",
            ok && "bg-muted text-success",
            !running && !ok && "bg-destructive/10 text-destructive",
          )}
        >
          {running ? (
            <LoaderCircle className="animate-spin" />
          ) : ok ? (
            <Check />
          ) : (
            <CircleAlert />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">
            {running
              ? `Creating the ${kindNoun(kind)}…`
              : ok
                ? `The ${kindNoun(kind)} is ready`
                : `The ${kindNoun(kind)} wasn't made`}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {job.title} · <StateText job={job} />
          </p>
        </div>
      </div>

      {running && (
        <div className="flex flex-col gap-1.5">
          <JobBar job={job} />
          <p className="text-caption text-muted-foreground">
            {progressText(job) || "Starting…"} You can leave this page: it
            carries on and shows under Tasks.
          </p>
        </div>
      )}

      {!running && !ok && job.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
          {job.error}
        </p>
      )}

      {ok && (
        <dl className="grid gap-3 sm:grid-cols-3">
          {vmid ? <Fact k="ID" v={String(vmid)} /> : null}
          {r.ip ? <Fact k="Address" v={r.ip} /> : null}
          {r.server_id ? <Fact k="Server" v="Added to Servers" /> : null}
        </dl>
      )}
      {ok && r.note && (
        <Callout icon={<Info />} tone="warning">
          {r.note}
        </Callout>
      )}

      {tail.length > 0 && (
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-subtle p-3 font-mono text-caption leading-relaxed break-all whitespace-pre-wrap">
          {tail.join("\n")}
        </pre>
      )}

      <div className="flex flex-wrap gap-2">
        {ok && cluster && vmid ? (
          <Button
            render={<Link href={vmHref(cluster, vmid)} />}
            nativeButton={false}
          >
            Open the {kindNoun(kind)}
          </Button>
        ) : null}
        {ok && r.server_id ? (
          <Button
            variant="outline"
            render={<Link href={`/servers/${r.server_id}`} />}
            nativeButton={false}
          >
            <Server />
            Open the server
          </Button>
        ) : null}
        {!running && !ok && <Button onClick={onEdit}>Back to the form</Button>}
        {ok && (
          <Button variant="outline" onClick={onEdit}>
            Make another
          </Button>
        )}
        <Button
          variant="ghost"
          render={<Link href={home} />}
          nativeButton={false}
        >
          All machines
        </Button>
      </div>
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-caption text-ash">{k}</dt>
      <dd className="truncate text-body-sm font-medium">{v}</dd>
    </div>
  )
}

// ---- shell

function PhoneBar({ title, action }: { title: string; action?: ReactNode }) {
  const back = useBack(home)
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
      <Button variant="ghost" size="icon-lg" aria-label="Back" onClick={back}>
        <ChevronLeft className="size-6" />
      </Button>
      <h1 className="min-w-0 flex-1 truncate text-body font-medium">{title}</h1>
      {action}
    </header>
  )
}

function Shell({
  phone,
  title,
  children,
}: {
  phone: boolean
  title: string
  children: ReactNode
}) {
  if (phone) {
    return (
      <div className="flex flex-col">
        <PhoneBar title={title} />
        {children}
      </div>
    )
  }
  return <div className="px-6 pt-5 pb-12">{children}</div>
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-6")}>
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
      <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
    </div>
  )
}
