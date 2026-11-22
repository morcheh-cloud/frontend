"use client"

import { KeyRound, Trash2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { ApiToken } from "@/lib/services"
import { cn } from "@/lib/utils"
import { tokenState } from "./meta"

const exact = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})
const exactTime = (iso: string) => exact.format(new Date(iso))

// One account's API tokens, newest first, each with Revoke. `whose` names the
// account in the confirm text (left out = your own).
export function TokenList({
  id,
  items,
  loading,
  error,
  whose,
  empty,
  onRevoke,
}: {
  id: string
  items: ApiToken[] | undefined
  loading: boolean
  error: Error | null
  whose?: string
  empty?: ReactNode
  onRevoke: (t: ApiToken) => Promise<unknown>
}) {
  const [open, setOpen] = useOpen(`revoke-token-${id}`)
  const [target, setTarget] = useState<ApiToken | null>(null)
  const [pending, setPending] = useState(false)

  if (loading)
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  if (error)
    return (
      <p className="text-body-sm text-destructive">
        Couldn't load the tokens: {error.message}
      </p>
    )
  if (!items?.length)
    return (
      empty ?? (
        <p className="text-body-sm text-muted-foreground">No API tokens.</p>
      )
    )

  const sorted = [...items].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )

  const revoke = async () => {
    if (!target) return
    setPending(true)
    try {
      await onRevoke(target)
      toast.success(`${target.name} revoked`)
      setOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <ul className="-mx-4 divide-y divide-border border-y border-border md:mx-0 md:rounded-xl md:border">
        {sorted.map((t) => (
          <TokenRow
            key={t.id}
            t={t}
            onRevoke={() => {
              setTarget(t)
              setOpen(true)
            }}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Revoke ${target?.name ?? "this token"}?`}
        description={
          <>
            It stops working at once: every script, CLI or tool using it gets
            “not valid” from the next request.
            {whose ? ` ${whose} can make a new one.` : ""}
          </>
        }
        confirmLabel="Revoke"
        pending={pending}
        onConfirm={revoke}
      />
    </>
  )
}

function Tag({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "brand" | "warning" | "destructive"
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-caption whitespace-nowrap",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "brand" && "bg-brand-soft text-brand-strong",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  )
}

function TokenRow({ t, onRevoke }: { t: ApiToken; onRevoke: () => void }) {
  const state = tokenState(t)
  return (
    <li
      className={cn(
        "flex min-h-16 items-center gap-3 px-4 py-3",
        state === "expired" && "bg-subtle",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          state === "expired"
            ? "bg-muted text-ash"
            : "bg-brand-soft text-brand-strong",
        )}
      >
        <KeyRound className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "truncate font-medium",
              state === "expired" && "text-muted-foreground",
            )}
          >
            {t.name}
          </span>
          {t.read_only ? (
            <Tag>Read only</Tag>
          ) : (
            <Tag tone="brand">Read and write</Tag>
          )}
          {state === "expired" && <Tag tone="destructive">Expired</Tag>}
          {state === "soon" && <Tag tone="warning">Expires soon</Tag>}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
          <span className="font-mono">morche_{t.prefix}…</span>
          <span aria-hidden>·</span>
          {t.last_used_at ? (
            <span title={exactTime(t.last_used_at)}>
              Used {timeAgo(t.last_used_at).toLowerCase()}
              {t.last_used_ip && (
                <>
                  {" "}
                  from{" "}
                  <span className="font-mono tabular-nums">
                    {t.last_used_ip}
                  </span>
                </>
              )}
            </span>
          ) : (
            <span>Never used</span>
          )}
        </span>
        <span className="text-caption text-ash">
          <span title={exactTime(t.created_at)}>
            Made {timeAgo(t.created_at).toLowerCase()}
          </span>
          {" · "}
          {t.expires_at ? (
            <span title={exactTime(t.expires_at)}>
              {state === "expired" ? "Expired" : "Expires"}{" "}
              {timeAgo(t.expires_at)}
            </span>
          ) : (
            "Never expires"
          )}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 max-md:size-11 max-md:p-0"
        aria-label={`Revoke ${t.name}`}
        onClick={onRevoke}
      >
        <Trash2 />
        <span className="max-md:sr-only">Revoke</span>
      </Button>
    </li>
  )
}
