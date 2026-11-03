"use client"

import { Ellipsis, ExternalLink, Loader2, UsersRound } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { App, AppCategory } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  afterClose,
  type Item,
  ItemMenu,
  Segmented,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { fullTime } from "../../servers/[id]/users/components/meta"
import { useAppActivity, useApps } from "../api"
import { useAppActions } from "./app-actions"
import { useAppMenu } from "./app-menu"
import { AppLogo, colorOf, safeHref, shortAddress } from "./meta"
import { useAppCan } from "./permissions"
import { CopyUsernameButton, PasswordCell } from "./secret"

export type AppDetailsTab = "overview" | "activity"

// One service: its address, logins and note, and (for its Owner) who viewed
// its passwords. Re-found in the list by id, so an edit shows at once and a
// removal closes it.
export function AppDetails({
  open,
  onOpenChange,
  appId,
  tab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  tab: AppDetailsTab
}) {
  const list = useApps()
  const app = list.data?.items.find((a) => a.id === appId)
  const gone = !!list.data && !app

  useEffect(() => {
    if (open && gone) onOpenChange(false)
  }, [open, gone, onOpenChange])

  if (!app) return null
  return (
    <Details
      open={open}
      onOpenChange={onOpenChange}
      app={app}
      category={list.data?.categories.find((c) => c.id === app.category_id)}
      initialTab={tab}
    />
  )
}

function Details({
  open,
  onOpenChange,
  app,
  category,
  initialTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  app: App
  category?: AppCategory
  initialTab: AppDetailsTab
}) {
  const phone = useIsPhone()
  const can = useAppCan(app)
  const a = useAppActions()
  const [picked, setTab] = useState<AppDetailsTab>(initialTab)
  const tab = can.activity ? picked : "overview"
  const href = safeHref(app.address)

  const tabs = can.activity && (
    <Segmented
      label="Show"
      items={[
        { value: "overview", label: "Overview" },
        { value: "activity", label: "Activity" },
      ]}
      value={tab}
      onChange={setTab}
    />
  )

  const body =
    tab === "activity" ? (
      <Activity app={app} active={open} />
    ) : (
      <Overview
        app={app}
        category={category}
        onAccess={
          can.manage
            ? () => afterClose(onOpenChange, () => a.access(app))
            : undefined
        }
      />
    )

  // Opening stays inside the tap (pop-up blockers); layers that replace this
  // one close it first, so they get the Back entry.
  const items = useAppMenu(app).map((group) =>
    group
      .filter((item) => item.key !== "details")
      .map((item): Item => {
        if (item.key === "open" || item.key === "critical") {
          return { ...item, stay: true }
        }
        return phone
          ? item
          : { ...item, onSelect: () => afterClose(onOpenChange, item.onSelect) }
      }),
  )

  const title = (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate">{app.name}</span>
      {app.critical && (
        <span
          role="img"
          aria-label="Critical"
          title="Critical"
          className="size-1.5 shrink-0 rounded-full bg-destructive"
        />
      )}
    </span>
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={app.name}
        header={
          <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 pb-3">
            <div className="flex items-center gap-3 px-2">
              <AppLogo app={app} />
              <div className="min-w-0">
                <p className="text-subheading font-medium">{title}</p>
                <p className="truncate text-caption text-ash">
                  {shortAddress(app.address)}
                </p>
              </div>
            </div>
            {tabs}
          </div>
        }
        className="pt-3"
      >
        {body}
        {tab === "overview" && (
          <div className="mt-3">
            <SheetItems groups={items} onOpenChange={onOpenChange} />
          </div>
        )}
      </BottomSheet>
    )
  }

  const rest = items.map((g) =>
    g.filter((i) => i.key !== "open" && i.key !== "edit"),
  )
  const edit = items.flat().find((i) => i.key === "edit")

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="gap-2 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <AppLogo app={app} />
            <div className="min-w-0">
              <SheetTitle className="text-body">{title}</SheetTitle>
              <SheetDescription className="truncate">
                {shortAddress(app.address)}
              </SheetDescription>
            </div>
          </div>
          {tabs && <div className="mt-2">{tabs}</div>}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {body}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4">
          {href && (
            <Button
              nativeButton={false}
              render={
                <a href={href} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink />
              Open
            </Button>
          )}
          {edit && (
            <Button variant="outline" onClick={edit.onSelect}>
              {edit.icon}
              {edit.label}
            </Button>
          )}
          {rest.some((g) => g.length > 0) && (
            <ItemMenu
              groups={rest}
              label={`More actions for ${app.name}`}
              trigger={
                <Button variant="outline" size="icon" aria-label="More actions">
                  <Ellipsis />
                </Button>
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 md:flex-row md:gap-4">
      <dt className="shrink-0 text-caption text-ash md:w-28 md:text-body-sm md:text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-body-sm">{children}</dd>
    </div>
  )
}

function Overview({
  app,
  category,
  onAccess,
}: {
  app: App
  category?: AppCategory
  onAccess?: () => void
}) {
  const can = useAppCan(app)
  const href = safeHref(app.address)

  return (
    <div className="flex flex-col gap-4 px-2 md:px-0">
      <dl className="divide-y divide-border">
        <Row label="Address">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-sm break-all text-brand-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {app.address}
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
          ) : (
            <span className="break-all text-muted-foreground">
              {app.address}
            </span>
          )}
        </Row>
        <Row label="Category">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                category ? colorOf(category.color).dot : "bg-mist",
              )}
            />
            {category?.name ?? "Uncategorized"}
          </span>
        </Row>
        <Row label={app.accounts.length > 1 ? "Logins" : "Login"}>
          {!can.reveal ? (
            // A Viewer gets no accounts at all, so there's nothing to count.
            <span className="text-muted-foreground">
              Seeing the logins takes Operator access.
            </span>
          ) : app.accounts.length === 0 ? (
            <span className="text-muted-foreground">No logins saved.</span>
          ) : (
            <ul className="flex flex-col gap-3">
              {app.accounts.map((acc) => (
                <li key={acc.id} className="flex flex-col gap-1">
                  {app.accounts.length > 1 && acc.label && (
                    <span className="text-caption text-ash">{acc.label}</span>
                  )}
                  <span className="flex min-w-0 items-center gap-0.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-caption">
                      {acc.username || (
                        <span className="font-sans text-ash">No username</span>
                      )}
                    </span>
                    <CopyUsernameButton app={app} account={acc} />
                  </span>
                  <PasswordCell app={app} account={acc} />
                </li>
              ))}
            </ul>
          )}
        </Row>
        {app.note && (
          <Row label="Note">
            <p className="break-words whitespace-pre-line">{app.note}</p>
          </Row>
        )}
      </dl>
      {onAccess && (
        <Button variant="outline" className="self-start" onClick={onAccess}>
          <UsersRound />
          Manage access
        </Button>
      )}
    </div>
  )
}

// Who viewed or copied a password, newest first (the last 200).
function Activity({ app, active }: { app: App; active: boolean }) {
  const can = useAppCan(app)
  const query = useAppActivity(app.id, active && can.activity)

  if (!query.data) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-16 text-body-sm text-muted-foreground">
        {query.error ? (
          <p role="alert">{query.error.message}</p>
        ) : (
          <>
            <Loader2 className="size-4 animate-spin" />
            Reading the log…
          </>
        )}
      </div>
    )
  }
  if (query.data.length === 0) {
    return (
      <p className="py-16 text-center text-body-sm text-muted-foreground">
        No one has viewed a password yet.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2 px-2 md:px-0">
      <p className="text-caption text-ash">
        Every time someone shows or copies a password, it's written here.
      </p>
      <ul className="divide-y divide-border">
        {query.data.map((row) => (
          <li key={row.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm">
                <span className="font-medium">{row.user_name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  viewed {row.account_label || "the password"}
                </span>
              </p>
              {row.ip && (
                <p className="font-mono text-caption text-ash">{row.ip}</p>
              )}
            </div>
            <time
              dateTime={row.created_at}
              className="shrink-0 text-caption text-muted-foreground"
            >
              {fullTime(row.created_at)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  )
}
