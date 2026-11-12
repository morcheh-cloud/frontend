"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { currentChild, isActive, type NavItem } from "./nav"
import type { NavAlert } from "./problems"

// One sidebar entry: a link, or a section that folds out its sub-pages.
export function NavEntry({
  item,
  pathname,
  alert,
  active: forced,
  current: forcedChild,
  onClick,
}: {
  item: NavItem
  pathname: string
  alert?: NavAlert
  // Set when the menu decides what's current itself (the Containers menu,
  // where every page sits under /containers).
  active?: boolean
  current?: string
  onClick?: () => void
}) {
  const Icon = item.icon
  const active =
    forced ??
    (isActive(pathname, item.href) ||
      !!item.children?.some((c) => isActive(pathname, c.href)))

  if (item.children) {
    return (
      <NavSection
        item={item}
        current={forcedChild ?? currentChild(pathname, item.children)}
        active={active}
        alert={alert}
      />
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} onClick={onClick} />}
        isActive={active}
        tooltip={tooltipFor(item, alert)}
      >
        <Icon />
        <span>{item.label}</span>
        {alert && <AlertCount alert={alert} />}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// A section that expands to its sub-pages. It opens by itself whenever
// navigation lands inside it, and otherwise stays as the user left it.
function NavSection({
  item,
  current,
  active,
  alert,
}: {
  item: NavItem
  current: string | undefined
  active: boolean
  alert?: NavAlert
}) {
  const Icon = item.icon
  const [open, setOpen] = useState(active)
  const [wasActive, setWasActive] = useState(active)
  if (active !== wasActive) {
    setWasActive(active)
    if (active) setOpen(true)
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={<SidebarMenuButton tooltip={tooltipFor(item, alert)} />}
      >
        <Icon />
        <span>{item.label}</span>
        {alert && <AlertCount alert={alert} />}
        <ChevronRight
          className={cn(
            "transition-transform duration-200 group-data-open/collapsible:rotate-90",
            !alert && "ms-auto",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                render={<Link href={child.href} />}
                isActive={child.href === current}
              >
                <span>{child.label}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

const tooltipFor = (item: NavItem, alert?: NavAlert) =>
  alert ? `${item.label} · ${alert.label}` : item.label

// What's broken in the section (servers or storages that can't be reached…),
// in red next to it; a dot on the icon when the sidebar is collapsed.
export function AlertCount({ alert: { count, label } }: { alert: NavAlert }) {
  return (
    <>
      <span className="sr-only">, {label}</span>
      <span
        aria-hidden
        className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/10 px-1.5 text-caption font-medium text-destructive tabular-nums group-data-[collapsible=icon]:hidden"
      >
        {count > 99 ? "99+" : count}
      </span>
      <span
        aria-hidden
        className="absolute end-1 top-1 hidden size-2 rounded-full bg-destructive ring-2 ring-sidebar group-data-[collapsible=icon]:block"
      />
    </>
  )
}
