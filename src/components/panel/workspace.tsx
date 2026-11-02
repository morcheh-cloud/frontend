"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { api, setActiveWorkspace } from "@/lib/api"
import type { PanelWorkspace } from "@/lib/services"
import { cn } from "@/lib/utils"

export type Workspace = PanelWorkspace

const storageKey = "morcheh.workspace"
export const workspacesKey = ["workspaces"] as const

type WorkspaceState = {
  workspaces: Workspace[]
  // Null when this person has been given access to nothing yet.
  workspace: Workspace | null
  setWorkspaceId: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceState | null>(null)

function readSaved() {
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

// Holds the selected workspace for the whole panel and remembers it per
// browser. Nothing below it renders until the list is in, so every request
// from the panel already carries the right workspace.
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: workspacesKey,
    queryFn: () => api.workspaces.listWorkspaces(),
    select: (data) => data.items,
    refetchOnWindowFocus: true,
  })
  const [picked, setPicked] = useState<string | null>(null)

  const select = useCallback(
    (id: string, leave: boolean) => {
      setPicked(id)
      setActiveWorkspace(id)
      try {
        localStorage.setItem(storageKey, id)
      } catch {}
      const scoped = ({ queryKey: [key] }: { queryKey: readonly unknown[] }) =>
        !["auth", "workspaces", "jobs", "server-stats"].includes(key as string)
      if (!leave) {
        queryClient.removeQueries({ type: "inactive", predicate: scoped })
        return
      }
      // What's on screen belongs to the workspace we just left.
      queryClient.resetQueries({ predicate: scoped })
      const { pathname } = window.location
      for (const root of ["/servers", "/storage"]) {
        if (pathname === root || pathname.startsWith(`${root}/`)) {
          router.push(root)
        }
      }
    },
    [queryClient, router],
  )

  const list = query.data
  if (!list) {
    if (!query.error) return null
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-body-sm text-muted-foreground">
          {query.error.message}
        </p>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          {query.isFetching ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          Try again
        </Button>
      </div>
    )
  }

  const wanted = picked ?? readSaved()
  const workspace =
    list.find((w) => w.id === wanted) ??
    // Prefer a whole workspace over one reached through a single server.
    list.find((w) => !w.partial) ??
    list[0] ??
    null
  // During render on purpose: the children's first requests need it.
  setActiveWorkspace(workspace?.id ?? null)

  return (
    <WorkspaceContext
      value={{
        workspaces: list,
        workspace,
        setWorkspaceId: (id) => select(id, true),
      }}
    >
      <WorkspaceSyncContext value={select}>{children}</WorkspaceSyncContext>
    </WorkspaceContext>
  )
}

const WorkspaceSyncContext = createContext<
  ((id: string, leave: boolean) => void) | null
>(null)

export function useWorkspace() {
  const state = use(WorkspaceContext)
  if (!state) throw new Error("useWorkspace needs a WorkspaceProvider")
  return state
}

// A server or storage opened from a link can be in another workspace: move the
// selection to it, staying on the page.
export function useFollowWorkspace(id: string | undefined) {
  const { workspace, workspaces } = useWorkspace()
  const select = use(WorkspaceSyncContext)
  const current = workspace?.id
  const known = workspaces.some((w) => w.id === id)
  useEffect(() => {
    if (id && known && id !== current) select?.(id, false)
  }, [id, known, current, select])
}

// The workspace's initial on a tinted tile.
export function WorkspaceAvatar({
  workspace,
  className,
}: {
  workspace: Pick<Workspace, "name"> | null
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-caption font-medium text-sidebar-primary-foreground",
        className,
      )}
    >
      {workspace?.name.charAt(0).toUpperCase() ?? "–"}
    </span>
  )
}
