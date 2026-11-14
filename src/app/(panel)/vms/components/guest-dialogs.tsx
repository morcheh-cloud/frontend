"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  CircleAlert,
  CircleCheck,
  Info,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api, fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  PVEBackup,
  PVEBackupBody,
  PVEGuest,
  PVEHABody,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServers } from "../../servers/api"
import {
  useBackupGuest,
  useCreateOptions,
  useHa,
  useLinkServer,
  useMigrationCheck,
  useSetHa,
  useVmJob,
  vmKeys,
} from "../api"
import { Callout, CheckRow, Pick } from "./form-parts"
import { guestName, guestState, kindNoun, storageActive } from "./meta"

export const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

type LayerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  guest: PVEGuest
  onDone?: () => void
}

export function Footer({
  form,
  pending,
  label,
  disabled,
  destructive,
  onCancel,
}: {
  form: string
  pending: boolean
  label: string
  disabled?: boolean
  destructive?: boolean
  onCancel: () => void
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="max-md:hidden"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={form}
        size="lg"
        className="md:h-9"
        variant={destructive ? "destructive" : "default"}
        disabled={pending || disabled}
      >
        {pending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </>
  )
}

export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong"

// Storages on a node (or shared) that hold a given kind of content.
export function storagesFor<
  S extends {
    storage: string
    node: string
    content: string[]
    shared: boolean
    status: string
  },
>(storages: S[], node: string, content: string) {
  const seen = new Set<string>()
  return storages.filter((s) => {
    if (!s.content.includes(content) || !storageActive(s)) return false
    if (!s.shared && s.node !== node) return false
    if (seen.has(s.storage)) return false
    seen.add(s.storage)
    return true
  })
}

export const freeText = (s: { total: number; used: number }) =>
  s.total > 0 ? `${formatSize(s.total - s.used)} free` : undefined

// ---------------------------------------------------------------- clone

export function CloneDialog({ open, onOpenChange, guest, onDone }: LayerProps) {
  const opts = useCreateOptions(guest.cluster_id, open)
  const clone = useVmJob(
    (body: Parameters<typeof api.virtualMachines.clonePveGuest>[2]) =>
      api.virtualMachines.clonePveGuest(guest.cluster_id, guest.vmid, body),
  )
  const [name, setName] = useState(
    `${guest.name || `machine-${guest.vmid}`}-copy`,
  )
  const [newId, setNewId] = useState("")
  const [full, setFull] = useState(!guest.template)
  const [target, setTarget] = useState("")
  const [storage, setStorage] = useState("")
  const [start, setStart] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const o = opts.data
  const node = target || guest.node
  const disks = o
    ? storagesFor(o.storages, node, guest.kind === "lxc" ? "rootdir" : "images")
    : []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const id = newId ? Number(newId) : undefined
    if (newId && (!Number.isInteger(id) || (id ?? 0) < 100)) {
      setErrors({ new_id: "An ID is a whole number from 100 up." })
      return
    }
    clone.mutate(
      {
        full,
        name: name.trim() || undefined,
        new_id: id,
        target: target || undefined,
        storage: full ? storage || undefined : undefined,
        start: start || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          onDone?.()
        },
        onError: (err) => {
          const f = fieldErrors(err)
          setErrors(f)
          if (!Object.keys(f).length) toast.error(errorText(err))
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Clone ${guestName(guest)}`}
      description={
        guest.template
          ? "A new machine made from this template."
          : `A copy of this ${kindNoun(guest.kind)}, disks and settings included.`
      }
      footer={
        <Footer
          form="pve-clone"
          pending={clone.isPending}
          label="Clone"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="pve-clone" onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Name" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                ref={focusOnPointer}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>
          <Field
            label="ID"
            error={errors.new_id}
            hint={!errors.new_id && o ? "Blank = next free" : undefined}
          >
            {(p) => (
              <Input
                {...p}
                value={newId}
                inputMode="numeric"
                placeholder={o ? String(o.next_id) : ""}
                onChange={(e) => setNewId(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
        </div>
        <Field label="Node" error={errors.target}>
          {(p) => (
            <Pick
              id={p.id}
              value={target}
              onChange={setTarget}
              items={[
                { value: "", label: `Same node (${guest.node})` },
                ...(o?.nodes ?? [])
                  .filter((n) => n.node !== guest.node)
                  .map((n) => ({
                    value: n.node,
                    label: n.node,
                    detail: n.status === "online" ? undefined : "offline",
                    disabled: n.status !== "online",
                  })),
              ]}
            />
          )}
        </Field>
        <CheckRow
          checked={full}
          onChange={setFull}
          label="Full copy"
          text={
            guest.template
              ? "Off = a linked clone: made at once and small, but it needs this template to stay."
              : "A machine that isn't a template can only be copied in full."
          }
          disabled={!guest.template}
        />
        {full && (
          <Field label="Disk storage" error={errors.storage}>
            {(p) => (
              <Pick
                id={p.id}
                value={storage}
                onChange={setStorage}
                items={[
                  { value: "", label: "Same as the source" },
                  ...disks.map((s) => ({
                    value: s.storage,
                    label: s.storage,
                    detail: freeText(s),
                  })),
                ]}
              />
            )}
          </Field>
        )}
        <CheckRow
          checked={start}
          onChange={setStart}
          label="Start it when ready"
        />
      </form>
    </ResponsiveDialog>
  )
}

// ---------------------------------------------------------------- migrate

export function MigrateDialog({
  open,
  onOpenChange,
  guest,
  onDone,
}: LayerProps) {
  const opts = useCreateOptions(guest.cluster_id, open)
  const [target, setTarget] = useState("")
  const running = guestState(guest) === "running"
  const check = useMigrationCheck(
    guest.cluster_id,
    guest.vmid,
    target,
    open && !!target,
  )
  const [online, setOnline] = useState(running)
  const [localDisks, setLocalDisks] = useState(false)
  const migrate = useVmJob(
    (body: Parameters<typeof api.virtualMachines.migratePveGuest>[2]) =>
      api.virtualMachines.migratePveGuest(guest.cluster_id, guest.vmid, body),
  )

  const nodes = (opts.data?.nodes ?? []).filter((n) => n.node !== guest.node)
  const c = check.data
  const refused = c?.not_allowed?.[target]
  const lxcRunning = guest.kind === "lxc" && running
  const blocked =
    !target ||
    check.isFetching ||
    !!refused ||
    (running && online && c?.online_supported === false) ||
    (!!c?.local_disks.length && !localDisks)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    migrate.mutate(
      {
        target,
        online: running && online,
        with_local_disks: localDisks || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          onDone?.()
        },
        onError: (err) => toast.error(errorText(err)),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Move ${guestName(guest)}`}
      description={`To another node of ${guest.cluster_name}. It now runs on ${guest.node}.`}
      footer={
        <Footer
          form="pve-migrate"
          pending={migrate.isPending}
          label="Move"
          disabled={blocked}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="pve-migrate" onSubmit={submit} className="grid gap-4">
        <Field label="To node">
          {(p) => (
            <Pick
              id={p.id}
              value={target}
              onChange={setTarget}
              placeholder={nodes.length ? "Pick a node" : "No other node"}
              items={nodes.map((n) => ({
                value: n.node,
                label: n.node,
                detail:
                  n.status === "online"
                    ? `${formatSize(n.max_mem - n.mem)} memory free`
                    : "offline",
                disabled: n.status !== "online",
              }))}
            />
          )}
        </Field>

        {target && check.isFetching && (
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Asking Proxmox whether
            it can go there…
          </p>
        )}
        {check.error && (
          <Callout tone="destructive" icon={<CircleAlert />}>
            {check.error.message}
          </Callout>
        )}
        {c && !check.isFetching && (
          <>
            {refused ? (
              <Callout tone="destructive" icon={<CircleAlert />}>
                Proxmox won't move it there:{" "}
                {JSON.stringify(refused)
                  .replace(/[{}"[\]]/g, " ")
                  .trim()}
              </Callout>
            ) : (
              <Callout icon={<CircleCheck className="text-success" />}>
                {target} can take it.
              </Callout>
            )}
            {c.local_resources.length > 0 && (
              <Callout tone="warning" icon={<ShieldAlert />}>
                Tied to this node: {c.local_resources.join(", ")}. Proxmox may
                refuse while they're attached.
              </Callout>
            )}
          </>
        )}

        {running && (
          <CheckRow
            checked={online && !lxcRunning}
            onChange={setOnline}
            disabled={lxcRunning || c?.online_supported === false}
            label="Keep it running (live)"
            text={
              lxcRunning
                ? "Containers can't move live: it restarts on the new node."
                : c?.online_supported === false
                  ? "Not possible for this machine: turn it off first or untick."
                  : "Memory is copied while it runs; users notice a short pause."
            }
          />
        )}
        {(c?.local_disks.length ?? 0) > 0 && (
          <CheckRow
            checked={localDisks}
            onChange={setLocalDisks}
            label="Copy its local disks too"
            text={`On this node only: ${c?.local_disks.join(", ")}. Copying takes a while.`}
          />
        )}
      </form>
    </ResponsiveDialog>
  )
}

// ---------------------------------------------------------------- snapshot

export function SnapshotDialog({
  open,
  onOpenChange,
  guest,
  onDone,
}: LayerProps) {
  const queryClient = useQueryClient()
  const take = useVmJob(
    (body: Parameters<typeof api.virtualMachines.createPveSnapshot>[2]) =>
      api.virtualMachines.createPveSnapshot(guest.cluster_id, guest.vmid, body),
  )
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
  const [name, setName] = useState(`snap_${stamp}`)
  const [description, setDescription] = useState("")
  const running = guestState(guest) === "running"
  const [withRam, setWithRam] = useState(false)
  const [error, setError] = useState("")

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[A-Za-z][A-Za-z0-9_-]{1,39}$/.test(name)) {
      setError(
        "Starts with a letter; letters, digits, - and _ only; 2–40 characters.",
      )
      return
    }
    take.mutate(
      {
        name,
        description: description.trim() || undefined,
        with_ram: (running && guest.kind === "qemu" && withRam) || undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: vmKeys.snapshots(guest.cluster_id, guest.vmid),
          })
          onOpenChange(false)
          onDone?.()
        },
        onError: (err) => {
          const f = fieldErrors(err)
          if (f.name) setError(f.name)
          else toast.error(errorText(err))
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Take a snapshot"
      description={`${guestName(guest)} as it is now. You can go back to it later.`}
      footer={
        <Footer
          form="pve-snapshot"
          pending={take.isPending}
          label="Take snapshot"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="pve-snapshot" onSubmit={submit} className="grid gap-4">
        <Field label="Name" error={error}>
          {(p) => (
            <Input
              {...p}
              ref={focusOnPointer}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Note"
          hint="What's in it, e.g. “before the PHP 8.3 upgrade”"
        >
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        {guest.kind === "qemu" && running && (
          <CheckRow
            checked={withRam}
            onChange={setWithRam}
            label="Include memory"
            text="Going back resumes it exactly where it was, programs still running. Takes longer and more space."
          />
        )}
      </form>
    </ResponsiveDialog>
  )
}

// ---------------------------------------------------------------- backup

export function BackupDialog({
  open,
  onOpenChange,
  guest,
  onDone,
}: LayerProps) {
  const queryClient = useQueryClient()
  const opts = useCreateOptions(guest.cluster_id, open)
  const backup = useBackupGuest(guest.cluster_id, guest.vmid)
  const targets = opts.data
    ? storagesFor(opts.data.storages, guest.node, "backup")
    : []
  const [storage, setStorage] = useState("")
  const picked = storage || targets[0]?.storage || ""
  const [mode, setMode] = useState<"snapshot" | "suspend" | "stop">("snapshot")
  const [compress, setCompress] =
    useState<NonNullable<PVEBackupBody["compress"]>>("zstd")
  const [notes, setNotes] = useState("{{guestname}}")
  const [keep, setKeep] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    backup.mutate(
      {
        storage: picked,
        mode,
        compress,
        notes: notes.trim() || undefined,
        protected: keep || undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: vmKeys.backups(guest.cluster_id, guest.vmid),
          })
          onOpenChange(false)
          onDone?.()
        },
        onError: (err) => toast.error(errorText(err)),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Back up now"
      description={`A full copy of ${guestName(guest)} on a backup storage (vzdump or Proxmox Backup Server).`}
      footer={
        <Footer
          form="pve-backup"
          pending={backup.isPending}
          label="Back up"
          disabled={!picked}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="pve-backup" onSubmit={submit} className="grid gap-4">
        <Field
          label="Storage"
          hint={
            opts.data && !targets.length
              ? "No storage on this node takes backups. Add “VZDump backup file” content to one in Proxmox, or connect a Proxmox Backup Server."
              : undefined
          }
        >
          {(p) => (
            <Pick
              id={p.id}
              value={picked}
              onChange={setStorage}
              placeholder={opts.isLoading ? "Loading…" : "Pick a storage"}
              items={targets.map((s) => ({
                value: s.storage,
                label: s.storage,
                detail: [s.type === "pbs" ? "Backup Server" : "", freeText(s)]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          )}
        </Field>
        <Field
          label="While it runs"
          hint={
            mode === "snapshot"
              ? "No downtime. Best with the guest agent installed (VMs)."
              : mode === "suspend"
                ? "Paused for a short while at the start."
                : "Shut down for the whole backup, started again after. Most consistent."
          }
        >
          {(p) => (
            <Pick
              id={p.id}
              value={mode}
              onChange={setMode}
              items={[
                { value: "snapshot", label: "Keep running (snapshot)" },
                { value: "suspend", label: "Pause briefly (suspend)" },
                { value: "stop", label: "Stop it (stop)" },
              ]}
            />
          )}
        </Field>
        <Field label="Compression">
          {(p) => (
            <Pick
              id={p.id}
              value={compress}
              onChange={setCompress}
              items={[
                { value: "zstd", label: "ZSTD", detail: "fast and small" },
                { value: "gzip", label: "GZIP" },
                { value: "lzo", label: "LZO", detail: "fastest" },
                { value: "0", label: "None" },
              ]}
            />
          )}
        </Field>
        <Field
          label="Note"
          hint="{{guestname}}, {{vmid}}, {{node}} and {{cluster}} are filled in."
        >
          {(p) => (
            <Input
              {...p}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>
        <CheckRow
          checked={keep}
          onChange={setKeep}
          label="Protect it"
          text="Kept when old backups are pruned, until you unprotect it."
        />
      </form>
    </ResponsiveDialog>
  )
}

// ---------------------------------------------------------------- restore

export function RestoreDialog({
  open,
  onOpenChange,
  guest,
  backup,
  onDone,
}: LayerProps & { backup: PVEBackup }) {
  const opts = useCreateOptions(guest.cluster_id, open)
  const restore = useVmJob(
    (body: Parameters<typeof api.virtualMachines.restorePveGuest>[2]) =>
      api.virtualMachines.restorePveGuest(guest.cluster_id, guest.vmid, body),
  )
  const [asNew, setAsNew] = useState(false)
  const [newId, setNewId] = useState("")
  const [storage, setStorage] = useState("")
  const [start, setStart] = useState(false)
  const [unique, setUnique] = useState(true)
  const [confirm, setConfirm] = useState("")
  const name = guestName(guest)
  const o = opts.data
  const disks = o
    ? storagesFor(
        o.storages,
        guest.node,
        guest.kind === "lxc" ? "rootdir" : "images",
      )
    : []
  const running = guestState(guest) === "running"
  const confirmed = asNew || confirm.trim() === name

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!confirmed) return
    restore.mutate(
      {
        volid: backup.volid,
        as_new: asNew || undefined,
        new_id: asNew && newId ? Number(newId) : undefined,
        storage: storage || undefined,
        start: start || undefined,
        unique: asNew ? unique : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          onDone?.()
        },
        onError: (err) => toast.error(errorText(err)),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore a backup"
      description={`From ${new Date(backup.created_at).toLocaleString()} · ${formatSize(backup.size)} on ${backup.storage}`}
      footer={
        <Footer
          form="pve-restore"
          pending={restore.isPending}
          label={asNew ? "Restore as new" : "Replace and restore"}
          destructive={!asNew}
          disabled={!confirmed}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="pve-restore" onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <ChoiceCard
            on={!asNew}
            onClick={() => setAsNew(false)}
            title={`Replace ${name}`}
            text="Its disks and settings go back to this backup. Everything since is lost."
          />
          <ChoiceCard
            on={asNew}
            onClick={() => setAsNew(true)}
            title="As a new machine"
            text={`${name} stays as it is; the backup becomes a second machine.`}
          />
        </div>
        {asNew ? (
          <>
            <Field label="New ID" hint="Blank = next free">
              {(p) => (
                <Input
                  {...p}
                  value={newId}
                  inputMode="numeric"
                  placeholder={o ? String(o.next_id) : ""}
                  onChange={(e) => setNewId(e.target.value.replace(/\D/g, ""))}
                />
              )}
            </Field>
            <CheckRow
              checked={unique}
              onChange={setUnique}
              label="New network addresses"
              text="Fresh MAC addresses so both can run side by side."
            />
          </>
        ) : (
          <>
            {running && (
              <Callout tone="warning" icon={<CircleAlert />}>
                It's running: Morche stops it first.
              </Callout>
            )}
            <Field label={`Type “${name}” to confirm`}>
              {(p) => (
                <Input
                  {...p}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </Field>
          </>
        )}
        <Field label="Disk storage">
          {(p) => (
            <Pick
              id={p.id}
              value={storage}
              onChange={setStorage}
              items={[
                { value: "", label: "As in the backup" },
                ...disks.map((s) => ({
                  value: s.storage,
                  label: s.storage,
                  detail: freeText(s),
                })),
              ]}
            />
          )}
        </Field>
        <CheckRow
          checked={start}
          onChange={setStart}
          label="Start it when done"
        />
      </form>
    </ResponsiveDialog>
  )
}

function ChoiceCard({
  on,
  onClick,
  title,
  text,
}: {
  on: boolean
  onClick: () => void
  title: string
  text: string
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        on ? "border-brand bg-brand-soft/40" : "hover:bg-muted",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          on ? "border-brand" : "border-mist",
        )}
      >
        {on && <span className="size-2 rounded-full bg-brand" />}
      </span>
      <span>
        <span className="block text-body-sm font-medium">{title}</span>
        <span className="block text-caption text-muted-foreground">{text}</span>
      </span>
    </button>
  )
}

// ---------------------------------------------------------------- link

export function LinkDialog({ open, onOpenChange, guest, onDone }: LayerProps) {
  const [q, setQ] = useState(guest.name)
  const servers = useServers({ q: q.trim() || undefined, limit: 8 })
  const link = useLinkServer(guest.cluster_id, guest.vmid)
  const ips = guest.ips

  const pick = (id: string, name: string) =>
    link.mutate(id, {
      onSuccess: () => {
        toast.success(`Linked to ${name}`)
        onOpenChange(false)
        onDone?.()
      },
      onError: (err) => toast.error(errorText(err)),
    })

  const items = servers.data?.items ?? []
  // A server at one of the machine's addresses is almost surely it.
  const ranked = [...items].sort(
    (a, b) => Number(ips.includes(b.host)) - Number(ips.includes(a.host)),
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Link to a server"
      description="The server in Morche that is this machine. Each page then links to the other, and the machine's power shows on the server."
    >
      <div className="grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
          <Input
            ref={focusOnPointer}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search servers"
            className="ps-9"
            type="search"
            enterKeyHint="search"
          />
        </div>
        <div className="-mx-2 grid">
          {servers.isLoading && (
            <p className="px-2 py-3 text-body-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {servers.data && !items.length && (
            <p className="px-2 py-3 text-body-sm text-muted-foreground">
              No server matches. Add it under Servers first, or create the
              machine from a template with “Add it to Servers” ticked.
            </p>
          )}
          {ranked.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={link.isPending}
              onClick={() => pick(s.id, s.name)}
              className="flex min-h-11 items-center gap-3 rounded-lg p-2 text-start hover:bg-muted disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium">
                  {s.name}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {s.username}@{s.host}
                </span>
              </span>
              {ips.includes(s.host) && (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-caption text-brand-strong">
                  Same address
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

// ---------------------------------------------------------------- HA

export function HaDialog({ open, onOpenChange, guest, onDone }: LayerProps) {
  const ha = useHa(guest.cluster_id, open)
  const set = useSetHa(guest.cluster_id, guest.vmid)
  const item = ha.data?.items.find((i) => i.vmid === guest.vmid)
  const managed = !!item
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="High availability"
      description="Proxmox keeps a managed machine in the state you ask for, and starts it on another node when its node fails."
    >
      {ha.isLoading ? (
        <p className="text-body-sm text-muted-foreground">Loading…</p>
      ) : (
        <HaForm
          key={item?.sid ?? "new"}
          initial={
            item
              ? {
                  state: ([
                    "started",
                    "stopped",
                    "disabled",
                    "ignored",
                  ].includes(item.state)
                    ? item.state
                    : "started") as PVEHABody["state"],
                  group: item.group ?? "",
                  max_restart: item.max_restart,
                  max_relocate: item.max_relocate,
                  comment: item.comment ?? "",
                }
              : {
                  state: "started",
                  group: "",
                  max_restart: 1,
                  max_relocate: 1,
                  comment: "",
                }
          }
          groups={ha.data?.groups ?? []}
          quorate={ha.data?.quorate ?? true}
          managed={managed}
          pending={set.isPending}
          onSave={(body) =>
            set.mutate(body, {
              onSuccess: () => {
                toast.success(
                  body ? "High availability saved" : "No longer managed by HA",
                )
                onOpenChange(false)
                onDone?.()
              },
              onError: (err) => toast.error(errorText(err)),
            })
          }
        />
      )}
    </ResponsiveDialog>
  )
}

function HaForm({
  initial,
  groups,
  quorate,
  managed,
  pending,
  onSave,
}: {
  initial: Required<Omit<PVEHABody, "$schema">>
  groups: string[]
  quorate: boolean
  managed: boolean
  pending: boolean
  onSave: (body: PVEHABody | null) => void
}) {
  const [v, setV] = useState(initial)
  const put = <K extends keyof PVEHABody>(k: K, val: PVEHABody[K]) =>
    setV((d) => ({ ...d, [k]: val }))
  const num = (s: string) => Math.max(0, Math.min(10, Number(s) || 0))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          state: v.state,
          group: v.group || undefined,
          max_restart: v.max_restart,
          max_relocate: v.max_relocate,
          comment: v.comment.trim() || undefined,
        })
      }}
      className="grid gap-4"
    >
      {!quorate && (
        <Callout tone="warning" icon={<CircleAlert />}>
          The cluster has no quorum right now: HA can't act until enough nodes
          are back.
        </Callout>
      )}
      <Field
        label="Keep it"
        hint={
          {
            started:
              "Running. If it stops or its node dies, HA starts it again.",
            stopped: "Stopped. HA stops it if someone starts it.",
            disabled: "Stopped and left alone; HA won't move it.",
            ignored: "HA forgets it for now, without removing it.",
          }[v.state]
        }
      >
        {(p) => (
          <Pick
            id={p.id}
            value={v.state}
            onChange={(s) => put("state", s)}
            items={[
              { value: "started", label: "Running" },
              { value: "stopped", label: "Stopped" },
              { value: "disabled", label: "Disabled" },
              { value: "ignored", label: "Ignored" },
            ]}
          />
        )}
      </Field>
      <Field
        label="Group"
        hint="Limits which nodes it may run on. Groups are set up in Proxmox."
      >
        {(p) => (
          <Pick
            id={p.id}
            value={v.group}
            onChange={(g) => put("group", g)}
            items={[
              { value: "", label: "Any node" },
              ...groups.map((g) => ({ value: g, label: g })),
            ]}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Restart tries" hint="On the same node">
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={v.max_restart}
              onChange={(e) => put("max_restart", num(e.target.value))}
            />
          )}
        </Field>
        <Field label="Move tries" hint="To other nodes">
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={v.max_relocate}
              onChange={(e) => put("max_relocate", num(e.target.value))}
            />
          )}
        </Field>
      </div>
      <Field label="Note">
        {(p) => (
          <Input
            {...p}
            value={v.comment}
            onChange={(e) => put("comment", e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-2 max-md:flex-col-reverse max-md:items-stretch">
        {managed && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive md:me-auto"
            disabled={pending}
            onClick={() => onSave(null)}
          >
            Stop managing it
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          className="md:ms-auto md:h-9"
          disabled={pending}
        >
          {pending && <Loader2 className="animate-spin" />}
          {managed ? "Save" : "Manage with HA"}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------- delete

export function DeleteGuestDialog({
  open,
  onOpenChange,
  guest,
  onDone,
}: LayerProps) {
  const remove = useVmJob((stop: boolean) =>
    api.virtualMachines.deletePveGuest(guest.cluster_id, guest.vmid, {
      stop: stop || undefined,
    }),
  )
  const name = guestName(guest)
  const [confirm, setConfirm] = useState("")
  const running = guestState(guest) === "running"
  const [stop, setStop] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (confirm.trim() !== name || (running && !stop)) return
    remove.mutate(running && stop, {
      onSuccess: () => {
        onOpenChange(false)
        onDone?.()
      },
      onError: (err) => toast.error(errorText(err)),
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${name}?`}
      description={`The ${guest.template ? "template" : kindNoun(guest.kind)} and its disks are destroyed on ${guest.cluster_name}. Backups on backup storages stay.`}
      footer={
        <Footer
          form="pve-delete"
          pending={remove.isPending}
          label="Delete for good"
          destructive
          disabled={confirm.trim() !== name || (running && !stop)}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="pve-delete" onSubmit={submit} className="grid gap-4">
        {guest.link && (
          <Callout icon={<Info />}>
            The linked server “{guest.link.server_name}” stays in Morche; remove
            it under Servers if it's gone for good.
          </Callout>
        )}
        {running && (
          <CheckRow
            checked={stop}
            onChange={setStop}
            label="Stop it first"
            text="It's running. Proxmox only deletes a stopped machine."
          />
        )}
        <Field label={`Type “${name}” to confirm`}>
          {(p) => (
            <Input
              {...p}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}

// ---------------------------------------------------------------- rollback

export function RollbackDialog({
  open,
  onOpenChange,
  guest,
  snapshot,
  onDone,
}: LayerProps & { snapshot: string }) {
  const rollback = useVmJob((start: boolean) =>
    api.virtualMachines.rollbackPveSnapshot(
      guest.cluster_id,
      guest.vmid,
      snapshot,
      { start: start || undefined },
    ),
  )
  const [start, setStart] = useState(guestState(guest) === "running")
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Go back to “${snapshot}”?`}
      description={`${guestName(guest)} returns to how it was then. What changed since is lost, unless you take a snapshot first.`}
      footer={
        <Footer
          form="pve-rollback"
          pending={rollback.isPending}
          label="Go back"
          destructive
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form
        id="pve-rollback"
        onSubmit={(e) => {
          e.preventDefault()
          rollback.mutate(start, {
            onSuccess: () => {
              onOpenChange(false)
              onDone?.()
            },
            onError: (err) => toast.error(errorText(err)),
          })
        }}
      >
        <CheckRow
          checked={start}
          onChange={setStart}
          label="Start it afterwards"
        />
      </form>
    </ResponsiveDialog>
  )
}

export type { ReactNode }
