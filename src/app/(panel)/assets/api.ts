"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useWorkspace } from "@/components/panel/workspace"
import { ApiError, api } from "@/lib/api"
import type {
  Asset,
  AssetBody,
  AssetBulkBody,
  AssetNote,
  AssetOwnerRule,
  AssetSettings,
} from "@/lib/services"

export const assetKeys = {
  all: ["assets"] as const,
  list: (ws: string) => ["assets", "list", ws] as const,
  one: (id: string) => ["assets", "one", id] as const,
  relations: (ws: string) => ["assets", "relations", ws] as const,
  people: (ws: string) => ["assets", "people", ws] as const,
  rules: (ws: string) => ["assets", "rules", ws] as const,
  settings: (ws: string) => ["assets", "settings", ws] as const,
  discoveries: (ws: string) => ["assets", "discoveries", ws] as const,
}

const notFound = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

function useWs(workspaceId?: string) {
  const { workspace } = useWorkspace()
  return workspaceId ?? workspace?.id ?? ""
}

// The inventory of the selected workspace. The backend brings linked assets
// in step with Morche on each read, so a short poll keeps statuses fresh.
export function assetsQuery(ws: string) {
  return {
    queryKey: assetKeys.list(ws),
    queryFn: () => api.assets.listAssets(ws).then((r) => r.items),
    enabled: !!ws,
    refetchInterval: 30_000,
  }
}

export function useAssets(workspaceId?: string) {
  return useQuery(assetsQuery(useWs(workspaceId)))
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.one(id ?? ""),
    queryFn: () => api.assets.getAsset(id ?? ""),
    enabled: !!id,
    retry: notFound,
    refetchInterval: 30_000,
  })
}

export function useAssetRelations(workspaceId?: string) {
  const ws = useWs(workspaceId)
  return useQuery({
    queryKey: assetKeys.relations(ws),
    queryFn: () => api.assets.listAssetRelations(ws).then((r) => r.items),
    enabled: !!ws,
    refetchInterval: 60_000,
  })
}

export function useAssetPeople(workspaceId?: string) {
  const ws = useWs(workspaceId)
  return useQuery({
    queryKey: assetKeys.people(ws),
    queryFn: () => api.assets.listAssetPeople(ws),
    enabled: !!ws,
    staleTime: 60_000,
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: assetKeys.all })
}

export function useSaveAsset() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AssetBody }) =>
      id ? api.assets.updateAsset(id, body) : api.assets.createAsset(ws, body),
    onSuccess: (a: Asset) => {
      invalidate(qc)
      qc.removeQueries({ queryKey: assetKeys.one(a.id) })
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.assets.deleteAsset(id),
    onSuccess: () => invalidate(qc),
  })
}

export function useReviewAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.assets.reviewAsset(id),
    onSuccess: () => invalidate(qc),
  })
}

export function useBulkAssets() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: (body: AssetBulkBody) => api.assets.bulkUpdateAssets(ws, body),
    onSuccess: () => invalidate(qc),
  })
}

export function useImportAssets() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: (items: AssetBody[]) => api.assets.importAssets(ws, { items }),
    onSuccess: () => invalidate(qc),
  })
}

// Each look is written to the asset's history: a mutation, never cached.
export function useRevealLicenseKey() {
  return useMutation({
    mutationFn: (id: string) =>
      api.assets.getAssetLicenseKey(id).then((r) => r.key),
    gcTime: 0,
  })
}

export function useAddRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      from: string
      to: string
      kind: string
      note?: string
    }) =>
      api.assets.addAssetRelation(v.from, {
        to_id: v.to,
        kind: v.kind as never,
        note: v.note,
      }),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { asset: string; relation: string }) =>
      api.assets.deleteAssetRelation(v.asset, v.relation),
    onSuccess: () => invalidate(qc),
  })
}

export function useOwnerRules(workspaceId?: string) {
  const ws = useWs(workspaceId)
  return useQuery({
    queryKey: assetKeys.rules(ws),
    queryFn: () => api.assets.getAssetOwnerRules(ws).then((r) => r.items),
    enabled: !!ws,
  })
}

export function useSaveOwnerRules() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: (items: AssetOwnerRule[]) =>
      api.assets.setAssetOwnerRules(ws, { items }).then((r) => r.items),
    onSuccess: () => invalidate(qc),
  })
}

export function useAssetSettings(workspaceId?: string) {
  const ws = useWs(workspaceId)
  return useQuery({
    queryKey: assetKeys.settings(ws),
    queryFn: () => api.assets.getAssetSettings(ws),
    enabled: !!ws,
  })
}

export function useSaveAssetSettings() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: (body: AssetSettings) => api.assets.setAssetSettings(ws, body),
    onSuccess: (s) => qc.setQueryData(assetKeys.settings(ws), s),
  })
}

export function useDiscoveries(workspaceId?: string) {
  const ws = useWs(workspaceId)
  return useQuery({
    queryKey: assetKeys.discoveries(ws),
    queryFn: () => api.assets.listAssetDiscoveries(ws),
    enabled: !!ws,
    refetchInterval: 30_000,
  })
}

export function useRunDiscovery() {
  const ws = useWs()
  return useMutation({
    mutationFn: () => api.assets.runAssetDiscovery(ws),
  })
}

export function useSetDiscoveryState() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: (v: { ids: string[]; state: "new" | "ignored" }) =>
      api.assets.setAssetDiscoveryState(ws, v),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: assetKeys.discoveries(ws) }),
  })
}

export function useTrackDiscovery() {
  const qc = useQueryClient()
  const ws = useWs()
  return useMutation({
    mutationFn: (id: string) => api.assets.trackAssetDiscovery(ws, { id }),
    onSuccess: () => invalidate(qc),
  })
}

// ---- Notes ----

type NoteList = { items: AssetNote[] }

const sortNotes = (items: AssetNote[]) =>
  [...items].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updated_at.localeCompare(a.updated_at),
  )

export const noteKeys = {
  list: (asset: string) => ["assets", "notes", asset] as const,
}

export function useAssetNotes(asset: string) {
  return useQuery({
    queryKey: noteKeys.list(asset),
    queryFn: () => api.assets.listAssetNotes(asset),
    enabled: !!asset,
    staleTime: 30_000,
  })
}

export type AssetNoteChange =
  | { kind: "create"; title: string; body: string; pinned: boolean }
  | {
      kind: "update"
      id: string
      title: string
      body: string
      pinned: boolean
      // The note's updated_at when editing began; null = overwrite.
      revision: string | null
    }
  | { kind: "pin"; id: string; pinned: boolean }

// Every write answers the note as saved; it goes straight into the list.
export function useAssetNoteChange(asset: string) {
  const qc = useQueryClient()
  return useMutation<AssetNote, ApiError, AssetNoteChange>({
    mutationFn: (c) => {
      switch (c.kind) {
        case "create":
          return api.assets.createAssetNote(asset, {
            title: c.title,
            body: c.body,
            pinned: c.pinned,
          })
        case "update":
          return api.assets.updateAssetNote(asset, c.id, {
            title: c.title,
            body: c.body,
            pinned: c.pinned,
            ...(c.revision ? { revision: c.revision } : {}),
          })
        case "pin":
          return api.assets.pinAssetNote(asset, c.id, { pinned: c.pinned })
      }
    },
    onSuccess: (note) => {
      qc.setQueryData<NoteList>(noteKeys.list(asset), (old) => ({
        items: sortNotes([
          note,
          ...(old?.items ?? []).filter((n) => n.id !== note.id),
        ]),
      }))
      qc.invalidateQueries({ queryKey: assetKeys.one(asset) })
      qc.invalidateQueries({ queryKey: ["assets", "list"] })
    },
  })
}

export function useDeleteAssetNote(asset: string) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => api.assets.deleteAssetNote(asset, id),
    onSuccess: (_, id) => {
      qc.setQueryData<NoteList>(noteKeys.list(asset), (old) =>
        old ? { items: old.items.filter((n) => n.id !== id) } : old,
      )
      qc.invalidateQueries({ queryKey: assetKeys.one(asset) })
      qc.invalidateQueries({ queryKey: ["assets", "list"] })
    },
  })
}
