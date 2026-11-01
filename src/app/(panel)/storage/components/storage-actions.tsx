"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { statusMeta } from "@/app/(panel)/servers/components/meta"
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
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { Storage } from "@/lib/services"
import {
  useCheckStorage,
  useCreateStorage,
  useDeleteStorage,
  useSetStorageFavorite,
  useUpdateStorage,
} from "../api"
import { endpointUrl } from "./meta"
import {
  connectionChanged,
  StorageForm,
  type StorageFormSubmit,
} from "./storage-form"

type Actions = {
  addStorage: () => void
  editStorage: (storage: Storage) => void
  check: (storage: Pick<Storage, "id" | "name">) => void
  trustHostKey: (storage: Storage) => void
  toggleFavorite: (storage: Storage) => void
  copyEndpoint: (storage: Storage) => void
  deleteStorage: (storage: Storage, done?: () => void) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useStorageActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useStorageActions outside StorageActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Owns every dialog and sheet of the storage pages, so the list and a
// storage's own page trigger the same flows.
export function StorageActionsProvider({ children }: { children: ReactNode }) {
  const [formOpen, setFormOpen] = useOpen("storage-form")
  const [formStorage, setFormStorage] = useState<Storage | undefined>()
  const [formKey, setFormKey] = useState(0)
  const [deleteOpen, setDeleteOpen] = useOpen("storage-delete")
  const [toDelete, setToDelete] = useState<{
    storage?: Storage
    done?: () => void
  }>({})
  const [trustOpen, setTrustOpen] = useOpen("storage-host-key")
  const [toTrust, setToTrust] = useState<Storage | null>(null)

  const checkMutation = useCheckStorage()
  const favorite = useSetStorageFavorite()
  const remove = useDeleteStorage()

  function check(storage: Pick<Storage, "id" | "name">, trust = false) {
    checkMutation.mutate(
      { id: storage.id, trust },
      { onSuccess: (s) => reportCheck(s, trustHostKey), onError: errorToast },
    )
  }

  function trustHostKey(storage: Storage) {
    setToTrust(storage)
    setTrustOpen(true)
  }

  const actions: Actions = {
    addStorage: () => {
      setFormStorage(undefined)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    editStorage: (storage) => {
      setFormStorage(storage)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    check,
    trustHostKey,
    toggleFavorite: (storage) =>
      favorite.mutate(
        { id: storage.id, favorite: !storage.favorite },
        { onError: errorToast },
      ),
    copyEndpoint: async (storage) => {
      try {
        await navigator.clipboard.writeText(endpointUrl(storage))
        toast.success("Address copied", { description: endpointUrl(storage) })
      } catch {
        toast.error("Couldn't access the clipboard")
      }
    },
    deleteStorage: (storage, done) => {
      setToDelete({ storage, done })
      setDeleteOpen(true)
    },
  }

  return (
    <ActionsContext value={actions}>
      {children}

      <StorageFormLayer
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        storage={formStorage}
        onSaved={(saved, recheck) => {
          setFormOpen(false)
          if (recheck) check(saved)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Remove “${toDelete.storage?.name}”?`}
        description="Morcheh forgets the connection and its stored credentials. Nothing on the storage itself is deleted."
        confirmLabel="Remove storage"
        pending={remove.isPending}
        onConfirm={() =>
          toDelete.storage &&
          remove.mutate(toDelete.storage.id, {
            onSuccess: () => {
              // `done` may navigate away; wait for the dialog's history entry
              // to pop first, or the pop would undo the navigation.
              const done = toDelete.done
              if (done) {
                window.addEventListener("popstate", done, { once: true })
              }
              setDeleteOpen(false)
              toast.success("Storage removed")
            },
            onError: errorToast,
          })
        }
      />

      <ConfirmDialog
        open={trustOpen}
        onOpenChange={setTrustOpen}
        title="Trust the new host key?"
        destructive={false}
        description={
          <>
            <p>
              The key {toTrust?.name} presents changed since it was first
              trusted. That's expected after a reinstall or a new IP; otherwise
              it can mean someone is intercepting the connection.
            </p>
            <p className="mt-2">Only continue if you know why it changed.</p>
          </>
        }
        confirmLabel="Trust and reconnect"
        pending={checkMutation.isPending}
        onConfirm={() => {
          if (toTrust) check(toTrust, true)
          setTrustOpen(false)
        }}
      />
    </ActionsContext>
  )
}

function reportCheck(s: Storage, trust: (s: Storage) => void) {
  if (s.status === "online") {
    toast.success(`${s.name} is online`, {
      description: [s.detail, s.latency_ms != null && `${s.latency_ms} ms`]
        .filter(Boolean)
        .join(" · "),
    })
  } else if (s.status === "host_key_mismatch") {
    toast.error(`${s.name}: host key changed`, {
      description: s.status_message,
      action: { label: "Review", onClick: () => trust(s) },
    })
  } else {
    toast.error(`${s.name}: ${statusMeta[s.status].label.toLowerCase()}`, {
      description: s.status_message,
    })
  }
}

const FORM_ID = "storage-form"

function StorageFormLayer({
  open,
  onOpenChange,
  storage,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage?: Storage
  onSaved: (storage: Storage, recheck: boolean) => void
}) {
  const isMobile = useIsMobile()
  const create = useCreateStorage()
  const update = useUpdateStorage()
  const pending = create.isPending || update.isPending
  const title = storage ? `Edit ${storage.name}` : "Add storage"

  function submit({ values, body, setErrors }: StorageFormSubmit) {
    const onError = (error: Error) => {
      const fields = fieldErrors(error)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(error.message)
    }
    if (storage) {
      update.mutate(
        { id: storage.id, body },
        {
          onSuccess: (saved) => {
            toast.success("Changes saved")
            onSaved(saved, connectionChanged(storage, values))
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
              {storage ? "Save" : "Add"}
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        <StorageForm
          formId={FORM_ID}
          storage={storage}
          onSubmit={submit}
          className="flex flex-col gap-8"
        >
          {(f) => (
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
          )}
        </StorageForm>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            S3, FTP, SFTP or WebDAV. Credentials are stored encrypted.
          </SheetDescription>
        </SheetHeader>
        <StorageForm
          formId={FORM_ID}
          storage={storage}
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col"
        >
          {(f) => (
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
                {f.testResult}
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
                    {storage ? "Save" : "Add storage"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </StorageForm>
      </SheetContent>
    </Sheet>
  )
}
