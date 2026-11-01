"use client"

import dynamic from "next/dynamic"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useOpen } from "@/hooks/useOpen"
import type { Fail2BanJail, Fail2BanOverview } from "@/lib/services"
import { afterClose } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { type Task, useBan, useEdit, useTask } from "../api"
import { BanDialog, type BanPrefill } from "./ban-dialog"
import { JailEditor } from "./jail-editor"
import { JAIL_LOCAL } from "./meta"
import { TaskOutput } from "./task-output"
import { TestDialog, type TestPrefill } from "./test-dialog"

// CodeMirror is only needed once someone edits a file as text.
const ConfigEditor = dynamic(
  () => import("./config-editor").then((m) => m.ConfigEditor),
  { ssr: false },
)
const FilterEditor = dynamic(
  () => import("./config-editor").then((m) => m.FilterEditor),
  { ssr: false },
)

export type ServiceAction =
  | "start"
  | "stop"
  | "restart"
  | "reload"
  | "enable"
  | "disable"

const serviceDone: Record<ServiceAction, string> = {
  start: "Fail2ban started",
  stop: "Fail2ban stopped",
  restart: "Fail2ban restarted",
  reload: "Configuration reloaded",
  enable: "Fail2ban will start at boot",
  disable: "Fail2ban won't start at boot",
}

type F2bActions = {
  overview: Fail2BanOverview
  // A change to jail.local is on its way.
  pending: boolean
  // The service is being installed, started, stopped…
  busy: boolean
  install: (protectSSH: boolean) => void
  uninstall: () => void
  service: (action: ServiceAction) => void
  editJail: (jail: Fail2BanJail | null) => void
  setEnabled: (jail: Fail2BanJail, enabled: boolean) => void
  resetJail: (jail: Fail2BanJail) => void
  ban: (prefill?: BanPrefill) => void
  unban: (ip: string, jail?: string) => void
  editConfig: () => void
  editFilter: (name: string) => void
  test: (prefill?: TestPrefill) => void
  copy: (text: string, what: string) => void
}

const Ctx = createContext<F2bActions | null>(null)

export function useF2bActions() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useF2bActions outside F2bActionsProvider")
  return ctx
}

export function F2bActionsProvider({
  overview,
  children,
}: {
  overview: Fail2BanOverview
  children: ReactNode
}) {
  const { server } = useServerPage()
  const task = useTask(server.id)
  const edit = useEdit(server.id)
  const banner = useBan(server.id)

  const [taskOpen, setTaskOpen] = useOpen("f2b-task")
  const [taskTitle, setTaskTitle] = useState({ title: "", pending: "" })

  const [uninstallOpen, setUninstallOpen] = useOpen("f2b-uninstall")
  const [jailOpen, setJailOpen] = useOpen("f2b-jail-editor")
  const [jail, setJail] = useState<string | null>(null)
  const [jailRound, setJailRound] = useState(0)
  const [resetOpen, setResetOpen] = useOpen("f2b-reset-jail")
  const [toReset, setToReset] = useState<Fail2BanJail | null>(null)
  const [banOpen, setBanOpen] = useOpen("f2b-ban")
  const [banPrefill, setBanPrefill] = useState<BanPrefill>({})
  const [banRound, setBanRound] = useState(0)
  const [configOpen, setConfigOpen] = useOpen("f2b-config")
  const [filterOpen, setFilterOpen] = useOpen("f2b-filter")
  const [filter, setFilter] = useState<string | null>(null)
  const [testOpen, setTestOpen] = useOpen("f2b-test")
  const [testPrefill, setTestPrefill] = useState<TestPrefill>({})
  const [testRound, setTestRound] = useState(0)

  // TanStack keeps `mutate` stable across renders.
  const { mutate: runTaskMutation } = task
  const { mutate: editMutation } = edit
  const { mutate: banMutation } = banner

  const runTask = useCallback(
    (t: Task, title: string, pending: string) => {
      setTaskTitle({ title, pending })
      setTaskOpen(true)
      runTaskMutation(t, {
        onError: (e) => {
          setTaskOpen(false)
          toast.error(e.message)
        },
      })
    },
    [setTaskOpen, runTaskMutation],
  )

  const service = useCallback(
    (action: ServiceAction) => {
      const id = toast.loading(
        action === "enable" || action === "disable"
          ? "Updating…"
          : `${action[0].toUpperCase()}${action.slice(1)}ing fail2ban…`,
      )
      runTaskMutation(
        { kind: "service", action },
        {
          onSuccess: (r) => {
            if (r.ok) {
              toast.success(serviceDone[action], { id })
              return
            }
            // Show why: the init system's own words.
            toast.dismiss(id)
            setTaskTitle({ title: `Couldn't ${action} fail2ban`, pending: "" })
            setTaskOpen(true)
          },
          onError: (e) => toast.error(e.message, { id }),
        },
      )
    },
    [setTaskOpen, runTaskMutation],
  )

  const setEnabled = useCallback(
    (j: Fail2BanJail, on: boolean) => {
      editMutation(
        { kind: "jail", jail: j.name, set: { enabled: on ? "true" : "false" } },
        {
          onSuccess: (o) => {
            const now = o.jails.find((x) => x.name === j.name)
            if (on && now && !now.active) {
              toast.warning(`${j.name} is on, but fail2ban didn't start it`, {
                description:
                  "Check its log files exist, or test its filter from the jail's menu.",
              })
            } else {
              toast.success(`${j.name} turned ${on ? "on" : "off"}`)
            }
          },
          onError: (e) => toast.error(e.message),
        },
      )
    },
    [editMutation],
  )

  const unban = useCallback(
    (ip: string, jailName?: string) => {
      banMutation(
        { ip, jail: jailName, unban: true },
        {
          onSuccess: () =>
            toast.success(
              jailName ? `${ip} unbanned from ${jailName}` : `${ip} unbanned`,
            ),
          onError: (e) => toast.error(e.message),
        },
      )
    },
    [banMutation],
  )

  const value = useMemo<F2bActions>(
    () => ({
      overview,
      pending: edit.isPending,
      busy: task.isPending,
      install: (protectSSH) =>
        runTask(
          { kind: "install", protect_ssh: protectSSH },
          "Install fail2ban",
          "Installing… this can take a few minutes.",
        ),
      uninstall: () => setUninstallOpen(true),
      service,
      editJail: (j) => {
        setJail(j?.name ?? null)
        setJailRound((r) => r + 1)
        setJailOpen(true)
      },
      setEnabled,
      resetJail: (j) => {
        setToReset(j)
        setResetOpen(true)
      },
      ban: (prefill = {}) => {
        setBanPrefill(prefill)
        setBanRound((r) => r + 1)
        setBanOpen(true)
      },
      unban,
      editConfig: () => setConfigOpen(true),
      editFilter: (name) => {
        setFilter(name)
        setFilterOpen(true)
      },
      test: (prefill = {}) => {
        setTestPrefill(prefill)
        setTestRound((r) => r + 1)
        setTestOpen(true)
      },
      copy: (text, what) => {
        navigator.clipboard
          .writeText(text)
          .then(() => toast.success(`${what} copied`))
          .catch(() => toast.error("Couldn't access the clipboard"))
      },
    }),
    [
      overview,
      edit.isPending,
      task.isPending,
      runTask,
      service,
      setEnabled,
      unban,
      setUninstallOpen,
      setJailOpen,
      setResetOpen,
      setBanOpen,
      setConfigOpen,
      setFilterOpen,
      setTestOpen,
    ],
  )

  function confirmReset() {
    if (!toReset) return
    const j = toReset
    edit.mutate(
      { kind: "delete-jail", jail: j.name },
      {
        onSuccess: () => {
          setResetOpen(false)
          toast.success(
            j.custom
              ? `Deleted ${j.name}`
              : `${j.name} is back to its shipped settings`,
          )
        },
        onError: (e) => {
          setResetOpen(false)
          toast.error(e.message)
        },
      },
    )
  }

  const editing = overview.jails.find((j) => j.name === jail) ?? null

  return (
    <Ctx.Provider value={value}>
      {children}
      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        title={taskTitle.title}
        pendingLabel={taskTitle.pending}
        task={task}
      />
      <UninstallDialog
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
        onConfirm={(purge) =>
          afterClose(setUninstallOpen, () =>
            runTask(
              { kind: "uninstall", purge },
              "Uninstall fail2ban",
              "Removing fail2ban…",
            ),
          )
        }
      />
      <JailEditor
        key={jailRound}
        open={jailOpen}
        onOpenChange={setJailOpen}
        jail={editing}
        isNew={jail === null}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={
          toReset?.custom
            ? `Delete ${toReset.name}?`
            : `Reset ${toReset?.name ?? "this jail"}?`
        }
        description={
          toReset?.custom
            ? "Its section is removed from jail.local, and fail2ban stops watching for it. Its bans are lifted."
            : `Everything jail.local sets for it is removed, so it goes back to the settings in ${toReset?.source.replace("/etc/fail2ban/", "") ?? "jail.conf"}.`
        }
        confirmLabel={toReset?.custom ? "Delete" : "Reset"}
        pending={edit.isPending}
        onConfirm={confirmReset}
      />
      <BanDialog
        key={`ban-${banRound}`}
        open={banOpen}
        onOpenChange={setBanOpen}
        prefill={banPrefill}
      />
      <ConfigEditor
        open={configOpen}
        onOpenChange={setConfigOpen}
        file={overview.config}
        path={JAIL_LOCAL}
      />
      {filter && (
        <FilterEditor
          key={filter}
          open={filterOpen}
          onOpenChange={setFilterOpen}
          name={filter}
        />
      )}
      <TestDialog
        key={`test-${testRound}`}
        open={testOpen}
        onOpenChange={setTestOpen}
        prefill={testPrefill}
      />
    </Ctx.Provider>
  )
}

function TaskDialog({
  open,
  onOpenChange,
  title,
  pendingLabel,
  task,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  pendingLabel: string
  task: ReturnType<typeof useTask>
}) {
  const { phone } = useServerPage()
  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TaskOutput
        result={task.data}
        pending={task.isPending}
        pendingLabel={pendingLabel || "Working…"}
        phone={phone}
      />
      <div className="flex gap-2 max-md:mt-auto max-md:flex-col md:justify-end">
        <Button
          size={phone ? "lg" : "default"}
          variant={task.isPending ? "outline" : "default"}
          onClick={() => onOpenChange(false)}
        >
          {task.isPending ? "Hide" : "Close"}
        </Button>
      </div>
      {task.isPending && (
        <p className="text-caption text-muted-foreground">
          It keeps running on the server if you hide this.
        </p>
      )}
    </div>
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        className="px-4 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {body}
      </BottomSheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="gap-5 p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pe-8">{title}</DialogTitle>
          <DialogDescription>
            Runs over SSH with root rights; this is what the server printed.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}

function UninstallDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (purge: boolean) => void
}) {
  const { phone } = useServerPage()
  const [purge, setPurge] = useState(false)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Uninstall fail2ban?"
      description="Every ban is lifted and nothing watches the logins any more."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            size={phone ? "lg" : "default"}
            variant="destructive"
            onClick={() => onConfirm(purge)}
          >
            Uninstall
          </Button>
          <Button
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control */}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body-sm">
        <Checkbox
          checked={purge}
          onCheckedChange={(on) => setPurge(on)}
          className="mt-0.5"
        />
        <span>
          <span className="block font-medium">
            Also delete its configuration
          </span>
          <span className="block text-muted-foreground">
            Removes /etc/fail2ban with jail.local and every change made here
            (apt and pacman only; other package managers keep it).
          </span>
        </span>
      </label>
    </ResponsiveDialog>
  )
}
