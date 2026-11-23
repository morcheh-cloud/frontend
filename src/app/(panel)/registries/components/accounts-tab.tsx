"use client"

import {
  Bot,
  KeyRound,
  Plus,
  RotateCcw,
  Trash2,
  User,
  Users,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ToggleRow } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { CodeBlock } from "@/components/code-block"
import { CredentialRow } from "@/components/credentials"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { type ApiError, fieldErrors } from "@/lib/api"
import type {
  PackageRegistry,
  RegistryAccount,
  RegistryAccountSecret,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCreateAccount,
  useDeleteAccount,
  useRegistryAccounts,
  useResetAccount,
} from "../api"
import { useRegistryCan } from "./permissions"

export function AccountsTab({
  r,
  phone,
}: {
  r: PackageRegistry
  phone: boolean
}) {
  const can = useRegistryCan()
  const list = useRegistryAccounts(r, true)
  const harbor = r.kind === "harbor"
  const [newOpen, setNewOpen] = useOpen("registry-account-new")
  const [nonce, setNonce] = useState(0)
  const [secret, setSecret] = useState<RegistryAccountSecret | null>(null)
  const [secretOpen, setSecretOpen] = useOpen("registry-account-secret")
  const [doomed, setDoomed] = useState<RegistryAccount | null>(null)
  const [delOpen, setDelOpen] = useOpen("registry-account-delete")
  const del = useDeleteAccount(r.id)
  const reset = useResetAccount(r.id)
  const engineer = can(r, "engineer")

  const show = (s: RegistryAccountSecret) => {
    setSecret(s)
    setSecretOpen(true)
  }

  const noun = harbor ? "robot account" : "user"
  const addButton = engineer && (
    <Button
      onClick={() => {
        setNonce((n) => n + 1)
        setNewOpen(true)
      }}
      className="max-md:h-11"
    >
      <Plus />
      {harbor ? "New robot account" : "New user"}
    </Button>
  )

  return (
    <div className="grid gap-4">
      <div className={cn("flex flex-wrap items-center gap-3", phone && "px-4")}>
        <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
          {harbor
            ? "Logins for servers, CI and people's machines: each can pull, or pull and push. Their secret is shown once."
            : "Each user can install and publish. Their password is shown once; give someone a new one any time."}
        </p>
        {addButton}
      </div>
      {list.isPending ? (
        <Skeleton className={cn("h-40 rounded-2xl", phone && "mx-4")} />
      ) : list.isError ? (
        <Empty
          icon={Users}
          title="Couldn't read the accounts"
          body={list.error.message}
        />
      ) : list.data.items.length === 0 ? (
        <Empty
          icon={harbor ? Bot : Users}
          title={`No ${noun}s yet`}
          body={
            harbor
              ? "Make one for each server or CI pipeline that pulls or pushes."
              : "Add one for each person or pipeline."
          }
          action={addButton}
        />
      ) : (
        <ul
          className={cn(
            "divide-y divide-border border-border",
            phone ? "border-y" : "rounded-2xl border",
          )}
        >
          {list.data.items.map((acc) => (
            <li
              key={acc.id}
              className="flex min-w-0 items-center gap-3 px-4 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {harbor ? (
                  <Bot className="size-4" />
                ) : (
                  <User className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate font-mono text-body-sm">
                    {acc.name}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                    {acc.push
                      ? harbor
                        ? "Pull + push"
                        : "Install + publish"
                      : "Pull only"}
                  </span>
                  {acc.morche && (
                    <span className="rounded-full bg-brand-soft px-1.5 text-[11px] text-brand-strong">
                      Morche
                    </span>
                  )}
                  {acc.disabled && (
                    <span className="rounded-full bg-muted px-1.5 text-[11px] text-destructive">
                      Off
                    </span>
                  )}
                </div>
                <p className="truncate text-caption text-muted-foreground">
                  {[
                    acc.note,
                    acc.created_at ? `made ${timeAgo(acc.created_at)}` : "",
                    acc.expires_at
                      ? new Date(acc.expires_at) < new Date()
                        ? "expired"
                        : `expires ${timeAgo(acc.expires_at)}`
                      : harbor
                        ? "never expires"
                        : "",
                    acc.morche
                      ? harbor
                        ? "used by Containers › Registries"
                        : "Morche signs in with it"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {engineer && !harbor && !acc.morche && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`New password for ${acc.name}`}
                  title="New password"
                  disabled={reset.isPending}
                  onClick={() =>
                    reset.mutate(acc.id, {
                      onSuccess: show,
                      onError: (e) => toast.error((e as ApiError).message),
                    })
                  }
                >
                  <RotateCcw />
                </Button>
              )}
              {engineer && !(acc.morche && !harbor) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${acc.name}`}
                  onClick={() => {
                    setDoomed(acc)
                    setDelOpen(true)
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <NewAccountDialog
        key={nonce}
        r={r}
        open={newOpen}
        onOpenChange={setNewOpen}
        onMade={(s) => {
          setNewOpen(false)
          window.addEventListener("popstate", () => show(s), { once: true })
        }}
      />
      {secret && (
        <SecretDialog
          r={r}
          s={secret}
          open={secretOpen}
          onOpenChange={(o) => {
            setSecretOpen(o)
            if (!o) setTimeout(() => setSecret(null), 300)
          }}
        />
      )}
      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={`Remove ${doomed?.name ?? ""}?`}
        description={
          doomed?.morche
            ? "Containers › Registries signs in with it: pulls and update checks from this registry will fail until you give it another login."
            : "Whatever signs in with it stops working at once."
        }
        confirmLabel="Remove"
        pending={del.isPending}
        onConfirm={() =>
          doomed &&
          del.mutate(doomed.id, {
            onSuccess: () => {
              setDelOpen(false)
              toast.success(`Removed ${doomed.name}`)
            },
            onError: (e) => toast.error((e as ApiError).message),
          })
        }
      />
    </div>
  )
}

function NewAccountDialog({
  r,
  open,
  onOpenChange,
  onMade,
}: {
  r: PackageRegistry
  open: boolean
  onOpenChange: (open: boolean) => void
  onMade: (s: RegistryAccountSecret) => void
}) {
  const harbor = r.kind === "harbor"
  const make = useCreateAccount(r.id)
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [push, setPush] = useState(false)
  const [days, setDays] = useState("0")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = () =>
    make.mutate(
      {
        name: name.trim().toLowerCase(),
        note: note.trim(),
        push,
        days: Number(days),
      },
      {
        onSuccess: onMade,
        onError: (e) => {
          setErrors(fieldErrors(e))
          toast.error((e as ApiError).message)
        },
      },
    )
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={harbor ? "New robot account" : "New user"}
      description={
        harbor
          ? "A login for one server, pipeline or person. Its secret is shown once."
          : "Gets a long random password, shown once."
      }
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
            disabled={!name.trim() || make.isPending}
            onClick={submit}
          >
            <KeyRound />
            Make it
          </Button>
        </div>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="acc-name">Name</Label>
        <Input
          id="acc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={harbor ? "ci-builds" : "alice"}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!errors.name}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && submit()}
        />
        {errors.name && (
          <p className="text-caption text-destructive">{errors.name}</p>
        )}
        {harbor && name && (
          <p className="text-caption text-muted-foreground">
            It signs in as{" "}
            <span className="font-mono">robot${name.trim().toLowerCase()}</span>
          </p>
        )}
      </div>
      {harbor && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="acc-note">What it's for (optional)</Label>
            <Input
              id="acc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="GitHub Actions builds"
            />
          </div>
          <ToggleRow
            id="acc-push"
            label="May push and delete"
            hint={
              push
                ? "Pulls, pushes images and deletes them."
                : "Pulls only: right for servers."
            }
            checked={push}
            onChange={setPush}
          />
          <div className="grid gap-2">
            <Label>Valid for</Label>
            <Segmented
              label="Valid for"
              value={days}
              onChange={setDays}
              items={[
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
                { value: "365", label: "A year" },
                { value: "0", label: "Never expires" },
              ]}
            />
          </div>
        </>
      )}
    </ResponsiveDialog>
  )
}

function SecretDialog({
  r,
  s,
  open,
  onOpenChange,
}: {
  r: PackageRegistry
  s: RegistryAccountSecret
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const harbor = r.kind === "harbor"
  const sample = harbor
    ? `echo '${s.secret}' | docker login ${r.address} -u '${s.account.name}' --password-stdin`
    : `# .npmrc\nregistry=${r.url}/\n${r.url.replace(/^https?:/, "")}/:_auth=${btoa(`${s.account.name}:${s.secret}`)}`
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${s.account.name} is ready`}
      description="Copy the secret now: Morche doesn't keep it, and it isn't shown again."
      className="sm:max-w-xl"
      footer={
        <Button className="max-md:h-11" onClick={() => onOpenChange(false)}>
          I've saved it
        </Button>
      }
    >
      <div className="grid gap-4">
        <CredentialRow label="User" value={s.account.name} />
        <CredentialRow
          label={harbor ? "Secret" : "Password"}
          value={s.secret}
          secret
        />
        <div className="grid gap-1.5">
          <p className="text-caption font-medium text-muted-foreground">
            {harbor ? "Sign in" : "Put it in .npmrc"}
          </p>
          <CodeBlock code={sample} label="sign-in command" wrap />
        </div>
      </div>
    </ResponsiveDialog>
  )
}
