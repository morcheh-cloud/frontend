"use client"

import {
  FolderOpen,
  KeyRound,
  Lock,
  LockOpen,
  LogOut,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import { filesHref } from "@/components/files/file-manager"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { Group, User, UsersOverview } from "@/lib/services"
import type { Item } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useChange } from "../api"
import {
  GroupEditor,
  LockDialog,
  PasswordDialog,
  RemoveUserDialog,
  removeGroupBlocker,
  SudoDialog,
} from "./dialogs"
import { guarded } from "./meta"
import { UserDetails } from "./user-details"
import { UserEditor } from "./user-editor"

type UsersActions = {
  overview: UsersOverview
  // Changes need engineer access, and root or sudo without a password.
  canManage: boolean
  engineer: boolean
  pending: boolean
  details: (u: User) => void
  addUser: () => void
  editUser: (u: User) => void
  password: (u: User) => void
  sudo: (u: User) => void
  lock: (u: User) => void
  unlock: (u: User) => void
  logout: (u: User) => void
  removeUser: (u: User) => void
  addGroup: () => void
  editGroup: (g: Group) => void
  removeGroup: (g: Group) => void
  browseHome: (u: User) => void
}

const Ctx = createContext<UsersActions | null>(null)

export function useUsersActions() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useUsersActions outside UsersActionsProvider")
  return ctx
}

export function UsersActionsProvider({
  overview,
  children,
}: {
  overview: UsersOverview
  children: ReactNode
}) {
  const { server, can } = useServerPage()
  const engineer = can("engineer")
  const router = useRouter()
  const change = useChange(server.id)
  const { mutate } = change

  // The account or group a layer is about, by name, so it follows changes.
  const [userName, setUserName] = useState<string | null>(null)
  const [groupName, setGroupName] = useState<string | null>(null)
  // Bumped on every open: forms start from the current values.
  const [round, setRound] = useState(0)

  const [detailsOpen, setDetailsOpen] = useOpen("users-details")
  const [editorOpen, setEditorOpen] = useOpen("users-editor")
  const [passwordOpen, setPasswordOpen] = useOpen("users-password")
  const [sudoOpen, setSudoOpen] = useOpen("users-sudo")
  const [lockOpen, setLockOpen] = useOpen("users-lock")
  const [logoutOpen, setLogoutOpen] = useOpen("users-logout")
  const [removeOpen, setRemoveOpen] = useOpen("users-remove")
  const [groupOpen, setGroupOpen] = useOpen("users-group")
  const [removeGroupOpen, setRemoveGroupOpen] = useOpen("users-remove-group")

  const openFor = useCallback(
    (setOpen: (open: boolean) => void, name: string | null) => {
      setUserName(name)
      setRound((r) => r + 1)
      setOpen(true)
    },
    [],
  )

  const unlock = useCallback(
    (u: User) => {
      const id = toast.loading(`Unlocking ${u.name}…`)
      mutate(
        { kind: "lock", user: u.name, locked: false },
        {
          onSuccess: () => toast.success(`${u.name} is unlocked`, { id }),
          onError: (e) => toast.error(e.message, { id }),
        },
      )
    },
    [mutate],
  )

  const value = useMemo<UsersActions>(
    () => ({
      overview,
      canManage: overview.access !== "user" && engineer,
      engineer,
      pending: change.isPending,
      details: (u) => openFor(setDetailsOpen, u.name),
      addUser: () => openFor(setEditorOpen, null),
      editUser: (u) => openFor(setEditorOpen, u.name),
      password: (u) => openFor(setPasswordOpen, u.name),
      sudo: (u) => openFor(setSudoOpen, u.name),
      lock: (u) => openFor(setLockOpen, u.name),
      unlock,
      logout: (u) => openFor(setLogoutOpen, u.name),
      removeUser: (u) => openFor(setRemoveOpen, u.name),
      addGroup: () => {
        setGroupName(null)
        setRound((r) => r + 1)
        setGroupOpen(true)
      },
      editGroup: (g) => {
        setGroupName(g.name)
        setRound((r) => r + 1)
        setGroupOpen(true)
      },
      removeGroup: (g) => {
        setGroupName(g.name)
        setRemoveGroupOpen(true)
      },
      browseHome: (u) =>
        router.push(
          `/servers/${server.id}/files${filesHref({ path: u.home })}`,
        ),
    }),
    [
      overview,
      change.isPending,
      openFor,
      unlock,
      router,
      server.id,
      setDetailsOpen,
      setEditorOpen,
      setPasswordOpen,
      setSudoOpen,
      setLockOpen,
      setLogoutOpen,
      setRemoveOpen,
      setGroupOpen,
      setRemoveGroupOpen,
      engineer,
    ],
  )

  const user = overview.users.find((u) => u.name === userName) ?? null
  const group = overview.groups.find((g) => g.name === groupName) ?? null
  const groupBlocker = group && removeGroupBlocker(group)

  return (
    <Ctx.Provider value={value}>
      {children}
      {user && (
        <UserDetails
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          user={user}
        />
      )}
      <UserEditor
        key={`editor-${round}`}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        user={userName ? user : null}
      />
      {user && (
        <>
          <PasswordDialog
            key={`password-${round}`}
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
            user={user}
          />
          <SudoDialog
            key={`sudo-${round}`}
            open={sudoOpen}
            onOpenChange={setSudoOpen}
            user={user}
          />
          <LockDialog
            key={`lock-${round}`}
            open={lockOpen}
            onOpenChange={setLockOpen}
            user={user}
          />
          <RemoveUserDialog
            key={`remove-${round}`}
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            user={user}
          />
          <ConfirmDialog
            open={logoutOpen}
            onOpenChange={setLogoutOpen}
            title={`Log ${user.name} out?`}
            description={`Ends ${user.sessions > 0 ? `their ${user.sessions} open session${user.sessions === 1 ? "" : "s"} and ` : ""}every process they run. They can log in again.`}
            confirmLabel="Log out"
            pending={change.isPending}
            onConfirm={() =>
              mutate(
                { kind: "logout", user: user.name },
                {
                  onSuccess: () => {
                    setLogoutOpen(false)
                    toast.success(`${user.name} is logged out`)
                  },
                  onError: (e) => {
                    setLogoutOpen(false)
                    toast.error(e.message)
                  },
                },
              )
            }
          />
        </>
      )}
      <GroupEditor
        key={`group-${round}`}
        open={groupOpen}
        onOpenChange={setGroupOpen}
        group={groupName ? group : null}
      />
      <ConfirmDialog
        open={removeGroupOpen}
        onOpenChange={setRemoveGroupOpen}
        title={
          groupBlocker
            ? `${group?.name} can't be removed`
            : `Remove group ${group?.name ?? ""}?`
        }
        description={
          groupBlocker ??
          "Its members lose what the group gave them; their accounts stay. Files it owns keep its number."
        }
        confirmLabel={groupBlocker ? "OK" : "Remove group"}
        destructive={!groupBlocker}
        pending={change.isPending}
        onConfirm={() => {
          if (!group || groupBlocker) return setRemoveGroupOpen(false)
          mutate(
            { kind: "delete-group", group: group.name },
            {
              onSuccess: () => {
                setRemoveGroupOpen(false)
                toast.success(`Group ${group.name} removed`)
              },
              onError: (e) => {
                setRemoveGroupOpen(false)
                toast.error(e.message)
              },
            },
          )
        }}
      />
    </Ctx.Provider>
  )
}

// What can be done with an account, for its ⋯ menu and its phone sheet.
export function useUserMenu(u: User): Item[][] {
  const a = useUsersActions()
  const { can } = useServerPage()
  const o = a.overview
  const guard = guarded(o, u)
  const off = !a.canManage
  const home = {
    key: "home",
    label: "Open home folder",
    icon: <FolderOpen />,
    onSelect: () => a.browseHome(u),
  }
  const browse = u.home_exists && can("operator") ? [home] : []
  if (!a.engineer) return [browse]
  return [
    [
      {
        key: "edit",
        label: "Edit account",
        icon: <Pencil />,
        disabled: off,
        onSelect: () => a.editUser(u),
      },
      {
        key: "password",
        label: u.password === "set" ? "Change password" : "Set a password",
        icon: <KeyRound />,
        disabled: off,
        onSelect: () => a.password(u),
      },
      ...(guard || !o.sudo_installed
        ? []
        : [
            {
              key: "sudo",
              label: "Sudo access…",
              icon: <ShieldCheck />,
              disabled: off,
              onSelect: () => a.sudo(u),
            },
          ]),
    ],
    [
      ...(guard
        ? []
        : [
            u.locked
              ? {
                  key: "lock",
                  label: "Unlock",
                  icon: <LockOpen />,
                  disabled: off || a.pending,
                  onSelect: () => a.unlock(u),
                }
              : {
                  key: "lock",
                  label: "Lock…",
                  icon: <Lock />,
                  disabled: off,
                  onSelect: () => a.lock(u),
                },
          ]),
      ...(guard || u.sessions === 0
        ? []
        : [
            {
              key: "logout",
              label: "Log out…",
              icon: <LogOut />,
              disabled: off,
              onSelect: () => a.logout(u),
            },
          ]),
      ...browse,
    ],
    guard
      ? []
      : [
          {
            key: "remove",
            label: "Remove account…",
            icon: <Trash2 />,
            destructive: true,
            disabled: off,
            onSelect: () => a.removeUser(u),
          },
        ],
  ]
}

export function useGroupMenu(g: Group): Item[][] {
  const a = useUsersActions()
  const off = !a.canManage
  if (!a.engineer) return []
  return [
    [
      {
        key: "edit",
        label: "Edit members",
        icon: <Users />,
        disabled: off,
        onSelect: () => a.editGroup(g),
      },
    ],
    [
      {
        key: "remove",
        label: "Remove group…",
        icon: <Trash2 />,
        destructive: true,
        disabled: off,
        onSelect: () => a.removeGroup(g),
      },
    ],
  ]
}
