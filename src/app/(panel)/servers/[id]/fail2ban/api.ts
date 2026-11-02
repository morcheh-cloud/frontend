"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { isActive, useJobList } from "@/components/jobs/api"
import { type ApiError, api } from "@/lib/api"
import type {
  Fail2BanBanBody,
  Fail2BanFilter,
  Fail2BanOverview,
  Fail2BanTask,
  Fail2BanTestBody,
  Fail2BanTestResult,
  Job,
} from "@/lib/services"

export const f2bKeys = {
  all: (serverId: string) => ["fail2ban", serverId] as const,
  overview: (serverId: string) => ["fail2ban", serverId, "overview"] as const,
  log: (serverId: string) => ["fail2ban", serverId, "log"] as const,
  filter: (serverId: string, name: string) =>
    ["fail2ban", serverId, "filter", name] as const,
}

// One SSH round trip: install state, every config file merged, and the live
// status and bans of each running jail.
export function useFail2ban(serverId: string) {
  return useQuery({
    queryKey: f2bKeys.overview(serverId),
    queryFn: () => api.security.getFail2Ban(serverId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useFail2banLog(serverId: string, enabled: boolean) {
  return useQuery({
    queryKey: f2bKeys.log(serverId),
    queryFn: () => api.security.fail2BanLog(serverId, { lines: 1000 }),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export type ServiceAction =
  | "start"
  | "stop"
  | "restart"
  | "reload"
  | "enable"
  | "disable"

// Service actions answer with the command's output, and the overview is read
// again after.
export function useServiceAction(serverId: string) {
  const qc = useQueryClient()
  return useMutation<Fail2BanTask, ApiError, ServiceAction>({
    mutationFn: (action) => api.security.fail2BanService(serverId, { action }),
    onSettled: () => qc.invalidateQueries({ queryKey: f2bKeys.all(serverId) }),
  })
}

export type PackageOp =
  | { kind: "install"; protect_ssh: boolean }
  | { kind: "uninstall"; purge: boolean }

// Install and remove run as background jobs: the answer is the job, and the
// overview is read again when it ends (refreshAfterJob).
export function usePackageOp(serverId: string) {
  return useMutation<Job, ApiError, PackageOp>({
    mutationFn: (op) =>
      op.kind === "install"
        ? api.security.installFail2Ban(serverId, {
            protect_ssh: op.protect_ssh,
          })
        : api.security.uninstallFail2Ban(serverId, { purge: op.purge }),
  })
}

// The install or removal under way on this server, wherever it was started.
export function usePackageJob(serverId: string) {
  const { data } = useJobList()
  return data?.find(
    (j) =>
      isActive(j) &&
      j.refs.includes(serverId) &&
      j.kind.startsWith("fail2ban-"),
  )
}

export type Edit =
  | { kind: "defaults"; set?: Record<string, string>; unset?: string[] }
  | {
      kind: "jail"
      jail: string
      set?: Record<string, string>
      unset?: string[]
    }
  | { kind: "delete-jail"; jail: string }
  | { kind: "config"; content: string; revision?: string }

// Every change goes to jail.local with the revision last read (an explicit
// one overwrites newer content); the server checks the configuration, reloads
// fail2ban and answers the fresh overview.
export function useEdit(serverId: string) {
  const qc = useQueryClient()
  return useMutation<Fail2BanOverview, ApiError, Edit>({
    mutationFn: (e) => {
      const revision =
        qc.getQueryData<Fail2BanOverview>(f2bKeys.overview(serverId))?.config
          .revision ?? ""
      switch (e.kind) {
        case "defaults":
          return api.security.updateFail2BanDefaults(serverId, {
            revision,
            set: e.set,
            unset: e.unset,
          })
        case "jail":
          return api.security.updateFail2BanJail(serverId, e.jail, {
            revision,
            set: e.set,
            unset: e.unset,
          })
        case "delete-jail":
          return api.security.deleteFail2BanJail(serverId, e.jail, {
            revision,
          })
        case "config":
          return api.security.saveFail2BanConfig(serverId, {
            revision: e.revision ?? revision,
            content: e.content,
          })
      }
    },
    onSuccess: (o) => qc.setQueryData(f2bKeys.overview(serverId), o),
    onError: (error) => {
      // Someone changed jail.local meanwhile: show what is there now.
      if (error.status === 409) {
        qc.invalidateQueries({ queryKey: f2bKeys.overview(serverId) })
      }
    },
  })
}

export function useBan(serverId: string) {
  const qc = useQueryClient()
  return useMutation<void, ApiError, Fail2BanBanBody & { unban?: boolean }>({
    mutationFn: ({ unban, ...body }) =>
      unban
        ? api.security.fail2BanUnban(serverId, body)
        : api.security.fail2BanBan(serverId, body),
    onSettled: () => qc.invalidateQueries({ queryKey: f2bKeys.all(serverId) }),
  })
}

export function useFilter(serverId: string, name: string | null) {
  return useQuery({
    queryKey: f2bKeys.filter(serverId, name ?? ""),
    queryFn: () => api.security.getFail2BanFilter(serverId, name ?? ""),
    enabled: Boolean(name),
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useSaveFilter(serverId: string) {
  const qc = useQueryClient()
  return useMutation<
    Fail2BanFilter,
    ApiError,
    { name: string; content: string; revision: string }
  >({
    mutationFn: ({ name, ...body }) =>
      api.security.saveFail2BanFilter(serverId, name, body),
    onSuccess: (f) => {
      qc.setQueryData(f2bKeys.filter(serverId, f.name), f)
      qc.invalidateQueries({ queryKey: f2bKeys.overview(serverId) })
    },
  })
}

export function useTestFilter(serverId: string) {
  return useMutation<Fail2BanTestResult, ApiError, Fail2BanTestBody>({
    mutationFn: (body) => api.security.testFail2BanFilter(serverId, body),
  })
}
