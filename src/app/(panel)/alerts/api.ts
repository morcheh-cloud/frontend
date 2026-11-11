"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { alertRulesQuery } from "@/components/panel/problems"
import { useWorkspace } from "@/components/panel/workspace"
import { api } from "@/lib/api"
import type {
  AlertMuteBody,
  AlertRule,
  AlertRuleBody,
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

// ---- Alert rules on servers and databases ----

export const alertRuleKeys = {
  all: ["alert-rules"] as const,
  server: (id: string) => ["alert-rules", "server", id] as const,
  database: (id: string) => ["alert-rules", "database", id] as const,
  events: (q: {
    server_id?: string
    database_id?: string
    rule_id?: string
    limit?: number
  }) => ["alert-rules", "events", q] as const,
  preview: (body: AlertRuleBody) => ["alert-rules", "preview", body] as const,
}

export function useAlertRules() {
  const { workspace } = useWorkspace()
  return useQuery(alertRulesQuery(workspace?.id ?? ""))
}

// The rules covering one server, with only that server's state.
export function useServerAlertRules(serverId: string) {
  return useQuery({
    queryKey: alertRuleKeys.server(serverId),
    queryFn: () => api.alerts.listAlertRules({ server_id: serverId }),
    select: (d) => d.items,
    enabled: !!serverId,
    refetchInterval: 30_000,
  })
}

export function useDatabaseAlertRules(databaseId: string) {
  return useQuery({
    queryKey: alertRuleKeys.database(databaseId),
    queryFn: () => api.alerts.listAlertRules({ database_id: databaseId }),
    select: (d) => d.items,
    enabled: !!databaseId,
    refetchInterval: 30_000,
  })
}

export function useAlertEvents(
  q: {
    server_id?: string
    database_id?: string
    rule_id?: string
    limit?: number
  },
  enabled = true,
) {
  return useQuery({
    queryKey: alertRuleKeys.events(q),
    queryFn: () => api.alerts.listAlertEvents(q),
    select: (d) => d.items,
    enabled,
    refetchInterval: 30_000,
  })
}

// What unsaved settings would see on each covered server right now.
export function useAlertPreview(body: AlertRuleBody | null) {
  return useQuery({
    queryKey: alertRuleKeys.preview(body ?? ({} as AlertRuleBody)),
    queryFn: () => api.alerts.previewAlertRule(body as AlertRuleBody),
    select: (d) => d.items,
    enabled: !!body,
    placeholderData: (prev) => prev,
    retry: false,
    staleTime: 15_000,
  })
}

// Every rule write changes the lists, the servers' views and the channels'
// rule counts.
function refreshRules(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: alertRuleKeys.all })
  qc.invalidateQueries({ queryKey: channelKeys.all })
}

function putRule(qc: QueryClient, r: AlertRule) {
  qc.setQueryData<{ items: AlertRule[] }>(
    ["alert-rules", "list", r.workspace_id],
    (d) =>
      d && {
        ...d,
        items: d.items.some((x) => x.id === r.id)
          ? d.items.map((x) => (x.id === r.id ? r : x))
          : [...d.items, r],
      },
  )
  refreshRules(qc)
}

export function useSaveAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AlertRuleBody }) =>
      id
        ? api.alerts.updateAlertRule(id, body)
        : api.alerts.createAlertRule(body),
    onSuccess: (r) => putRule(qc, r),
  })
}

export function useToggleAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.alerts.setAlertRuleEnabled(id, { enabled }),
    onSuccess: (r) => putRule(qc, r),
  })
}

export function useDeleteAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (r: Pick<AlertRule, "id" | "workspace_id">) =>
      api.alerts.deleteAlertRule(r.id),
    onSuccess: (_, r) => {
      qc.setQueryData<{ items: AlertRule[] }>(
        ["alert-rules", "list", r.workspace_id],
        (d) => d && { ...d, items: d.items.filter((x) => x.id !== r.id) },
      )
      refreshRules(qc)
    },
  })
}

// Mutes: quiet times (maintenance). While one is on, the alerts it matches
// are recorded but not sent.

export const muteKeys = {
  all: ["alert-mutes"] as const,
  list: (ws: string, q: { server_id?: string; database_id?: string }) =>
    ["alert-mutes", ws, q] as const,
}

export function useAlertMutes(
  q: { server_id?: string; database_id?: string } = {},
) {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  return useQuery({
    queryKey: muteKeys.list(ws, q),
    queryFn: () => api.alerts.listAlertMutes(q),
    select: (d) => d.items,
    enabled: !!ws,
    refetchInterval: 30_000,
  })
}

// A mute changes which states count as sent, so the rules refresh too.
function refreshMutes(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: muteKeys.all })
  qc.invalidateQueries({ queryKey: alertRuleKeys.all })
}

export function useCreateMute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AlertMuteBody) => api.alerts.createAlertMute(body),
    onSuccess: () => refreshMutes(qc),
  })
}

export function useEndMute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.alerts.deleteAlertMute(id),
    onSuccess: () => refreshMutes(qc),
  })
}
