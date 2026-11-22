"use client"

import { BookOpen, KeyRound, Plus } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/components/auth/auth"
import { guideHref } from "@/components/help/guides"
import { Button } from "@/components/ui/button"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { PanelUser } from "@/lib/services"
import {
  useAdminRevokeToken,
  useMyTokens,
  useRevokeToken,
  useUserTokens,
} from "./api"
import { NewTokenDialog } from "./new-token"
import { TokenList } from "./token-list"

// Account › API tokens: your tokens, New token, and how to use them. The
// command palette's "New API token" opens the dialog (intent).
export function MyApiTokens() {
  const tokens = useMyTokens()
  const revoke = useRevokeToken()
  const [open, setOpen] = useOpen("new-api-token")
  useIntent("new-api-token", () => {
    document
      .getElementById("api-tokens")
      ?.scrollIntoView({ block: "start", behavior: "smooth" })
    setOpen(true)
  })
  const count = tokens.data?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <TokenList
        id="mine"
        items={tokens.data}
        loading={tokens.isPending}
        error={tokens.error}
        onRevoke={(t) => revoke.mutateAsync(t.id)}
        empty={<NoTokens onNew={() => setOpen(true)} />}
      />
      {count > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            variant="outline"
            className="max-md:h-11 max-md:w-full"
            disabled={count >= 50}
            onClick={() => setOpen(true)}
          >
            <Plus />
            New token
          </Button>
          <GuideLink />
          {count >= 50 && (
            <span className="text-caption text-muted-foreground">
              50 is the most: revoke one first.
            </span>
          )}
        </div>
      )}
      <NewTokenDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function GuideLink() {
  return (
    <Link
      href={guideHref("api")}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-brand underline-offset-4 hover:underline max-md:min-h-11"
    >
      <BookOpen className="size-4" />
      API, CLI and webhooks guide
    </Link>
  )
}

function NoTokens({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-mist p-5 max-md:-mx-4 max-md:rounded-none max-md:border-x-0">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
        <KeyRound className="size-5" />
      </span>
      <div>
        <p className="font-medium">No tokens yet</p>
        <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">
          Make one to call the API from a script, sign in the{" "}
          <code className="rounded bg-muted px-1 font-mono text-[0.875em]">
            morche
          </code>{" "}
          command-line tool, or let a CI job run a cron job after a deploy.
        </p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
        <Button className="max-md:h-11 max-md:w-full" onClick={onNew}>
          <Plus />
          New token
        </Button>
        <GuideLink />
      </div>
    </div>
  )
}

// A member's tokens on their details (system admin): revoke only, since a
// token is always made by its owner.
export function MemberApiTokens({
  user,
  open,
  name,
}: {
  user: PanelUser
  open: boolean
  name: string
}) {
  const { user: me } = useAuth()
  const tokens = useUserTokens(user.id, open)
  const revoke = useAdminRevokeToken()
  return (
    <section aria-labelledby="member-tokens" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="member-tokens" className="text-body-sm font-medium">
          API tokens
        </h3>
        {me.id === user.id && (
          <Link
            href="/account#api-tokens"
            className="text-caption text-brand hover:underline"
          >
            Manage yours
          </Link>
        )}
      </div>
      <TokenList
        id={`member-${user.id}`}
        items={tokens.data}
        loading={tokens.isPending && open}
        error={tokens.error}
        whose={name}
        empty={
          <p className="text-body-sm text-muted-foreground">
            {me.id === user.id
              ? "No API tokens. Make one on your account page."
              : `No API tokens. Only ${name} can make one, from their account page.`}
          </p>
        }
        onRevoke={(t) => revoke.mutateAsync(t.id)}
      />
    </section>
  )
}
