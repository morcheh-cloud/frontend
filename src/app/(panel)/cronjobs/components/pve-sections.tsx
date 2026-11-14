"use client"

import { Search, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  useClusters,
  useGuests,
  useInfrastructure,
} from "@/app/(panel)/vms/api"
import {
  GuestTile,
  guestName,
  kindLabel,
} from "@/app/(panel)/vms/components/meta"
import { useVmCan } from "@/app/(panel)/vms/components/permissions"
import { Field } from "@/components/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { PVEGuest } from "@/lib/services"

import { Callout, FieldError, Section, ToggleRow } from "./editor-parts"
import { pveCompress, pveModes } from "./meta"
import { Choice, NoneYet, type TaskSectionProps } from "./task-fields"

const modeOrder = ["snapshot", "suspend", "stop"] as const
const compressOrder = ["zstd", "lzo", "gzip", "0"] as const
const modeHints: Record<(typeof modeOrder)[number], string> = {
  snapshot:
    "The machine keeps running. Best for most; a VM with the guest agent also flushes its disks first.",
  suspend:
    "The machine is paused for the last part of the copy. For containers whose storage can't snapshot.",
  stop: "The machine is shut down for the backup and started again after. The most consistent copy, with downtime.",
}

// pve-backup / pve-snapshot: one cluster, then every machine (with a skip
// list) or the chosen ones, then what to do with them.
export function PveSections({
  action,
  t,
  set,
  errors,
  phone,
  ws,
}: TaskSectionProps) {
  const clusters = useClusters()
  const guests = useGuests()
  const infra = useInfrastructure(action === "pve-backup")
  const can = useVmCan()
  const mine = (clusters.data?.items ?? []).filter(
    (c) => c.workspace_id === ws && can(c, "engineer"),
  )
  const machines = (guests.data?.items ?? [])
    .filter((g) => g.cluster_id === t.pveCluster && !g.template)
    .sort((a, b) => a.vmid - b.vmid)
  const storages = [
    ...new Map(
      (infra.data?.storages ?? [])
        .filter(
          (s) => s.cluster_id === t.pveCluster && s.content.includes("backup"),
        )
        .map((s) => [s.storage, s]),
    ).values(),
  ].sort((a, b) => a.storage.localeCompare(b.storage))

  const snapshot = action === "pve-snapshot"

  return (
    <>
      <Section
        title="Machines"
        hint="VMs and containers on one Proxmox cluster. Templates are left out."
        phone={phone}
      >
        <Field label="Cluster" error={errors.cluster}>
          {(p) =>
            clusters.isPending ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : mine.length === 0 ? (
              <NoneYet
                text="No Proxmox cluster in this workspace that you can manage (Engineer)."
                href="/vms?tab=clusters"
                label="Add a cluster"
              />
            ) : (
              <Choice
                id={p.id}
                value={t.pveCluster}
                onChange={(pveCluster) =>
                  set({ pveCluster, pveVmids: [], pveSkip: [], pveStorage: "" })
                }
                placeholder="Choose a cluster"
                items={mine.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            )
          }
        </Field>
        {t.pveCluster && (
          <div className="flex flex-col gap-2">
            <Segmented
              label="Which machines"
              value={t.pveAll ? "all" : "chosen"}
              onChange={(v) => set({ pveAll: v === "all" })}
              items={[
                { value: "all", label: "All of them" },
                { value: "chosen", label: "Chosen ones" },
              ]}
            />
            <p className="text-caption text-muted-foreground">
              {t.pveAll
                ? "Every machine on the cluster when it runs, new ones too. Tick the ones to leave out."
                : "Only the ticked machines. A machine deleted later is skipped."}
            </p>
            <MachinePicker
              loading={guests.isPending}
              machines={machines}
              picked={t.pveAll ? t.pveSkip : t.pveVmids}
              skip={t.pveAll}
              onChange={(ids) =>
                set(t.pveAll ? { pveSkip: ids } : { pveVmids: ids })
              }
            />
            <FieldError text={errors.machines} />
          </div>
        )}
      </Section>

      {snapshot ? (
        <Section
          title="Snapshots"
          hint="Each run takes a snapshot named prefix-date-time and removes the oldest ones it made beyond the number to keep."
          phone={phone}
        >
          <Field
            label="Name prefix"
            hint="Only snapshots starting with it are counted and removed; ones you take by hand stay."
            error={errors.prefix}
          >
            {(p) => (
              <Input
                {...p}
                value={t.pvePrefix}
                onChange={(e) => set({ pvePrefix: e.target.value })}
                placeholder="auto"
                autoCapitalize="off"
                spellCheck={false}
                className="max-w-60"
              />
            )}
          </Field>
          <Field
            label="Keep"
            hint="How many of these snapshots each machine keeps. 0 = never remove."
            error={errors.keep}
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={t.pveKeep}
                onChange={(e) => set({ pveKeep: e.target.value })}
                className="w-28"
              />
            )}
          </Field>
          <ToggleRow
            id="cronjob-pve-vmstate"
            label="With memory (VMs)"
            hint="Also saves the running VM's memory, so going back resumes where it was. Slower and takes as much space as the RAM."
            checked={t.pveVmstate}
            onChange={(pveVmstate) => set({ pveVmstate })}
          />
          <Callout icon={<TriangleAlert />} tone="warning">
            Snapshots live on the machine's own storage: they don't replace
            backups. Many of them slow the disks down.
          </Callout>
        </Section>
      ) : (
        <Section
          title="Backup"
          hint="Proxmox's vzdump makes a full copy of each machine on a backup storage or a Proxmox Backup Server."
          phone={phone}
        >
          <Field
            label="Storage"
            hint="Storages on the cluster that take backups."
            error={errors.storage}
          >
            {(p) =>
              !t.pveCluster ? (
                <p className="text-body-sm text-muted-foreground">
                  Choose a cluster first.
                </p>
              ) : infra.isPending ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : storages.length === 0 ? (
                <p className="rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
                  No storage on this cluster takes backups. In Proxmox, add
                  &ldquo;VZDump backup file&rdquo; to a storage's content, or
                  add a Proxmox Backup Server.
                </p>
              ) : (
                <Choice
                  id={p.id}
                  value={t.pveStorage}
                  onChange={(pveStorage) => set({ pveStorage })}
                  placeholder="Choose a storage"
                  items={storages.map((s) => ({
                    value: s.storage,
                    label: s.storage,
                    detail: `${s.type}${s.shared ? " · shared" : ` · ${s.node}`}`,
                  }))}
                />
              )
            }
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Mode</span>
            <div className="[scrollbar-width:none] overflow-x-auto">
              <Segmented
                label="Mode"
                value={t.pveMode}
                onChange={(pveMode) => set({ pveMode })}
                items={modeOrder.map((m) => ({ value: m, label: pveModes[m] }))}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              {modeHints[t.pveMode]}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Compression</span>
            <div className="[scrollbar-width:none] overflow-x-auto">
              <Segmented
                label="Compression"
                value={t.pveCompress}
                onChange={(pveCompress) => set({ pveCompress })}
                items={compressOrder.map((c) => ({
                  value: c,
                  label: pveCompress[c],
                }))}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              Zstandard is fast and small: the best pick. A Proxmox Backup
              Server compresses by itself and ignores this.
            </p>
          </div>
          <Field
            label="Note"
            hint="Shown beside each backup. {{guestname}}, {{vmid}}, {{node}} and {{cluster}} are filled in."
            error={errors.notes}
          >
            {(p) => (
              <Input
                {...p}
                value={t.pveNotes}
                maxLength={200}
                onChange={(e) => set({ pveNotes: e.target.value })}
                spellCheck={false}
              />
            )}
          </Field>
          <ToggleRow
            id="cronjob-pve-protected"
            label="Protect the backups"
            hint="Protected backups can't be deleted, not even by Proxmox's own pruning, until someone unprotects them."
            checked={t.pveProtected}
            onChange={(pveProtected) => set({ pveProtected })}
          />
          <p className="text-caption text-muted-foreground">
            How many backups are kept is the storage's own retention, set in
            Proxmox.
          </p>
        </Section>
      )}

      <Section title="When one fails" phone={phone}>
        <ToggleRow
          id="cronjob-pve-keep-going"
          label="Carry on with the other machines"
          hint="Off = the machines not reached yet are left alone."
          checked={t.pveKeepGoing}
          onChange={(pveKeepGoing) => set({ pveKeepGoing })}
        />
      </Section>
    </>
  )
}

function MachinePicker({
  loading,
  machines,
  picked,
  skip,
  onChange,
}: {
  loading: boolean
  machines: PVEGuest[]
  picked: number[]
  skip: boolean
  onChange: (ids: number[]) => void
}) {
  const [q, setQ] = useState("")
  if (loading) return <Skeleton className="h-40 rounded-lg" />
  if (machines.length === 0) {
    return (
      <p className="rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
        No machines on this cluster yet.
      </p>
    )
  }
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? machines.filter(
        (g) =>
          guestName(g).toLowerCase().includes(needle) ||
          String(g.vmid).includes(needle) ||
          g.node.toLowerCase().includes(needle),
      )
    : machines
  const set = new Set(picked)
  const toggle = (id: number, on: boolean) =>
    onChange(on ? [...picked, id] : picked.filter((v) => v !== id))
  const count = machines.filter((g) => set.has(g.vmid)).length

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-ash" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find by name, ID or node"
          aria-label="Find a machine"
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 text-caption text-muted-foreground">
          {skip ? `${count} left out` : `${count} chosen`}
        </span>
      </div>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto">
        {shown.map((g) => {
          const on = set.has(g.vmid)
          const id = `pve-machine-${g.vmid}`
          return (
            <li key={g.vmid}>
              <label
                htmlFor={id}
                className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-muted/60"
              >
                <Checkbox
                  id={id}
                  checked={on}
                  onCheckedChange={(v) => toggle(g.vmid, v === true)}
                />
                <GuestTile guest={g} className="size-7" />
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      skip && on
                        ? "block truncate text-body-sm text-muted-foreground line-through"
                        : "block truncate text-body-sm"
                    }
                  >
                    {guestName(g)}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {g.vmid} · {kindLabel(g.kind)} · {g.node}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="px-3 py-4 text-body-sm text-muted-foreground">
            Nothing matches.
          </li>
        )}
      </ul>
    </div>
  )
}
