"use client"

import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { Database } from "@/lib/services"
import {
  useCheckDatabase,
  useDeleteDatabase,
  useSetDatabaseFavorite,
  useSetDatabasePaused,
} from "../api"
import { DatabaseCredentialsLayer } from "./credentials"
import {
  type AddSource,
  editDatabaseHref,
  endpointLabel,
  newDatabaseHref,
  statusMeta,
} from "./meta"

type Actions = {
  // Adding and editing are pages: /databases/new and /databases/[id]/edit.
  addDatabase: (options?: { serverId?: string; source?: AddSource }) => void
  editDatabase: (database: Database) => void
  check: (database: Pick<Database, "id" | "name">) => void
  toggleFavorite: (database: Database) => void
  togglePaused: (database: Database) => void
  copyAddress: (database: Database) => void
  showCredentials: (database: Database) => void
  deleteDatabase: (database: Database, done?: () => void) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useDatabaseActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx)
    throw new Error("useDatabaseActions outside DatabaseActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Owns every dialog and sheet of the database pages (the list, a database's
// dashboard, a server's Databases tab), so they all run the same flows.
export function DatabaseActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useOpen("database-delete")
  const [toDelete, setToDelete] = useState<{
    database?: Database
    done?: () => void
  }>({})
  const [credsOpen, setCredsOpen] = useOpen("database-credentials")
  const [credsDatabase, setCredsDatabase] = useState<Database | null>(null)

  const checkMutation = useCheckDatabase()
  const favorite = useSetDatabaseFavorite()
  const paused = useSetDatabasePaused()
  const remove = useDeleteDatabase()

  function check(database: Pick<Database, "id" | "name">) {
    checkMutation.mutate(
      { id: database.id, name: database.name },
      { onSuccess: reportCheck, onError: errorToast },
    )
  }

  const actions: Actions = {
    addDatabase: (options) =>
      router.push(
        newDatabaseHref({ server: options?.serverId, source: options?.source }),
      ),
    editDatabase: (database) => router.push(editDatabaseHref(database.id)),
    check,
    toggleFavorite: (database) =>
      favorite.mutate(
        { id: database.id, on: !database.favorite },
        { onError: errorToast },
      ),
    togglePaused: (database) =>
      paused.mutate(
        { id: database.id, on: !database.paused },
        {
          onSuccess: (d) =>
            toast.success(
              d.paused ? `Paused ${d.name}` : `Watching ${d.name} again`,
              {
                description: d.paused
                  ? "No checks or alerts until you resume it."
                  : undefined,
              },
            ),
          onError: errorToast,
        },
      ),
    copyAddress: async (database) => {
      const address = endpointLabel(database)
      try {
        await navigator.clipboard.writeText(address)
        toast.success("Address copied", { description: address })
      } catch {
        toast.error("Couldn't access the clipboard")
      }
    },
    showCredentials: (database) => {
      setCredsDatabase(database)
      setCredsOpen(true)
    },
    deleteDatabase: (database, done) => {
      setToDelete({ database, done })
      setDeleteOpen(true)
    },
  }

  // "Add database" from the command palette, on any page.
  useIntent("add-database", () => actions.addDatabase())

  return (
    <ActionsContext value={actions}>
      {children}

      <DatabaseCredentialsLayer
        open={credsOpen}
        onOpenChange={setCredsOpen}
        database={credsDatabase}
        onEdit={() => {
          const database = credsDatabase
          if (!database) return
          // Close first, or the layer's Back would undo the navigation.
          window.addEventListener(
            "popstate",
            () => actions.editDatabase(database),
            { once: true },
          )
          setCredsOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Remove “${toDelete.database?.name}”?`}
        description="Morche stops watching it and forgets the connection, its history and stored password. Nothing in the database itself changes."
        confirmLabel="Remove database"
        pending={remove.isPending}
        onConfirm={() =>
          toDelete.database &&
          remove.mutate(toDelete.database.id, {
            onSuccess: () => {
              // `done` may navigate away; wait for the dialog's history entry
              // to pop first, or the pop would undo the navigation.
              const done = toDelete.done
              if (done) {
                window.addEventListener("popstate", done, { once: true })
              }
              setDeleteOpen(false)
              toast.success("Database removed")
            },
            onError: errorToast,
          })
        }
      />
    </ActionsContext>
  )
}

export function reportCheck(d: Database) {
  if (d.status === "online") {
    toast.success(`${d.name} is online`, {
      description: [d.version, d.latency_ms != null && `${d.latency_ms} ms`]
        .filter(Boolean)
        .join(" · "),
    })
  } else {
    toast.error(`${d.name}: ${statusMeta[d.status].label.toLowerCase()}`, {
      description: d.status_message || statusMeta[d.status].hint,
    })
  }
}
