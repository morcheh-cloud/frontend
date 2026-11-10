"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useWorkspace } from "@/components/panel/workspace"
import { api } from "@/lib/api"
import type {
  ChannelTestBody,
  NotifyChannel,
  NotifyChannelBody,
} from "@/lib/services"

// Notification channels: where alerts go (email, Telegram, Bale, webhooks…).
// Shared by uptime monitors now, other alerts later.

export const channelKeys = {
  all: ["notify-channels"] as const,
  list: (ws: string) => ["notify-channels", "list", ws] as const,
  log: (id: string) => ["notify-channels", "log", id] as const,
}

// The selected workspace's channels (or another one's, e.g. a monitor's).
export function useChannels(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const ws = workspaceId ?? workspace?.id ?? ""
  return useQuery({
    queryKey: channelKeys.list(ws),
    queryFn: () =>
      api.notifications.listNotificationChannels({
        headers: { "X-Workspace-Id": ws },
      }),
    select: (d) =>
      [...d.items].sort(
        (a, b) =>
          Number(b.is_default) - Number(a.is_default) ||
          a.name.localeCompare(b.name),
      ),
    enabled: !!ws,
    refetchInterval: 60_000,
  })
}

export function useChannelLog(id: string | undefined) {
  return useQuery({
    queryKey: channelKeys.log(id ?? ""),
    queryFn: () =>
      api.notifications.listNotificationLog(id ?? "", { limit: 100 }),
    select: (d) => d.items,
    enabled: !!id,
    refetchInterval: 30_000,
  })
}

function putChannel(qc: QueryClient, c: NotifyChannel) {
  qc.setQueryData<{ items: NotifyChannel[] }>(
    channelKeys.list(c.workspace_id),
    (d) =>
      d
        ? {
            ...d,
            items: d.items.some((x) => x.id === c.id)
              ? d.items.map((x) => (x.id === c.id ? c : x))
              : [...d.items, c],
          }
        : d,
  )
  // A new default or "attach to all" changes other channels and monitors.
  qc.invalidateQueries({ queryKey: channelKeys.all })
  qc.invalidateQueries({ queryKey: ["monitors"] })
}

export function useSaveChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: NotifyChannelBody }) =>
      id
        ? api.notifications.updateNotificationChannel(id, body)
        : api.notifications.createNotificationChannel(body),
    onSuccess: (c) => putChannel(qc, c),
  })
}

export function useDeleteChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: Pick<NotifyChannel, "id" | "workspace_id">) =>
      api.notifications.deleteNotificationChannel(c.id),
    onSuccess: (_, c) => {
      qc.setQueryData<{ items: NotifyChannel[] }>(
        channelKeys.list(c.workspace_id),
        (d) => d && { ...d, items: d.items.filter((x) => x.id !== c.id) },
      )
      qc.invalidateQueries({ queryKey: channelKeys.all })
      qc.invalidateQueries({ queryKey: ["monitors"] })
    },
  })
}

// Sends a test message through a saved channel.
export function useTestChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.notifications.testNotificationChannel(id),
    onSettled: () => qc.invalidateQueries({ queryKey: channelKeys.all }),
  })
}

// Sends a test message with unsaved settings (blank secrets = the saved ones).
export function useTestChannelSettings() {
  return useMutation({
    mutationFn: (body: ChannelTestBody) =>
      api.notifications.testNotificationSettings(body),
  })
}
