"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { useWorkspace } from "@/components/panel/workspace"
import { api, apiFetch } from "@/lib/api"
import type {
  App,
  AppCategory,
  AppCreateBody,
  AppLayoutBody,
  AppList,
  AppUpdateBody,
  CreateAppCategoryRequest,
  UpdateAppCategoryRequest,
} from "@/lib/services"

// Usernames come with the list (Operator and up); passwords never do.
export const appKeys = {
  all: ["apps"] as const,
}

export function useApps() {
  return useQuery({
    queryKey: appKeys.all,
    queryFn: () => api.apps.listApps(),
  })
}

export function useRefetchApps() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: appKeys.all })
}

// Every write answers with the fresh row; put it straight into the list.
function putApp(queryClient: QueryClient, app: App) {
  queryClient.setQueryData<AppList>(appKeys.all, (list) => {
    if (!list) return list
    const found = list.items.some((a) => a.id === app.id)
    return {
      ...list,
      items: found
        ? list.items.map((a) => (a.id === app.id ? app : a))
        : [...list.items, app],
    }
  })
}

const cachedApp = (queryClient: QueryClient, id: string) =>
  queryClient.getQueryData<AppList>(appKeys.all)?.items.find((a) => a.id === id)

// The backend fetches a new address's favicon in the background; look again
// once it has had time to land.
const FAVICON_DELAY = 6000

export function useSaveApp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      v:
        | { id?: undefined; body: AppCreateBody }
        | { id: string; body: AppUpdateBody },
    ) =>
      v.id === undefined
        ? api.apps.createApp(v.body)
        : api.apps.updateApp(v.id, v.body),
    onSuccess: (app, v) => {
      const before = v.id ? cachedApp(queryClient, v.id) : undefined
      putApp(queryClient, app)
      if (!before || before.address !== app.address) {
        setTimeout(
          () => queryClient.invalidateQueries({ queryKey: appKeys.all }),
          FAVICON_DELAY,
        )
      }
    },
  })
}

export function useDeleteApp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.apps.deleteApp(id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<AppList>(
        appKeys.all,
        (list) =>
          list && { ...list, items: list.items.filter((a) => a.id !== id) },
      ),
  })
}

// The image goes up as raw bytes; the generated client would send JSON.
export function useUploadLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiFetch<App>(`/apps/${id}/logo`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      }),
    onSuccess: (app) => putApp(queryClient, app),
  })
}

export function useRefetchIcon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.apps.refetchAppIcon(id),
    onSuccess: (app) => putApp(queryClient, app),
  })
}

// A saved password, for the form's eye. Logged by the backend every time.
export const revealPassword = (appId: string, accountId: string) =>
  api.apps.revealAppAccount(appId, accountId).then((s) => s.password)

// A reveal is a write (it logs a row), so a mutation: refetches never repeat
// it, and with gcTime 0 the answer leaves the cache with its last user. The
// value itself lives only in the component that asked for it.
export function useRevealPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { appId: string; accountId: string }) =>
      revealPassword(v.appId, v.accountId),
    gcTime: 0,
    onSettled: (_, __, v) =>
      queryClient.invalidateQueries({ queryKey: activityKey(v.appId) }),
  })
}

const activityKey = (id: string) => [...appKeys.all, id, "activity"] as const

// Who revealed this service's passwords (Owner only).
export function useAppActivity(id: string, enabled: boolean) {
  return useQuery({
    queryKey: activityKey(id),
    queryFn: () => api.apps.listAppActivity(id).then((r) => r.items),
    enabled,
  })
}

// The whole page's arrangement: every category in order, and every group
// (null = uncategorized) with its services in order. Services in a category
// that's gone count as uncategorized, as the page shows them.
export function layoutOf(list: AppList): AppLayoutBody {
  const byPosition = <T extends { position: number }>(a: T, b: T) =>
    a.position - b.position
  const categories = [...list.categories].sort(byPosition).map((c) => c.id)
  const known = new Set(categories)
  const items = [...list.items].sort(byPosition)
  return {
    categories,
    groups: [
      ...categories.map((id) => ({
        category_id: id,
        app_ids: items.filter((a) => a.category_id === id).map((a) => a.id),
      })),
      {
        category_id: null,
        app_ids: items
          .filter((a) => !a.category_id || !known.has(a.category_id))
          .map((a) => a.id),
      },
    ],
  }
}

// The list as it looks with this arrangement (position = index).
export function withLayout(list: AppList, layout: AppLayoutBody): AppList {
  const place = new Map<string, { category?: string; position: number }>()
  for (const g of layout.groups) {
    g.app_ids.forEach((id, position) => {
      place.set(id, { category: g.category_id ?? undefined, position })
    })
  }
  const order = new Map(layout.categories.map((id, i) => [id, i]))
  return {
    ...list,
    categories: list.categories.map((c) => ({
      ...c,
      position: order.get(c.id) ?? c.position,
    })),
    items: list.items.map((a) => {
      const p = place.get(a.id)
      return p ? { ...a, category_id: p.category, position: p.position } : a
    }),
  }
}

// Saves the whole arrangement at once (even when a filter shows only part of
// it). Shown straight away; put back as it was if the backend refuses.
export function useSetLayout() {
  const queryClient = useQueryClient()
  const { workspace } = useWorkspace()
  return useMutation({
    mutationFn: (layout: AppLayoutBody) =>
      api.apps.setAppsLayout(workspace?.id ?? "", layout),
    onMutate: async (layout) => {
      await queryClient.cancelQueries({ queryKey: appKeys.all })
      const before = queryClient.getQueryData<AppList>(appKeys.all)
      if (before) {
        queryClient.setQueryData(appKeys.all, withLayout(before, layout))
      }
      return { before }
    },
    onError: (err, _, context) => {
      if (context?.before) queryClient.setQueryData(appKeys.all, context.before)
      toast.error("Couldn't save the new order", { description: err.message })
    },
    onSuccess: (list) => queryClient.setQueryData(appKeys.all, list),
  })
}

// Categories belong to the current workspace.
export function useCategoryMutations() {
  const queryClient = useQueryClient()
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""

  const putCategory = (category: AppCategory) =>
    queryClient.setQueryData<AppList>(appKeys.all, (list) => {
      if (!list) return list
      const found = list.categories.some((c) => c.id === category.id)
      return {
        ...list,
        categories: found
          ? list.categories.map((c) => (c.id === category.id ? category : c))
          : [...list.categories, category],
      }
    })

  const create = useMutation({
    mutationFn: (body: CreateAppCategoryRequest) =>
      api.apps.createAppCategory(ws, body),
    onSuccess: putCategory,
  })
  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: UpdateAppCategoryRequest
    }) => api.apps.updateAppCategory(ws, id, body),
    onSuccess: putCategory,
  })
  // Its services stay, outside every category; reload for their new order.
  const remove = useMutation({
    mutationFn: (id: string) => api.apps.deleteAppCategory(ws, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppList>(
        appKeys.all,
        (list) =>
          list && {
            ...list,
            categories: list.categories.filter((c) => c.id !== id),
            items: list.items.map((a) =>
              a.category_id === id ? { ...a, category_id: undefined } : a,
            ),
          },
      )
      queryClient.invalidateQueries({ queryKey: appKeys.all })
    },
  })
  return { create, update, remove }
}
