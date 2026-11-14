"use client"

import {
  Copy,
  Info,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  RotateCw,
  ServerCog,
  SquarePlus,
  Star,
  StarOff,
  TextCursorInput,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { queueAddServer } from "@/app/(panel)/servers/components/server-actions"
import { useAccess } from "@/components/auth/auth"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { CloudAccount, CloudServer } from "@/lib/services"
import {
  type PowerAction,
  serverBusy,
  serverKey,
  useCheckCloudAccount,
  useCloudAccounts,
  useDeleteCloudAccount,
  useSetCloudFavorite,
} from "../api"
import { CloudAccountFormLayer } from "./account-form"
import {
  accountStatusMeta,
  defaultUser,
  mainAddress,
  providerLabel,
} from "./meta"
import { useCloudCan } from "./permissions"
import { ServerDetailsLayer } from "./server-details"
import { PowerDialog, powerMeta, RenameDialog } from "./server-dialogs"

// What the person may do to a cloud server, and why not when they can't.
export type ServerCan = {
  account?: CloudAccount
  power: boolean
  rename: boolean
  // Shown where the buttons would be: changes are off for the account.
  locked: string | null
}

type Actions = {
  addAccount: () => void
  editAccount: (account: CloudAccount) => void
  check: (account: CloudAccount) => void
  toggleFavorite: (account: CloudAccount) => void
  removeAccount: (account: CloudAccount) => void
  details: (server: CloudServer) => void
  power: (server: CloudServer, action: PowerAction) => void
  rename: (server: CloudServer) => void
  addToMorche: (server: CloudServer) => void
  copy: (text: string, what: string) => void
  serverCan: (server: CloudServer) => ServerCan
  // Whether "Add to Morche servers" is open to this person.
  canAddToMorche: boolean
}

const ActionsContext = createContext<Actions | null>(null)

export function useCloudActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useCloudActions outside CloudActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`, { description: text })
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

// Run `fn` once the layer's history entry is gone (it may navigate).
function whenClosed(close: (open: boolean) => void, fn?: () => void) {
  if (fn) window.addEventListener("popstate", fn, { once: true })
  close(false)
}

// Owns every dialog and sheet of the cloud page.
export function CloudActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const can = useCloudCan()
  const accounts = useCloudAccounts()
  const { canCreateIn } = useAccess()
  const { workspace } = useWorkspace()
  const byId = new Map((accounts.data?.items ?? []).map((a) => [a.id, a]))

  const [formOpen, setFormOpen] = useOpen("cloud-account-form")
  const [formAccount, setFormAccount] = useState<CloudAccount>()
  const [formKey, setFormKey] = useState(0)

  const [removeOpen, setRemoveOpen] = useOpen("cloud-account-remove")
  const [toRemove, setToRemove] = useState<CloudAccount>()

  const [detailsOpen, setDetailsOpen] = useOpen("cloud-server-details")
  const [detailsKey, setDetailsKey] = useState<string>()

  const [powerOpen, setPowerOpen] = useOpen("cloud-server-power")
  const [powerFor, setPowerFor] = useState<{
    server: CloudServer
    action: PowerAction
    n: number
  }>()

  const [renameOpen, setRenameOpen] = useOpen("cloud-server-rename")
  const [renameFor, setRenameFor] = useState<{
    server: CloudServer
    n: number
  }>()

  const checkMutation = useCheckCloudAccount()
  const favorite = useSetCloudFavorite()
  const remove = useDeleteCloudAccount()

  function serverCan(server: CloudServer): ServerCan {
    const account = byId.get(server.account_id)
    if (!account) return { power: false, rename: false, locked: null }
    const operator = can(account, "operator")
    if (!account.allow_changes) {
      return {
        account,
        power: false,
        rename: false,
        locked: operator
          ? `Changes are off for ${account.name}: Morche only reads it.`
          : null,
      }
    }
    return {
      account,
      power: operator,
      rename: can(account, "engineer"),
      locked: null,
    }
  }

  const actions: Actions = {
    addAccount: () => {
      setFormAccount(undefined)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    editAccount: (account) => {
      setFormAccount(account)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    check: (account) =>
      checkMutation.mutate(account.id, {
        onSuccess: (a) => {
          if (a.status === "online") {
            toast.success(`${a.name} is connected`, {
              description: [
                `${a.server_count} server${a.server_count === 1 ? "" : "s"}`,
                `${a.running_count} running`,
                a.latency_ms != null && `${a.latency_ms} ms`,
              ]
                .filter(Boolean)
                .join(" · "),
            })
          } else {
            toast.error(
              `${a.name}: ${accountStatusMeta[a.status].label.toLowerCase()}`,
              { description: a.status_message },
            )
          }
        },
        onError: errorToast,
      }),
    toggleFavorite: (account) =>
      favorite.mutate(
        { id: account.id, favorite: !account.favorite },
        { onError: errorToast },
      ),
    removeAccount: (account) => {
      setToRemove(account)
      setRemoveOpen(true)
    },
    details: (server) => {
      setDetailsKey(serverKey(server))
      setDetailsOpen(true)
    },
    power: (server, action) => {
      setPowerFor((p) => ({ server, action, n: (p?.n ?? 0) + 1 }))
      setPowerOpen(true)
    },
    rename: (server) => {
      setRenameFor((p) => ({ server, n: (p?.n ?? 0) + 1 }))
      setRenameOpen(true)
    },
    addToMorche: (server) => {
      const host = mainAddress(server)
      if (!host) {
        toast.error(`${server.name} has no address yet`)
        return
      }
      queueAddServer({
        name: server.name,
        host,
        username: defaultUser(server),
        description: [
          providerLabel(server.provider),
          server.account_name,
          server.region_name || server.region,
        ]
          .filter(Boolean)
          .join(" · "),
      })
      router.push("/servers")
    },
    copy,
    serverCan,
    canAddToMorche: canCreateIn(workspace?.id),
  }

  // "Add cloud account" from the command palette, on any page.
  useIntent("add-cloud-account", () => actions.addAccount())

  return (
    <ActionsContext value={actions}>
      {children}
      <CloudAccountFormLayer
        key={`form-${formKey}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        account={formAccount}
        onSaved={() => whenClosed(setFormOpen)}
      />
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove “${toRemove?.name}”?`}
        description="Morche forgets this account and its API key. Nothing changes at the provider: the servers keep running, and ones added to Morche's servers stay there."
        confirmLabel="Remove account"
        pending={remove.isPending}
        onConfirm={() =>
          toRemove &&
          remove.mutate(toRemove.id, {
            onSuccess: () => {
              setRemoveOpen(false)
              toast.success("Account removed")
            },
            onError: errorToast,
          })
        }
      />
      <ServerDetailsLayer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        serverKey={detailsKey}
      />
      {powerFor && (
        <PowerDialog
          key={`power-${powerFor.n}`}
          open={powerOpen}
          onOpenChange={setPowerOpen}
          server={powerFor.server}
          action={powerFor.action}
        />
      )}
      {renameFor && (
        <RenameDialog
          key={`rename-${renameFor.n}`}
          open={renameOpen}
          onOpenChange={setRenameOpen}
          server={renameFor.server}
        />
      )}
    </ActionsContext>
  )
}

// The power actions that fit a server's state right now.
export function powerChoices(server: CloudServer): PowerAction[] {
  if (serverBusy(server)) return []
  if (server.state === "running") return ["reboot", "off"]
  if (server.state === "stopped") return ["on"]
  return []
}

const powerIcon: Record<PowerAction, ReactNode> = {
  on: <Power />,
  off: <PowerOff />,
  reboot: <RotateCw />,
}

// A server's actions. `details` adds "Details" (lists only).
export function useServerMenu() {
  const a = useCloudActions()
  const router = useRouter()
  return (server: CloudServer, { details = false } = {}): Item[][] => {
    const c = a.serverCan(server)
    const address = mainAddress(server)
    const linked = server.linked[0]
    return [
      details
        ? [
            {
              key: "details",
              label: "Details",
              icon: <Info />,
              onSelect: () => a.details(server),
            },
          ]
        : [],
      c.power
        ? powerChoices(server).map((action) => ({
            key: `power-${action}`,
            label: powerMeta[action].label,
            icon: powerIcon[action],
            destructive: action === "off",
            onSelect: () => a.power(server, action),
          }))
        : [],
      [
        ...(c.rename
          ? [
              {
                key: "rename",
                label: "Rename",
                icon: <TextCursorInput />,
                onSelect: () => a.rename(server),
              },
            ]
          : []),
        ...(linked
          ? [
              {
                key: "open-linked",
                label: "Open in Morche",
                icon: <ServerCog />,
                onSelect: () => router.push(`/servers/${linked.id}`),
              },
            ]
          : a.canAddToMorche && address
            ? [
                {
                  key: "add",
                  label: "Add to Morche servers",
                  icon: <SquarePlus />,
                  onSelect: () => a.addToMorche(server),
                },
              ]
            : []),
        ...(address
          ? [
              {
                key: "copy-ip",
                label: "Copy address",
                icon: <Copy />,
                onSelect: () => a.copy(address, "Address"),
              },
            ]
          : []),
      ],
    ]
  }
}

// An account's actions.
export function useAccountMenu() {
  const a = useCloudActions()
  const can = useCloudCan()
  return (account: CloudAccount): Item[][] => [
    can(account, "operator")
      ? [
          {
            key: "check",
            label: "Check now",
            icon: <RefreshCw />,
            onSelect: () => a.check(account),
          },
          {
            key: "favorite",
            label: account.favorite
              ? "Remove from favorites"
              : "Add to favorites",
            icon: account.favorite ? <StarOff /> : <Star />,
            stay: true,
            onSelect: () => a.toggleFavorite(account),
          },
        ]
      : [],
    can(account, "owner")
      ? [
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil />,
            onSelect: () => a.editAccount(account),
          },
          {
            key: "remove",
            label: "Remove",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.removeAccount(account),
          },
        ]
      : [],
  ]
}
