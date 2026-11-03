"use client"

import { Copy, Eye, EyeOff, KeyRound, Loader2, UserRound } from "lucide-react"
import { type MouseEvent, type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { App, AppAccount } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRevealPassword } from "../api"
import { useAppCan } from "./permissions"

// A shown password hides itself after this long.
const HIDE_AFTER = 30_000

const UNAVAILABLE =
  "Copying isn't available on this connection. The password is shown instead."

// Copy a value that has to be fetched first. Safari drops the click's
// permission across an await, so the promise goes inside the clipboard item;
// "unavailable" = no clipboard here (plain http), and load() wasn't called.
export async function copyLazy(
  load: () => Promise<string>,
): Promise<"copied" | "unavailable"> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": load().then((v) => new Blob([v], { type: "text/plain" })),
      }),
    ])
    return "copied"
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(await load())
    return "copied"
  }
  return "unavailable"
}

export const accountName = (a: AppAccount) => a.label || a.username || "Account"

// Buttons over a tile sit beside its link: keep their clicks to themselves.
const quiet = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

// Reveal and copy one service's passwords. Every reveal is one request and one
// row in the service's activity; the value stays in this component's state
// only and hides itself after HIDE_AFTER (or when the component goes away).
// The person sees either "Copied" or the value, never neither.
function useSecret(app: App) {
  const reveal = useRevealPassword()
  const [shown, setShown] = useState<{ account: string; value: string }>()

  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setShown(undefined), HIDE_AFTER)
    return () => clearTimeout(t)
  }, [shown])

  const load = (account: AppAccount) =>
    reveal.mutateAsync({ appId: app.id, accountId: account.id })

  const failed = (err: unknown) =>
    toast.error("Couldn't get the password", {
      description: err instanceof Error ? err.message : undefined,
    })

  return {
    shown,
    pending: reveal.isPending,
    hide: () => setShown(undefined),
    show: async (account: AppAccount) => {
      try {
        setShown({ account: account.id, value: await load(account) })
      } catch (err) {
        failed(err)
      }
    },
    copy: async (account: AppAccount) => {
      // One request per click, whichever way it ends.
      let request: Promise<string> | undefined
      const once = () => {
        request ??= load(account)
        return request
      }
      let result: "copied" | "unavailable"
      try {
        result = await copyLazy(once)
      } catch {
        result = "unavailable"
      }
      if (result === "copied") {
        toast.success(
          app.accounts.length > 1
            ? `Copied the password of ${accountName(account)}`
            : "Copied the password",
        )
        return
      }
      // No clipboard, or it refused: fetch (or reuse the fetch) and show it.
      try {
        setShown({ account: account.id, value: await once() })
        toast(UNAVAILABLE)
      } catch (err) {
        failed(err)
      }
    },
  }
}

function IconButton({
  label,
  onClick,
  children,
  className,
  disabled,
}: {
  label: string
  onClick?: (e: MouseEvent) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn("max-md:size-11", className)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

// A password in a table row or the details: dots until the eye is pressed,
// with a copy button. Nothing for a Viewer or an account without one.
export function PasswordCell({
  app,
  account,
}: {
  app: App
  account: AppAccount
}) {
  const can = useAppCan(app)
  const s = useSecret(app)
  if (!can.reveal) return null
  if (!account.has_password) {
    return <span className="text-caption text-ash">No password</span>
  }
  const value = s.shown?.account === account.id ? s.shown.value : undefined

  return (
    <span className="flex min-w-0 items-center gap-0.5">
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-mono text-caption",
          value === undefined && "tracking-widest text-ash",
        )}
      >
        {value ?? "••••••••"}
      </span>
      <IconButton
        label={value === undefined ? "Show password" : "Hide password"}
        disabled={s.pending}
        onClick={() => (value === undefined ? s.show(account) : s.hide())}
      >
        {s.pending ? (
          <Loader2 className="animate-spin" />
        ) : value === undefined ? (
          <Eye />
        ) : (
          <EyeOff />
        )}
      </IconButton>
      <IconButton
        label="Copy password"
        disabled={s.pending}
        onClick={() => s.copy(account)}
      >
        <Copy />
      </IconButton>
    </span>
  )
}

// Pick an account first when there are several.
function AccountChoice({
  label,
  icon,
  accounts,
  onPick,
  disabled,
}: {
  label: string
  icon: ReactNode
  accounts: AppAccount[]
  onPick: (a: AppAccount) => void
  disabled?: boolean
}) {
  if (accounts.length === 1) {
    return (
      <IconButton
        label={label}
        disabled={disabled}
        onClick={(e) => {
          quiet(e)
          onPick(accounts[0])
        }}
      >
        {icon}
      </IconButton>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            className="max-md:size-11"
          />
        }
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {accounts.map((a) => (
            <DropdownMenuItem key={a.id} onClick={() => onPick(a)}>
              <span className="min-w-0 flex-1 truncate">{accountName(a)}</span>
              {a.label && a.username && (
                <span className="truncate font-mono text-caption text-ash">
                  {a.username}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Copy a login's username; a plain value, so no reveal and no log.
export function CopyUsernameButton({
  app,
  account,
}: {
  app: App
  account?: AppAccount
}) {
  const can = useAppCan(app)
  const accounts = account ? [account] : app.accounts.filter((a) => a.username)
  if (!can.reveal || accounts.length === 0 || !accounts[0].username) {
    return null
  }
  const copy = async (a: AppAccount) => {
    try {
      await navigator.clipboard.writeText(a.username)
      toast.success("Copied the username")
    } catch {
      toast("Copying isn't available on this connection.", {
        description: a.username,
      })
    }
  }
  return (
    <AccountChoice
      label="Copy username"
      icon={<UserRound />}
      accounts={accounts}
      onPick={copy}
    />
  )
}

// Copy a password from a tile. Where the clipboard can't be used, the value
// shows in a small bubble by the button instead.
export function CopyPasswordButton({
  app,
  account,
}: {
  app: App
  account?: AppAccount
}) {
  const can = useAppCan(app)
  const s = useSecret(app)
  const accounts = account
    ? [account]
    : app.accounts.filter((a) => a.has_password)
  if (!can.reveal || accounts.length === 0 || !accounts[0].has_password) {
    return null
  }
  const shownAccount = accounts.find((a) => a.id === s.shown?.account)

  return (
    <Popover
      open={!!s.shown}
      onOpenChange={(open) => {
        if (!open) s.hide()
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        render={<span className="inline-flex" />}
        onClick={quiet}
      >
        <AccountChoice
          label="Copy password"
          icon={s.pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          accounts={accounts}
          disabled={s.pending}
          onPick={s.copy}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-1.5">
        <p className="text-caption text-muted-foreground">
          {shownAccount && app.accounts.length > 1
            ? `Password of ${accountName(shownAccount)}`
            : "Password"}
        </p>
        <p className="font-mono text-body-sm break-all select-all">
          {s.shown?.value}
        </p>
        <p className="text-caption text-ash">Hides in 30 seconds.</p>
      </PopoverContent>
    </Popover>
  )
}
