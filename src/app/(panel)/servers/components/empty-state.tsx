"use client"

import { CloudOff, FolderOpen, SearchX, Server, Star } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useFacets } from "../api"
import { useWorkspaceCan } from "./permissions"
import { useServerActions } from "./server-actions"
import { useFilters } from "./use-filters"

// What an empty list says depends on why it's empty: no servers at all, a
// search or filter that matches nothing, or an empty folder/favorites view.
export function EmptyState() {
  const { filters, narrowed, clearFilters, setFilters } = useFilters()
  const facets = useFacets()
  const actions = useServerActions()
  const { addServer } = useWorkspaceCan()

  if (facets.data?.total === 0) {
    if (!addServer) {
      return (
        <Empty
          icon={<Server />}
          title="No servers for you here"
          text="Servers show up once an admin gives you access to them."
        />
      )
    }
    return (
      <Empty
        icon={<Server />}
        title="Add your first server"
        text="Connect over SSH with a password or a private key. Morcheh checks the connection and detects the OS."
        action={<Button onClick={() => actions.addServer()}>Add server</Button>}
      />
    )
  }
  if (narrowed) {
    return (
      <Empty
        icon={<SearchX />}
        title="No servers match"
        text={
          filters.q
            ? `Nothing matches “${filters.q}” with the current filters.`
            : "No server matches the current filters."
        }
        action={
          <Button variant="outline" onClick={clearFilters}>
            Clear search and filters
          </Button>
        }
      />
    )
  }
  if (filters.favorites) {
    return (
      <Empty
        icon={<Star />}
        title="No favorites yet"
        text="Star the servers you open most to keep them one tap away."
        action={
          <Button
            variant="outline"
            onClick={() => setFilters({ favorites: null })}
          >
            Show all servers
          </Button>
        }
      />
    )
  }
  if (!filters.folder) {
    return (
      <Empty
        icon={<Server />}
        title="No servers here"
        text="Servers you add show up in this list."
        action={
          addServer && (
            <Button onClick={() => actions.addServer()}>Add server</Button>
          )
        }
      />
    )
  }
  const folderId = filters.folder !== "none" ? filters.folder : null
  return (
    <Empty
      icon={<FolderOpen />}
      title={
        filters.folder === "none"
          ? "Every server is in a folder"
          : "This folder is empty"
      }
      text={
        filters.folder === "none"
          ? "Servers outside every folder show up here."
          : addServer
            ? "Add a server here, or move existing ones in from the list."
            : "Servers moved into this folder show up here."
      }
      action={
        addServer &&
        folderId && (
          <Button onClick={() => actions.addServer(folderId)}>
            Add server here
          </Button>
        )
      }
    />
  )
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry: () => void
}) {
  return (
    <Empty
      icon={<CloudOff />}
      title="Couldn't load servers"
      text={
        error?.message ||
        "The server didn't answer. Check your connection and try again."
      }
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center md:py-20">
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="text-body font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
