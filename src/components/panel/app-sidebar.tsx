"use client"

import { ChevronRight, ChevronsUpDown, CircleUser, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  currentChild,
  isActive,
  type NavItem,
  navGroups,
  settingsItem,
} from "./nav"
import { useWorkspace, WorkspaceAvatar, workspaces } from "./workspace"

// Desktop navigation (md and up), after shadcn's sidebar-07 block: collapses
// to an icon rail. Phones get the bottom tab bar instead.
export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavEntry key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <NavEntry item={settingsItem} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function WorkspaceSwitcher() {
  const { workspace, setWorkspaceId } = useWorkspace()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="h-10 data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <WorkspaceAvatar
              workspace={workspace}
              className="group-data-[collapsible=icon]:mx-auto"
            />
            <span className="flex-1 truncate font-medium">
              {workspace.name}
            </span>
            <ChevronsUpDown className="ms-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side="right" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={workspace.id}
                onValueChange={(id) => setWorkspaceId(id as string)}
              >
                {workspaces.map((w) => (
                  <DropdownMenuRadioItem key={w.id} value={w.id}>
                    <WorkspaceAvatar workspace={w} />
                    <span className="truncate">{w.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavEntry({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const active = isActive(pathname, item.href)

  if (item.children) {
    return <NavSection item={item} pathname={pathname} active={active} />
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        tooltip={item.label}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// A section that expands to its sub-pages. It opens by itself whenever
// navigation lands inside it, and otherwise stays as the user left it.
function NavSection({
  item,
  pathname,
  active,
}: {
  item: NavItem
  pathname: string
  active: boolean
}) {
  const Icon = item.icon
  const [open, setOpen] = useState(active)
  const [wasActive, setWasActive] = useState(active)
  if (active !== wasActive) {
    setWasActive(active)
    if (active) setOpen(true)
  }
  const current = currentChild(pathname, item.children ?? [])

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.label} />}>
        <Icon />
        <span>{item.label}</span>
        <ChevronRight className="ms-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
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

// TODO: show the signed-in user once the backend has auth.
function AccountMenu() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="data-popup-open:bg-sidebar-accent" />
            }
          >
            <CircleUser />
            <span>Account</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48" side="right" align="end">
            <DropdownMenuItem render={<Link href="/login" />}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
