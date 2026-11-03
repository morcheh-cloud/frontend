"use client"

import {
  createContext,
  type FormEvent,
  type ReactNode,
  use,
  useId,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { Choice } from "@/components/access/choice"
import { Field } from "@/components/field"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { PanelWorkspace } from "@/lib/services"
import {
  failed,
  useAssignWorkspace,
  useDeleteWorkspace,
  useSaveWorkspace,
} from "../../api"

export type MoveTarget = {
  from: string
  title: string
  server_ids: string[]
  storage_ids: string[]
  app_ids: string[]
}

type WorkspacesActions = {
  add: () => void
  edit: (workspace: PanelWorkspace) => void
  remove: (workspace: PanelWorkspace, onDone?: () => void) => void
  move: (target: MoveTarget) => void
}

const Context = createContext<WorkspacesActions | null>(null)

export function useWorkspacesActions() {
  const value = use(Context)
  if (!value) throw new Error("useWorkspacesActions outside its provider")
  return value
}

export function WorkspacesActionsProvider({
  children,
}: {
  children: ReactNode
}) {
  const remove = useDeleteWorkspace()
  const [formOpen, setFormOpen] = useOpen("workspace-form")
  const [editing, setEditing] = useState<PanelWorkspace>()
  const [formKey, setFormKey] = useState(0)
  const [removeOpen, setRemoveOpen] = useOpen("workspace-remove")
  const [removing, setRemoving] = useState<{
    workspace: PanelWorkspace
    onDone?: () => void
  }>()
  const [moveOpen, setMoveOpen] = useOpen("workspace-move")
  const [moving, setMoving] = useState<MoveTarget>()

  const value = useMemo<WorkspacesActions>(
    () => ({
      add: () => {
        setEditing(undefined)
        setFormKey((k) => k + 1)
        setFormOpen(true)
      },
      edit: (workspace) => {
        setEditing(workspace)
        setFormKey((k) => k + 1)
        setFormOpen(true)
      },
      remove: (workspace, onDone) => {
        setRemoving({ workspace, onDone })
        setRemoveOpen(true)
      },
      move: (target) => {
        setMoving(target)
        setFormKey((k) => k + 1)
        setMoveOpen(true)
      },
    }),
    [setFormOpen, setRemoveOpen, setMoveOpen],
  )

  return (
    <Context value={value}>
      {children}
      <WorkspaceForm
        key={`form-${formKey}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        workspace={editing}
      />
      {moving && (
        <MoveDialog
          key={`move-${formKey}`}
          open={moveOpen}
          onOpenChange={setMoveOpen}
          target={moving}
        />
      )}
      {removing && (
        <ConfirmDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          title={`Delete ${removing.workspace.name}?`}
          description="Everyone's access to it goes with it. A workspace that still holds servers or storage can't be deleted: move them first."
          confirmLabel="Delete"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(removing.workspace.id, {
              onSuccess: () => {
                toast.success("Workspace deleted")
                setRemoveOpen(false)
                removing.onDone?.()
              },
              onError: failed,
            })
          }
        />
      )}
    </Context>
  )
}

function WorkspaceForm({
  open,
  onOpenChange,
  workspace,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace?: PanelWorkspace
}) {
  const save = useSaveWorkspace()
  const formId = useId()
  const [name, setName] = useState(workspace?.name ?? "")
  const [description, setDescription] = useState(workspace?.description ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    save.mutate(
      { id: workspace?.id, name, description },
      {
        onSuccess: () => {
          toast.success(workspace ? "Workspace updated" : "Workspace added")
          onOpenChange(false)
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          setErrors(fields)
          if (Object.keys(fields).length === 0) toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={workspace ? `Edit ${workspace.name}` : "Add workspace"}
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            className="max-md:h-11"
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : workspace ? "Save" : "Add workspace"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name" error={errors.name}>
          {(props) => (
            <Input
              {...props}
              value={name}
              autoComplete="off"
              required
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Description" error={errors.description}>
          {(props) => (
            <Input
              {...props}
              value={description}
              autoComplete="off"
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}

function MoveDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: MoveTarget
}) {
  const { workspaces } = useWorkspace()
  const assign = useAssignWorkspace()
  const [to, setTo] = useState("")
  const items = workspaces
    .filter((w) => w.id !== target.from)
    .map((w) => ({ value: w.id, label: w.name }))
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={target.title}
      description="Access given on the old workspace stops covering it. Access given directly on a server, storage or service stays. Services leave their category."
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="max-md:h-11"
            disabled={!to || assign.isPending}
            onClick={() =>
              assign.mutate(
                {
                  id: to,
                  server_ids: target.server_ids,
                  storage_ids: target.storage_ids,
                  app_ids: target.app_ids,
                },
                {
                  onSuccess: () => {
                    toast.success("Moved")
                    onOpenChange(false)
                  },
                  onError: failed,
                },
              )
            }
          >
            {assign.isPending ? "Moving…" : "Move"}
          </Button>
        </>
      }
    >
      {items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          There is no other workspace to move to. Add one first.
        </p>
      ) : (
        <Field label="Workspace">
          {(props) => (
            <Choice
              id={props.id}
              value={to}
              items={items}
              placeholder="Choose a workspace"
              onChange={setTo}
            />
          )}
        </Field>
      )}
    </ResponsiveDialog>
  )
}
