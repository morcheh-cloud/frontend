"use client"

import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { Recipe, SoftwareInstall } from "@/lib/services"
import {
  useCancelSoftwareRun,
  useCatalog,
  useDeleteRecipe,
  useDeleteSoftwareRun,
  useForgetInstall,
  useScanServer,
  useScanWorkspace,
  useStartSoftwareRun,
} from "../api"
import { InstallLayer, type InstallPreset } from "./install-layer"
import { ManageLayer } from "./manage-layer"
import { type RunAction, runHref } from "./meta"
import { SwitchRow } from "./parts"

// One application on one server, as the run dialog lists it.
export type Target = Pick<
  SoftwareInstall,
  "server_id" | "server_name" | "recipe_id" | "name" | "kind"
>

export type SystemTarget = { server_id: string; server_name: string }

type Actions = {
  install: (recipe: Recipe, preset?: InstallPreset) => void
  // By recipe id, for links from other pages (a server tab, the palette).
  installId: (recipeId: string, preset?: InstallPreset) => void
  manage: (i: SoftwareInstall) => void
  update: (targets: Target[]) => void
  rollback: (t: Target) => void
  uninstall: (targets: Target[]) => void
  upgradeSystem: (servers: SystemTarget[], securityOnly?: boolean) => void
  forget: (i: SoftwareInstall) => void
  scan: (serverId?: string) => void
  scanning: boolean
  removeRecipe: (r: Recipe, after?: () => void) => void
  cancelRun: (id: string) => void
  removeRun: (id: string, after?: () => void) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useSoftwareActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx)
    throw new Error("useSoftwareActions outside SoftwareActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Leave a page once the dialog's own Back has happened.
const afterBack = (go?: () => void) => {
  if (go) window.addEventListener("popstate", () => go(), { once: true })
}

type Pending =
  | { action: "update" | "uninstall" | "rollback"; targets: Target[] }
  | {
      action: "upgrade-system"
      servers: SystemTarget[]
      securityOnly?: boolean
    }

// Every layer of the Applications pages and a server's Applications tab.
export function SoftwareActionsProvider({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace()
  const jobs = useJobActions()
  const catalog = useCatalog(workspace?.id)

  const [installOpen, setInstallOpen] = useOpen("software-install")
  const [toInstall, setToInstall] = useState<{
    recipe: Recipe
    preset?: InstallPreset
  } | null>(null)
  const [manageOpen, setManageOpen] = useOpen("software-manage")
  const [managed, setManaged] = useState<SoftwareInstall | null>(null)
  const [runOpen, setRunOpen] = useOpen("software-run")
  const [pending, setPending] = useState<Pending | null>(null)
  const [forgetOpen, setForgetOpen] = useOpen("software-forget")
  const [toForget, setToForget] = useState<SoftwareInstall | null>(null)
  const [recipeRmOpen, setRecipeRmOpen] = useOpen("software-recipe-remove")
  const [recipeRm, setRecipeRm] = useState<{
    r: Recipe
    after?: () => void
  } | null>(null)
  const [runRmOpen, setRunRmOpen] = useOpen("software-run-remove")
  const [runRm, setRunRm] = useState<{ id: string; after?: () => void }>()
  const [cancelOpen, setCancelOpen] = useOpen("software-run-cancel")
  const [toCancel, setToCancel] = useState<string>()

  const forget = useForgetInstall()
  const deleteRecipe = useDeleteRecipe(workspace?.id ?? "")
  const deleteRun = useDeleteSoftwareRun()
  const cancel = useCancelSoftwareRun()
  const scanServer = useScanServer()
  const scanWorkspace = useScanWorkspace()

  const install = (recipe: Recipe, preset?: InstallPreset) => {
    setToInstall({ recipe, preset })
    setInstallOpen(true)
  }
  const installId = (id: string, preset?: InstallPreset) => {
    const r = catalog.data?.items.find((x) => x.id === id)
    if (r) install(r, preset)
    else toast.error("That application isn't in this workspace's catalog.")
  }
  const ask = (p: Pending) => {
    setPending(p)
    setRunOpen(true)
  }

  const actions: Actions = {
    install,
    installId,
    manage: (i) => {
      setManaged(i)
      setManageOpen(true)
    },
    update: (targets) => ask({ action: "update", targets }),
    rollback: (t) => ask({ action: "rollback", targets: [t] }),
    uninstall: (targets) => ask({ action: "uninstall", targets }),
    upgradeSystem: (servers, securityOnly) =>
      ask({ action: "upgrade-system", servers, securityOnly }),
    forget: (i) => {
      setToForget(i)
      setForgetOpen(true)
    },
    scan: (serverId) => {
      const done = {
        onSuccess: (job: Parameters<typeof jobs.track>[0]) => jobs.track(job),
        onError: errorToast,
      }
      if (serverId) scanServer.mutate(serverId, done)
      else if (workspace) scanWorkspace.mutate(workspace.id, done)
    },
    scanning: scanServer.isPending || scanWorkspace.isPending,
    removeRecipe: (r, after) => {
      setRecipeRm({ r, after })
      setRecipeRmOpen(true)
    },
    cancelRun: (id) => {
      setToCancel(id)
      setCancelOpen(true)
    },
    removeRun: (id, after) => {
      setRunRm({ id, after })
      setRunRmOpen(true)
    },
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <InstallLayer
        open={installOpen}
        onOpenChange={setInstallOpen}
        recipe={toInstall?.recipe ?? null}
        preset={toInstall?.preset}
      />
      <ManageLayer
        open={manageOpen}
        onOpenChange={setManageOpen}
        install={managed}
        recipe={
          catalog.data?.items.find((r) => r.id === managed?.recipe_id) ?? null
        }
      />
      <RunDialog open={runOpen} onOpenChange={setRunOpen} pending={pending} />
      <ConfirmDialog
        open={forgetOpen}
        onOpenChange={setForgetOpen}
        title={`Forget ${toForget?.name ?? ""} on ${toForget?.server_name ?? ""}?`}
        description="Morcheh stops tracking it; nothing on the server changes. The next scan finds it again if it's still there."
        confirmLabel="Forget"
        pending={forget.isPending}
        onConfirm={() => {
          if (!toForget) return
          forget.mutate(toForget.id, {
            onSuccess: () => {
              setForgetOpen(false)
              setManageOpen(false)
              toast.success("Forgotten")
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={recipeRmOpen}
        onOpenChange={setRecipeRmOpen}
        title={`Delete “${recipeRm?.r.name ?? ""}” from the catalog?`}
        description="What's installed from it stays on the servers, but can't be updated or removed from here any more."
        confirmLabel="Delete application"
        pending={deleteRecipe.isPending}
        onConfirm={() => {
          if (!recipeRm?.r.record_id) return
          deleteRecipe.mutate(recipeRm.r.record_id, {
            onSuccess: () => {
              setRecipeRmOpen(false)
              toast.success("Deleted from the catalog")
              afterBack(recipeRm.after)
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={runRmOpen}
        onOpenChange={setRunRmOpen}
        title="Delete this run?"
        description="Its output on every server goes with it. What it installed stays."
        confirmLabel="Delete run"
        pending={deleteRun.isPending}
        onConfirm={() => {
          if (!runRm) return
          deleteRun.mutate(runRm.id, {
            onSuccess: () => {
              setRunRmOpen(false)
              toast.success("Run deleted")
              afterBack(runRm.after)
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Stop this run?"
        description="Steps not started are skipped. A step that's running is stopped, which can leave that install half done: check it, then run it again."
        confirmLabel="Stop run"
        pending={cancel.isPending}
        onConfirm={() => {
          if (!toCancel) return
          cancel.mutate(toCancel, {
            onSuccess: () => setCancelOpen(false),
            onError: errorToast,
          })
        }}
      />
    </ActionsContext.Provider>
  )
}

const upgradeModes = [
  { value: "security", label: "Security only" },
  { value: "all", label: "All updates" },
  { value: "full", label: "Full upgrade" },
] as const
type UpgradeMode = (typeof upgradeModes)[number]["value"]

// Asks before update, uninstall, roll back and system upgrade, with the
// options each one has.
function RunDialog({
  open,
  onOpenChange,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: Pending | null
}) {
  return (
    <RunDialogBody
      key={`${open}-${pending?.action}`}
      open={open}
      onOpenChange={onOpenChange}
      pending={pending}
    />
  )
}

function RunDialogBody({
  open,
  onOpenChange,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: Pending | null
}) {
  const router = useRouter()
  const jobs = useJobActions()
  const phone = useIsPhone()
  const start = useStartSoftwareRun()
  const [removeData, setRemoveData] = useState(false)
  const [keepGoing, setKeepGoing] = useState(false)
  const [mode, setMode] = useState<UpgradeMode>(
    pending?.action === "upgrade-system" && pending.securityOnly
      ? "security"
      : "all",
  )

  if (!pending) return null
  const action = pending.action
  const lines =
    pending.action === "upgrade-system"
      ? pending.servers.map((s) => s.server_name)
      : pending.targets.map((t) => `${t.name} on ${t.server_name}`)
  const servers =
    pending.action === "upgrade-system"
      ? pending.servers.map((s) => s.server_id)
      : [...new Set(pending.targets.map((t) => t.server_id))]
  const hasDocker =
    pending.action !== "upgrade-system" &&
    pending.targets.some((t) => t.kind === "docker")
  const many = servers.length > 1

  const title = titleOf(pending)
  const verb: Record<RunAction, string> = {
    install: "Install",
    update: "Update",
    uninstall: "Uninstall",
    rollback: "Roll back",
    "upgrade-system": "Upgrade",
  }

  // One run per application: the backend runs every chosen application on
  // every chosen server, so mixed picks are split.
  const groups =
    pending.action === "upgrade-system"
      ? [{ recipes: [] as string[], servers }]
      : Object.values(
          pending.targets.reduce<
            Record<string, { recipes: string[]; servers: string[] }>
          >((acc, t) => {
            acc[t.recipe_id] ??= { recipes: [t.recipe_id], servers: [] }
            acc[t.recipe_id].servers.push(t.server_id)
            return acc
          }, {}),
        )

  const go = async () => {
    const options = {
      remove_data: action === "uninstall" && hasDocker ? removeData : undefined,
      stop_on_failure: many ? !keepGoing : undefined,
      security_only:
        action === "upgrade-system" ? mode === "security" : undefined,
      full: action === "upgrade-system" ? mode === "full" : undefined,
    }
    let last: string | null = null
    for (const g of groups) {
      try {
        const { run, job } = await start.mutateAsync({
          action,
          server_ids: g.servers,
          recipes: g.recipes.length ? g.recipes : undefined,
          options,
        })
        jobs.track(job)
        last = run.id
      } catch (err) {
        toast.error((err as Error).message)
        return
      }
    }
    onOpenChange(false)
    if (groups.length === 1 && last) {
      const id = last
      window.addEventListener("popstate", () => router.push(runHref(id)), {
        once: true,
      })
    } else toast.success(`${groups.length} runs started`)
  }

  const destructive = action === "uninstall"
  const footer = (
    <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
      <Button
        variant="ghost"
        size={phone ? "lg" : "default"}
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        variant={destructive ? "destructive" : "default"}
        size={phone ? "lg" : "default"}
        disabled={start.isPending}
        onClick={go}
      >
        {start.isPending ? "Starting…" : verb[action]}
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={descriptionOf(pending, hasDocker)}
      footer={footer}
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <ul className="max-h-48 overflow-y-auto rounded-2xl border border-border text-body-sm">
          {lines.slice(0, 50).map((l) => (
            <li
              key={l}
              className="truncate border-b border-border px-4 py-2 last:border-b-0"
            >
              {l}
            </li>
          ))}
          {lines.length > 50 && (
            <li className="px-4 py-2 text-ash">and {lines.length - 50} more</li>
          )}
        </ul>
        {action === "upgrade-system" && (
          <div className="flex flex-col gap-2">
            <Segmented
              label="What to install"
              items={upgradeModes}
              value={mode}
              onChange={setMode}
            />
            <p className="text-caption text-muted-foreground">
              {mode === "security"
                ? "Only updates marked as security fixes (apt, dnf, yum, zypper; others install everything)."
                : mode === "all"
                  ? "Every package with a newer version. Packages are never removed."
                  : "apt full-upgrade / dist-upgrade: may add or remove packages to finish the upgrade."}
            </p>
          </div>
        )}
        {action === "uninstall" && hasDocker && (
          <SwitchRow
            label="Delete its data too"
            hint="Removes the Docker apps' volumes and folders. Off: they stay, and a new install picks them up."
            checked={removeData}
            onChange={setRemoveData}
          />
        )}
        {many && (
          <SwitchRow
            label="Keep going when one server fails"
            hint="Off: the servers not started yet are skipped once one fails."
            checked={keepGoing}
            onChange={setKeepGoing}
          />
        )}
      </div>
    </ResponsiveDialog>
  )
}

function titleOf(p: Pending) {
  if (p.action === "upgrade-system") {
    const n = p.servers.length
    return n === 1
      ? `Upgrade the packages on ${p.servers[0].server_name}?`
      : `Upgrade the packages on ${n} servers?`
  }
  const one = p.targets.length === 1 ? p.targets[0] : null
  const what = one
    ? `${one.name} on ${one.server_name}`
    : `${p.targets.length} applications`
  if (p.action === "update") return `Update ${what}?`
  if (p.action === "rollback") return `Roll back ${what}?`
  return `Uninstall ${what}?`
}

function descriptionOf(p: Pending, docker: boolean) {
  switch (p.action) {
    case "update":
      return docker
        ? "Docker apps pull newer images and are recreated; the image they ran is kept, so you can roll back."
        : "Installs the newest version from the package manager or the vendor."
    case "rollback":
      return "Goes back to the images it ran before its last update, and keeps them until you update again."
    case "uninstall":
      return "Removes it from the server. Packages may leave their config files behind."
    case "upgrade-system":
      return "Runs the server's package manager. Servers go one at a time; some may ask for a reboot after."
  }
}
