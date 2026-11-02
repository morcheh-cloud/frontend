"use client"

import {
  ChevronRight,
  ChevronsUpDown,
  CircleUser,
  LogOut,
  Settings2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useAuth } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
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
  DropdownMenuSeparator,
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
  helpItem,
  isActive,
  type NavItem,
  navGroups,
  settingsFor,
} from "./nav"
import { WithPathname } from "./with-pathname"
import { useWorkspace, WorkspaceAvatar } from "./workspace"

// Desktop navigation (md and up), after shadcn's sidebar-07 block: collapses
// to an icon rail. Phones get the bottom tab bar instead.
export function AppSidebar() {
  const settings = useSettingsItem()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <WithPathname>
        {(pathname) => (
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
                <NavEntry item={helpItem} pathname={pathname} />
                {settings && <NavEntry item={settings} pathname={pathname} />}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        )}
      </WithPathname>

      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// The Settings entry this person gets, if any.
export function useSettingsItem() {
  const { access } = useAuth()
  return settingsFor(
    access.admin,
    access.workspaces.some((w) => atLeast(w.level, "owner")),
  )
}

function WorkspaceSwitcher() {
  const { access } = useAuth()
  const { workspace, workspaces, setWorkspaceId } = useWorkspace()

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
              {workspace?.name ?? "No workspace"}
            </span>
            <ChevronsUpDown className="ms-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side="right" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={workspace?.id ?? ""}
                onValueChange={(id) => setWorkspaceId(id as string)}
              >
                {workspaces.map((w) => (
                  <DropdownMenuRadioItem key={w.id} value={w.id}>
                    <WorkspaceAvatar workspace={w} />
                    <span className="truncate">{w.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {workspaces.length === 0 && (
                <p className="px-1.5 py-1 text-body-sm text-muted-foreground">
                  Ask an admin to give you access.
                </p>
              )}
            </DropdownMenuGroup>
            {access.admin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/settings/workspaces" />}>
                  <Settings2 />
                  Manage workspaces
                </DropdownMenuItem>
              </>
            )}
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

function AccountMenu() {
  const { user, signOut } = useAuth()

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
            <span className="truncate">{user.full_name || user.username}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48" side="right" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">
                {user.username}
              </DropdownMenuLabel>
              <DropdownMenuItem render={<Link href="/account" />}>
                <CircleUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
