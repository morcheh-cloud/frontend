"use client"

import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  Pencil,
  Save,
  Trash2,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { DatabaseSavedView, DatabaseViewState } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDeleteView, useSavedViews, useSaveView } from "../../../api"
import { useDashboard } from "../parts"

// The parts of a state that matter when comparing two.
function same(a: DatabaseViewState, b: DatabaseViewState) {
  const norm = (s: DatabaseViewState) =>
    JSON.stringify({
      search: s.search?.trim() || "",
      filters: s.filters ?? [],
      match: s.filters && s.filters.length > 1 ? (s.match ?? "all") : "all",
      where: s.where?.trim() || "",
      sort: s.sort ?? [],
      page_size: s.page_size || 100,
    })
  return norm(a) === norm(b)
}

export const isEmptyState = (s: DatabaseViewState) =>
  !s.search?.trim() && !s.filters?.length && !s.where?.trim() && !s.sort?.length

// Saved filters of one table: pick one to put its filters back, save the
// current ones, update or delete the one in use.
export function ViewsMenu({
  target,
  state,
  active,
  onApply,
}: {
  target: { database: string; schema: string; table: string }
  state: DatabaseViewState
  active: string | null
  onApply: (view: DatabaseSavedView | null) => void
}) {
  const { database: d, phone } = useDashboard()
  const views = useSavedViews(d.id, target)
  const save = useSaveView(d.id)
  const remove = useDeleteView(d.id)
  const [sheet, setSheet] = useOpen("rows-views")
  const [dialog, setDialog] = useOpen("rows-view-save")
  const [confirm, setConfirm] = useOpen("rows-view-delete")
  const [editing, setEditing] = useState<DatabaseSavedView | undefined>()
  const items = views.data?.items ?? []
  const current = items.find((v) => v.id === active)
  const changed = !!current && !same(current.state, state)
  const empty = isEmptyState(state)

  const update = () =>
    current &&
    save.mutate(
      {
        viewId: current.id,
        body: {
          ...target,
          title: current.title,
          shared: current.shared,
          state,
        },
      },
      {
        onSuccess: () => toast.success(`“${current.title}” updated`),
        onError: (e) => toast.error(e.message),
      },
    )

  const label = (
    <>
      {current ? <BookmarkCheck className="text-brand" /> : <Bookmark />}
      <span className="max-w-40 truncate">
        {current ? current.title : "Saved filters"}
      </span>
      {changed && (
        <span
          title="Changed since it was saved"
          className="size-1.5 shrink-0 rounded-full bg-warning"
        />
      )}
      {items.length > 0 && !current && (
        <span className="text-caption text-ash tabular-nums">
          {items.length}
        </span>
      )}
      <ChevronDown className="opacity-60" />
    </>
  )

  const actions = [
    {
      key: "all",
      label: "All rows, no filters",
      icon: current ? null : Check,
      run: () => onApply(null),
      show: true,
    },
    ...items.map((v) => ({
      key: v.id,
      label: v.title,
      icon: v.id === active ? Check : v.shared ? Users : null,
      hint: v.shared && !v.mine ? v.created_by_name : undefined,
      run: () => onApply(v),
      show: true,
    })),
  ]
  const manage = [
    {
      key: "update",
      label: `Update “${current?.title}”`,
      icon: Save,
      run: update,
      show: !!current && current.can_edit && changed,
    },
    {
      key: "new",
      label: current ? "Save as new…" : "Save these filters…",
      icon: Bookmark,
      run: () => {
        setEditing(undefined)
        setDialog(true)
      },
      show: !empty,
    },
    {
      key: "rename",
      label: "Rename or share…",
      icon: Pencil,
      run: () => {
        setEditing(current)
        setDialog(true)
      },
      show: !!current?.can_edit,
    },
  ].filter((a) => a.show)

  return (
    <>
      {phone ? (
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setSheet(true)}
        >
          {label}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className={cn(current && "border-brand/40")}
              />
            }
          >
            {label}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Saved filters of this table</DropdownMenuLabel>
              {actions.map((a) => (
                <DropdownMenuItem key={a.key} onClick={a.run}>
                  {a.icon ? <a.icon /> : <span className="size-4" />}
                  <span className="truncate">{a.label}</span>
                  {"hint" in a && a.hint && (
                    <span className="ms-auto ps-3 text-caption text-ash">
                      {a.hint}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {(manage.length > 0 || current?.can_edit) && (
              <DropdownMenuSeparator />
            )}
            {manage.map((a) => (
              <DropdownMenuItem key={a.key} onClick={a.run}>
                <a.icon />
                {a.label}
              </DropdownMenuItem>
            ))}
            {current?.can_edit && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirm(true)}
              >
                <Trash2 />
                Delete “{current.title}”
              </DropdownMenuItem>
            )}
            {items.length === 0 && empty && (
              <p className="w-0 min-w-full px-2 py-1.5 text-caption text-muted-foreground">
                Set a search, filters or a sort, then save them here to use
                again with one click.
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {phone && (
        <BottomSheet open={sheet} onOpenChange={setSheet} title="Saved filters">
          <div className="flex flex-col px-2">
            {actions.map((a) => (
              <SheetAction
                key={a.key}
                icon={a.icon ? <a.icon /> : <Bookmark />}
                label={a.label}
                description={"hint" in a ? a.hint : undefined}
                onClick={() => {
                  setSheet(false)
                  a.run()
                }}
              />
            ))}
            {manage.map((a) => (
              <SheetAction
                key={a.key}
                icon={<a.icon />}
                label={a.label}
                onClick={() => {
                  setSheet(false)
                  a.run()
                }}
              />
            ))}
            {current?.can_edit && (
              <SheetAction
                icon={<Trash2 />}
                label={`Delete “${current.title}”`}
                destructive
                onClick={() => {
                  setSheet(false)
                  setConfirm(true)
                }}
              />
            )}
          </div>
        </BottomSheet>
      )}
      <SaveViewDialog
        open={dialog}
        onOpenChange={setDialog}
        existing={editing}
        onSave={(title, shared) =>
          save.mutate(
            {
              viewId: editing?.id,
              body: {
                ...target,
                title,
                shared,
                state: editing ? editing.state : state,
              },
            },
            {
              onSuccess: (v) => {
                setDialog(false)
                onApply(v)
                toast.success(editing ? "Saved" : `Saved as “${v.title}”`)
              },
            },
          )
        }
        pending={save.isPending}
        error={save.error}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete “${current?.title}”?`}
        description={
          current?.shared
            ? "It's shared: it goes for everyone. The rows aren't touched."
            : "Only the saved filters go; the rows aren't touched."
        }
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() =>
          current &&
          remove.mutate(current, {
            onSuccess: () => {
              setConfirm(false)
              onApply(null)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  )
}

function SaveViewDialog({
  open,
  onOpenChange,
  existing,
  onSave,
  pending,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing?: DatabaseSavedView
  onSave: (title: string, shared: boolean) => void
  pending: boolean
  error: Error | null
}) {
  const [title, setTitle] = useState("")
  const [shared, setShared] = useState(false)
  useEffect(() => {
    if (!open) return
    setTitle(existing?.title ?? "")
    setShared(existing?.shared ?? false)
  }, [open, existing])
  const errors = fieldErrors(error)
  const submit = () => title.trim() && onSave(title.trim(), shared)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Saved filters" : "Save these filters"}
      description={
        existing
          ? undefined
          : "The search, filters, condition and sort, to use again on this table with one click."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!title.trim() || pending} onClick={submit}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Name" error={errors.title}>
          {(p) => (
            <Input
              {...p}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unpaid orders this month"
              maxLength={200}
            />
          )}
        </Field>
        <label
          htmlFor="save-view-shared"
          className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
        >
          <span>
            <span className="block text-body-sm font-medium">
              Share with the team
            </span>
            <span className="block text-caption text-muted-foreground">
              Everyone who can browse this database sees it on this table.
            </span>
          </span>
          <Switch
            id="save-view-shared"
            checked={shared}
            onCheckedChange={setShared}
            disabled={!!existing && !existing.mine}
          />
        </label>
        {error && !errors.title && (
          <p className="text-body-sm text-destructive">{error.message}</p>
        )}
      </form>
    </ResponsiveDialog>
  )
}
