"use client"

import { ArrowUpCircle, Ellipsis, Package, Trash2, X } from "lucide-react"
import { useRef, useState } from "react"
import { Th } from "@/app/(panel)/scripts/components/scripts-view"
import {
  Empty,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useOpen } from "@/hooks/useOpen"
import type { Recipe, SoftwareInstall } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useInstallMenu } from "./install-menu"
import { InstallStatus, kindLabels, RecipeIcon } from "./meta"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

const iconOf = (i: SoftwareInstall, recipes: Recipe[]) =>
  recipes.find((r) => r.id === i.recipe_id) ?? { kind: i.kind }

export const sortInstalls = (items: SoftwareInstall[]) =>
  [...items].sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.server_name.localeCompare(b.server_name),
  )

// Installs as a table (desktop) with a selection for bulk update/uninstall.
// `server` hides the Server column (a server's own tab).
export function InstallsTable({
  items,
  recipes,
  server,
}: {
  items: SoftwareInstall[]
  recipes: Recipe[]
  server?: boolean
}) {
  const a = useSoftwareActions()
  const can = useSoftwareCan()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const chosen = items.filter((i) => picked.has(i.id))
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const all = items.length > 0 && chosen.length === items.length
  const updatable = chosen.filter(
    (i) => i.status !== "missing" && can.updateOn(i),
  )
  const removable = chosen.filter(
    (i) => i.status !== "missing" && can.uninstallOn(i),
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="@container overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 ps-4">
                <Checkbox
                  aria-label="Select all"
                  checked={all}
                  indeterminate={chosen.length > 0 && !all}
                  onCheckedChange={() =>
                    setPicked(all ? new Set() : new Set(items.map((i) => i.id)))
                  }
                />
              </th>
              <Th>Application</Th>
              {!server && <Th>Server</Th>}
              <Th>Version</Th>
              <Th>Status</Th>
              <Th className="hidden @3xl:table-cell">Kind</Th>
              <Th className="hidden @4xl:table-cell">Checked</Th>
              <th scope="col" className="w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((i) => (
              <InstallRow
                key={i.id}
                i={i}
                recipe={iconOf(i, recipes)}
                server={server}
                picked={picked.has(i.id)}
                onPick={() => toggle(i.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {chosen.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 self-center rounded-2xl border border-border bg-card px-4 py-2 shadow-md">
          <span className="text-body-sm font-medium">
            {chosen.length} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={updatable.length === 0}
            onClick={() => a.update(updatable)}
          >
            <ArrowUpCircle />
            Update
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={removable.length === 0}
            onClick={() => a.uninstall(removable)}
          >
            <Trash2 />
            Uninstall
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear selection"
            onClick={() => setPicked(new Set())}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  )
}

function InstallRow({
  i,
  recipe,
  server,
  picked,
  onPick,
}: {
  i: SoftwareInstall
  recipe: Pick<Recipe, "kind" | "icon">
  server?: boolean
  picked: boolean
  onPick: () => void
}) {
  const a = useSoftwareActions()
  const menu = useInstallMenu(i)
  return (
    <tr
      className={cn(
        "h-14 cursor-pointer hover:bg-subtle",
        picked && "bg-subtle",
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,[role=menu]")) return
        a.manage(i)
      }}
    >
      <td className="ps-4">
        <Checkbox
          aria-label={`Select ${i.name} on ${i.server_name}`}
          checked={picked}
          onCheckedChange={onPick}
        />
      </td>
      <td className="max-w-72 px-3">
        <span className="flex items-center gap-3">
          <RecipeIcon recipe={recipe} size="sm" />
          <button
            type="button"
            onClick={() => a.manage(i)}
            className="truncate font-medium outline-none hover:text-brand focus-visible:text-brand"
          >
            {i.name}
          </button>
        </span>
      </td>
      {!server && (
        <td className="max-w-48 truncate px-3 text-muted-foreground">
          {i.server_name}
        </td>
      )}
      <td className="max-w-48 px-3">
        <span className="block truncate">{i.version || "—"}</span>
        {i.update_available && i.latest && (
          <span className="block truncate text-caption text-brand">
            → {i.latest}
          </span>
        )}
      </td>
      <td className="px-3">
        <InstallStatus install={i} />
      </td>
      <td className="hidden px-3 text-muted-foreground @3xl:table-cell">
        {kindLabels[i.kind]}
        {i.origin === "found" && (
          <span className="block text-caption text-ash">Found</span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
        {i.checked_at ? timeAgo(i.checked_at) : "—"}
      </td>
      <td className="pe-2">
        <ItemMenu groups={menu} label={`${i.name} actions`} />
      </td>
    </tr>
  )
}

// Phone rows: a tap opens the install; ⋯ = its actions in a sheet.
export function InstallRows({
  items,
  recipes,
  server,
}: {
  items: SoftwareInstall[]
  recipes: Recipe[]
  server?: boolean
}) {
  const a = useSoftwareActions()
  const [open, setOpen] = useOpen("software-install-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<SoftwareInstall | null>(null)
  const current = items.find((i) => i.id === id) ?? last.current
  if (current) last.current = current
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center">
            <button
              type="button"
              onClick={() => a.manage(i)}
              className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 text-start outline-none active:bg-muted"
            >
              <RecipeIcon recipe={iconOf(i, recipes)} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-medium">
                  {i.name}
                  {!server && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {i.server_name}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <InstallStatus install={i} className="text-caption" />
                  <span className="truncate text-caption text-ash">
                    {i.version}
                    {i.update_available && i.latest ? ` → ${i.latest}` : ""}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={`${i.name} actions`}
              className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:bg-muted"
              onClick={() => {
                setId(i.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <InstallSheet i={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function InstallSheet({
  i,
  open,
  onOpenChange,
}: {
  i: SoftwareInstall
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useInstallMenu(i)
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${i.name} on ${i.server_name}`}
    >
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

export function NoInstalls({ onScan }: { onScan?: () => void }) {
  return (
    <Empty
      icon={Package}
      title="Nothing installed yet"
      body="Install something from the catalog, or check the servers: Morcheh finds Docker, web servers, databases and the rest that are already there."
      action={
        onScan && (
          <Button
            variant="outline"
            className="h-11 w-full md:h-9 md:w-auto"
            onClick={onScan}
          >
            Check servers
          </Button>
        )
      }
    />
  )
}
