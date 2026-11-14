"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowRightLeft,
  Camera,
  CircleCheck,
  Copy,
  CopyPlus,
  ExternalLink,
  HardDriveDownload,
  HeartPulse,
  Link2,
  Link2Off,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  RotateCw,
  Server,
  SquareTerminal,
  Star,
  StarOff,
  Trash2,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type {
  PVEBackup,
  PVECluster,
  PVEGuest,
  PVEPowerBody,
} from "@/lib/services"
import {
  useCheckCluster,
  useDeleteCluster,
  useFavoriteCluster,
  vmKeys,
} from "../api"
import { ClusterFormLayer } from "./cluster-form"
import {
  BackupDialog,
  CloneDialog,
  DeleteGuestDialog,
  HaDialog,
  LinkDialog,
  MigrateDialog,
  RestoreDialog,
  RollbackDialog,
  SnapshotDialog,
} from "./guest-dialogs"
import { guestName, guestState, kindNoun, newVmHref, vmHref } from "./meta"
import { useCanAddCluster, useVmCan } from "./permissions"

type PowerAction = PVEPowerBody["action"]

// One layer at a time; its data stays while it animates out.
type Layer =
  | { kind: "cluster-form"; cluster?: PVECluster }
  | { kind: "cluster-delete"; cluster: PVECluster; done?: () => void }
  | {
      kind:
        | "clone"
        | "migrate"
        | "snapshot"
        | "backup"
        | "link"
        | "ha"
        | "delete"
        | "template"
      guest: PVEGuest
      done?: () => void
    }
  | { kind: "power"; guest: PVEGuest; action: PowerAction }
  | { kind: "rollback" | "snapshot-delete"; guest: PVEGuest; snapshot: string }
  | { kind: "restore"; guest: PVEGuest; backup: PVEBackup }

type Actions = {
  addCluster: () => void
  editCluster: (c: PVECluster) => void
  checkCluster: (c: PVECluster) => void
  toggleFavorite: (c: PVECluster) => void
  deleteCluster: (c: PVECluster, done?: () => void) => void
  power: (g: PVEGuest, action: PowerAction) => void
  clone: (g: PVEGuest) => void
  migrate: (g: PVEGuest) => void
  snapshot: (g: PVEGuest) => void
  rollback: (g: PVEGuest, snapshot: string) => void
  deleteSnapshot: (g: PVEGuest, snapshot: string) => void
  backup: (g: PVEGuest) => void
  restore: (g: PVEGuest, backup: PVEBackup) => void
  link: (g: PVEGuest) => void
  unlink: (g: PVEGuest) => void
  ha: (g: PVEGuest) => void
  toTemplate: (g: PVEGuest) => void
  deleteGuest: (g: PVEGuest, done?: () => void) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useVmActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useVmActions outside VmActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

export async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`, { description: text })
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

const powerText: Record<
  PowerAction,
  { verb: string; ask?: (name: string) => string; destructive?: boolean }
> = {
  start: { verb: "Start" },
  resume: { verb: "Resume" },
  suspend: { verb: "Pause" },
  shutdown: {
    verb: "Shut down",
    ask: (n) =>
      `${n} is asked to shut down cleanly. Whoever is using it loses the connection.`,
  },
  reboot: {
    verb: "Restart",
    ask: (n) => `${n} restarts cleanly. It is unreachable for a minute or so.`,
  },
  stop: {
    verb: "Stop",
    destructive: true,
    ask: (n) =>
      `Like pulling the plug: ${n} is cut off at once, and what wasn't saved is lost. Prefer Shut down when it still answers.`,
  },
  reset: {
    verb: "Reset",
    destructive: true,
    ask: (n) =>
      `Like pressing the reset button: ${n} restarts at once, unsaved work is lost.`,
  },
}

// Owns every dialog of the Virtual machines pages, so the list, a machine's
// page and the palette start the same flows.
export function VmActionsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const jobs = useJobActions()
  const canAdd = useCanAddCluster()

  const [open, setOpen] = useOpen("vm-layer")
  const [layer, setLayer] = useState<Layer>()
  const [key, setKey] = useState(0)
  const show = (l: Layer) => {
    setLayer(l)
    setKey((k) => k + 1)
    setOpen(true)
  }

  const [pending, setPending] = useState(false)
  // A short request answered by a Job: track it, then close.
  const runJob = (start: () => Promise<Parameters<typeof jobs.track>[0]>) => {
    setPending(true)
    start()
      .then((job) => {
        jobs.track(job)
        setOpen(false)
      })
      .catch(errorToast)
      .finally(() => setPending(false))
  }

  const check = useCheckCluster()
  const favorite = useFavoriteCluster()
  const removeCluster = useDeleteCluster()

  const unlink = useUnlink()

  const doPower = (g: PVEGuest, action: PowerAction) =>
    api.virtualMachines
      .powerPveGuest(g.cluster_id, g.vmid, { action })
      .then((job) => {
        queryClient.invalidateQueries({
          queryKey: vmKeys.guest(g.cluster_id, g.vmid),
        })
        return job
      })

  const actions: Actions = {
    addCluster: () => show({ kind: "cluster-form" }),
    editCluster: (cluster) => show({ kind: "cluster-form", cluster }),
    checkCluster: (c) =>
      check.mutate(c.id, {
        onSuccess: (r) =>
          r.status === "online"
            ? toast.success(`${r.name} answers`, {
                description: `Proxmox VE ${r.version}`,
              })
            : toast.error(`${r.name}: ${r.status_message || r.status}`),
        onError: errorToast,
      }),
    toggleFavorite: (c) =>
      favorite.mutate(
        { id: c.id, favorite: !c.favorite },
        { onError: errorToast },
      ),
    deleteCluster: (cluster, done) =>
      show({ kind: "cluster-delete", cluster, done }),
    power: (guest, action) => {
      if (powerText[action].ask) return show({ kind: "power", guest, action })
      doPower(guest, action).then(jobs.track).catch(errorToast)
    },
    clone: (guest) => show({ kind: "clone", guest }),
    migrate: (guest) => show({ kind: "migrate", guest }),
    snapshot: (guest) => show({ kind: "snapshot", guest }),
    rollback: (guest, snapshot) => show({ kind: "rollback", guest, snapshot }),
    deleteSnapshot: (guest, snapshot) =>
      show({ kind: "snapshot-delete", guest, snapshot }),
    backup: (guest) => show({ kind: "backup", guest }),
    restore: (guest, backup) => show({ kind: "restore", guest, backup }),
    link: (guest) => show({ kind: "link", guest }),
    unlink: (guest) => unlink.mutate(guest),
    ha: (guest) => show({ kind: "ha", guest }),
    toTemplate: (guest) => show({ kind: "template", guest }),
    deleteGuest: (guest, done) => show({ kind: "delete", guest, done }),
  }

  useIntent("add-pve-cluster", () => canAdd && actions.addCluster())

  const l = layer
  const close = (o: boolean) => setOpen(o)
  const done = l && "done" in l ? l.done : undefined
  const guestProps =
    l && "guest" in l
      ? {
          open,
          onOpenChange: close,
          guest: l.guest,
          onDone: done,
        }
      : null

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      {l?.kind === "cluster-form" && (
        <ClusterFormLayer
          key={key}
          open={open}
          onOpenChange={close}
          cluster={l.cluster}
          onSaved={() => setOpen(false)}
        />
      )}
      {l?.kind === "cluster-delete" && (
        <ConfirmDialog
          open={open}
          onOpenChange={close}
          title={`Disconnect ${l.cluster.name}?`}
          description="Morche forgets the cluster, its token and the links to servers. Nothing changes on Proxmox: every machine keeps running."
          confirmLabel="Disconnect"
          pending={removeCluster.isPending}
          onConfirm={() =>
            removeCluster.mutate(l.cluster.id, {
              onSuccess: () => {
                toast.success(`${l.cluster.name} disconnected`)
                if (l.done) {
                  window.addEventListener("popstate", l.done, { once: true })
                }
                setOpen(false)
              },
              onError: errorToast,
            })
          }
        />
      )}
      {l?.kind === "power" && (
        <ConfirmDialog
          open={open}
          onOpenChange={close}
          title={`${powerText[l.action].verb} ${guestName(l.guest)}?`}
          description={powerText[l.action].ask?.(guestName(l.guest))}
          confirmLabel={powerText[l.action].verb}
          destructive={!!powerText[l.action].destructive}
          pending={pending}
          onConfirm={() => runJob(() => doPower(l.guest, l.action))}
        />
      )}
      {l?.kind === "template" && (
        <ConfirmDialog
          open={open}
          onOpenChange={close}
          title={`Make ${guestName(l.guest)} a template?`}
          description="A template can't be started any more; it becomes a starting point that new machines are cloned from. This can't be undone (clone it first to keep a working copy)."
          confirmLabel="Make a template"
          destructive={false}
          pending={pending}
          onConfirm={() =>
            runJob(() =>
              api.virtualMachines.convertPveGuestToTemplate(
                l.guest.cluster_id,
                l.guest.vmid,
              ),
            )
          }
        />
      )}
      {l?.kind === "snapshot-delete" && (
        <ConfirmDialog
          open={open}
          onOpenChange={close}
          title={`Delete snapshot “${l.snapshot}”?`}
          description="The machine stays as it is now; you can no longer go back to this point."
          confirmLabel="Delete snapshot"
          pending={pending}
          onConfirm={() =>
            runJob(() =>
              api.virtualMachines.deletePveSnapshot(
                l.guest.cluster_id,
                l.guest.vmid,
                l.snapshot,
              ),
            )
          }
        />
      )}
      {guestProps && l?.kind === "clone" && (
        <CloneDialog key={key} {...guestProps} />
      )}
      {guestProps && l?.kind === "migrate" && (
        <MigrateDialog key={key} {...guestProps} />
      )}
      {guestProps && l?.kind === "snapshot" && (
        <SnapshotDialog key={key} {...guestProps} />
      )}
      {guestProps && l?.kind === "backup" && (
        <BackupDialog key={key} {...guestProps} />
      )}
      {guestProps && l?.kind === "link" && (
        <LinkDialog key={key} {...guestProps} />
      )}
      {guestProps && l?.kind === "ha" && <HaDialog key={key} {...guestProps} />}
      {guestProps && l?.kind === "delete" && (
        <DeleteGuestDialog
          key={key}
          {...guestProps}
          onDone={
            l.done &&
            (() =>
              window.addEventListener("popstate", l.done as () => void, {
                once: true,
              }))
          }
        />
      )}
      {guestProps && l?.kind === "rollback" && (
        <RollbackDialog key={key} {...guestProps} snapshot={l.snapshot} />
      )}
      {guestProps && l?.kind === "restore" && (
        <RestoreDialog key={key} {...guestProps} backup={l.backup} />
      )}
    </ActionsContext.Provider>
  )
}

function useUnlink() {
  const queryClient = useQueryClient()
  return {
    mutate: (g: PVEGuest) =>
      api.virtualMachines
        .unlinkPveGuest(g.cluster_id, g.vmid)
        .then(() => {
          toast.success(`${guestName(g)} no longer linked to a server`)
          queryClient.invalidateQueries({ queryKey: ["pve"] })
        })
        .catch(errorToast),
  }
}

// ---- menus

// Proxmox's own UI for a cluster (and a machine in it).
export const proxmoxUrl = (c: Pick<PVECluster, "url">, g?: PVEGuest) => {
  const base = c.url.replace(/\/+$/, "")
  return g ? `${base}/#v1:0:=${g.kind}%2F${g.vmid}` : base
}

export function useClusterMenu() {
  const a = useVmActions()
  const can = useVmCan()
  return (
    c: PVECluster,
    { onRemoved }: { onRemoved?: () => void } = {},
  ): Item[][] => {
    const owner = can(c, "owner")
    return [
      [
        {
          key: "proxmox",
          label: "Open in Proxmox",
          icon: <ExternalLink />,
          onSelect: () => window.open(proxmoxUrl(c), "_blank", "noopener"),
        },
        ...(can(c, "operator")
          ? [
              {
                key: "check",
                label: "Check now",
                icon: <RotateCw />,
                onSelect: () => a.checkCluster(c),
              },
            ]
          : []),
        {
          key: "favorite",
          label: c.favorite ? "Remove from favorites" : "Add to favorites",
          icon: c.favorite ? <StarOff /> : <Star />,
          stay: true,
          onSelect: () => a.toggleFavorite(c),
        },
      ],
      owner
        ? [
            {
              key: "edit",
              label: "Edit connection",
              icon: <Pencil />,
              onSelect: () => a.editCluster(c),
            },
            {
              key: "delete",
              label: "Disconnect",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.deleteCluster(c, onRemoved),
            },
          ]
        : [],
    ]
  }
}

export function useGuestMenu() {
  const a = useVmActions()
  const can = useVmCan()
  const router = useRouter()
  const clusters = useClusterUrls()
  return (
    g: PVEGuest,
    { open = true, onRemoved }: { open?: boolean; onRemoved?: () => void } = {},
  ): Item[][] => {
    const state = guestState(g)
    const operator = can(g.cluster_id, "operator")
    const engineer = can(g.cluster_id, "engineer")
    const owner = can(g.cluster_id, "owner")
    const busy = !!g.lock
    const qemu = g.kind === "qemu"
    const url = clusters(g.cluster_id)

    const power: Item[] = []
    if (operator && state !== "template") {
      const p = (
        action: PowerAction,
        label: string,
        icon: ReactNode,
        destructive = false,
      ): Item => ({
        key: action,
        label,
        icon,
        destructive,
        disabled: busy,
        onSelect: () => a.power(g, action),
      })
      if (state === "stopped" || state === "unknown")
        power.push(p("start", "Start", <Play />))
      if (state === "running") {
        power.push(p("shutdown", "Shut down", <Power />))
        power.push(p("reboot", "Restart", <RotateCcw />))
        if (qemu) power.push(p("suspend", "Pause", <Pause />))
      }
      if (state === "paused") power.push(p("resume", "Resume", <Play />))
      if (state === "running" || state === "paused") {
        power.push(p("stop", "Stop (force)", <PowerOff />, true))
        if (qemu && state === "running")
          power.push(p("reset", "Reset", <Zap />, true))
      }
    }

    const work: Item[] = []
    if (engineer) {
      if (state === "running")
        work.push({
          key: "console",
          label: "Console",
          icon: <SquareTerminal />,
          onSelect: () => router.push(vmHref(g.cluster_id, g.vmid, "console")),
        })
      if (state === "template")
        work.push({
          key: "create",
          label: "Create a machine from it",
          icon: <Plus />,
          onSelect: () =>
            router.push(
              newVmHref({
                cluster: g.cluster_id,
                kind: g.kind,
                template: g.vmid,
              }),
            ),
        })
      if (state !== "template")
        work.push({
          key: "snapshot",
          label: "Take a snapshot",
          icon: <Camera />,
          disabled: busy,
          onSelect: () => a.snapshot(g),
        })
      work.push(
        {
          key: "backup",
          label: "Back up now",
          icon: <HardDriveDownload />,
          disabled: busy,
          onSelect: () => a.backup(g),
        },
        {
          key: "clone",
          label: "Clone",
          icon: <CopyPlus />,
          disabled: busy,
          onSelect: () => a.clone(g),
        },
        {
          key: "migrate",
          label: "Move to another node",
          icon: <ArrowRightLeft />,
          disabled: busy,
          onSelect: () => a.migrate(g),
        },
      )
    }

    const more: Item[] = []
    if (g.link)
      more.push({
        key: "server",
        label: `Open server ${g.link.server_name}`,
        icon: <Server />,
        onSelect: () => router.push(`/servers/${g.link?.server_id}`),
      })
    if (engineer) {
      more.push(
        g.link
          ? {
              key: "unlink",
              label: "Unlink from the server",
              icon: <Link2Off />,
              onSelect: () => a.unlink(g),
            }
          : {
              key: "link",
              label: "Link to a server…",
              icon: <Link2 />,
              onSelect: () => a.link(g),
            },
      )
      if (state !== "template")
        more.push({
          key: "ha",
          label: g.ha_state ? "High availability…" : "Manage with HA…",
          icon: <HeartPulse />,
          onSelect: () => a.ha(g),
        })
      if (state === "stopped")
        more.push({
          key: "template",
          label: "Make a template",
          icon: <CircleCheck />,
          disabled: busy,
          onSelect: () => a.toTemplate(g),
        })
    }
    more.push({
      key: "copy-id",
      label: "Copy ID",
      icon: <Copy />,
      onSelect: () => copy(String(g.vmid), "ID"),
    })
    if (g.ips[0])
      more.push({
        key: "copy-ip",
        label: "Copy address",
        icon: <Copy />,
        onSelect: () => copy(g.ips[0], "Address"),
      })
    if (url)
      more.push({
        key: "proxmox",
        label: "Open in Proxmox",
        icon: <ExternalLink />,
        onSelect: () =>
          window.open(proxmoxUrl({ url }, g), "_blank", "noopener"),
      })

    return [
      open
        ? [
            {
              key: "open",
              label: `Open ${kindNoun(g.kind)}`,
              icon: <ExternalLink />,
              onSelect: () => router.push(vmHref(g.cluster_id, g.vmid)),
            },
          ]
        : [],
      power,
      work,
      more,
      owner
        ? [
            {
              key: "delete",
              label: "Delete…",
              icon: <Trash2 />,
              destructive: true,
              disabled: busy,
              onSelect: () => a.deleteGuest(g, onRemoved),
            },
          ]
        : [],
    ]
  }
}

function useClusterUrls() {
  const queryClient = useQueryClient()
  return (id: string) =>
    queryClient
      .getQueryData<{ items: PVECluster[] }>(vmKeys.clusters)
      ?.items.find((c) => c.id === id)?.url
}
