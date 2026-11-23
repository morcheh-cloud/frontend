"use client"

import { ChevronsUpDown, Settings2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useAuth } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
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
  serversItem,
  settingsFor,
} from "./nav"
import { NavEntry } from "./nav-entry"
import { sectionAlert, useNavAlerts } from "./problems"
import { ServerSidebarContent, serverPageOf } from "./server-sidebar"
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
        {(pathname, search) => (
          <SidebarBody pathname={pathname} search={search} />
        )}
      </WithPathname>

      <SidebarRail />
    </Sidebar>
  )
}

// Under /containers the sidebar shows the Containers menu instead (like
// Arcane), and on a server's page that server's sections. "Main menu" goes
// back without leaving the page; the main menu's Containers / Servers entry
// drills in again.
function SidebarBody({
  pathname,
  search,
}: {
  pathname: string
  search: URLSearchParams
}) {
  const settings = useSettingsItem()
  const alerts = useNavAlerts()
  // The page where "Main menu" was pressed: the main menu stays until the
  // page changes.
  const [mainAt, setMainAt] = useState<string | null>(null)
  const drill = () => setMainAt(null)

  if (serverPageOf(pathname) && mainAt !== pathname) {
    return (
      <ServerSidebarContent
        pathname={pathname}
        onBack={() => setMainAt(pathname)}
      />
    )
  }

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
                search={search}
                alert={sectionAlert(item, alerts)}
                onClick={
                  item === containersItem || item === serversItem
                    ? drill
                    : undefined
                }
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      <SidebarGroup className="mt-auto">
        <SidebarMenu>
          <NavEntry item={helpItem} pathname={pathname} />
          {settings && (
            <NavEntry item={settings} pathname={pathname} search={search} />
          )}
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
