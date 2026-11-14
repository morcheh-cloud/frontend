"use client"

import {
  FlaskConical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { StorageSync } from "@/lib/services"
import {
  runActive,
  useCancelRun,
  useDeleteSync,
  usePauseSync,
  useResync,
  useRunSync,
} from "../api"
import { editSyncHref, isReplication, kindMeta, syncHref } from "./meta"
import { useSyncCan } from "./permissions"

type Actions = {
  // Starts a run. A test run opens its result; a real one is followed in
  // Tasks and on the sync's page. A migration that empties its source asks
  // first.
  run: (s: StorageSync, opts?: { dryRun?: boolean }) => void
  running: boolean
  setPaused: (s: StorageSync, paused: boolean) => void
  remove: (s: StorageSync, after?: () => void) => void
  cancelRun: (runId: string) => void
  // MinIO replication: copy what's already in the bucket again.
  resync: (s: StorageSync) => void
  resyncing: boolean
}

const ActionsContext = createContext<Actions | null>(null)

export function useSyncActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useSyncActions outside SyncActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

const noun = (s: Pick<StorageSync, "kind">) =>
  kindMeta[s.kind].label.toLowerCase()

export function SyncActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const runMutation = useRunSync()
  const pause = usePauseSync()
  const del = useDeleteSync()
  const cancel = useCancelRun()
  const resync = useResync()

  const [rmOpen, setRmOpen] = useOpen("sync-remove")
  const [toRemove, setToRemove] = useState<{
    s: StorageSync
    after?: () => void
  }>()
  const [emptyOpen, setEmptyOpen] = useOpen("sync-empty-source")
  const [toEmpty, setToEmpty] = useState<StorageSync>()
  const [cancelOpen, setCancelOpen] = useOpen("sync-run-cancel")
  const [toCancel, setToCancel] = useState<string>()
  const [resyncOpen, setResyncOpen] = useOpen("sync-resync")
  const [toResync, setToResync] = useState<StorageSync>()

  const start = (s: StorageSync, dryRun: boolean, done?: () => void) =>
    runMutation.mutate(
      { id: s.id, dryRun },
      {
        onSuccess: (out) => {
          done?.()
          if (dryRun) router.push(syncHref(s.id, out.run.id))
          else if (!out.job) toast.success(`${s.name} started`)
        },
        onError: errorToast,
      },
    )

  const actions: Actions = {
    run: (s, opts) => {
      const dryRun = !!opts?.dryRun
      if (!dryRun && s.kind === "migrate" && s.options.delete_source) {
        setToEmpty(s)
        setEmptyOpen(true)
        return
      }
      start(s, dryRun)
    },
    running: runMutation.isPending,
    setPaused: (s, paused) =>
      pause.mutate(
        { id: s.id, paused },
        {
          onSuccess: () =>
            toast.success(
              paused ? `${s.name} is paused` : `${s.name} is on again`,
            ),
          onError: errorToast,
        },
      ),
    remove: (s, after) => {
      setToRemove({ s, after })
      setRmOpen(true)
    },
    cancelRun: (id) => {
      setToCancel(id)
      setCancelOpen(true)
    },
    resync: (s) => {
      setToResync(s)
      setResyncOpen(true)
    },
    resyncing: resync.isPending,
  }

  const removing = toRemove?.s
  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <ConfirmDialog
        open={rmOpen}
        onOpenChange={setRmOpen}
        title={`Delete ${removing?.name ?? "this sync"}?`}
        description={
          removing && isReplication(removing)
            ? "The replication rule is taken off the source bucket, so new changes stop being copied. Everything already copied stays on the destination."
            : `It stops running and its run history goes with it. Files it already copied stay where they are${removing?.held_count ? `, and the ${removing.held_count} deletions still waiting won't happen` : ""}.`
        }
        confirmLabel="Delete"
        destructive
        pending={del.isPending}
        onConfirm={() => {
          if (!toRemove) return
          del.mutate(toRemove.s, {
            onSuccess: () => {
              setRmOpen(false)
              toast.success(`${toRemove.s.name} deleted`)
              toRemove.after?.()
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title={`Move everything: ${toEmpty?.name ?? ""}?`}
        description={`Every file is copied to ${toEmpty?.dest.name ?? "the destination"}, checked, and then deleted from ${toEmpty?.source.name ?? "the source"}. Files that fail the check stay on the source. Try a test run first if you're not sure.`}
        confirmLabel="Start moving"
        destructive
        pending={runMutation.isPending}
        onConfirm={() => {
          if (toEmpty) start(toEmpty, false, () => setEmptyOpen(false))
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Stop this run?"
        description="It stops after the file it's on. What's already copied stays; the rest happens next time."
        confirmLabel="Stop"
        pending={cancel.isPending}
        onConfirm={() => {
          if (!toCancel) return
          cancel.mutate(toCancel, {
            onSuccess: () => setCancelOpen(false),
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={resyncOpen}
        onOpenChange={setResyncOpen}
        title="Copy everything again?"
        description={`MinIO goes through every object in ${toResync?.source.name ?? "the source"} and copies it to ${toResync?.dest.name ?? "the destination"} again. Use it after the destination was emptied or replaced. It can take a while for a big bucket.`}
        confirmLabel="Copy again"
        pending={resync.isPending}
        onConfirm={() => {
          if (!toResync) return
          resync.mutate(toResync.id, {
            onSuccess: () => {
              setResyncOpen(false)
              toast.success("MinIO started copying again")
            },
            onError: errorToast,
          })
        }}
      />
    </ActionsContext.Provider>
  )
}

// A sync's actions, for the list's ⋯ menu, its phone sheet and its page.
export function useSyncMenu(
  s: StorageSync,
  { onPage = false, after }: { onPage?: boolean; after?: () => void } = {},
): Item[][] {
  const can = useSyncCan(s.workspace_id)
  const a = useSyncActions()
  const router = useRouter()
  const busy = !!s.last_run?.id && runActive(s.last_run.state)
  const blocked = !!s.problem || busy || a.running
  const replication = isReplication(s)

  const runs: Item[] = !can.run
    ? []
    : replication
      ? [
          {
            key: "resync",
            label: "Copy everything again",
            icon: <RotateCcw />,
            disabled: s.paused || !!s.problem || a.resyncing,
            onSelect: () => a.resync(s),
          },
        ]
      : [
          {
            key: "run",
            label: busy
              ? "Running…"
              : s.kind === "migrate"
                ? s.last_run?.id
                  ? "Run again"
                  : "Start"
                : "Run now",
            icon: <Play />,
            disabled: blocked,
            onSelect: () => a.run(s),
          },
          {
            key: "test",
            label: "Test run",
            icon: <FlaskConical />,
            disabled: blocked,
            onSelect: () => a.run(s, { dryRun: true }),
          },
        ]

  return [
    runs,
    [
      ...(onPage
        ? []
        : [
            {
              key: "open",
              label: "Open",
              icon: <SquareArrowOutUpRight />,
              onSelect: () => router.push(syncHref(s.id)),
            },
          ]),
      ...(can.edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => router.push(editSyncHref(s.id)),
            },
            ...(s.kind === "sync"
              ? [
                  {
                    key: "pause",
                    label: s.paused ? "Resume" : "Pause",
                    icon: s.paused ? <Play /> : <Pause />,
                    onSelect: () => a.setPaused(s, !s.paused),
                  },
                ]
              : []),
          ]
        : []),
    ],
    can.edit
      ? [
          {
            key: "delete",
            label: `Delete ${noun(s)}`,
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.remove(s, after),
          },
        ]
      : [],
  ]
}
