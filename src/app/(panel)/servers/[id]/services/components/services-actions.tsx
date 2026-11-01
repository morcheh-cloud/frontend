"use client"

import {
  Ban,
  CircleCheck,
  FilePen,
  FileSliders,
  Play,
  Power,
  PowerOff,
  RotateCcw,
  RotateCw,
  ScrollText,
  Square,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type {
  Service,
  ServiceActionBody,
  ServicesOverview,
} from "@/lib/services"
import { Field } from "../../../components/fields"
import type { Item } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { Picker } from "../../users/components/fields"
import {
  type Action,
  type FileKind,
  useDeleteService,
  useServiceAction,
} from "../api"
import {
  canDisable,
  canEnable,
  isMasked,
  type Signal,
  serviceState,
  shortName,
  signals,
} from "./meta"
import { NewServiceEditor } from "./new-service"
import { type DetailsTab, ServiceDetails } from "./service-details"
import { UnitEditor } from "./unit-editor"

type ServicesActions = {
  overview: ServicesOverview
  systemd: boolean
  // Changes need root or sudo without a password.
  canManage: boolean
  // Units with a change on the way, and which.
  busy: Record<string, Action>
  details: (s: Service, tab?: DetailsTab) => void
  run: (s: Service, action: Action, extra?: Partial<ServiceActionBody>) => void
  kill: (s: Service) => void
  mask: (s: Service) => void
  remove: (s: Service) => void
  edit: (s: Service, kind: FileKind) => void
  create: () => void
}

const Ctx = createContext<ServicesActions | null>(null)

export function useServicesActions() {
  const ctx = useContext(Ctx)
  if (!ctx)
    throw new Error("useServicesActions outside ServicesActionsProvider")
  return ctx
}

// Stopping these cuts Morcheh off or breaks the system: the backend asks for
// force, so they're confirmed first.
const risky: Action[] = ["stop", "disable", "mask", "kill"]

const verbs: Record<Action, [doing: string, done: string]> = {
  start: ["Starting", "started"],
  stop: ["Stopping", "stopped"],
  restart: ["Restarting", "restarted"],
  reload: ["Reloading", "reloaded its configuration"],
  enable: ["Enabling", "starts at boot"],
  disable: ["Disabling", "no longer starts at boot"],
  mask: ["Masking", "is masked"],
  unmask: ["Unmasking", "is unmasked"],
  "reset-failed": ["Clearing", "is no longer failed"],
  kill: ["Signalling", "got the signal"],
}

type Confirm = {
  unit: string
  action: Action
  extra: Partial<ServiceActionBody>
}

export function ServicesActionsProvider({
  overview,
  children,
}: {
  overview: ServicesOverview
  children: ReactNode
}) {
  const { server } = useServerPage()
  const action = useServiceAction(server.id)
  const del = useDeleteService(server.id)
  const { mutateAsync } = action

  // The unit a layer is about, by name, so it follows changes.
  const [unit, setUnit] = useState<string | null>(null)
  const [tab, setTab] = useState<DetailsTab>("overview")
  const [kind, setKind] = useState<FileKind>("override")
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState<Record<string, Action>>({})
  // Bumped on every open: forms start from the current values.
  const [round, setRound] = useState(0)

  const [detailsOpen, setDetailsOpen] = useOpen("services-details")
  const [editorOpen, setEditorOpen] = useOpen("services-editor")
  const [createOpen, setCreateOpen] = useOpen("services-create")
  const [confirmOpen, setConfirmOpen] = useOpen("services-confirm")
  const [killOpen, setKillOpen] = useOpen("services-kill")
  const [removeOpen, setRemoveOpen] = useOpen("services-remove")

  const openFor = useCallback(
    (setOpen: (open: boolean) => void, name: string) => {
      setUnit(name)
      setRound((r) => r + 1)
      setOpen(true)
    },
    [],
  )

  // Runs it now; `details` lets a toast open the logs of what failed.
  const send = useCallback(
    (
      name: string,
      act: Action,
      extra: Partial<ServiceActionBody>,
      details: (tab: DetailsTab) => void,
    ) => {
      const [doing, done] = verbs[act]
      const short = shortName(name)
      const id = toast.loading(`${doing} ${short}…`)
      setBusy((b) => ({ ...b, [name]: act }))
      const logs = { label: "Logs", onClick: () => details("logs") }
      mutateAsync({ unit: name, body: { action: act, ...extra } })
        .then((s) => {
          if (
            (act === "start" || act === "restart") &&
            serviceState(s) === "failed"
          ) {
            toast.error(`${short} failed straight after starting`, {
              id,
              action: logs,
            })
            return
          }
          toast.success(`${short} ${done}`, { id })
        })
        .catch((e: Error) => toast.error(e.message, { id, action: logs }))
        .finally(() =>
          setBusy((b) => {
            const { [name]: _, ...rest } = b
            return rest
          }),
        )
    },
    [mutateAsync],
  )

  const value = useMemo<ServicesActions>(() => {
    const details = (s: Service, t: DetailsTab = "overview") => {
      setTab(t)
      openFor(setDetailsOpen, s.name)
    }
    return {
      overview,
      systemd: overview.init === "systemd",
      canManage: overview.access !== "user",
      busy,
      details,
      run: (s, act, extra = {}) => {
        if (s.protected && risky.includes(act) && !extra.force) {
          setConfirm({ unit: s.name, action: act, extra })
          setConfirmOpen(true)
          return
        }
        send(s.name, act, extra, (t) => details(s, t))
      },
      kill: (s) => openFor(setKillOpen, s.name),
      mask: (s) => {
        setConfirm({ unit: s.name, action: "mask", extra: { now: true } })
        setConfirmOpen(true)
      },
      remove: (s) => openFor(setRemoveOpen, s.name),
      edit: (s, k) => {
        setKind(k)
        openFor(setEditorOpen, s.name)
      },
      create: () => {
        setRound((r) => r + 1)
        setCreateOpen(true)
      },
    }
  }, [
    overview,
    busy,
    send,
    openFor,
    setDetailsOpen,
    setConfirmOpen,
    setKillOpen,
    setRemoveOpen,
    setEditorOpen,
    setCreateOpen,
  ])

  const service = overview.services.find((s) => s.name === unit) ?? null
  const target = confirm
    ? (overview.services.find((s) => s.name === confirm.unit) ?? null)
    : null

  return (
    <Ctx.Provider value={value}>
      {children}
      {service && (
        <ServiceDetails
          key={`details-${round}`}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          service={service}
          tab={tab}
        />
      )}
      {unit && (
        <UnitEditor
          key={`editor-${round}`}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          unit={unit}
          kind={kind}
        />
      )}
      <NewServiceEditor
        key={`create-${round}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(s) => value.details(s)}
      />
      {target && confirm && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          {...confirmText(target, confirm.action)}
          onConfirm={() => {
            setConfirmOpen(false)
            send(
              target.name,
              confirm.action,
              { ...confirm.extra, force: target.protected || undefined },
              (t) => value.details(target, t),
            )
          }}
        />
      )}
      {service && (
        <>
          <KillDialog
            key={`kill-${round}`}
            open={killOpen}
            onOpenChange={setKillOpen}
            service={service}
            onSend={(signal) => {
              setKillOpen(false)
              value.run(service, "kill", { signal })
            }}
          />
          <ConfirmDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            title={`Remove ${shortName(service.name)}?`}
            description={`Stops it, turns off its start at boot and deletes ${service.path ?? "its unit file"} with its drop-ins. This can't be undone.`}
            confirmLabel="Remove service"
            pending={del.isPending}
            onConfirm={() =>
              del.mutate(service.name, {
                onSuccess: () => {
                  setRemoveOpen(false)
                  setDetailsOpen(false)
                  toast.success(`${shortName(service.name)} removed`)
                },
                onError: (e) => {
                  setRemoveOpen(false)
                  toast.error(e.message)
                },
              })
            }
          />
        </>
      )}
    </Ctx.Provider>
  )
}

function confirmText(s: Service, act: Action) {
  const name = shortName(s.name)
  const why = s.protected
    ? `${name} is one Morcheh or the system relies on: without it this server may become unreachable over SSH or stop working properly. `
    : ""
  switch (act) {
    case "mask":
      return {
        title: `Mask ${name}?`,
        description: `${why}Stops it and blocks every start, by hand, at boot or by other units, until it's unmasked.`,
        confirmLabel: "Mask",
      }
    case "disable":
      return {
        title: `Stop starting ${name} at boot?`,
        description: `${why}It keeps running now; after the next reboot it won't start.`,
        confirmLabel: "Don't start at boot",
      }
    case "kill":
      return {
        title: `Send a signal to ${name}?`,
        description: `${why}Its processes get the signal straight away.`,
        confirmLabel: "Send signal",
      }
    default:
      return {
        title: `Stop ${name}?`,
        description: `${why}Start it again from here or with systemctl.`,
        confirmLabel: "Stop",
      }
  }
}

const signalHints: Record<Signal, string> = {
  TERM: "Ask it to exit cleanly (what stop sends)",
  HUP: "Many daemons reload their configuration on it",
  INT: "Like Ctrl+C",
  KILL: "End it at once, no cleanup",
  USR1: "Program-specific (e.g. reopen logs)",
  USR2: "Program-specific",
}

function KillDialog({
  open,
  onOpenChange,
  service: s,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service
  onSend: (signal: Signal) => void
}) {
  const { phone } = useServerPage()
  const [signal, setSignal] = useState<Signal>("TERM")
  const size = phone ? "lg" : "default"
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Send a signal to ${shortName(s.name)}`}
      description="Every process of the service gets it, not just the main one."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            size={size}
            variant={signal === "KILL" ? "destructive" : "default"}
            onClick={() => onSend(signal)}
          >
            Send SIG{signal}
          </Button>
          <Button
            size={size}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Field label="Signal" hint={signalHints[signal]}>
        {(props) => (
          <Picker
            id={props.id}
            items={signals.map((v) => ({ value: v, label: `SIG${v}` }))}
            value={signal}
            onChange={(v) => setSignal(v as Signal)}
          />
        )}
      </Field>
    </ResponsiveDialog>
  )
}

// What can be done with a service, for its ⋯ menu, its phone sheet and the
// details footer.
export function useServiceMenu(s: Service): Item[][] {
  const a = useServicesActions()
  const off = !a.canManage || s.name in a.busy
  const st = serviceState(s)
  const up = st !== "stopped" && st !== "failed"
  const masked = isMasked(s)

  const now: Item[] = []
  if (!up && s.can_start && !masked) {
    now.push({
      key: "start",
      label: "Start",
      icon: <Play />,
      disabled: off,
      onSelect: () => a.run(s, "start"),
    })
  }
  if (up && s.can_start) {
    now.push({
      key: "restart",
      label: "Restart",
      icon: <RotateCw />,
      disabled: off,
      onSelect: () => a.run(s, "restart"),
    })
  }
  if (up && s.can_reload) {
    now.push({
      key: "reload",
      label: "Reload configuration",
      icon: <RotateCcw />,
      disabled: off,
      onSelect: () => a.run(s, "reload"),
    })
  }
  if (up && s.can_stop) {
    now.push({
      key: "stop",
      label: s.protected ? "Stop…" : "Stop",
      icon: <Square />,
      disabled: off,
      onSelect: () => a.run(s, "stop"),
    })
  }
  if (st === "failed") {
    now.push({
      key: "reset",
      label: "Clear failed state",
      icon: <CircleCheck />,
      disabled: off,
      onSelect: () => a.run(s, "reset-failed"),
    })
  }

  const read: Item[] = [
    {
      key: "logs",
      label: "Logs",
      icon: <ScrollText />,
      onSelect: () => a.details(s, "logs"),
    },
  ]
  if (a.systemd && s.load !== "not-found") {
    read.push({
      key: "override",
      label: s.drop_ins.some((d) => d.endsWith("/override.conf"))
        ? "Edit override"
        : "Override settings…",
      icon: <FileSliders />,
      disabled: !a.canManage,
      onSelect: () => a.edit(s, "override"),
    })
  }
  if (a.systemd && s.custom) {
    read.push({
      key: "file",
      label: "Edit unit file",
      icon: <FilePen />,
      disabled: !a.canManage,
      onSelect: () => a.edit(s, "file"),
    })
  }

  const boot: Item[] = []
  if (canEnable(s)) {
    boot.push({
      key: "enable",
      label: "Start at boot",
      icon: <Power />,
      disabled: off,
      onSelect: () => a.run(s, "enable"),
    })
  }
  if (canDisable(s)) {
    boot.push({
      key: "disable",
      label: s.protected ? "Don't start at boot…" : "Don't start at boot",
      icon: <PowerOff />,
      disabled: off,
      onSelect: () => a.run(s, "disable"),
    })
  }
  if (a.systemd) {
    boot.push(
      masked
        ? {
            key: "mask",
            label: "Unmask",
            icon: <Undo2 />,
            disabled: off,
            onSelect: () => a.run(s, "unmask"),
          }
        : {
            key: "mask",
            label: "Mask…",
            icon: <Ban />,
            disabled: off,
            onSelect: () => a.mask(s),
          },
    )
    if (s.main_pid > 0) {
      boot.push({
        key: "kill",
        label: "Send signal…",
        icon: <Zap />,
        disabled: off,
        onSelect: () => a.kill(s),
      })
    }
  }

  const remove: Item[] =
    a.systemd && s.custom && !s.protected
      ? [
          {
            key: "remove",
            label: "Remove service…",
            icon: <Trash2 />,
            destructive: true,
            disabled: off,
            onSelect: () => a.remove(s),
          },
        ]
      : []

  return [now, read, boot, remove]
}
