"use client"

import { Check, Inbox } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { AccessLayer, ResourceAccess } from "@/components/access/grants"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { App, AppCategory } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useApps, useCategoryMutations, useDeleteApp, useSaveApp } from "../api"
import { AppFormLayer } from "./app-form"
import { CategoryDialog } from "./category-dialog"
import { colorOf, useAppFilters } from "./meta"

type Actions = {
  add: (categoryId?: string) => void
  edit: (app: App) => void
  moveTo: (app: App) => void
  remove: (app: App) => void
  access: (app: App) => void
  toggleCritical: (app: App) => void
  addCategory: () => void
  editCategory: (category: AppCategory) => void
  removeCategory: (category: AppCategory) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useAppActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useAppActions outside AppActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Owns every dialog of the services page, so tiles, table rows and menus all
// open the same ones.
export function AppActionsProvider({ children }: { children: ReactNode }) {
  const list = useApps()
  const categories = list.data?.categories ?? []
  const { cat, setCat } = useAppFilters()

  const [formOpen, setFormOpen] = useOpen("app-form")
  const [form, setForm] = useState<{
    app?: App
    category?: string
    key: number
  }>({ key: 0 })
  const [moveOpen, setMoveOpen] = useOpen("app-move")
  const [toMove, setToMove] = useState<App>()
  const [removeOpen, setRemoveOpen] = useOpen("app-remove")
  const [toRemove, setToRemove] = useState<App>()
  const [accessOpen, setAccessOpen] = useOpen("app-access")
  const [accessApp, setAccessApp] = useState<App>()
  const [catOpen, setCatOpen] = useOpen("app-category")
  const [catForm, setCatForm] = useState<{
    category?: AppCategory
    key: number
  }>({ key: 0 })
  const [catRemoveOpen, setCatRemoveOpen] = useOpen("app-category-remove")
  const [catToRemove, setCatToRemove] = useState<AppCategory>()

  const save = useSaveApp()
  const remove = useDeleteApp()
  const { remove: removeCategory } = useCategoryMutations()

  const actions: Actions = {
    add: (category) => {
      setForm((f) => ({ category, key: f.key + 1 }))
      setFormOpen(true)
    },
    edit: (app) => {
      setForm((f) => ({ app, key: f.key + 1 }))
      setFormOpen(true)
    },
    moveTo: (app) => {
      setToMove(app)
      setMoveOpen(true)
    },
    remove: (app) => {
      setToRemove(app)
      setRemoveOpen(true)
    },
    access: (app) => {
      setAccessApp(app)
      setAccessOpen(true)
    },
    toggleCritical: (app) =>
      save.mutate(
        { id: app.id, body: { critical: !app.critical } },
        {
          onSuccess: (saved) =>
            toast.success(
              saved.critical
                ? `${saved.name} is marked critical`
                : `${saved.name} is no longer critical`,
            ),
          onError: errorToast,
        },
      ),
    addCategory: () => {
      setCatForm((f) => ({ key: f.key + 1 }))
      setCatOpen(true)
    },
    editCategory: (category) => {
      setCatForm((f) => ({ category, key: f.key + 1 }))
      setCatOpen(true)
    },
    removeCategory: (category) => {
      setCatToRemove(category)
      setCatRemoveOpen(true)
    },
  }

  // "Add service" from the command palette, on any page.
  useIntent("add-service", () => actions.add())

  const looseCount = catToRemove
    ? (list.data?.items ?? []).filter((a) => a.category_id === catToRemove.id)
        .length
    : 0

  return (
    <ActionsContext value={actions}>
      {children}

      <AppFormLayer
        key={`form-${form.key}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        app={form.app}
        category={form.category}
        categories={categories}
        onSaved={(saved) => {
          setFormOpen(false)
          toast.success(form.app ? "Changes saved" : `Added ${saved.name}`)
        }}
      />

      {toMove && (
        <MoveLayer
          open={moveOpen}
          onOpenChange={setMoveOpen}
          app={toMove}
          categories={categories}
          pending={save.isPending}
          onPick={(category) => {
            if (category === (toMove.category_id ?? "")) {
              setMoveOpen(false)
              return
            }
            save.mutate(
              { id: toMove.id, body: { category_id: category } },
              {
                onSuccess: (saved) => {
                  setMoveOpen(false)
                  const name =
                    categories.find((c) => c.id === category)?.name ??
                    "Uncategorized"
                  toast.success(`Moved ${saved.name} to ${name}`)
                },
                onError: errorToast,
              },
            )
          }}
        />
      )}

      {accessApp && (
        <AccessLayer
          open={accessOpen}
          onOpenChange={setAccessOpen}
          title={`Access to ${accessApp.name}`}
          description="Who can open this service, and who can see its logins."
        >
          <ResourceAccess
            scope={{ app_id: accessApp.id }}
            kind="app"
            workspaceId={accessApp.workspace_id}
          />
        </AccessLayer>
      )}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove “${toRemove?.name}”?`}
        description="Its logins and the log of who viewed them are deleted too. The service itself isn't touched."
        confirmLabel="Remove service"
        pending={remove.isPending}
        onConfirm={() =>
          toRemove &&
          remove.mutate(toRemove.id, {
            onSuccess: () => {
              setRemoveOpen(false)
              toast.success(`Removed ${toRemove.name}`)
            },
            onError: errorToast,
          })
        }
      />

      <CategoryDialog
        key={`category-${catForm.key}`}
        open={catOpen}
        onOpenChange={setCatOpen}
        category={catForm.category}
        onSaved={(saved) => {
          setCatOpen(false)
          toast.success(
            catForm.category ? "Category saved" : `Added ${saved.name}`,
          )
        }}
      />

      <ConfirmDialog
        open={catRemoveOpen}
        onOpenChange={setCatRemoveOpen}
        title={`Delete “${catToRemove?.name}”?`}
        description={
          looseCount > 0
            ? `Its ${looseCount === 1 ? "service moves" : `${looseCount} services move`} to Uncategorized. No service is deleted.`
            : "It has no services. Nothing else changes."
        }
        confirmLabel="Delete category"
        pending={removeCategory.isPending}
        onConfirm={() =>
          catToRemove &&
          removeCategory.mutate(catToRemove.id, {
            onSuccess: () => {
              setCatRemoveOpen(false)
              if (cat === catToRemove.id) setCat(null)
              toast.success(`Deleted ${catToRemove.name}`)
            },
            onError: errorToast,
          })
        }
      />
    </ActionsContext>
  )
}

// Pick where a service goes. Choosing applies at once.
function MoveLayer({
  open,
  onOpenChange,
  app,
  categories,
  pending,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  app: App
  categories: AppCategory[]
  pending: boolean
  // A category id, or "" for none.
  onPick: (category: string) => void
}) {
  const known = categories.some((c) => c.id === app.category_id)
  const current = known ? (app.category_id ?? "") : ""
  const options = [
    ...[...categories]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: (
          <span
            className={cn("mx-1 size-2.5 rounded-full", colorOf(c.color).dot)}
          />
        ),
      })),
    { id: "", name: "Uncategorized", icon: <Inbox className="size-4.5" /> },
  ]

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Move ${app.name}`}
      description="It goes to the end of the category you pick."
    >
      <ul className="-mx-2 flex flex-col">
        {options.map((o) => (
          <li key={o.id || "none"}>
            <button
              type="button"
              disabled={pending}
              aria-current={o.id === current}
              onClick={() => onPick(o.id)}
              className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-start text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-9"
            >
              <span className="flex w-5 justify-center text-ash">{o.icon}</span>
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === current && <Check className="size-4 text-brand" />}
            </button>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  )
}
