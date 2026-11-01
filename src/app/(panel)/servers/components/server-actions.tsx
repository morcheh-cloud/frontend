"use client"

import { useIsMutating } from "@tanstack/react-query"
import { FolderInput, FolderMinus } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
import { ApiError, fieldErrors } from "@/lib/api"
import type { Folder, Server } from "@/lib/services"
import {
  saveFolderKey,
  useCheckServer,
  useCreateServer,
  useDeleteFolder,
  useDeleteServers,
  useDuplicateServer,
  useFolders,
  useMoveServers,
  useSaveFolder,
  useSetFavorite,
  useTagServers,
  useUpdateServer,
} from "../api"
import { CredentialsLayer } from "./credentials"
import { Field, FolderSelect, TagInput } from "./fields"
import { buildTree, flatten, subtreeIds } from "./folder-tree"
import { osLabel, sshCommand, statusMeta } from "./meta"
import {
  connectionChanged,
  ServerForm,
  type ServerFormDefaults,
  type ServerFormSubmit,
} from "./server-form"

type FolderDraft = { folder?: Folder; parentId: string | null }

type Actions = {
  addServer: (folderId?: string | null) => void
  editServer: (server: Server) => void
  check: (server: Pick<Server, "id" | "name">) => void
  trustHostKey: (server: Server) => void
  copySsh: (server: Server) => void
  showCredentials: (server: Server) => void
  duplicate: (server: Server) => void
  toggleFavorite: (server: Server) => void
  deleteServers: (
    servers: Pick<Server, "id" | "name">[],
    done?: () => void,
  ) => void
  moveServers: (ids: string[], done?: () => void) => void
  tagServers: (servers: Server[], done?: () => void) => void
  newFolder: (parentId?: string | null) => void
  editFolder: (folder: Folder) => void
  deleteFolder: (folder: Folder) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useServerActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useServerActions outside ServerActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Owns every dialog and sheet of the servers page, so the desktop table, the
// phone list and the folder rail all trigger the same flows.
export function ServerActionsProvider({ children }: { children: ReactNode }) {
  // Server form
  const [formOpen, setFormOpen] = useOpen("server-form")
  const [formServer, setFormServer] = useState<Server | undefined>()
  const [formFolder, setFormFolder] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  // Folder form
  const [folderOpen, setFolderOpen] = useOpen("folder-form")
  const [folderDraft, setFolderDraft] = useState<FolderDraft>({
    parentId: null,
  })

  // Confirmations and pickers
  const [deleteOpen, setDeleteOpen] = useOpen("servers-delete")
  const [toDelete, setToDelete] = useState<{
    servers: Pick<Server, "id" | "name">[]
    done?: () => void
  }>({ servers: [] })
  const [folderDeleteOpen, setFolderDeleteOpen] = useOpen("folder-delete")
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const [trustOpen, setTrustOpen] = useOpen("host-key-trust")
  const [toTrust, setToTrust] = useState<Server | null>(null)
  const [moveOpen, setMoveOpen] = useOpen("servers-move")
  const [toMove, setToMove] = useState<{ ids: string[]; done?: () => void }>({
    ids: [],
  })
  const [credsOpen, setCredsOpen] = useOpen("server-credentials")
  const [credsServer, setCredsServer] = useState<Server | null>(null)
  const [tagsOpen, setTagsOpen] = useOpen("servers-tags")
  const [toTag, setToTag] = useState<{ servers: Server[]; done?: () => void }>({
    servers: [],
  })

  const checkMutation = useCheckServer()
  const favorite = useSetFavorite()
  const duplicateMutation = useDuplicateServer()
  const deleteMutation = useDeleteServers()
  const deleteFolderMutation = useDeleteFolder()

  function check(server: Pick<Server, "id" | "name">, trust = false) {
    checkMutation.mutate(
      { id: server.id, trust },
      {
        onSuccess: (s) => reportCheck(s, trustHostKey),
        onError: errorToast,
      },
    )
  }

  function trustHostKey(server: Server) {
    setToTrust(server)
    setTrustOpen(true)
  }

  const actions: Actions = {
    addServer: (folderId = null) => {
      setFormServer(undefined)
      setFormFolder(folderId)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    editServer: (server) => {
      setFormServer(server)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    check,
    trustHostKey,
    copySsh: async (server) => {
      try {
        await navigator.clipboard.writeText(sshCommand(server))
        toast.success("SSH command copied", { description: sshCommand(server) })
      } catch {
        toast.error("Couldn't access the clipboard")
      }
    },
    showCredentials: (server) => {
      setCredsServer(server)
      setCredsOpen(true)
    },
    duplicate: (server) =>
      duplicateMutation.mutate(server.id, {
        onSuccess: (copy) =>
          toast.success(`Created “${copy.name}”`, {
            action: { label: "Edit", onClick: () => actions.editServer(copy) },
          }),
        onError: errorToast,
      }),
    toggleFavorite: (server) =>
      favorite.mutate(
        { id: server.id, favorite: !server.favorite },
        { onError: errorToast },
      ),
    deleteServers: (servers, done) => {
      setToDelete({ servers, done })
      setDeleteOpen(true)
    },
    moveServers: (ids, done) => {
      setToMove({ ids, done })
      setMoveOpen(true)
    },
    tagServers: (servers, done) => {
      setToTag({ servers, done })
      setTagsOpen(true)
    },
    newFolder: (parentId = null) => {
      setFolderDraft({ parentId })
      setFolderOpen(true)
    },
    editFolder: (folder) => {
      setFolderDraft({ folder, parentId: folder.parent_id })
      setFolderOpen(true)
    },
    deleteFolder: (folder) => {
      setFolderToDelete(folder)
      setFolderDeleteOpen(true)
    },
  }

  const deleteCount = toDelete.servers.length

  return (
    <ActionsContext.Provider value={actions}>
      {children}

      <ServerFormLayer
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        server={formServer}
        defaultFolderId={formFolder}
        onSaved={(saved, recheck, keepOpen) => {
          if (!keepOpen) setFormOpen(false)
          if (recheck) check(saved)
        }}
      />

      <FolderFormLayer
        open={folderOpen}
        onOpenChange={setFolderOpen}
        draft={folderDraft}
      />

      <MoveLayer
        open={moveOpen}
        onOpenChange={setMoveOpen}
        ids={toMove.ids}
        onMoved={() => {
          setMoveOpen(false)
          toMove.done?.()
        }}
      />

      <TagsLayer
        open={tagsOpen}
        onOpenChange={setTagsOpen}
        servers={toTag.servers}
        onDone={() => {
          setTagsOpen(false)
          toTag.done?.()
        }}
      />

      <CredentialsLayer
        open={credsOpen}
        onOpenChange={setCredsOpen}
        server={credsServer}
        onEdit={() => {
          const server = credsServer
          if (!server) return
          // Close first so the form gets its own Back entry.
          window.addEventListener(
            "popstate",
            () => actions.editServer(server),
            { once: true },
          )
          setCredsOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={
          deleteCount === 1
            ? `Delete “${toDelete.servers[0]?.name}”?`
            : `Delete ${deleteCount} servers?`
        }
        description="Morcheh forgets the connection details and stored credentials. Nothing on the server itself is touched."
        confirmLabel={
          deleteCount === 1 ? "Delete server" : `Delete ${deleteCount} servers`
        }
        pending={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(
            toDelete.servers.map((s) => s.id),
            {
              onSuccess: ({ affected }) => {
                // `done` may navigate away; wait for the dialog's history
                // entry to pop first, or the pop would undo the navigation.
                const done = toDelete.done
                if (done) {
                  window.addEventListener("popstate", done, { once: true })
                }
                setDeleteOpen(false)
                toast.success(
                  affected === 1
                    ? "Server deleted"
                    : `${affected} servers deleted`,
                )
              },
              onError: errorToast,
            },
          )
        }
      />

      <ConfirmDialog
        open={folderDeleteOpen}
        onOpenChange={setFolderDeleteOpen}
        title={`Delete folder “${folderToDelete?.name}”?`}
        description="Its servers and subfolders move up one level. No server is deleted."
        confirmLabel="Delete folder"
        pending={deleteFolderMutation.isPending}
        onConfirm={() =>
          folderToDelete &&
          deleteFolderMutation.mutate(folderToDelete.id, {
            onSuccess: () => {
              setFolderDeleteOpen(false)
              toast.success("Folder deleted")
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
    </ActionsContext.Provider>
  )
}

function reportCheck(s: Server, trust: (s: Server) => void) {
  if (s.status === "online") {
    toast.success(`${s.name} is online`, {
      description: [osLabel(s.os), s.latency_ms != null && `${s.latency_ms} ms`]
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

const FORM_ID = "server-form"

function ServerFormLayer({
  open,
  onOpenChange,
  server,
  defaultFolderId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server?: Server
  defaultFolderId: string | null
  onSaved: (server: Server, recheck: boolean, keepOpen: boolean) => void
}) {
  const isMobile = useIsMobile()
  const create = useCreateServer()
  const update = useUpdateServer()
  const pending = create.isPending || update.isPending
  const title = server ? `Edit ${server.name}` : "Add server"
  // "Add another": after a save the form starts over, keeping folder and tags
  // so a batch of servers lands in the same place.
  const [addAnother, setAddAnother] = useState(false)
  const [round, setRound] = useState(0)
  const [defaults, setDefaults] = useState<Partial<ServerFormDefaults>>({
    folder_id: defaultFolderId,
  })

  function submit({ values, body, setErrors }: ServerFormSubmit) {
    const onError = (error: Error) => {
      const fields = fieldErrors(error)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(error.message)
    }
    if (server) {
      update.mutate(
        { id: server.id, body },
        {
          onSuccess: (saved) => {
            toast.success("Changes saved")
            onSaved(saved, connectionChanged(server, values), false)
          },
          onError,
        },
      )
    } else {
      const again = addAnother && !isMobile
      create.mutate(body, {
        onSuccess: (saved) => {
          toast.success(`Added ${saved.name}`, {
            description: "Connecting to detect its OS…",
          })
          if (again) {
            setDefaults({ folder_id: values.folder_id, tags: values.tags })
            setRound((r) => r + 1)
          }
          onSaved(saved, true, again)
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
              {server ? "Save" : "Add"}
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        <ServerForm
          formId={FORM_ID}
          server={server}
          defaults={defaults}
          onSubmit={submit}
          className="flex flex-col gap-8"
        >
          {(f) => (
            <>
              {f.connection}
              <div className="flex flex-col gap-4">
                {f.auth}
                {f.testButton}
                {f.testResult}
              </div>
              {f.organize}
            </>
          )}
        </ServerForm>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            Connects over SSH. Credentials are stored encrypted.
          </SheetDescription>
        </SheetHeader>
        <ServerForm
          key={round}
          formId={FORM_ID}
          server={server}
          defaults={defaults}
          focusName={round > 0}
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col"
        >
          {(f) => (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
                {f.connection}
                <Separator />
                {f.auth}
                <Separator />
                {f.organize}
              </div>
              <div className="flex flex-col gap-3 border-t border-border px-6 py-4">
                {f.testResult}
                <div className="flex items-center gap-2">
                  {f.testButton}
                  <span className="flex-1" />
                  {!server && (
                    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control
                    <label className="me-2 flex cursor-pointer items-center gap-2 text-body-sm text-muted-foreground select-none">
                      <Checkbox
                        checked={addAnother}
                        onCheckedChange={setAddAnother}
                      />
                      Add another
                    </label>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {server ? "Save" : "Add server"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </ServerForm>
      </SheetContent>
    </Sheet>
  )
}

function FolderFormLayer({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: FolderDraft
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={draft.folder ? "Edit folder" : "New folder"}
      footer={<FolderFormButtons onCancel={() => onOpenChange(false)} />}
    >
      {/* Remount per draft so the inputs start from it. */}
      <FolderForm
        key={`${draft.folder?.id ?? "new"}-${draft.parentId}-${open}`}
        draft={draft}
        onSaved={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  )
}

const FOLDER_FORM_ID = "folder-form"

function FolderFormButtons({ onCancel }: { onCancel: () => void }) {
  const saving = useIsMutating({ mutationKey: saveFolderKey }) > 0
  return (
    <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
      <Button variant="outline" className="max-md:h-11" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={FOLDER_FORM_ID}
        className="max-md:h-11"
        disabled={saving}
      >
        Save
      </Button>
    </div>
  )
}

function FolderForm({
  draft,
  onSaved,
}: {
  draft: FolderDraft
  onSaved: () => void
}) {
  const [name, setName] = useState(draft.folder?.name ?? "")
  const [parentId, setParentId] = useState(draft.parentId)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const folders = useFolders()
  const save = useSaveFolder()
  const { roots, nodes } = buildTree(folders.data ?? [])
  const self = draft.folder ? nodes.get(draft.folder.id) : undefined
  const skip = self ? subtreeIds(self) : undefined

  return (
    <form
      id={FOLDER_FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setErrors({ name: "Name the folder" })
          return
        }
        save.mutate(
          {
            id: draft.folder?.id,
            body: { name: name.trim(), parent_id: parentId },
          },
          {
            onSuccess: (f) => {
              toast.success(
                draft.folder ? "Folder saved" : `Created “${f.name}”`,
              )
              onSaved()
            },
            onError: (error) => {
              const fields = fieldErrors(error)
              if (Object.keys(fields).length) setErrors(fields)
              else toast.error(error.message)
            },
          },
        )
      }}
    >
      <Field label="Name" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            value={name}
            maxLength={64}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => {
              setName(e.target.value)
              setErrors({})
            }}
            placeholder="Production"
          />
        )}
      </Field>
      <Field label="Inside" error={errors.parent_id}>
        {(p) => (
          <FolderSelect
            id={p.id}
            roots={roots}
            value={parentId}
            onChange={(v) => {
              setParentId(v)
              setErrors({})
            }}
            skip={skip}
            rootLabel="Top level"
          />
        )}
      </Field>
    </form>
  )
}

// Move to a folder. Phones get a tappable list (one tap moves); desktop a
// picker and a button.
function MoveLayer({
  open,
  onOpenChange,
  ids,
  onMoved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  onMoved: () => void
}) {
  const isMobile = useIsMobile()
  const folders = useFolders()
  const move = useMoveServers()
  const { roots } = buildTree(folders.data ?? [])
  const [target, setTarget] = useState<string | null>(null)
  const title = ids.length === 1 ? "Move server" : `Move ${ids.length} servers`

  function moveTo(folderId: string | null) {
    move.mutate(
      { ids, folderId },
      {
        onSuccess: () => {
          toast.success(folderId ? "Moved" : "Removed from folder")
          onMoved()
        },
        onError: errorToast,
      },
    )
  }

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
        <div className="divide-y divide-border">
          <SheetAction
            icon={<FolderMinus />}
            label="No folder"
            disabled={move.isPending}
            onClick={() => moveTo(null)}
          />
          {flatten(roots).map((f) => (
            <div
              key={f.id}
              style={{ paddingInlineStart: `${f.depth * 1.25}rem` }}
            >
              <SheetAction
                icon={<FolderInput />}
                label={f.name}
                disabled={move.isPending}
                onClick={() => moveTo(f.id)}
              />
            </div>
          ))}
        </div>
      </BottomSheet>
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={move.isPending} onClick={() => moveTo(target)}>
            Move
          </Button>
        </>
      }
    >
      <FolderSelect roots={roots} value={target} onChange={setTarget} />
    </ResponsiveDialog>
  )
}

function TagsLayer({
  open,
  onOpenChange,
  servers,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  servers: Server[]
  onDone: () => void
}) {
  const [add, setAdd] = useState<string[]>([])
  const [remove, setRemove] = useState<string[]>([])
  const tagServers = useTagServers()
  const present = [...new Set(servers.flatMap((s) => s.tags))].sort()
  const nothing = !add.length && !remove.length

  function reset(next: boolean) {
    if (!next) {
      setAdd([])
      setRemove([])
    }
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={reset}
      title={
        servers.length === 1 ? "Edit tags" : `Tag ${servers.length} servers`
      }
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => reset(false)}
          >
            Cancel
          </Button>
          <Button
            className="max-md:h-11"
            disabled={nothing || tagServers.isPending}
            onClick={() =>
              tagServers.mutate(
                { ids: servers.map((s) => s.id), add, remove },
                {
                  onSuccess: () => {
                    toast.success("Tags updated")
                    setAdd([])
                    setRemove([])
                    onDone()
                  },
                  onError: (error) =>
                    toast.error(
                      error instanceof ApiError
                        ? error.message
                        : "Couldn't update tags",
                    ),
                },
              )
            }
          >
            Apply
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Add tags">
          {(p) => <TagInput id={p.id} value={add} onChange={setAdd} />}
        </Field>
        {present.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium">Remove tags</span>
            <div className="flex flex-wrap gap-1.5">
              {present.map((tag) => {
                const on = remove.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setRemove(
                        on ? remove.filter((t) => t !== tag) : [...remove, tag],
                      )
                    }
                    className={
                      on
                        ? "inline-flex h-8 items-center rounded-full bg-destructive/10 px-3 text-body-sm text-destructive line-through"
                        : "inline-flex h-8 items-center rounded-full bg-muted px-3 text-body-sm hover:bg-mist"
                    }
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}
