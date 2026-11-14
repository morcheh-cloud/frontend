"use client"

import {
  Archive,
  CalendarClock,
  Copy,
  History,
  Lock,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { PVEBackup } from "@/lib/services"

import { newCronjobHref } from "../../../../cronjobs/components/meta"
import type { Item } from "../../../../servers/[id]/components/parts"
import { Empty } from "../../../../servers/[id]/components/parts"
import { timeAgo } from "../../../../servers/components/meta"
import { useGuestBackups, useVmJob } from "../../../api"
import { kindNoun } from "../../../components/meta"
import { copy, useVmActions } from "../../../components/vm-actions"
import { TabLoading, useGuestPage } from "./guest-page"
import { MenuRow, Panel, TabBar, TabBody, Tag } from "./kit"

// Where a backup lives: "pbs:backup/vm/101/2026-…" → "pbs".
const storageOf = (b: PVEBackup) => b.storage || b.volid.split(":")[0]

export function BackupsTab() {
  const { guest: g, phone, can } = useGuestPage()
  const a = useVmActions()
  const q = useGuestBackups(g.cluster_id, g.vmid)
  const engineer = can("engineer")
  const owner = can("owner")
  const [removing, setRemoving] = useState<PVEBackup | null>(null)
  const [confirm, setConfirm] = useOpen("vm-backup-delete")
  const remove = useVmJob((b: PVEBackup) =>
    api.virtualMachines.deletePveVolume(g.cluster_id, b.node, storageOf(b), {
      volid: b.volid,
    }),
  )

  if (q.isLoading) return <TabLoading />

  const items = [...(q.data?.items ?? [])].sort((x, y) =>
    y.created_at.localeCompare(x.created_at),
  )
  const problems = q.data?.problems ?? []
  const total = items.reduce((n, b) => n + (b.size || 0), 0)
  const newest = items[0]
  const schedule = newCronjobHref({
    action: "pve-backup",
    cluster: g.cluster_id,
    vmid: g.vmid,
  })

  const backupButton = engineer && (
    <Button
      size={phone ? "lg" : "sm"}
      disabled={!!g.lock}
      onClick={() => a.backup(g)}
      className="max-md:flex-1"
    >
      <Archive />
      Back up now
    </Button>
  )
  const scheduleButton = engineer && (
    <Button
      variant="outline"
      size={phone ? "lg" : "sm"}
      render={<Link href={schedule} />}
      nativeButton={false}
      className="max-md:flex-1"
    >
      <CalendarClock />
      Schedule
    </Button>
  )

  if (q.isError) {
    return (
      <Empty
        icon={Archive}
        title="Couldn't read the backups"
        body={q.error.message}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  if (items.length === 0) {
    return (
      <TabBody>
        {problems.length > 0 && <Problems names={problems} />}
        <Empty
          icon={Archive}
          title="No backups of this machine"
          body={`A backup is a full copy of the ${kindNoun(g.kind)} on a backup storage (or a Proxmox Backup Server), made by Proxmox's vzdump. Unlike a snapshot it survives losing the disk. Take one now, or schedule them with Cron jobs.`}
          action={
            engineer ? (
              <div className="flex flex-wrap justify-center gap-2">
                {backupButton}
                {scheduleButton}
              </div>
            ) : undefined
          }
        />
      </TabBody>
    )
  }

  const menu = (b: PVEBackup): Item[][] => [
    engineer
      ? [
          {
            key: "restore",
            label: "Restore…",
            icon: <History />,
            disabled: !!g.lock,
            onSelect: () => a.restore(g, b),
          },
        ]
      : [],
    [
      {
        key: "copy",
        label: "Copy volume ID",
        icon: <Copy />,
        onSelect: () => copy(b.volid, "Volume ID"),
      },
    ],
    owner
      ? [
          {
            key: "delete",
            label: b.protected ? "Protected: can't delete" : "Delete…",
            icon: <Trash2 />,
            destructive: true,
            disabled: b.protected,
            onSelect: () => {
              setRemoving(b)
              setConfirm(true)
            },
          },
        ]
      : [],
  ]

  return (
    <TabBody>
      <TabBar>
        <span className="text-caption text-muted-foreground">
          {items.length} backup{items.length === 1 ? "" : "s"}
          {total > 0 && ` · ${formatSize(total)}`}
          {newest && ` · newest ${timeAgo(newest.created_at)}`}
        </span>
        {engineer && (
          <span className="ms-auto flex gap-2 max-md:ms-0 max-md:w-full">
            {scheduleButton}
            {backupButton}
          </span>
        )}
      </TabBar>
      {problems.length > 0 && <Problems names={problems} />}
      <Panel flush>
        <ul className="divide-y divide-border py-1">
          {items.map((b) => (
            <li key={b.volid}>
              <MenuRow
                id={`backup-${b.volid}`}
                phone={phone}
                label={`Backup from ${new Date(b.created_at).toLocaleString()}`}
                icon={<Archive />}
                title={
                  <>
                    <span>{new Date(b.created_at).toLocaleString()}</span>
                    {b.protected && (
                      <Tag>
                        <Lock className="me-1 size-3" />
                        Protected
                      </Tag>
                    )}
                    {b.verified && (
                      <Tag tone="success">
                        <ShieldCheck className="me-1 size-3" />
                        Verified
                      </Tag>
                    )}
                  </>
                }
                sub={[
                  timeAgo(b.created_at),
                  storageOf(b),
                  b.vmid !== g.vmid ? `from machine ${b.vmid}` : "",
                  b.notes,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                aside={b.size > 0 ? formatSize(b.size) : undefined}
                groups={menu(b)}
              />
            </li>
          ))}
        </ul>
      </Panel>
      <p className="text-caption text-muted-foreground max-md:px-4 max-md:py-3">
        Restoring over this machine replaces its disks and settings; restore to
        a new ID to look inside a backup first. Backups made on a node's local
        storage disappear with that node.
      </p>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this backup?"
        description={
          removing && (
            <>
              The backup from {new Date(removing.created_at).toLocaleString()}{" "}
              on <b>{storageOf(removing)}</b> is deleted for good.
            </>
          )
        }
        confirmLabel="Delete backup"
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing, {
            onSuccess: () => setConfirm(false),
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </TabBody>
  )
}

function Problems({ names }: { names: string[] }) {
  return (
    <p className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-body-sm max-md:rounded-none max-md:border-x-0 max-md:border-t-0">
      Couldn't read {names.join(", ")}: backups there aren't listed.
    </p>
  )
}
