"use client"

import {
  ArchiveRestore,
  Ban,
  Download,
  Eye,
  FolderOpen,
  Pause,
  Pencil,
  Play,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { backupActive } from "@/app/(panel)/databases/api"
import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { filesHref } from "@/components/files/file-manager"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { Backup, BackupPlan, BackupPlanBody, Job } from "@/lib/services"
import {
  downloadBackup,
  useCancelBackup,
  useDeleteBackup,
  useDeletePlan,
  useRunPlan,
  useSavePlan,
  useVerifyBackup,
} from "../../../api"
import { useDashboard } from "../parts"
import { BackupDetails } from "./backup-details"
import { folderOf, storedOn } from "./meta"
import { RestoreLayer } from "./restore-layer"

type Actions = {
  removePlan: (p: BackupPlan) => void
  run: (id: string) => void
  pause: (p: BackupPlan) => void
  show: (b: Pick<Backup, "id">) => void
  check: (b: Backup) => void
  cancel: (b: Backup) => void
  remove: (b: Backup) => void
  restore: (b: Backup) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useBackupActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useBackupActions outside BackupActionsProvider")
  return ctx
}

// A plan's fields as they go back in a save. A blank password keeps the saved
// one, so nothing about its login changes.
const planBody = (p: BackupPlan, enabled: boolean): BackupPlanBody => ({
  name: p.name,
  selection: p.selection,
  targets: p.targets,
  pattern: p.pattern,
  method: p.method,
  full_every_days: p.full_every_days || 7,
  storage_ids: p.storages.map((s) => s.id),
  folder: p.folder,
  runner_server_id: p.runner_server_id || undefined,
  username: p.username,
  password: "",
  cron: p.cron,
  timezone: p.timezone,
  enabled,
  retention: p.retention,
  keep_days: p.keep_days || 14,
  gfs_daily: p.gfs_daily,
  gfs_weekly: p.gfs_weekly,
  gfs_monthly: p.gfs_monthly,
})

// Where the plan pages live.
export const newPlanHref = (databaseId: string) =>
  `/databases/${databaseId}/backups/new`
export const planHref = (p: Pick<BackupPlan, "id" | "database_id">) =>
  `/databases/${p.database_id}/backups/plans/${p.id}`

export function BackupActionsProvider({ children }: { children: ReactNode }) {
  const { database: d } = useDashboard()
  const { track } = useJobActions()
  // The nonce starts the form afresh without cutting its closing animation.
  const [restoreOpen, setRestoreOpen] = useOpen("backup-restore")
  const [restoring, setRestoring] = useState<{ b?: Backup; nonce: number }>({
    nonce: 0,
  })
  const [rmPlanOpen, setRmPlanOpen] = useOpen("backup-plan-remove")
  const [rmPlan, setRmPlan] = useState<BackupPlan>()
  const [detailsOpen, setDetailsOpen] = useOpen("backup-details")
  const [detailsId, setDetailsId] = useState<string>()
  const [rmOpen, setRmOpen] = useOpen("backup-remove")
  const [rm, setRm] = useState<Backup>()

  const save = useSavePlan(d.id)
  const delPlan = useDeletePlan()
  const runPlan = useRunPlan()
  const verify = useVerifyBackup()
  const stop = useCancelBackup()
  const del = useDeleteBackup()

  const started = {
    onSuccess: (job: Job) => track(job),
    onError: (err: Error) => toast.error(err.message),
  }

  const actions: Actions = {
    removePlan: (p) => {
      setRmPlan(p)
      setRmPlanOpen(true)
    },
    run: (id) => runPlan.mutate(id, started),
    pause: (p) =>
      save.mutate(
        { id: p.id, body: planBody(p, !p.enabled) },
        {
          onSuccess: (next) =>
            toast.success(
              next.enabled ? "Schedule resumed" : "Schedule paused",
            ),
          onError: (err) => toast.error(err.message),
        },
      ),
    show: (b) => {
      setDetailsId(b.id)
      setDetailsOpen(true)
    },
    check: (b) => verify.mutate(b.id, started),
    cancel: (b) =>
      stop.mutate(b.id, {
        onSuccess: () => toast.success("Stopping the backup"),
        onError: (err) => toast.error(err.message),
      }),
    remove: (b) => {
      setRm(b)
      setRmOpen(true)
    },
    restore: (b) => {
      setRestoring((r) => ({ b, nonce: r.nonce + 1 }))
      setRestoreOpen(true)
    },
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <RestoreLayer
        key={restoring.nonce}
        backup={restoring.b}
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
      />
      <BackupDetails
        id={detailsId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <ConfirmDialog
        open={rmPlanOpen}
        onOpenChange={setRmPlanOpen}
        title={`Delete the plan ${rmPlan?.name ?? ""}?`}
        description="It stops running. The backups it made stay where they are, and stay listed here; delete those one by one if you want them gone."
        confirmLabel="Delete plan"
        pending={delPlan.isPending}
        onConfirm={() => {
          if (!rmPlan) return
          delPlan.mutate(rmPlan.id, {
            onSuccess: () => {
              setRmPlanOpen(false)
              toast.success("Plan deleted")
            },
            onError: (err) => toast.error(err.message),
          })
        }}
      />
      <ConfirmDialog
        open={rmOpen}
        onOpenChange={setRmOpen}
        title="Delete this backup?"
        description={removeText(rm)}
        confirmLabel="Delete backup"
        pending={del.isPending}
        onConfirm={() => {
          if (!rm) return
          del.mutate(rm.id, {
            onSuccess: () => {
              setRmOpen(false)
              toast.success("Backup deleted")
            },
            onError: (err) => toast.error(err.message),
          })
        }}
      />
    </ActionsContext.Provider>
  )
}

function removeText(b: Backup | undefined) {
  const on = b ? storedOn(b).map((c) => c.storage_name) : []
  const where = on.length ? on.join(", ") : "its storage"
  const chain =
    b && b.dependents > 0
      ? ` The ${b.dependents} incremental backup${b.dependents === 1 ? "" : "s"} built on it can't be restored without it, so ${b.dependents === 1 ? "it goes" : "they go"} too.`
      : ""
  return `Its file is removed from ${where} for good.${chain}`
}

export function usePlanMenu(p: BackupPlan): Item[][] {
  const { operator, owner } = useDashboard()
  const a = useBackupActions()
  const router = useRouter()
  const groups: Item[][] = []
  if (operator) {
    groups.push([
      {
        key: "run",
        label: p.running ? "Running…" : "Back up now",
        icon: <Play />,
        disabled: p.running || !!p.problem,
        onSelect: () => a.run(p.id),
      },
    ])
  }
  if (owner) {
    const edit: Item[] = [
      {
        key: "edit",
        label: "Edit",
        icon: <Pencil />,
        onSelect: () => router.push(planHref(p)),
      },
    ]
    if (p.cron) {
      edit.push({
        key: "pause",
        label: p.enabled ? "Pause schedule" : "Resume schedule",
        icon: p.enabled ? <Pause /> : <Play />,
        onSelect: () => a.pause(p),
      })
    }
    groups.push(edit, [
      {
        key: "remove",
        label: "Delete plan",
        icon: <Trash2 />,
        destructive: true,
        onSelect: () => a.removePlan(p),
      },
    ])
  }
  return groups
}

// What a person can do with a stored file also depends on its storages: the
// backend asks for Operator on one of them to download or restore, Engineer
// on every one to delete.
export function useBackupCan(b: Backup | undefined) {
  const { database: d, operator, owner } = useDashboard()
  const { storageLevel } = useAccess()
  return useMemo(() => {
    const copies = (b?.copies ?? []).filter(
      (c): c is typeof c & { storage_id: string } =>
        c.state === "stored" && !!c.storage_id,
    )
    const level = (id: string) => storageLevel(id, d.workspace_id)
    const readable = copies.filter((c) => {
      const l = level(c.storage_id)
      return !!l && atLeast(l, "operator")
    })
    const viewable = copies.filter((c) => {
      const l = level(c.storage_id)
      return !!l && atLeast(l, "viewer")
    })
    const done = b?.state === "succeeded"
    return {
      check: operator && done && copies.length > 0,
      cancel: operator && !!b && backupActive(b),
      download: owner && done ? readable : [],
      browse: done ? viewable : [],
      restore: owner && done && !!b?.restorable && readable.length > 0,
      remove:
        owner &&
        !!b &&
        !backupActive(b) &&
        copies.every((c) => {
          const l = level(c.storage_id)
          return !!l && atLeast(l, "engineer")
        }),
    }
  }, [b, d.workspace_id, operator, owner, storageLevel])
}

export function useBackupMenu(b: Backup, withDetails = true): Item[][] {
  const a = useBackupActions()
  const can = useBackupCan(b)
  const router = useRouter()
  const groups: Item[][] = []
  if (withDetails) {
    groups.push([
      {
        key: "show",
        label: "Details",
        icon: <Eye />,
        onSelect: () => a.show(b),
      },
    ])
  }
  const main: Item[] = []
  if (can.restore) {
    main.push({
      key: "restore",
      label: "Restore…",
      icon: <ArchiveRestore />,
      onSelect: () => a.restore(b),
    })
  }
  if (can.cancel) {
    main.push({
      key: "cancel",
      label: "Stop",
      icon: <Ban />,
      onSelect: () => a.cancel(b),
    })
  }
  if (can.check) {
    main.push({
      key: "check",
      label: "Check",
      icon: <ShieldCheck />,
      onSelect: () => a.check(b),
    })
  }
  // One item per storage when it's on several.
  const many = (n: number) => n > 1
  for (const c of can.download) {
    main.push({
      key: `download-${c.storage_id}`,
      label: many(can.download.length)
        ? `Download from ${c.storage_name}`
        : "Download",
      icon: <Download />,
      onSelect: () => downloadBackup(b.id, c.storage_id),
    })
  }
  for (const c of can.browse) {
    main.push({
      key: `folder-${c.storage_id}`,
      label: many(can.browse.length)
        ? `Open folder on ${c.storage_name}`
        : "Open folder",
      icon: <FolderOpen />,
      onSelect: () =>
        router.push(
          `/storage/${c.storage_id}${filesHref({ path: folderOf(b) })}`,
        ),
    })
  }
  if (main.length > 0) groups.push(main)
  if (can.remove) {
    groups.push([
      {
        key: "remove",
        label: "Delete",
        icon: <Trash2 />,
        destructive: true,
        onSelect: () => a.remove(b),
      },
    ])
  }
  return groups
}
