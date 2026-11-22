"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  OutgoingWebhook,
  WebhookBody,
  WebhookDelivery,
} from "@/lib/services"

// Outgoing webhooks of a workspace (Owner) and their deliveries. A signing
// secret is answered once by create/rotate and never goes into the cache.
export const webhookKeys = {
  all: ["webhooks"] as const,
  list: (ws: string) => ["webhooks", "list", ws] as const,
  one: (id: string) => ["webhooks", "one", id] as const,
  deliveries: (id: string) => ["webhooks", "deliveries", id] as const,
  page: (id: string, q: DeliveryQuery) =>
    ["webhooks", "deliveries", id, q] as const,
  delivery: (id: string) => ["webhooks", "delivery", id] as const,
}

export type DeliveryQuery = {
  status?: WebhookDelivery["status"]
  limit: number
  offset: number
}

export const POLL = 10_000

export function useWebhooks(ws: string | undefined, enabled = true) {
  return useQuery({
    queryKey: webhookKeys.list(ws ?? ""),
    queryFn: () => api.webhooks.listWebhooks(ws as string),
    select: (d) => d.items,
    enabled: !!ws && enabled,
    refetchInterval: POLL,
  })
}

export function useWebhook(id: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: webhookKeys.one(id ?? ""),
    queryFn: () => api.webhooks.getWebhook(id as string),
    enabled: !!id,
    refetchInterval: POLL,
    // Opened from the list: show that copy straight away.
    initialData: () => {
      for (const [, items] of queryClient.getQueriesData<{
        items: OutgoingWebhook[]
      }>({ queryKey: ["webhooks", "list"] })) {
        const hit = items?.items.find((w) => w.id === id)
        if (hit) return hit
      }
      return undefined
    },
    initialDataUpdatedAt: 0,
  })
}

export function useDeliveries(id: string, q: DeliveryQuery, enabled = true) {
  return useQuery({
    queryKey: webhookKeys.page(id, q),
    queryFn: () =>
      api.webhooks.listWebhookDeliveries(id, {
        limit: q.limit,
        offset: q.offset,
        status: q.status,
      }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: POLL,
  })
}

export function useDelivery(id: string | null) {
  return useQuery({
    queryKey: webhookKeys.delivery(id ?? ""),
    queryFn: () => api.webhooks.getWebhookDelivery(id as string),
    enabled: !!id,
    // A pending one moves on its own (retries).
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? 5_000 : false,
  })
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: webhookKeys.all })
}

export function useSaveWebhook() {
  const queryClient = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({
      id,
      ws,
      body,
    }: {
      id?: string
      ws: string
      body: WebhookBody
    }): Promise<{ webhook: OutgoingWebhook; secret?: string }> =>
      id
        ? api.webhooks
            .updateWebhook(id, body)
            .then((webhook) => ({ webhook, secret: undefined }))
        : api.webhooks.createWebhook(ws, body),
    onSuccess: ({ webhook }) => {
      queryClient.setQueryData(webhookKeys.one(webhook.id), webhook)
      refresh()
    },
  })
}

export function useDeleteWebhook() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.webhooks.deleteWebhook(id),
    onSuccess: refresh,
  })
}

export function useTestWebhook() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.webhooks.testWebhook(id),
    onSuccess: refresh,
  })
}

export function useRotateSecret() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.webhooks.rotateWebhookSecret(id),
    onSuccess: refresh,
  })
}

export function useRedeliver() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.webhooks.redeliverWebhookDelivery(id),
    onSuccess: refresh,
  })
}
