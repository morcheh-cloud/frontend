"use client"

import { Boxes, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

import {
  Empty,
  type Item,
  ItemMenu,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useAccess } from "@/components/auth/auth"
import { levelLabel } from "@/components/auth/level"
import { PageHeader } from "@/components/panel/page-header"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { PanelWorkspace } from "@/lib/services"
import { NoAccess } from "../../components/no-access"
import { useWorkspacesActions } from "./workspaces-actions"

export function WorkspacesView() {
  const phone = useIsPhone()
  const { admin, workspaceLevel } = useAccess()
  const { workspaces } = useWorkspace()
  const a = useWorkspacesActions()
  if (phone === null) return null

  const items = admin
    ? workspaces
    : workspaces.filter((w) => workspaceLevel(w.id) === "owner")
  if (!admin && items.length === 0) {
    return <NoAccess text="Only an admin or a workspace owner can open this." />
  }

  const menu = (w: PanelWorkspace): Item[][] =>
    admin
      ? [
          [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => a.edit(w),
            },
          ],
          [
            {
              key: "delete",
              label: "Delete…",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.remove(w),
            },
          ],
        ]
      : []

  return (
    <>
      <PageHeader
        title="Workspaces"
        guide="access"
        description={
          admin
            ? "Every server and storage belongs to one workspace."
            : "The workspaces you own."
        }
        actions={
          admin && (
            <Button className="max-md:h-11" onClick={a.add}>
              <Plus />
              Add workspace
            </Button>
          )
        }
      />
      {items.length === 0 ? (
        <Empty
          icon={Boxes}
          title="No workspaces"
          body="Add one to start grouping servers and storage."
        />
      ) : phone ? (
        <ul className="divide-y divide-border border-b border-border">
          {items.map((w) => (
            <li key={w.id}>
              <Link
                href={`/settings/workspaces/${w.id}`}
                className="flex min-h-16 flex-col justify-center px-4 py-3 active:bg-muted"
              >
                <span className="truncate font-medium">{w.name}</span>
                <span className="truncate text-body-sm text-muted-foreground">
                  {w.server_count} {w.server_count === 1 ? "server" : "servers"}{" "}
                  · {w.storage_count} storage
                  {!admin && ` · ${levelLabel(w.level)}`}
                </span>
              </Link>
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
                    Servers
                  </th>
                  <th className="px-4 py-2.5 text-start font-normal">
                    Storage
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((w) => (
                  <tr key={w.id} className="h-12 hover:bg-subtle">
                    <td className="px-4">
                      <Link
                        href={`/settings/workspaces/${w.id}`}
                        className="font-medium"
                      >
                        {w.name}
                      </Link>
                    </td>
                    <td className="max-w-96 truncate px-4 text-muted-foreground">
                      {w.description || "—"}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {w.server_count}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {w.storage_count}
                    </td>
                    <td className="pe-2 text-end">
                      <ItemMenu
                        groups={menu(w)}
                        label={`Actions for ${w.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
