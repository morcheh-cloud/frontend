"use client"

import { useQueries } from "@tanstack/react-query"

import { useWorkspace, workspacesKey } from "@/components/panel/workspace"
import { api } from "@/lib/api"

export type TargetKind = "workspace" | "server" | "storage" | "app"

export type Target = {
  key: string
  kind: TargetKind
  name: string
  detail: string
  tags: string[]
}

export type TargetGroup = { workspace: Target; items: Target[] }

const count = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

// Everything access can be given on, by workspace. Only an admin sees every
// workspace, so only an admin gets the whole picture from this.
export function useAccessTargets() {
  const { workspaces } = useWorkspace()
  const details = useQueries({
    queries: workspaces.map((w) => ({
      queryKey: [...workspacesKey, w.id],
      queryFn: () => api.workspaces.getWorkspace(w.id),
    })),
  })
  // The workspace detail doesn't carry tags. Without them, picking still works.
  const lists = useQueries({
    queries: workspaces.map((w) => ({
      queryKey: ["servers", "access-tags", w.id],
      queryFn: () =>
        api.servers.listServers(
          { limit: 500 },
          { headers: { "X-Workspace-Id": w.id } },
        ),
    })),
  })

  const tagsOf = new Map<string, string[]>()
  for (const list of lists) {
    for (const s of list.data?.items ?? []) tagsOf.set(s.id, s.tags ?? [])
  }

  const groups: TargetGroup[] = []
  details.forEach((query, i) => {
    const w = query.data
    if (!w) return
    const servers = w.servers ?? []
    const storages = w.storages ?? []
    const apps = w.apps ?? []
    groups.push({
      workspace: {
        key: `workspace:${workspaces[i].id}`,
        kind: "workspace",
        name: w.name,
        detail: `Whole workspace · ${count(servers.length, "server")} · ${count(storages.length, "storage", "storages")} · ${count(apps.length, "service")}`,
        tags: [],
      },
      items: [
        ...servers.map(
          (s): Target => ({
            key: `server:${s.id}`,
            kind: "server",
            name: s.name,
            detail: s.host,
            tags: tagsOf.get(s.id) ?? [],
          }),
        ),
        ...storages.map(
          (s): Target => ({
            key: `storage:${s.id}`,
            kind: "storage",
            name: s.name,
            detail: s.protocol,
            tags: [],
          }),
        ),
        ...apps.map(
          (a): Target => ({
            key: `app:${a.id}`,
            kind: "app",
            name: a.name,
            detail: a.address,
            tags: [],
          }),
        ),
      ],
    })
  })

  return {
    groups,
    pending: details.some((q) => q.isPending),
    error: details.find((q) => q.error)?.error ?? null,
  }
}
