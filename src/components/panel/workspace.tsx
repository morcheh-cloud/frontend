"use client"

import { createContext, type ReactNode, use, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type Workspace = { id: string; name: string }

// Placeholder list until the backend serves the user's workspaces.
export const workspaces: Workspace[] = [
  { id: "main", name: "Main workspace" },
  { id: "staging", name: "Staging" },
  { id: "lab", name: "Home lab" },
]

const storageKey = "morcheh.workspace"

type WorkspaceState = {
  workspace: Workspace
  setWorkspaceId: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceState | null>(null)

// Holds the selected workspace for the whole panel and remembers it per
// browser.
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(workspaces[0].id)

  // Storage is read after mount so the server render and hydration agree.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && workspaces.some((w) => w.id === saved)) setId(saved)
    } catch {}
  }, [])

  function setWorkspaceId(next: string) {
    setId(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {}
  }

  const workspace = workspaces.find((w) => w.id === id) ?? workspaces[0]

  return (
    <WorkspaceContext value={{ workspace, setWorkspaceId }}>
      {children}
    </WorkspaceContext>
  )
}

export function useWorkspace() {
  const state = use(WorkspaceContext)
  if (!state) throw new Error("useWorkspace needs a WorkspaceProvider")
  return state
}

// The workspace's initial on a tinted tile.
export function WorkspaceAvatar({
  workspace,
  className,
}: {
  workspace: Workspace
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
      {workspace.name.charAt(0).toUpperCase()}
    </span>
  )
}
