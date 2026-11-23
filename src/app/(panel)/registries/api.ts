"use client"

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useWorkspace } from "@/components/panel/workspace"
import { api } from "@/lib/api"
import type {
  PackageRegistry,
  RegistryAccountBody,
  RegistryCreateBody,
  RegistryUpdateBody,
} from "@/lib/services"

const POLL = 10_000
// While a deploy, HTTPS or remove job runs the row changes often.
const BUSY_POLL = 3_000

export const registryKeys = {
  all: ["package-registries"] as const,
  kinds: ["package-registries", "kinds"] as const,
  list: (ws: string | undefined) =>
    ["package-registries", "list", ws ?? ""] as const,
  one: (id: string) => ["package-registries", "one", id] as const,
  items: (id: string, q: string) =>
    ["package-registries", "one", id, "items", q] as const,
  item: (id: string, name: string) =>
    ["package-registries", "one", id, "item", name] as const,
  accounts: (id: string) =>
    ["package-registries", "one", id, "accounts"] as const,
  preflight: (server: string, kind: string, port: number, domain: string) =>
    ["package-registries", "preflight", server, kind, port, domain] as const,
}

export const busy = (r: Pick<PackageRegistry, "state">) =>
  r.state === "deploying" || r.state === "removing"

export const registryKindsQuery = queryOptions({
  queryKey: registryKeys.kinds,
  queryFn: () => api.packageRegistries.listPackageRegistryKinds(),
  staleTime: Number.POSITIVE_INFINITY,
})

export function useRegistryKinds() {
  return useQuery(registryKindsQuery)
}

export function registriesQuery(ws: string | undefined) {
  return queryOptions({
    queryKey: registryKeys.list(ws),
    queryFn: () => api.packageRegistries.listPackageRegistries(),
    refetchInterval: (q) => (q.state.data?.items.some(busy) ? BUSY_POLL : POLL),
  })
}

export function useRegistries() {
  const { workspace } = useWorkspace()
  return useQuery(registriesQuery(workspace?.id))
}

export function useRegistry(id: string) {
  return useQuery({
    queryKey: registryKeys.one(id),
    queryFn: () => api.packageRegistries.getPackageRegistry(id),
    refetchInterval: (q) =>
      q.state.data && busy(q.state.data) ? BUSY_POLL : POLL,
  })
}

// Puts a fresh registry into its own entry and every list holding it.
function usePut() {
  const qc = useQueryClient()
  return (r: PackageRegistry) => {
    qc.setQueryData(registryKeys.one(r.id), r)
    qc.setQueriesData<{ items: PackageRegistry[] }>(
      { queryKey: ["package-registries", "list"] },
      (old) =>
        old && {
          ...old,
          items: old.items.map((x) => (x.id === r.id ? r : x)),
        },
    )
  }
}

export function usePreflight(
  server: string,
  kind: string,
  port: number,
  domain: string,
  name: string,
) {
  return useQuery({
    queryKey: registryKeys.preflight(server, kind, port, domain),
    queryFn: () =>
      api.packageRegistries.packageRegistryPreflight(server, {
        kind: kind as "harbor" | "verdaccio",
        port,
        domain,
        name,
      }),
    enabled: !!server && !!kind,
    staleTime: 30_000,
    retry: false,
    placeholderData: keepPreviousData,
  })
}

export function useCreateRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RegistryCreateBody) =>
      api.packageRegistries.createPackageRegistry(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: registryKeys.all }),
  })
}

export function useUpdateRegistry(id: string) {
  const put = usePut()
  return useMutation({
    mutationFn: (body: RegistryUpdateBody) =>
      api.packageRegistries.updatePackageRegistry(id, body),
    onSuccess: put,
  })
}

export function useCheckRegistry() {
  const put = usePut()
  return useMutation({
    mutationFn: (id: string) => api.packageRegistries.checkPackageRegistry(id),
    onSuccess: put,
  })
}

export type RegistryAction = "start" | "stop" | "restart" | "cleanup"

export function useRegistryAction() {
  const put = usePut()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RegistryAction }) =>
      api.packageRegistries.packageRegistryAction(id, action),
    onSuccess: put,
  })
}

export function useRemoveRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, keepData }: { id: string; keepData: boolean }) =>
      api.packageRegistries.deletePackageRegistry(id, { keep_data: keepData }),
    onSuccess: () => qc.invalidateQueries({ queryKey: registryKeys.all }),
  })
}

export function useRedeployRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scanner }: { id: string; scanner?: boolean }) =>
      api.packageRegistries.redeployPackageRegistry(id, { scanner }),
    onSuccess: () => qc.invalidateQueries({ queryKey: registryKeys.all }),
  })
}

export function useSecureRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      api.packageRegistries.securePackageRegistry(id, { email }),
    onSuccess: () => qc.invalidateQueries({ queryKey: registryKeys.all }),
  })
}

// The admin login, fetched inside the layer that shows it and never kept.
export function useRegistryCredentials(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...registryKeys.one(id), "credentials"],
    queryFn: () => api.packageRegistries.getPackageRegistryCredentials(id),
    enabled,
    gcTime: 0,
    staleTime: 0,
  })
}

export function useRegistryItems(r: PackageRegistry, q: string) {
  return useQuery({
    queryKey: registryKeys.items(r.id, q),
    queryFn: () => api.packageRegistries.listPackageRegistryItems(r.id, { q }),
    enabled: r.state === "ready",
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

export function useRegistryItem(r: PackageRegistry, name: string | null) {
  return useQuery({
    queryKey: registryKeys.item(r.id, name ?? ""),
    queryFn: () =>
      api.packageRegistries.getPackageRegistryItem(r.id, { name: name ?? "" }),
    enabled: r.state === "ready" && !!name,
  })
}

export function useDeleteRegistryItem(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; ref?: string }) =>
      api.packageRegistries.deletePackageRegistryItem(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: registryKeys.one(id) }),
  })
}

export function useRegistryAccounts(r: PackageRegistry, enabled: boolean) {
  return useQuery({
    queryKey: registryKeys.accounts(r.id),
    queryFn: () => api.packageRegistries.listPackageRegistryAccounts(r.id),
    enabled: enabled && r.state === "ready",
  })
}

// Answers the secret once: it goes to component state, never the cache.
export function useCreateAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RegistryAccountBody) =>
      api.packageRegistries.createPackageRegistryAccount(id, body),
    gcTime: 0,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: registryKeys.accounts(id) }),
  })
}

export function useResetAccount(id: string) {
  return useMutation({
    mutationFn: (account: string) =>
      api.packageRegistries.resetPackageRegistryAccount(id, account),
    gcTime: 0,
  })
}

export function useDeleteAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (account: string) =>
      api.packageRegistries.deletePackageRegistryAccount(id, account),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: registryKeys.accounts(id) }),
  })
}
