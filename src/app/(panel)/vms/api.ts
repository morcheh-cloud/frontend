"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { pveClustersQuery, STATUS_POLL } from "@/components/panel/problems"
import { API_URL, ApiError, api } from "@/lib/api"
import type {
  ErrorModel,
  Job,
  PVEBackupBody,
  PVECloudInitBody,
  PVECluster,
  PVEClusterBody,
  PVECreateBody,
  PVEFirewall,
  PVEFirewallOptions,
  PVEFirewallRule,
  PVEGuest,
  PVEGuestDetail,
  PVEHABody,
  PVEPowerBody,
  PVETestBody,
} from "@/lib/services"

export type Timeframe = "hour" | "day" | "week" | "month" | "year"
export type VolumeContent =
  | "iso"
  | "vztmpl"
  | "backup"
  | "images"
  | "rootdir"
  | "import"
  | "snippets"
  | ""

// The cluster list sits under ["pve-clusters"] (shared with the nav's red
// count); everything read through a cluster sits under ["pve"], so a finished
// Proxmox job refreshes it all with one invalidation.
export const vmKeys = {
  clusters: pveClustersQuery.queryKey,
  cluster: (id: string) => ["pve-clusters", id] as const,
  guests: ["pve", "guests"] as const,
  infra: ["pve", "infra"] as const,
  guest: (c: string, vmid: number) => ["pve", c, vmid] as const,
  rrd: (c: string, vmid: number, tf: Timeframe) =>
    ["pve", c, vmid, "rrd", tf] as const,
  snapshots: (c: string, vmid: number) =>
    ["pve", c, vmid, "snapshots"] as const,
  backups: (c: string, vmid: number) => ["pve", c, vmid, "backups"] as const,
  cloudInit: (c: string, vmid: number) =>
    ["pve", c, vmid, "cloud-init"] as const,
  firewall: (c: string, vmid: number) => ["pve", c, vmid, "firewall"] as const,
  tasks: (c: string, vmid: number) => ["pve", c, vmid, "tasks"] as const,
  migration: (c: string, vmid: number, target: string) =>
    ["pve", c, vmid, "migration", target] as const,
  ha: (c: string) => ["pve", c, "ha"] as const,
  clusterTasks: (c: string) => ["pve", c, "tasks"] as const,
  taskLog: (c: string, upid: string) => ["pve", c, "task-log", upid] as const,
  createOptions: (c: string) => ["pve", c, "create-options"] as const,
  node: (c: string, node: string) => ["pve", c, "node", node] as const,
  nodeRrd: (c: string, node: string, tf: Timeframe) =>
    ["pve", c, "node", node, "rrd", tf] as const,
  content: (c: string, node: string, storage: string, content: VolumeContent) =>
    ["pve", c, "storage", node, storage, content] as const,
  serverLink: (serverId: string) => ["pve", "server-link", serverId] as const,
}

export const notFound = (error: Error) =>
  error instanceof ApiError && error.status === 404

const retry = (count: number, error: Error) => !notFound(error) && count < 2

// Machines change on the cluster by themselves (HA moving one, someone using
// Proxmox's own panel): re-read the lists now and then.
const GUEST_POLL = 10_000
// A machine's page while it's open: status and live numbers.
const DETAIL_POLL = 5_000

export function useClusters() {
  return useQuery(pveClustersQuery)
}

export function useCluster(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: vmKeys.cluster(id),
    queryFn: () => api.virtualMachines.getPveCluster(id),
    refetchInterval: STATUS_POLL,
    placeholderData: () =>
      queryClient
        .getQueryData<{ items: PVECluster[] }>(vmKeys.clusters)
        ?.items.find((c) => c.id === id),
    retry,
  })
}

export function useGuests(enabled = true) {
  return useQuery({
    queryKey: vmKeys.guests,
    queryFn: () => api.virtualMachines.listPveGuestsEverywhere(),
    refetchInterval: GUEST_POLL,
    enabled,
  })
}

export function useInfrastructure(enabled = true) {
  return useQuery({
    queryKey: vmKeys.infra,
    queryFn: () => api.virtualMachines.listPveInfrastructure(),
    refetchInterval: GUEST_POLL,
    enabled,
  })
}

export function useGuest(cluster: string, vmid: number) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: vmKeys.guest(cluster, vmid),
    queryFn: () => api.virtualMachines.getPveGuest(cluster, vmid),
    refetchInterval: DETAIL_POLL,
    // The list row draws the header at once; the rest fills in.
    placeholderData: () => {
      const row = queryClient
        .getQueryData<{ items: PVEGuest[] }>(vmKeys.guests)
        ?.items.find((g) => g.cluster_id === cluster && g.vmid === vmid)
      return row && ({ ...row, partial: true } as unknown as PVEGuestDetail)
    },
    retry,
  })
}

export function useGuestRrd(cluster: string, vmid: number, tf: Timeframe) {
  return useQuery({
    queryKey: vmKeys.rrd(cluster, vmid, tf),
    queryFn: () =>
      api.virtualMachines.getPveGuestRrd(cluster, vmid, { timeframe: tf }),
    refetchInterval: tf === "hour" ? 30_000 : 300_000,
    placeholderData: (prev) => prev,
  })
}

export function useSnapshots(cluster: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.snapshots(cluster, vmid),
    queryFn: () => api.virtualMachines.listPveSnapshots(cluster, vmid),
  })
}

export function useGuestBackups(cluster: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.backups(cluster, vmid),
    queryFn: () => api.virtualMachines.listPveGuestBackups(cluster, vmid),
  })
}

export function useCloudInit(cluster: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.cloudInit(cluster, vmid),
    queryFn: () => api.virtualMachines.getPveCloudInit(cluster, vmid),
    staleTime: 0,
  })
}

export function useGuestFirewall(cluster: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.firewall(cluster, vmid),
    queryFn: () => api.virtualMachines.getPveGuestFirewall(cluster, vmid),
  })
}

export function useGuestTasks(cluster: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.tasks(cluster, vmid),
    queryFn: () =>
      api.virtualMachines.listPveGuestTasks(cluster, vmid, { limit: 100 }),
    refetchInterval: 10_000,
  })
}

export function useClusterTasks(cluster: string, enabled = true) {
  return useQuery({
    queryKey: vmKeys.clusterTasks(cluster),
    queryFn: () =>
      api.virtualMachines.listPveClusterTasks(cluster, { limit: 100 }),
    refetchInterval: 10_000,
    enabled,
  })
}

// A task's log, re-read while it runs.
export function useTaskLog(cluster: string, upid: string, running: boolean) {
  return useQuery({
    queryKey: vmKeys.taskLog(cluster, upid),
    queryFn: () =>
      api.virtualMachines.getPveTaskLog(cluster, { upid, start: 0 }),
    refetchInterval: running ? 2_000 : false,
    enabled: !!upid,
  })
}

export function useHa(cluster: string, enabled = true) {
  return useQuery({
    queryKey: vmKeys.ha(cluster),
    queryFn: () => api.virtualMachines.listPveHa(cluster),
    enabled,
  })
}

export function useMigrationCheck(
  cluster: string,
  vmid: number,
  target: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: vmKeys.migration(cluster, vmid, target),
    queryFn: () =>
      api.virtualMachines.checkPveMigration(cluster, vmid, {
        target: target || undefined,
      }),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useCreateOptions(cluster: string, enabled = true) {
  return useQuery({
    queryKey: vmKeys.createOptions(cluster),
    queryFn: () => api.virtualMachines.getPveCreateOptions(cluster),
    enabled: enabled && !!cluster,
    staleTime: 30_000,
  })
}

export function useNode(cluster: string, node: string, enabled = true) {
  return useQuery({
    queryKey: vmKeys.node(cluster, node),
    queryFn: () => api.virtualMachines.getPveNode(cluster, node),
    refetchInterval: 10_000,
    enabled: enabled && !!node,
  })
}

export function useNodeRrd(
  cluster: string,
  node: string,
  tf: Timeframe,
  enabled = true,
) {
  return useQuery({
    queryKey: vmKeys.nodeRrd(cluster, node, tf),
    queryFn: () =>
      api.virtualMachines.getPveNodeRrd(cluster, node, { timeframe: tf }),
    refetchInterval: tf === "hour" ? 30_000 : 300_000,
    placeholderData: (prev) => prev,
    enabled: enabled && !!node,
  })
}

export function useStorageContent(
  cluster: string,
  node: string,
  storage: string,
  content: VolumeContent,
  enabled = true,
) {
  return useQuery({
    queryKey: vmKeys.content(cluster, node, storage, content),
    queryFn: () =>
      api.virtualMachines.listPveStorageContent(cluster, node, storage, {
        content,
      }),
    enabled: enabled && !!storage,
  })
}

export function useServerPveLink(serverId: string, enabled = true) {
  return useQuery({
    queryKey: vmKeys.serverLink(serverId),
    queryFn: () => api.virtualMachines.getServerPveLink(serverId),
    refetchInterval: 30_000,
    enabled,
  })
}

// ---- clusters

function storeCluster(queryClient: QueryClient, c: PVECluster) {
  queryClient.setQueryData(vmKeys.cluster(c.id), c)
  queryClient.setQueryData<{ items: PVECluster[] }>(
    vmKeys.clusters,
    (data) =>
      data && {
        ...data,
        items: data.items.some((x) => x.id === c.id)
          ? data.items.map((x) => (x.id === c.id ? c : x))
          : [...data.items, c],
      },
  )
  queryClient.invalidateQueries({ queryKey: vmKeys.clusters, exact: true })
}

export function useSaveCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PVEClusterBody }) =>
      id
        ? api.virtualMachines.updatePveCluster(id, body)
        : api.virtualMachines.createPveCluster(body),
    onSuccess: (c) => {
      storeCluster(queryClient, c)
      // A new or re-pointed cluster changes every list.
      queryClient.invalidateQueries({ queryKey: ["pve"] })
    },
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (body: PVETestBody) =>
      api.virtualMachines.testPveConnection(body),
  })
}

export function useCheckCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.virtualMachines.checkPveCluster(id),
    onSuccess: (c) => {
      storeCluster(queryClient, c)
      queryClient.invalidateQueries({ queryKey: ["pve"] })
    },
  })
}

export function useFavoriteCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.virtualMachines.setPveClusterFavorite(id, { favorite }),
    onSuccess: (c) => storeCluster(queryClient, c),
  })
}

export function useDeleteCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.virtualMachines.deletePveCluster(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<{ items: PVECluster[] }>(
        vmKeys.clusters,
        (data) =>
          data && { ...data, items: data.items.filter((c) => c.id !== id) },
      )
      queryClient.removeQueries({ queryKey: vmKeys.cluster(id) })
      queryClient.removeQueries({ queryKey: ["pve", id] })
      queryClient.invalidateQueries({ queryKey: ["pve"] })
    },
  })
}

// ---- machine jobs

// Every long change answers a Job: hand it to the task tracker (toast now and
// when it ends, refresh) and let the dialog close.
export function useVmJob<T>(fn: (vars: T) => Promise<Job>) {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: fn,
    onSuccess: (job) => jobs.track(job),
  })
}

export function usePower(cluster: string, vmid: number) {
  const queryClient = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (body: PVEPowerBody) =>
      api.virtualMachines.powerPveGuest(cluster, vmid, body),
    onSuccess: (job) => {
      jobs.track(job)
      queryClient.invalidateQueries({ queryKey: vmKeys.guest(cluster, vmid) })
    },
  })
}

// A guest answered by the API (HA, link) goes straight into its page.
function storeGuest(queryClient: QueryClient, g: PVEGuestDetail) {
  queryClient.setQueryData(vmKeys.guest(g.cluster_id, g.vmid), g)
  queryClient.invalidateQueries({ queryKey: vmKeys.guests })
}

export function useSetHa(cluster: string, vmid: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PVEHABody | null) =>
      body
        ? api.virtualMachines.setPveGuestHa(cluster, vmid, body)
        : api.virtualMachines.removePveGuestHa(cluster, vmid),
    onSuccess: (g) => {
      storeGuest(queryClient, g)
      queryClient.invalidateQueries({ queryKey: vmKeys.ha(cluster) })
    },
  })
}

export function useLinkServer(cluster: string, vmid: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (serverId: string | null) =>
      serverId
        ? api.virtualMachines.linkPveGuest(cluster, vmid, {
            server_id: serverId,
          })
        : api.virtualMachines
            .unlinkPveGuest(cluster, vmid)
            .then(() => api.virtualMachines.getPveGuest(cluster, vmid)),
    onSuccess: (g) => {
      storeGuest(queryClient, g)
      queryClient.invalidateQueries({ queryKey: ["pve", "server-link"] })
    },
  })
}

export function useSetCloudInit(cluster: string, vmid: number) {
  return useVmJob((body: PVECloudInitBody) =>
    api.virtualMachines.setPveCloudInit(cluster, vmid, body),
  )
}

export function useSetConfig(cluster: string, vmid: number) {
  return useVmJob(
    (body: {
      set?: Record<string, string>
      delete?: string[]
      digest?: string
    }) => api.virtualMachines.setPveGuestConfig(cluster, vmid, body),
  )
}

export function useResizeDisk(cluster: string, vmid: number) {
  return useVmJob((body: { disk: string; size: string }) =>
    api.virtualMachines.resizePveGuestDisk(cluster, vmid, body),
  )
}

export function useBackupGuest(cluster: string, vmid: number) {
  return useVmJob((body: PVEBackupBody) =>
    api.virtualMachines.backupPveGuest(cluster, vmid, body),
  )
}

export function useCreateGuest(cluster: string) {
  return useVmJob((body: PVECreateBody) =>
    api.virtualMachines.createPveGuest(cluster, body),
  )
}

// ---- firewall: every write answers the fresh firewall.

export function useFirewallChange(cluster: string, vmid: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      change:
        | { kind: "options"; options: PVEFirewallOptions }
        | { kind: "add"; rule: PVEFirewallRule }
        | { kind: "update"; pos: number; rule: PVEFirewallRule }
        | { kind: "delete"; pos: number }
        | { kind: "move"; pos: number; to: number },
    ): Promise<PVEFirewall> => {
      const vm = api.virtualMachines
      switch (change.kind) {
        case "options":
          return vm.setPveGuestFirewallOptions(cluster, vmid, change.options)
        case "add":
          return vm.addPveGuestFirewallRule(cluster, vmid, change.rule)
        case "update":
          return vm.updatePveGuestFirewallRule(
            cluster,
            vmid,
            change.pos,
            change.rule,
          )
        case "delete":
          return vm.deletePveGuestFirewallRule(cluster, vmid, change.pos)
        case "move":
          return vm.movePveGuestFirewallRule(cluster, vmid, change.pos, {
            to: change.to,
          })
      }
    },
    onSuccess: (fw) =>
      queryClient.setQueryData(vmKeys.firewall(cluster, vmid), fw),
  })
}

// ---- upload: raw bytes with progress (fetch can't report upload progress).

export function uploadToStorage(
  cluster: string,
  node: string,
  storage: string,
  file: File,
  {
    content,
    filename,
    onProgress,
    signal,
  }: {
    content: "iso" | "vztmpl"
    filename: string
    onProgress?: (loaded: number) => void
    signal?: AbortSignal
  },
) {
  const query = new URLSearchParams({ content, filename })
  const url = `${API_URL}/pve-clusters/${cluster}/nodes/${encodeURIComponent(node)}/storages/${encodeURIComponent(storage)}/upload?${query}`
  return new Promise<Job>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.withCredentials = true
    xhr.setRequestHeader("Content-Type", "application/octet-stream")
    xhr.responseType = "json"
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
      else {
        const body = xhr.response as ErrorModel | null
        reject(
          new ApiError(
            xhr.status,
            body?.detail ?? body?.title ?? xhr.statusText,
            body ?? undefined,
          ),
        )
      }
    }
    xhr.onerror = () => reject(new ApiError(0, "The upload was interrupted."))
    xhr.onabort = () => reject(new DOMException("Canceled", "AbortError"))
    signal?.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}

// The console's websocket (not in the spec): a one-time token from
// openPveConsole, good for 30 seconds.
export function consoleSocketUrl(cluster: string, token: string) {
  const base = API_URL || window.location.origin
  const url = new URL(
    `${base}/pve-clusters/${cluster}/console/connect`,
    window.location.href,
  )
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.searchParams.set("token", token)
  return url.toString()
}
