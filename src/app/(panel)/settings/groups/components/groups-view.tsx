"use client"

import { Pencil, Plus, ShieldCheck, Trash2, UsersRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useId, useState } from "react"
import { toast } from "sonner"

import {
  afterClose,
  Empty,
  type Item,
  ItemMenu,
  Loading,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { AccessLayer, PrincipalAccess } from "@/components/access/grants"
import { Field } from "@/components/field"
import { PageHeader } from "@/components/panel/page-header"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { PanelGroup } from "@/lib/services"
import {
  failed,
  useDeleteGroup,
  useGroups,
  useMembers,
  useSaveGroup,
  useSetGroupMembers,
} from "../../api"
import { displayName } from "../../members/components/meta"

const noun = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

export function GroupsView() {
  const phone = useIsPhone()
  const router = useRouter()
  const groups = useGroups()
  const [formOpen, setFormOpen] = useOpen("group-form")
  const [editing, setEditing] = useState<PanelGroup>()
  const [formKey, setFormKey] = useState(0)
  const [detailsOpen, setDetailsOpen] = useOpen("group-details")
  const [detailsId, setDetailsId] = useState<string>()
  const [removeOpen, setRemoveOpen] = useOpen("group-remove")
  const [removing, setRemoving] = useState<PanelGroup>()
  const remove = useDeleteGroup()

  if (phone === null) return null

  const items = groups.data ?? []
  const details = items.find((g) => g.id === detailsId)

  const showForm = (group?: PanelGroup) => {
    setEditing(group)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }
  const manageAccess = (group: PanelGroup) =>
    router.push(`/settings/groups/${group.id}/access`)
  const menu = (group: PanelGroup): Item[][] => [
    [
      {
        key: "grants",
        label: "Manage access",
        icon: <ShieldCheck />,
        onSelect: () => manageAccess(group),
      },
      {
        key: "edit",
        label: "Rename",
        icon: <Pencil />,
        onSelect: () => showForm(group),
      },
    ],
    [
      {
        key: "delete",
        label: "Delete…",
        icon: <Trash2 />,
        destructive: true,
        onSelect: () => {
          setRemoving(group)
          setRemoveOpen(true)
        },
      },
    ],
  ]
  const open = (group: PanelGroup) => {
    setDetailsId(group.id)
    setDetailsOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Groups"
        guide="access"
        actions={
          <Button className="max-md:h-11" onClick={() => showForm()}>
            <Plus />
            Add group
          </Button>
        }
      />
      {groups.isPending ? (
        <Loading phone={phone} />
      ) : groups.isError ? (
        <p className="px-4 py-6 text-body-sm text-destructive md:px-6">
          {groups.error.message}
        </p>
      ) : items.length === 0 ? (
        <Empty
          icon={UsersRound}
          title="No groups yet"
          body="Make one for a team, then give it access to a workspace or a server."
        />
      ) : phone ? (
        <ul className="divide-y divide-border border-b border-border">
          {items.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="flex min-h-16 w-full flex-col justify-center px-4 py-3 text-start active:bg-muted"
                onClick={() => open(g)}
              >
                <span className="truncate font-medium">{g.name}</span>
                <span className="truncate text-body-sm text-muted-foreground">
                  {noun(g.member_ids?.length ?? 0, "member")}
                  {g.description && ` · ${g.description}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-6 py-5">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-body-sm">
              <thead className="border-b border-border text-caption text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-start font-normal">Name</th>
                  <th className="px-4 py-2.5 text-start font-normal">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-start font-normal">
                    Members
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((g) => (
                  <tr key={g.id} className="h-12 hover:bg-subtle">
                    <td className="px-4">
                      <button
                        type="button"
                        className="font-medium"
                        onClick={() => open(g)}
                      >
                        {g.name}
                      </button>
                    </td>
                    <td className="max-w-96 truncate px-4 text-muted-foreground">
                      {g.description || "—"}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {g.member_ids?.length ?? 0}
                    </td>
                    <td className="pe-2 text-end">
                      <ItemMenu
                        groups={menu(g)}
                        label={`Actions for ${g.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GroupForm
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editing}
      />
      {details && (
        <AccessLayer
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          title={details.name}
          description={details.description || undefined}
          footer={
            !phone && (
              <ItemMenu
                groups={menu(details).map((group) =>
                  group.map((item) => ({
                    ...item,
                    onSelect: () => afterClose(setDetailsOpen, item.onSelect),
                  })),
                )}
                label="Group actions"
                trigger={<Button variant="outline">Actions</Button>}
              />
            )
          }
        >
          <div className="flex flex-col gap-6">
            <Members group={details} />
            <PrincipalAccess
              principal={{ group_id: details.id }}
              onManage={() =>
                afterClose(setDetailsOpen, () => manageAccess(details))
              }
            />
            {phone && (
              <SheetItems
                groups={menu(details)}
                onOpenChange={setDetailsOpen}
              />
            )}
          </div>
        </AccessLayer>
      )}
      {removing && (
        <ConfirmDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          title={`Delete ${removing.name}?`}
          confirmLabel="Delete"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(removing.id, {
              onSuccess: () => {
                toast.success("Group deleted")
                setRemoveOpen(false)
              },
              onError: failed,
            })
          }
        />
      )}
    </>
  )
}

function GroupForm({
  open,
  onOpenChange,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: PanelGroup
}) {
  const save = useSaveGroup()
  const formId = useId()
  const [name, setName] = useState(group?.name ?? "")
  const [description, setDescription] = useState(group?.description ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    save.mutate(
      { id: group?.id, name, description },
      {
        onSuccess: () => {
          toast.success(group ? "Group updated" : "Group added")
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
      title={group ? `Edit ${group.name}` : "Add group"}
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
            {save.isPending ? "Saving…" : group ? "Save" : "Add group"}
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

// The whole member list goes up on every tick: the API replaces it.
function Members({ group }: { group: PanelGroup }) {
  const members = useMembers()
  const setMembers = useSetGroupMembers()
  const ids = group.member_ids ?? []
  const people = (members.data?.items ?? []).filter(
    (u) => u.status !== "pending",
  )
  return (
    <section>
      <h2 className="mb-1 text-body-sm font-medium">Members</h2>
      {members.isPending ? (
        <Skeleton className="h-9 rounded-lg" />
      ) : people.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Nobody to add yet.</p>
      ) : (
        <ul>
          {people.map((u) => (
            <li key={u.id}>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
              <label className="flex min-h-9 items-center gap-2.5 text-body-sm max-md:min-h-11">
                <Checkbox
                  checked={ids.includes(u.id)}
                  disabled={setMembers.isPending}
                  onCheckedChange={(on) =>
                    setMembers.mutate(
                      {
                        id: group.id,
                        user_ids: on
                          ? [...ids, u.id]
                          : ids.filter((id) => id !== u.id),
                      },
                      { onError: failed },
                    )
                  }
                />
                <span className="min-w-0 truncate">{displayName(u)}</span>
                <span className="min-w-0 truncate text-caption text-ash">
                  @{u.username}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
