"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { isActive, useJobList } from "@/components/jobs/api"
import { type ApiError, api } from "@/lib/api"
import type {
  Job,
  PackageActionBody,
  PackageMarkBody,
  PackagePreview,
  PackagesOverview,
} from "@/lib/services"

// Everything sits under ["packages", serverId]: a finished package job
// invalidates that root (refreshAfterJob), so the list, details and history
// all read again.
export const packageKeys = {
  all: (serverId: string) => ["packages", serverId] as const,
  overview: (serverId: string) => ["packages", serverId, "overview"] as const,
  info: (serverId: string, name: string) =>
    ["packages", serverId, "info", name] as const,
  search: (serverId: string, q: string) =>
    ["packages", serverId, "search", q] as const,
  history: (serverId: string) => ["packages", serverId, "history"] as const,
}

// One SSH round trip: every installed package with its update, plus the
// manager's state (reboot needed, automatic updates, cache size).
export function usePackages(serverId: string) {
  return useQuery({
    queryKey: packageKeys.overview(serverId),
    queryFn: () => api.packages.getPackages(serverId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function usePackageInfo(serverId: string, name: string | null) {
  return useQuery({
    queryKey: packageKeys.info(serverId, name ?? ""),
    queryFn: () => api.packages.getPackage(serverId, { name: name ?? "" }),
    enabled: name !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (n, err: ApiError) => err.status !== 404 && n < 2,
  })
}

// Searches the repositories (installed or not). Two letters at least.
export function usePackageSearch(serverId: string, q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: packageKeys.search(serverId, term),
    queryFn: () => api.packages.searchPackages(serverId, { q: term }),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function usePackageHistory(serverId: string, enabled: boolean) {
  return useQuery({
    queryKey: packageKeys.history(serverId),
    queryFn: () => api.packages.packageHistory(serverId),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

// What an action would change, from the manager's own dry run.
export function usePreview(serverId: string) {
  return useMutation<PackagePreview, ApiError, PackageActionBody>({
    mutationFn: (body) => api.packages.previewPackages(serverId, body),
  })
}

// Starts the change as a background job.
export function usePackageAction(serverId: string) {
  return useMutation<Job, ApiError, PackageActionBody>({
    mutationFn: (body) => api.packages.runPackageAction(serverId, body),
  })
}

export function useRefreshLists(serverId: string) {
  return useMutation<Job, ApiError, void>({
    mutationFn: () => api.packages.refreshPackageLists(serverId),
  })
}

function useStore(serverId: string) {
  const qc = useQueryClient()
  return (o: PackagesOverview) => {
    qc.setQueryData(packageKeys.overview(serverId), o)
    qc.invalidateQueries({
      queryKey: ["packages", serverId, "info"],
    })
  }
}

export function useMarkPackages(serverId: string) {
  const store = useStore(serverId)
  return useMutation<PackagesOverview, ApiError, PackageMarkBody>({
    mutationFn: (body) => api.packages.markPackages(serverId, body),
    onSuccess: store,
  })
}

export function useAutoUpdates(serverId: string) {
  const store = useStore(serverId)
  return useMutation<PackagesOverview, ApiError, boolean>({
    mutationFn: (enabled) => api.packages.setAutoUpdates(serverId, { enabled }),
    onSuccess: store,
  })
}

// A package job on this server still running, from any tab or page (fail2ban
// installs use the same package manager, so they count too).
export function useActivePackageJob(serverId: string) {
  const { data } = useJobList()
  return data?.find(
    (j) =>
      isActive(j) &&
      j.refs.includes(serverId) &&
      (j.kind.startsWith("package-") || j.kind.startsWith("fail2ban-")),
  )
}
