"use client"

import { ChevronLeft, Ellipsis, Globe, TriangleAlert } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  type Item,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideForPath } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { DNSServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDnsActions } from "./dns-actions"
import { DnsStatusDot, dnsStatusMeta } from "./meta"
import { useDnsCan } from "./permissions"

export const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

// The phone app bar of a DNS page: Back, a centred title, guide and ⋯.
export function AppBar({
  title,
  subtitle,
  path,
  onBack,
  onMenu,
  menuLabel,
  children,
}: {
  title: string
  subtitle?: ReactNode
  // The page's path, for its guide.
  path: string
  onBack: () => void
  onMenu?: () => void
  menuLabel?: string
  children?: ReactNode
}) {
  const guide = guideForPath(path)
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-12 items-center gap-1 px-1">
        {/* As wide as the end side, so the title stays centred. */}
        <div className="flex w-22 shrink-0">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className={barButton}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-body font-medium">{title}</h1>
          {subtitle && (
            <p className="flex items-center justify-center gap-1.5 truncate text-caption text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {guide ? (
          <HelpButton href={guide.href} label={`${guide.guide.title} guide`} />
        ) : (
          <span aria-hidden className="size-11 shrink-0" />
        )}
        {onMenu ? (
          <button
            type="button"
            aria-label={menuLabel}
            onClick={onMenu}
            className={barButton}
          >
            <Ellipsis className="size-5" />
          </button>
        ) : (
          <span aria-hidden className="size-11 shrink-0" />
        )}
      </div>
      {children}
    </header>
  )
}

// A phone action sheet: a title block, then the actions.
export function ActionSheet({
  open,
  onOpenChange,
  title,
  head,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  head?: ReactNode
  groups: Item[][]
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      {head}
      <SheetItems groups={groups} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// What's wrong with a server's connection, with the way to fix it.
export function ServerBanner({
  server: s,
  checking,
  className,
}: {
  server: DNSServer
  checking: boolean
  className?: string
}) {
  const actions = useDnsActions()
  const can = useDnsCan()
  if (s.status === "online" || s.status === "unknown") return null

  const fix =
    s.status === "auth_failed" ||
    s.status === "tls_error" ||
    s.status === "blocked"
      ? {
          label: "Edit connection",
          allowed: can(s, "owner"),
          run: () => actions.editServer(s),
        }
      : {
          label: checking ? "Checking…" : "Check again",
          allowed: can(s, "operator"),
          run: () => actions.check(s),
        }
  const warn = s.status === "auth_failed" || s.status === "blocked"

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y p-4 md:items-center md:rounded-2xl md:border md:px-5 md:py-3",
        warn
          ? "border-warning/25 bg-warning/5"
          : "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <TriangleAlert
        className={cn(
          "mt-0.5 size-4 shrink-0 md:mt-0",
          warn ? "text-warning" : "text-destructive",
        )}
      />
      <div className="min-w-0 flex-1 text-body-sm">
        <p className="font-medium">
          {dnsStatusMeta[s.status].label} on the last check
          {s.last_checked_at && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {timeAgo(s.last_checked_at).toLowerCase()}
            </span>
          )}
        </p>
        <p className="text-muted-foreground">
          {s.status_message ||
            "Morcheh couldn't talk to this DNS server's API."}
        </p>
      </div>
      {fix.allowed && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-9"
          disabled={checking}
          onClick={fix.run}
        >
          {fix.label}
        </Button>
      )}
    </div>
  )
}

export function ServerStatus({
  server: s,
  checking,
}: {
  server: DNSServer
  checking: boolean
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title={s.status === "online" ? undefined : s.status_message}
    >
      <DnsStatusDot status={s.status} checking={checking} />
      {checking ? "Checking…" : dnsStatusMeta[s.status].label}
      {!checking && s.status === "online" && s.latency_ms != null && (
        <span className="text-muted-foreground">{s.latency_ms} ms</span>
      )}
    </span>
  )
}

// A small rounded label: zone type, "Disabled", a problem.
export function Tag({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode
  tone?: "muted" | "warning" | "destructive" | "brand"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-caption whitespace-nowrap",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        tone === "brand" && "bg-brand-soft text-brand-strong",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ServerTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong",
        className,
      )}
    >
      <Globe className="size-1/2" />
    </span>
  )
}

export function PageLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:px-6 md:pt-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-9 rounded-lg" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

export function Missing({
  title,
  body,
  href,
  label,
  onRetry,
}: {
  title: string
  body: string
  href: string
  label: string
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Globe className="size-5" />
      </span>
      <div>
        <h1 className="text-body font-medium">{title}</h1>
        <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
          {body}
        </p>
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Link href={href} className={buttonVariants()}>
          {label}
        </Link>
      </div>
    </div>
  )
}

// A table header cell.
export function Th({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {children}
    </th>
  )
}

// Chip row on phones (tabs, filters).
export const chipClass =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-medium aria-[current=page]:text-background"
