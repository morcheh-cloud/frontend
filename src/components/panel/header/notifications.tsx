"use client"

import { Bell, BellOff, ChevronRight, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useSignInAlerts } from "@/components/sessions/api"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { type NavItem, navGroups } from "../nav"
import { useNavAlerts } from "../problems"
import { HeaderIcon, headerIconClass } from "./header-icon"

// The header's bell: what needs a look right now across the workspace (the
// same red counts as the sidebar) plus sign-ins to this account that weren't
// confirmed yet. Each row opens the section it belongs to.

type Row = {
  key: string
  href: string
  title: string
  detail: string
  count: number
  icon: NavItem["icon"]
  tone: "destructive" | "warning"
}

// The section a red count belongs to (a top-level item or a sub-page).
function sectionOf(href: string) {
  for (const item of navGroups.flatMap((g) => g.items)) {
    if (item.href === href) return item
    const child = item.children?.find((c) => c.href.split("?")[0] === href)
    if (child) return { ...item, label: child.label }
  }
}

function useRows(): Row[] {
  const alerts = useNavAlerts()
  const signIns = useSignInAlerts().data ?? []
  const rows: Row[] = []
  if (signIns.length > 0) {
    rows.push({
      key: "sign-ins",
      href: "/account#sign-ins",
      title: "Was it you?",
      detail: `${signIns.length} sign-in${signIns.length === 1 ? "" : "s"} from a new network to answer`,
      count: signIns.length,
      icon: ShieldAlert,
      tone: "warning",
    })
  }
  for (const [href, alert] of alerts) {
    const section = sectionOf(href)
    rows.push({
      key: href,
      href,
      title: section?.label ?? href,
      detail: alert.label,
      count: alert.count,
      icon: section?.icon ?? Bell,
      tone: "destructive",
    })
  }
  return rows
}

export function Notifications() {
  const rows = useRows()
  const [open, setOpen] = useState(false)
  const total = rows.reduce((n, r) => n + r.count, 0)
  const label =
    total > 0
      ? `${total} thing${total === 1 ? "" : "s"} need a look`
      : "Notifications"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <HeaderIcon
        label={label}
        render={<PopoverTrigger className={headerIconClass} />}
      >
        <Bell />
        {total > 0 && (
          <span
            aria-hidden
            className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-medium text-white tabular-nums ring-2 ring-background"
          >
            {total > 99 ? "99+" : total}
          </span>
        )}
      </HeaderIcon>
      <PopoverContent align="end" className="w-96 gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-medium">Needs a look</p>
          {total > 0 && (
            <span className="text-caption text-muted-foreground tabular-nums">
              {total} in {rows.length} place{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
              <BellOff className="size-5" />
            </span>
            <p className="font-medium">All clear</p>
            <p className="text-body-sm text-muted-foreground">
              Nothing is down, failing or firing in this workspace.
            </p>
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {rows.map((r) => (
              <li key={r.key}>
                <Link
                  href={r.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 px-4 py-2.5 outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      r.tone === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    <r.icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm font-medium">
                      {r.title}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {r.detail}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ash transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/home"
          onClick={() => setOpen(false)}
          className="border-t border-border px-4 py-2.5 text-center text-body-sm text-brand outline-none hover:bg-muted focus-visible:bg-muted"
        >
          Open the dashboard
        </Link>
      </PopoverContent>
    </Popover>
  )
}
