"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { Database } from "@/lib/services"
import {
  useCheckDatabase,
  useCreateDatabase,
  useDeleteDatabase,
  useSetDatabaseFavorite,
  useSetDatabasePaused,
  useUpdateDatabase,
} from "../api"
import { DatabaseCredentialsLayer } from "./credentials"
import { DatabaseForm, type DatabaseFormSubmit } from "./database-form"
import { endpointLabel, statusMeta } from "./meta"

type Actions = {
  addDatabase: (options?: { serverId?: string }) => void
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
  const [formOpen, setFormOpen] = useOpen("database-form")
  const [form, setForm] = useState<{ database?: Database; serverId?: string }>(
    {},
  )
  const [formKey, setFormKey] = useState(0)
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
    addDatabase: (options) => {
      setForm({ serverId: options?.serverId })
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    editDatabase: (database) => {
      setForm({ database })
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
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

      <DatabaseFormLayer
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        database={form.database}
        serverId={form.serverId}
        onSaved={(saved, recheck) => {
          setFormOpen(false)
          if (recheck) check(saved)
        }}
      />

      <DatabaseCredentialsLayer
        open={credsOpen}
        onOpenChange={setCredsOpen}
        database={credsDatabase}
        onEdit={() => {
          const database = credsDatabase
          if (!database) return
          // Close first so the form gets its own Back entry.
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

function reportCheck(d: Database) {
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

// Whether a save changes how Morche connects, so it should be re-checked.
function connectionChanged(d: Database, saved: Database) {
  return (
    d.engine !== saved.engine ||
    d.mode !== saved.mode ||
    d.server_id !== saved.server_id ||
    d.container !== saved.container ||
    d.host !== saved.host ||
    d.port !== saved.port ||
    d.username !== saved.username ||
    d.has_password !== saved.has_password ||
    d.dbname !== saved.dbname ||
    d.tls !== saved.tls ||
    d.ca_cert !== saved.ca_cert ||
    d.allow_internal !== saved.allow_internal
  )
}

const FORM_ID = "database-form"

function DatabaseFormLayer({
  open,
  onOpenChange,
  database,
  serverId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  database?: Database
  serverId?: string
  onSaved: (database: Database, recheck: boolean) => void
}) {
  const isMobile = useIsMobile()
  const create = useCreateDatabase()
  const update = useUpdateDatabase()
  const pending = create.isPending || update.isPending
  const title = database ? `Edit ${database.name}` : "Add database"

  function submit({ body, setErrors }: DatabaseFormSubmit) {
    const onError = (error: Error) => {
      const fields = fieldErrors(error)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(error.message)
    }
    if (database) {
      update.mutate(
        { id: database.id, body },
        {
          onSuccess: (saved) => {
            toast.success("Changes saved")
            // A new password doesn't change the flags; send it to check too.
            onSaved(
              saved,
              connectionChanged(database, saved) ||
                !!body.password ||
                !!body.clear_password,
            )
          },
          onError,
        },
      )
    } else {
      create.mutate(body, {
        onSuccess: (saved) => {
          toast.success(`Added ${saved.name}`, {
            description: "Checking the connection…",
          })
          onSaved(saved, true)
        },
        onError,
      })
    }
  }

  const form = (
    className: string,
    children: Parameters<typeof DatabaseForm>[0]["children"],
  ) => (
    <DatabaseForm
      formId={FORM_ID}
      database={database}
      serverId={serverId}
      onSubmit={submit}
      className={className}
    >
      {children}
    </DatabaseForm>
  )

  if (isMobile) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <span aria-hidden className="truncate text-body font-medium">
              {title}
            </span>
            <Button
              type="submit"
              form={FORM_ID}
              variant="ghost"
              disabled={pending}
              className="h-11 justify-self-end text-body text-brand"
            >
              {database ? "Save" : "Add"}
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {form("flex flex-col gap-8", (f) => (
          <>
            {f.kind}
            {f.connection}
            <div className="flex flex-col gap-4">
              {f.auth}
              {f.testButton}
              {f.testResult}
            </div>
            {f.options}
          </>
        ))}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            PostgreSQL, MySQL/MariaDB, SQL Server, MongoDB or Redis. The
            password is stored encrypted.
          </SheetDescription>
        </SheetHeader>
        {form("flex min-h-0 flex-1 flex-col", (f) => (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
              {f.kind}
              <Separator />
              {f.connection}
              <Separator />
              {f.auth}
              <Separator />
              {f.options}
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-6 py-4">
              {f.testResult && (
                <div className="max-h-56 overflow-y-auto">{f.testResult}</div>
              )}
              <div className="flex items-center gap-2">
                {f.testButton}
                <span className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {database ? "Save" : "Add database"}
                </Button>
              </div>
            </div>
          </>
        ))}
      </SheetContent>
    </Sheet>
  )
}
