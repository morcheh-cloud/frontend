"use client"

import {
  Ban,
  Check,
  CircleCheck,
  Info,
  KeyRound,
  LogOut,
  Pencil,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, use, useMemo, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { useAuth } from "@/components/auth/auth"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { PanelUser } from "@/lib/services"
import { failed, useMemberAction } from "../../api"
import { MemberDetails } from "./member-details"
import { MemberForm, PasswordDialog } from "./member-forms"
import { accessHref, displayName } from "./meta"

type Confirm = {
  action: "reject" | "block" | "delete" | "revoke"
  user: PanelUser
}

type MembersActions = {
  add: () => void
  edit: (user: PanelUser) => void
  details: (user: PanelUser) => void
  manageAccess: (user: PanelUser) => void
  password: (user: PanelUser) => void
  unblock: (user: PanelUser) => void
  confirm: (action: Confirm["action"], user: PanelUser) => void
}

const Context = createContext<MembersActions | null>(null)

export function useMembersActions() {
  const value = use(Context)
  if (!value) throw new Error("useMembersActions outside its provider")
  return value
}

const confirmText = (c: Confirm) => {
  const name = displayName(c.user)
  switch (c.action) {
    case "reject":
      return {
        title: `Reject ${name}?`,
        description: "Their sign-up is deleted. They can register again.",
        label: "Reject",
        done: "Sign-up rejected",
      }
    case "block":
      return {
        title: `Block ${name}?`,
        description:
          "They are signed out at once and their open terminals close. Nothing else of theirs changes, so you can unblock them later.",
        label: "Block",
        done: "Member blocked",
      }
    case "delete":
      return {
        title: `Delete ${name}?`,
        description:
          "Their account and access are removed for good. Their running terminals close. Servers and storage stay.",
        label: "Delete",
        done: "Member deleted",
      }
    case "revoke":
      return {
        title: `Sign ${name} out everywhere?`,
        description:
          "All of their browsers are signed out and their open terminals close. They can sign in again.",
        label: "Sign out",
        done: "Signed out everywhere",
      }
  }
}

// Every layer of the Members page. Layers re-find their member from the list
// through `user` state kept here, so they survive a refetch.
export function MembersActionsProvider({ children }: { children: ReactNode }) {
  const action = useMemberAction()
  const router = useRouter()

  const [formOpen, setFormOpen] = useOpen("member-form")
  const [formUser, setFormUser] = useState<PanelUser>()
  const [formKey, setFormKey] = useState(0)
  const [detailsOpen, setDetailsOpen] = useOpen("member-details")
  const [detailsId, setDetailsId] = useState<string>()
  const [passwordOpen, setPasswordOpen] = useOpen("member-password")
  const [passwordUser, setPasswordUser] = useState<PanelUser>()
  const [confirmOpen, setConfirmOpen] = useOpen("member-confirm")
  const [confirming, setConfirming] = useState<Confirm>()

  const value = useMemo<MembersActions>(
    () => ({
      add: () => {
        setFormUser(undefined)
        setFormKey((k) => k + 1)
        setFormOpen(true)
      },
      edit: (user) => {
        setFormUser(user)
        setFormKey((k) => k + 1)
        setFormOpen(true)
      },
      details: (user) => {
        setDetailsId(user.id)
        setDetailsOpen(true)
      },
      // A pending member is approved there, together with what they can reach.
      manageAccess: (user) => router.push(accessHref(user.id)),
      password: (user) => {
        setPasswordUser(user)
        setFormKey((k) => k + 1)
        setPasswordOpen(true)
      },
      unblock: (user) =>
        action.mutate(
          { action: "unblock", id: user.id },
          {
            onSuccess: () => toast.success("Member unblocked"),
            onError: failed,
          },
        ),
      confirm: (kind, user) => {
        setConfirming({ action: kind, user })
        setConfirmOpen(true)
      },
    }),
    [
      action.mutate,
      setFormOpen,
      setDetailsOpen,
      router.push,
      setPasswordOpen,
      setConfirmOpen,
    ],
  )

  const text = confirming && confirmText(confirming)

  return (
    <Context value={value}>
      {children}

      <MemberForm
        key={`form-${formKey}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        user={formUser}
      />
      {detailsId && (
        <MemberDetails
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          id={detailsId}
        />
      )}
      {passwordUser && (
        <PasswordDialog
          key={`password-${formKey}`}
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
          user={passwordUser}
        />
      )}
      {confirming && text && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={text.title}
          description={text.description}
          confirmLabel={text.label}
          pending={action.isPending}
          onConfirm={() =>
            action.mutate(
              { action: confirming.action, id: confirming.user.id },
              {
                onSuccess: () => {
                  toast.success(text.done)
                  setConfirmOpen(false)
                },
                onError: failed,
              },
            )
          }
        />
      )}
    </Context>
  )
}

// The same actions in the row menu, the phone sheet and the details layer.
export function useMemberMenu(user: PanelUser): Item[][] {
  const a = useMembersActions()
  const { user: me } = useAuth()
  const self = user.id === me.id

  const manage: Item[] = [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil />,
      onSelect: () => a.edit(user),
    },
  ]
  if (user.status === "pending") {
    manage.unshift(
      {
        key: "approve",
        label: "Approve…",
        icon: <Check />,
        onSelect: () => a.manageAccess(user),
      },
      {
        key: "reject",
        label: "Reject…",
        icon: <UserX />,
        onSelect: () => a.confirm("reject", user),
      },
    )
  }
  if (user.status !== "pending") {
    manage.push(
      {
        key: "grants",
        label: "Manage access",
        icon: <ShieldCheck />,
        onSelect: () => a.manageAccess(user),
      },
      {
        key: "details",
        label: "Details",
        icon: <Info />,
        onSelect: () => a.details(user),
      },
    )
  }

  const secure: Item[] =
    user.status === "pending"
      ? []
      : [
          {
            key: "password",
            label: "Set a temporary password…",
            icon: <KeyRound />,
            onSelect: () => a.password(user),
          },
          ...(self
            ? []
            : [
                {
                  key: "revoke",
                  label: "Sign out everywhere…",
                  icon: <LogOut />,
                  onSelect: () => a.confirm("revoke", user),
                },
              ]),
        ]

  const danger: Item[] = self
    ? []
    : [
        ...(user.status === "active"
          ? [
              {
                key: "block",
                label: "Block…",
                icon: <Ban />,
                destructive: true,
                onSelect: () => a.confirm("block", user),
              },
            ]
          : []),
        ...(user.status === "blocked"
          ? [
              {
                key: "unblock",
                label: "Unblock",
                icon: <CircleCheck />,
                onSelect: () => a.unblock(user),
              },
            ]
          : []),
        ...(user.status !== "pending"
          ? [
              {
                key: "delete",
                label: "Delete…",
                icon: <Trash2 />,
                destructive: true,
                onSelect: () => a.confirm("delete", user),
              },
            ]
          : []),
      ]

  return [manage, secure, danger].filter((g) => g.length > 0)
}
