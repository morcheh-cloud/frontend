"use client"

import {
  Activity,
  Container,
  ExternalLink,
  FileKey,
  KeyRound,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Split,
  Square,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, use, useState } from "react"
import { toast } from "sonner"

import { projectHref } from "@/app/(panel)/containers/components/project-actions"
import { hostHref } from "@/app/(panel)/proxy/components/meta"
import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { CredentialRow, CredentialsQuery } from "@/components/credentials"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { ApiError } from "@/lib/api"
import type { PackageRegistry } from "@/lib/services"
import {
  type RegistryAction,
  useCheckRegistry,
  useRedeployRegistry,
  useRegistryAction,
  useRegistryCredentials,
  useRemoveRegistry,
  useSecureRegistry,
} from "../api"
import { registryHref } from "./meta"
import { useRegistryCan } from "./permissions"

type Actions = {
  check: (r: PackageRegistry) => void
  run: (r: PackageRegistry, action: RegistryAction) => void
  redeploy: (r: PackageRegistry, scanner?: boolean) => void
  secure: (r: PackageRegistry) => void
  credentials: (r: PackageRegistry) => void
  remove: (r: PackageRegistry) => void
  // Which registries have an action under way, by id.
  pending: Set<string>
}

const Ctx = createContext<Actions | null>(null)

export function useRegistryActions() {
  const a = use(Ctx)
  if (!a) throw new Error("useRegistryActions needs RegistryActionsProvider")
  return a
}

const failed = (e: unknown) => toast.error((e as ApiError).message)

export function RegistryActionsProvider({ children }: { children: ReactNode }) {
  const jobs = useJobActions()
  const checkM = useCheckRegistry()
  const actionM = useRegistryAction()
  const redeployM = useRedeployRegistry()
  const secureM = useSecureRegistry()
  const [pending, setPending] = useState<Set<string>>(new Set())

  const [credsOpen, setCredsOpen] = useOpen("registry-credentials")
  const [secureOpen, setSecureOpen] = useOpen("registry-https")
  const [removeOpen, setRemoveOpen] = useOpen("registry-remove")
  const [target, setTarget] = useState<PackageRegistry | null>(null)
  const [nonce, setNonce] = useState(0)

  const busy = (id: string, on: boolean) =>
    setPending((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })

  const open = (r: PackageRegistry, set: (o: boolean) => void) => {
    setTarget(r)
    setNonce((n) => n + 1)
    set(true)
  }

  const actions: Actions = {
    pending,
    check: (r) => {
      busy(r.id, true)
      checkM.mutate(r.id, {
        onSuccess: (x) =>
          x.health === "online"
            ? toast.success(`${x.name} answers`)
            : toast.warning(x.problem || `${x.name} doesn't answer`),
        onError: failed,
        onSettled: () => busy(r.id, false),
      })
    },
    run: (r, action) => {
      busy(r.id, true)
      const verb = {
        start: "Started",
        stop: "Stopped",
        restart: "Restarted",
        cleanup: "Cleanup started for",
      }[action]
      actionM.mutate(
        { id: r.id, action },
        {
          onSuccess: () => toast.success(`${verb} ${r.name}`),
          onError: failed,
          onSettled: () => busy(r.id, false),
        },
      )
    },
    redeploy: (r, scanner) =>
      redeployM.mutate(
        { id: r.id, scanner },
        { onSuccess: (j) => jobs.track(j), onError: failed },
      ),
    secure: (r) => open(r, setSecureOpen),
    credentials: (r) => open(r, setCredsOpen),
    remove: (r) => open(r, setRemoveOpen),
  }

  return (
    <Ctx value={actions}>
      {children}
      {target && (
        <>
          <CredentialsDialog
            r={target}
            open={credsOpen}
            onOpenChange={setCredsOpen}
          />
          <SecureDialog
            key={`s${nonce}`}
            r={target}
            open={secureOpen}
            onOpenChange={setSecureOpen}
            pending={secureM.isPending}
            onSubmit={(email) =>
              secureM.mutate(
                { id: target.id, email },
                {
                  onSuccess: (j) => {
                    setSecureOpen(false)
                    jobs.track(j)
                  },
                  onError: failed,
                },
              )
            }
          />
          <RemoveDialog
            key={`r${nonce}`}
            r={target}
            open={removeOpen}
            onOpenChange={setRemoveOpen}
          />
        </>
      )}
    </Ctx>
  )
}

// The admin login: fetched when the layer opens, dropped when it closes.
function CredentialsDialog({
  r,
  open,
  onOpenChange,
}: {
  r: PackageRegistry
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const q = useRegistryCredentials(r.id, open)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${r.name} admin login`}
      description={
        r.kind === "harbor"
          ? "Signs in to Harbor's web page with every right. For CI and servers, make a robot account instead."
          : "Morche signs in with it to manage Verdaccio. For people and CI, add a user instead."
      }
      className="sm:max-w-lg"
      footer={
        <Button className="max-md:h-11" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      {open && (
        <CredentialsQuery query={q}>
          {(c) => (
            <div className="grid gap-4">
              <CredentialRow label="Address" value={c.url} />
              <CredentialRow label="User" value={c.user} />
              <CredentialRow label="Password" value={c.password} secret />
            </div>
          )}
        </CredentialsQuery>
      )}
    </ResponsiveDialog>
  )
}

function SecureDialog({
  r,
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  r: PackageRegistry
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onSubmit: (email: string) => void
}) {
  const [email, setEmail] = useState("")
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Get HTTPS for ${r.domain}`}
      description={`Let's Encrypt checks that ${r.domain} points at ${r.server_name} and that port 80 is open there, then the site switches to https. It renews by itself.`}
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="max-md:h-11"
            disabled={pending}
            onClick={() => onSubmit(email.trim())}
          >
            <FileKey />
            Get a certificate
          </Button>
        </div>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="registry-https-email">Email (optional)</Label>
        <Input
          id="registry-https-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ops@example.com"
        />
        <p className="text-caption text-muted-foreground">
          Let's Encrypt writes here if renewing ever fails.
        </p>
      </div>
    </ResponsiveDialog>
  )
}

function RemoveDialog({
  r,
  open,
  onOpenChange,
}: {
  r: PackageRegistry
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const jobs = useJobActions()
  const router = useRouter()
  const remove = useRemoveRegistry()
  const [typed, setTyped] = useState("")
  const [keep, setKeep] = useState(false)
  const ok = typed.trim() === r.name
  const what = r.kind === "harbor" ? "image" : "package"
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${r.name}?`}
      description={`Its containers stop and go, with its site ${r.domain || ""} on the reverse proxy${r.docker_registry_id ? " and its login in Containers" : ""}. Clients pulling or installing from it start failing.`}
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11"
            disabled={!ok || remove.isPending}
            onClick={() =>
              remove.mutate(
                { id: r.id, keepData: keep },
                {
                  onSuccess: (j) => {
                    onOpenChange(false)
                    jobs.track(j)
                    if (window.location.pathname !== "/registries")
                      window.addEventListener(
                        "popstate",
                        () => router.push("/registries"),
                        { once: true },
                      )
                  },
                  onError: failed,
                },
              )
            }
          >
            <Trash2 />
            Remove
          </Button>
        </div>
      }
    >
      <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border p-3">
        <label htmlFor="registry-keep" className="min-w-0">
          <span className="block text-body-sm font-medium">
            Keep its data on the server
          </span>
          <span className="block text-caption text-muted-foreground">
            {keep
              ? `Every ${what} stays in ${r.dir}; deploying again there picks it up.`
              : `Every ${what} in ${r.dir} is deleted for good.`}
          </span>
        </label>
        <Switch id="registry-keep" checked={keep} onCheckedChange={setKeep} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="registry-remove-name">
          Type <span className="font-mono">{r.name}</span> to confirm
        </Label>
        <Input
          id="registry-remove-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
    </ResponsiveDialog>
  )
}

// Every action on a registry, for the ⋯ menu and phone sheets.
export function useRegistryMenu() {
  const a = useRegistryActions()
  const can = useRegistryCan()
  const router = useRouter()
  return (r: PackageRegistry, opts: { onPage?: boolean } = {}): Item[][] => {
    const ready = r.state === "ready"
    const engineer = can(r, "engineer")
    const groups: Item[][] = []
    const open: Item[] = []
    if (!opts.onPage)
      open.push({
        key: "open",
        label: "Open",
        icon: <Settings2 />,
        onSelect: () => router.push(registryHref(r.id)),
      })
    if (ready)
      open.push({
        key: "web",
        label: r.kind === "harbor" ? "Open Harbor" : "Open Verdaccio",
        icon: <ExternalLink />,
        onSelect: () => window.open(r.url, "_blank", "noopener"),
      })
    groups.push(open)

    const run: Item[] = []
    if (ready && can(r, "operator"))
      run.push({
        key: "check",
        label: "Check now",
        icon: <Activity />,
        disabled: a.pending.has(r.id),
        onSelect: () => a.check(r),
      })
    if (ready && engineer) {
      run.push(
        {
          key: "restart",
          label: "Restart",
          icon: <RefreshCw />,
          disabled: a.pending.has(r.id),
          onSelect: () => a.run(r, "restart"),
        },
        r.health === "down"
          ? {
              key: "start",
              label: "Start",
              icon: <Play />,
              onSelect: () => a.run(r, "start"),
            }
          : {
              key: "stop",
              label: "Stop",
              icon: <Square />,
              onSelect: () => a.run(r, "stop"),
            },
      )
      if (r.domain && !r.https)
        run.push({
          key: "https",
          label: "Get HTTPS",
          icon: <FileKey />,
          onSelect: () => a.secure(r),
        })
    }
    if (engineer && (r.state === "failed" || ready))
      run.push({
        key: "redeploy",
        label: r.state === "failed" ? "Deploy again" : "Write and start again",
        icon: <RotateCcw />,
        onSelect: () => a.redeploy(r),
      })
    groups.push(run)

    const links: Item[] = [
      {
        key: "project",
        label: "Its containers",
        icon: <Container />,
        onSelect: () => router.push(projectHref(r.server_id, r.project)),
      },
    ]
    if (r.proxy_id && r.proxy_host_id)
      links.push({
        key: "site",
        label: "Its proxy site",
        icon: <Split />,
        onSelect: () =>
          router.push(
            hostHref(r.proxy_id as string, r.proxy_host_id as string),
          ),
      })
    groups.push(links)

    const owner: Item[] = []
    if (can(r, "owner")) {
      owner.push({
        key: "creds",
        label: "Admin login",
        icon: <KeyRound />,
        onSelect: () => a.credentials(r),
      })
      if (r.state !== "deploying" && r.state !== "removing")
        owner.push({
          key: "remove",
          label: "Remove…",
          icon: <Trash2 />,
          destructive: true,
          onSelect: () => a.remove(r),
        })
    }
    groups.push(owner)
    return groups
  }
}
