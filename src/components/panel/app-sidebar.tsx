"use client"

import { ChevronsUpDown, CircleUser, LogOut, Settings2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useAuth } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { ThemeMenuItems } from "@/components/theme-picker"
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
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { DockerSidebarContent } from "./docker-sidebar"
import {
  containersItem,
  helpItem,
  isActive,
  navGroups,
  settingsFor,
} from "./nav"
import { NavEntry } from "./nav-entry"
import { useNavAlerts } from "./problems"
import { WithPathname } from "./with-pathname"
import { useWorkspace, WorkspaceAvatar } from "./workspace"

// Desktop navigation (md and up), after shadcn's sidebar-07 block: collapses
// to an icon rail. Phones get the bottom tab bar instead.
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <WithPathname>
        {(pathname) => <SidebarBody pathname={pathname} />}
      </WithPathname>

      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// Under /containers the sidebar shows the Containers menu instead (like
// Arcane). "Main menu" goes back without leaving the page; the main menu's
// Containers entry drills in again.
function SidebarBody({ pathname }: { pathname: string }) {
  const settings = useSettingsItem()
  const alerts = useNavAlerts()
  // The page where "Main menu" was pressed: the main menu stays until the
  // page changes.
  const [mainAt, setMainAt] = useState<string | null>(null)
  const drill = () => setMainAt(null)

  if (isActive(pathname, containersItem.href) && mainAt !== pathname) {
    return (
      <DockerSidebarContent
        pathname={pathname}
        onBack={() => setMainAt(pathname)}
      />
    )
  }

  return (
    <SidebarContent
      className={cn(
        mainAt && "animate-in duration-200 slide-in-from-start-4 fade-in",
      )}
    >
      {navGroups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <NavEntry
                key={item.href}
                item={item}
                pathname={pathname}
                alert={alerts.get(item.href)}
                onClick={item === containersItem ? drill : undefined}
              />
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
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeMenuItems />
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
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
