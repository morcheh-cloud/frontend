"use client"

import { ChevronLeft, Database as DatabaseIcon, Lightbulb } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import type { Database } from "@/lib/services"
import { useCreateDatabase, useDatabase, useUpdateDatabase } from "../api"
import { useDatabaseActions } from "./database-actions"
import { DatabaseForm, type DatabaseFormSubmit } from "./database-form"
import { DeployEditor } from "./deploy/deploy-editor"
import { EngineTile, editDatabaseHref, useAddDatabaseParams } from "./meta"
import { SourcePicker } from "./source-picker"

const FORM_ID = "database-form"

// /databases/new: connect to a database that runs, or start a new one in a
// container (?source=container). ?server= picks a server to start with.
export function NewDatabase() {
  const phone = useIsPhone()
  const [params, setParams] = useAddDatabaseParams()
  usePageCrumbs([{ href: "/databases/new", label: "Add database" }])
  if (phone === null) return null

  const picker = (
    <SourcePicker
      value={params.source}
      onChange={(source) => setParams({ source })}
      phone={phone}
    />
  )
  if (params.source === "container") {
    return (
      <DeployEditor
        phone={phone}
        lead={picker}
        serverId={params.server || undefined}
        engine={params.engine || undefined}
      />
    )
  }
  return (
    <ConnectEditor
      phone={phone}
      lead={picker}
      serverId={params.server || undefined}
    />
  )
}

export function EditDatabaseFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <EditDatabase id={id} />
}

function EditDatabase({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useDatabase(id)
  const d = query.data
  usePageCrumbs(
    d
      ? [
          { href: `/databases/${id}`, label: d.name },
          { href: editDatabaseHref(id), label: "Edit" },
        ]
      : [],
  )
  if (phone === null) return null
  if (query.isPending) return <Loading phone={phone} />
  if (!d) {
    return (
      <div className="p-6">
        <Empty
          icon={DatabaseIcon}
          title="Database not found"
          body={
            query.error?.message ??
            "It was removed, or you no longer have access to it."
          }
          action={
            <Button
              variant="outline"
              render={<Link href="/databases" />}
              nativeButton={false}
            >
              All databases
            </Button>
          }
        />
      </div>
    )
  }
  return <ConnectEditor key={d.id} phone={phone} database={d} />
}

function ConnectEditor({
  database,
  serverId,
  phone,
  lead,
}: {
  database?: Database
  serverId?: string
  phone: boolean
  // The "Start from" choice on a new database.
  lead?: ReactNode
}) {
  const router = useRouter()
  const actions = useDatabaseActions()
  const create = useCreateDatabase()
  const update = useUpdateDatabase()
  const saving = create.isPending || update.isPending
  const home = database ? `/databases/${database.id}` : "/databases"
  const back = useBack(home)

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
            router.replace(`/databases/${saved.id}`)
            // A new password doesn't change the flags; check for it too.
            if (
              connectionChanged(database, saved) ||
              body.password ||
              body.clear_password
            ) {
              actions.check(saved)
            }
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
          router.replace(`/databases/${saved.id}`)
          actions.check(saved)
        },
        onError,
      })
    }
  }

  const save = () =>
    (
      document.getElementById(FORM_ID) as HTMLFormElement | null
    )?.requestSubmit()
  const submitLabel = saving
    ? "Saving…"
    : database
      ? "Save"
      : phone
        ? "Add"
        : "Add database"

  return (
    <DatabaseForm
      formId={FORM_ID}
      database={database}
      serverId={serverId}
      onSubmit={submit}
      phone={phone}
    >
      {(f) => {
        const off = saving || (!!database && !f.dirty)
        if (phone) {
          return (
            <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
              <DirtyGuard dirty={f.dirty && !saving} />
              <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Back"
                  onClick={back}
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <h1 className="min-w-0 flex-1 truncate text-body font-medium">
                  {database ? `Edit ${database.name}` : "Add database"}
                </h1>
                <Button
                  type="submit"
                  variant="ghost"
                  className="h-11 px-3 text-brand"
                  disabled={off}
                >
                  {submitLabel}
                </Button>
              </header>
              <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                {lead}
                {f.connection}
                {f.auth}
                <div className="flex flex-col gap-3 border-b border-border p-4">
                  {f.testButton}
                  {f.testResult}
                </div>
                {f.options}
              </div>
            </div>
          )
        }
        return (
          <>
            <DirtyGuard dirty={f.dirty && !saving} />
            <EditorPage
              icon={
                <EngineTile
                  engine={f.engine}
                  flavor={f.flavor}
                  className="size-9 rounded-lg"
                />
              }
              title={database ? `Edit ${database.name}` : "Add database"}
              dirty={f.dirty}
              status={
                f.dirty
                  ? "Unsaved changes"
                  : database
                    ? `Saved ${timeAgo(database.updated_at)}`
                    : "Not saved yet"
              }
              onSave={off ? undefined : save}
              actions={
                <>
                  <span className="[&_button]:h-9">{f.testButton}</span>
                  <Button
                    variant="outline"
                    className="h-9"
                    render={<Link href={home} />}
                    nativeButton={false}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="h-9" disabled={off}>
                    {submitLabel}
                  </Button>
                </>
              }
              aside={
                <>
                  <AsideCard title="Summary">
                    <SummaryList rows={f.summary} />
                  </AsideCard>
                  {f.testResult ? (
                    <AsideCard title="Connection test">
                      {f.testResult}
                    </AsideCard>
                  ) : (
                    <AsideCard title="Tip">
                      <p className="flex gap-2 text-caption text-muted-foreground">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-ash" />
                        <span>
                          Test the connection before saving: Morche walks every
                          step (server, tunnel, sign-in, permissions) and says
                          which one fails.
                        </span>
                      </p>
                    </AsideCard>
                  )}
                </>
              }
            >
              {lead}
              {f.connection}
              {f.auth}
              {f.options}
            </EditorPage>
          </>
        )
      }}
    </DatabaseForm>
  )
}

// Asks before the tab closes or reloads with unsaved changes.
export function DirtyGuard({ dirty }: { dirty: boolean }) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  return null
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

export function Loading({ phone }: { phone: boolean }) {
  if (!phone) return <EditorLoading />
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
