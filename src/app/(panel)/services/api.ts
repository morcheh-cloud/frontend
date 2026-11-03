"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useWorkspace } from "@/components/panel/workspace"
import { api, apiFetch } from "@/lib/api"
import type {
  App,
  AppCategory,
  AppCreateBody,
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
