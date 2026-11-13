"use client"

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { isActive, useJobList } from "@/components/jobs/api"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ApiError, api } from "@/lib/api"
import type {
  DockerAutoUpdate,
  DockerAutoUpdateBody,
  DockerAutoUpdateEvent,
  DockerAutoUpdateRules,
  DockerContainer,
  DockerDaemonResult,
  DockerDaemonSaveBody,
  DockerLogBatch,
  DockerLogLine,
  DockerNetworkBody,
  DockerProject,
  DockerProjectDetails,
  DockerProjectLogBatch,
  DockerProjectLogLine,
  DockerPruneBody,
  DockerRegistryBody,
  DockerRunBody,
  DockerScanBody,
  DockerServerSettings,
  DockerSettingsBody,
  DockerSettingsOverrides,
  DockerStats,
  DockerStreamEnd,
  DockerTemplateBody,
} from "@/lib/services"

// Container names, image references (`library/nginx:1.27`) and volume names
// go into the path as one segment each.
const seg = encodeURIComponent

export const dockerKeys = {
  all: ["docker"] as const,
  fleet: ["docker", "fleet"] as const,
  server: (id: string) => ["docker", id] as const,
  engine: (id: string) => ["docker", id, "engine"] as const,
  containers: (id: string) => ["docker", id, "containers"] as const,
  container: (id: string, c: string) => ["docker", id, "container", c] as const,
  inspect: (id: string, c: string) => ["docker", id, "inspect", c] as const,
  logs: (id: string, c: string, tail: number) =>
    ["docker", id, "logs", c, tail] as const,
  images: (id: string) => ["docker", id, "images"] as const,
  image: (id: string, ref: string) => ["docker", id, "image", ref] as const,
  volumes: (id: string, sizes: boolean) =>
    ["docker", id, "volumes", sizes] as const,
  networks: (id: string) => ["docker", id, "networks"] as const,
  usage: (id: string) => ["docker", id, "usage"] as const,
  projects: (id: string) => ["docker", id, "projects"] as const,
  projectScan: (id: string) => ["docker", id, "project-scan"] as const,
  project: (id: string, name: string) =>
    ["docker", id, "project", name] as const,
  projectStats: (id: string) => ["docker", id, "project-stats"] as const,
  report: (id: string) => ["docker", id, "report"] as const,
  projectLogs: (id: string, name: string, tail: number) =>
    ["docker", id, "project-logs", name, tail] as const,
  versions: (id: string, name: string) =>
    ["docker", id, "project", name, "versions"] as const,
  version: (id: string, name: string, v: string) =>
    ["docker", id, "project", name, "version", v] as const,
  history: (id: string, name: string, range: HistoryRange) =>
    ["docker", id, "project", name, "history", range] as const,
  git: (id: string, name: string) =>
    ["docker", id, "project", name, "git"] as const,
  volumeBackups: (id: string, volume?: string) =>
    ["docker", id, "volume-backups", volume ?? ""] as const,
  updates: (id: string) => ["docker", id, "updates"] as const,
  scans: (id: string) => ["docker", id, "scans"] as const,
  scan: (id: string, image: string) => ["docker", id, "scan", image] as const,
  layers: (id: string, image: string) =>
    ["docker", id, "layers", image] as const,
  layerFiles: (
    id: string,
    image: string,
    layer: number,
    path: string,
    changes: boolean,
  ) => ["docker", id, "layers", image, "files", layer, path, changes] as const,
  events: (id: string, q: EventQuery) => ["docker", id, "events", q] as const,
  workspace: (ws: string) => ["docker", "ws", ws] as const,
  settings: (ws: string) => ["docker", "ws", ws, "settings"] as const,
  serverSettings: (ws: string) =>
    ["docker", "ws", ws, "settings", "servers"] as const,
  effectiveSettings: (id: string) => ["docker", id, "settings"] as const,
  daemon: (id: string) => ["docker", id, "daemon"] as const,
  registries: (ws: string) => ["docker", "ws", ws, "registries"] as const,
  templates: (ws: string) => ["docker", "ws", ws, "templates"] as const,
  autoUpdates: (ws: string) => ["docker", "ws", ws, "auto-updates"] as const,
  autoUpdate: (ws: string, id: string) =>
    ["docker", "ws", ws, "auto-updates", id] as const,
  autoUpdatePreview: (ws: string, rules: DockerAutoUpdateRules) =>
    ["docker", "ws", ws, "auto-update-preview", rules] as const,
  autoUpdateEvents: (ws: string, q: AutoUpdateEventQuery) =>
    ["docker", "ws", ws, "auto-update-events", q] as const,
  serverAutoUpdate: (id: string) => ["docker", id, "auto-update"] as const,
}

export type AutoUpdateEventQuery = {
  policy?: string
  server?: string
  result?: DockerAutoUpdateEvent["result"]
}

export type HistoryRange = "24h" | "7d" | "30d"

export type EventQuery = {
  hours: number
  type: "" | "container" | "image" | "volume" | "network"
  exec: boolean
}

// The fleet re-reads every engine over SSH: a slower poll than one server's.
const FLEET_POLL = 15_000
const LIST_POLL = 5_000
const POLL = 10_000

// Errors that won't change by asking again: no access, not found, no engine.
function retry(count: number, error: Error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500)
    return false
  return count < 2
}

export function useDockerFleet() {
  return useQuery({
    queryKey: dockerKeys.fleet,
    queryFn: () => api.containers.listDockerFleet(),
    refetchInterval: FLEET_POLL,
    retry,
  })
}

export function useDockerEngine(id: string) {
  return useQuery({
    queryKey: dockerKeys.engine(id),
    queryFn: () => api.containers.getDockerEngine(id),
    refetchInterval: POLL,
    retry,
  })
}

export function useDockerContainers(id: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.containers(id),
    queryFn: () => api.containers.listDockerContainers(id),
    refetchInterval: LIST_POLL,
    enabled,
    retry,
  })
}

export function useDockerContainer(id: string, c: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: dockerKeys.container(id, c),
    queryFn: () =>
      api.containers.getDockerContainer(id, seg(c), { size: true }),
    refetchInterval: LIST_POLL,
    retry,
    // The list row stands in while the details load.
    placeholderData: () => {
      const list = qc.getQueryData<DockerContainer[]>(dockerKeys.containers(id))
      const row = list?.find((x) => x.id === c || x.name === c)
      return row ? fromRow(row) : undefined
    },
  })
}

function fromRow(r: DockerContainer) {
  return {
    ...r,
    args: [],
    auto_remove: false,
    cap_add: [],
    cap_drop: [],
    command: [],
    cpu_shares: 0,
    cpus: 0,
    devices: [],
    dns: [],
    endpoints: [],
    entrypoint: [],
    env: [],
    env_hidden: true,
    exit_code: 0,
    exposed_ports: [],
    extra_hosts: [],
    health_failing: 0,
    health_log: [],
    health_test: [],
    labels: {},
    log_options: {},
    memory_limit: 0,
    memory_reservation: 0,
    oom_killed: false,
    pid: 0,
    pids_limit: 0,
    port_bindings: {},
    privileged: false,
    read_only: false,
    restart_count: 0,
    restart_max: 0,
    restart_policy: "",
    size_root_fs: 0,
    size_rw: 0,
    stop_timeout: 0,
    tty: false,
  }
}

export function useDockerInspect(id: string, c: string, enabled: boolean) {
  return useQuery({
    queryKey: dockerKeys.inspect(id, c),
    queryFn: () => api.containers.inspectDockerContainer(id, seg(c)),
    enabled,
    retry,
  })
}

export function useDockerLogs(id: string, c: string, tail: number) {
  return useQuery({
    queryKey: dockerKeys.logs(id, c, tail),
    queryFn: () => api.containers.dockerContainerLogs(id, seg(c), { tail }),
    placeholderData: keepPreviousData,
    retry,
    // Live lines come from the stream; this is the backlog.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  })
}

export function useDockerImages(id: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.images(id),
    queryFn: () => api.containers.listDockerImages(id),
    refetchInterval: POLL,
    enabled,
    retry,
  })
}

export function useDockerImage(id: string, ref: string | null) {
  return useQuery({
    queryKey: dockerKeys.image(id, ref ?? ""),
    queryFn: () => api.containers.getDockerImage(id, seg(ref ?? "")),
    enabled: !!ref,
    retry,
  })
}

export function useDockerVolumes(id: string, sizes: boolean, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.volumes(id, sizes),
    queryFn: () => api.containers.listDockerVolumes(id, { sizes }),
    refetchInterval: sizes ? false : POLL,
    placeholderData: keepPreviousData,
    enabled,
    retry,
  })
}

export function useDockerNetworks(id: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.networks(id),
    queryFn: () => api.containers.listDockerNetworks(id),
    refetchInterval: POLL,
    enabled,
    retry,
  })
}

export function useDockerUsage(id: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.usage(id),
    queryFn: () => api.containers.dockerDiskUsage(id),
    enabled,
    retry,
  })
}

// Every write refreshes the whole server: a container action changes the
// image, volume and network lists' "used by" too. Each call names its server,
// so one set of hooks serves the fleet and a server's page alike.
function useDockerWrite<T extends { server: string }, R>(
  fn: (vars: T) => Promise<R>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: dockerKeys.server(v.server) })
      qc.invalidateQueries({ queryKey: dockerKeys.fleet })
    },
  })
}

export type ContainerAction = "start" | "stop" | "restart" | "pause" | "unpause"

export function useContainerAction() {
  return useDockerWrite(
    (v: {
      server: string
      container: string
      action: ContainerAction
      timeout?: number
    }) =>
      api.containers.dockerContainerAction(
        v.server,
        seg(v.container),
        v.action,
        v.timeout ? { timeout: v.timeout } : {},
      ),
  )
}

export function useKillContainer() {
  return useDockerWrite(
    (v: { server: string; container: string; signal: string }) =>
      api.containers.killDockerContainer(v.server, seg(v.container), {
        signal: v.signal,
      }),
  )
}

export function useRemoveContainer() {
  return useDockerWrite(
    (v: {
      server: string
      container: string
      force: boolean
      volumes: boolean
    }) =>
      api.containers.removeDockerContainer(v.server, seg(v.container), {
        force: v.force,
        volumes: v.volumes,
      }),
  )
}

export function useRenameContainer() {
  return useDockerWrite(
    (v: { server: string; container: string; name: string }) =>
      api.containers.renameDockerContainer(v.server, seg(v.container), {
        name: v.name,
      }),
  )
}

export function usePullImage() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: { server: string; image: string; platform?: string }) =>
      api.containers.pullDockerImage(v.server, {
        image: v.image,
        ...(v.platform ? { platform: v.platform } : {}),
      }),
    onSuccess: (job) => jobs.track(job),
  })
}

export function useRemoveImage() {
  return useDockerWrite(
    (v: { server: string; image: string; force: boolean }) =>
      api.containers.removeDockerImage(v.server, seg(v.image), {
        force: v.force,
      }),
  )
}

export function useTagImage() {
  return useDockerWrite(
    (v: { server: string; image: string; repo: string; tag: string }) =>
      api.containers.tagDockerImage(v.server, seg(v.image), {
        repo: v.repo,
        ...(v.tag ? { tag: v.tag } : {}),
      }),
  )
}

export function useCreateVolume() {
  return useDockerWrite(
    ({
      server,
      ...body
    }: {
      server: string
      name: string
      driver?: string
      labels?: Record<string, string>
      options?: Record<string, string>
    }) => api.containers.createDockerVolume(server, body),
  )
}

export function useRemoveVolume() {
  return useDockerWrite(
    (v: { server: string; volume: string; force: boolean }) =>
      api.containers.removeDockerVolume(v.server, seg(v.volume), {
        force: v.force,
      }),
  )
}

export function useCreateNetwork() {
  return useDockerWrite(
    ({ server, ...body }: DockerNetworkBody & { server: string }) =>
      api.containers.createDockerNetwork(server, body),
  )
}

export function useRemoveNetwork() {
  return useDockerWrite((v: { server: string; network: string }) =>
    api.containers.removeDockerNetwork(v.server, seg(v.network)),
  )
}

export function useConnectNetwork() {
  return useDockerWrite(
    (v: {
      server: string
      network: string
      container: string
      aliases?: string[]
      ipv4?: string
    }) =>
      api.containers.connectDockerNetwork(v.server, seg(v.network), {
        container: v.container,
        ...(v.aliases?.length ? { aliases: v.aliases } : {}),
        ...(v.ipv4 ? { ipv4: v.ipv4 } : {}),
      }),
  )
}

export function useDisconnectNetwork() {
  return useDockerWrite(
    (v: {
      server: string
      network: string
      container: string
      force?: boolean
    }) =>
      api.containers.disconnectDockerNetwork(v.server, seg(v.network), {
        container: v.container,
        force: v.force,
      }),
  )
}

export function usePrune() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: ({ server, ...body }: DockerPruneBody & { server: string }) =>
      api.containers.pruneDocker(server, body),
    onSuccess: (job) => jobs.track(job),
  })
}

function streamUrl(path: string, params?: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  const url = new URL(path, base)
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
  return url.toString()
}

const MAX_LIVE = 5000

// Follows a container's log from `since` on (the end of the backlog). The
// lines arrive in batches; `end` says why the stream stopped (the container
// stopped, or it failed).
export function useLogFollow(
  id: string,
  c: string,
  since: string | undefined,
  enabled: boolean,
) {
  const [lines, setLines] = useState<DockerLogLine[]>([])
  const [end, setEnd] = useState<DockerStreamEnd | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    setLines([])
    setEnd(null)
    setLive(false)
    if (!enabled) return
    let after = since
    let es: EventSource | null = null
    let closed = false
    let timer = 0
    const open = () => {
      es = new EventSource(
        streamUrl(
          `/servers/${id}/docker/containers/${seg(c)}/logs/stream`,
          after ? { since: after } : undefined,
        ),
        { withCredentials: true },
      )
      es.onopen = () => setLive(true)
      es.addEventListener("lines", (ev) => {
        const batch = JSON.parse((ev as MessageEvent).data) as DockerLogBatch
        const last = batch.lines.at(-1)?.time
        // Reopen after the last line seen, a nanosecond on, so it isn't
        // printed twice.
        if (last) after = nextNano(last)
        setLines((prev) => {
          const next = prev.concat(batch.lines)
          return next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next
        })
      })
      es.addEventListener("end", (ev) => {
        closed = true
        setEnd(JSON.parse((ev as MessageEvent).data) as DockerStreamEnd)
        setLive(false)
        es?.close()
      })
      es.onerror = () => {
        setLive(false)
        es?.close()
        if (!closed) timer = window.setTimeout(() => !closed && open(), 2000)
      }
    }
    open()
    return () => {
      closed = true
      window.clearTimeout(timer)
      es?.close()
    }
  }, [id, c, since, enabled])

  return { lines, end, live }
}

// RFC 3339 with nanoseconds, plus one nanosecond.
function nextNano(t: string) {
  const m = t.match(/^(.*\.)(\d{1,9})(Z|[+-].*)$/)
  if (!m) return t
  const digits = m[2].padEnd(9, "0")
  const n = String(Number(digits) + 1).padStart(9, "0")
  if (n.length > 9) return t
  return `${m[1]}${n}${m[3]}`
}

export const STATS_HISTORY = 90

export type StatsState = {
  now: DockerStats | null
  history: DockerStats[]
  end: DockerStreamEnd | null
  live: boolean
}

// Live resource use of one container, about once a second, with the last
// minute and a half kept for the charts. Closed while the tab is hidden.
export function useContainerStats(id: string, c: string, enabled: boolean) {
  const [state, setState] = useState<StatsState>({
    now: null,
    history: [],
    end: null,
    live: false,
  })

  useEffect(() => {
    setState({ now: null, history: [], end: null, live: false })
    if (!enabled) return
    let es: EventSource | null = null
    let closed = false
    let timer = 0
    const open = () => {
      if (document.hidden) return
      es = new EventSource(
        streamUrl(`/servers/${id}/docker/containers/${seg(c)}/stats/stream`),
        { withCredentials: true },
      )
      es.onopen = () => setState((s) => ({ ...s, live: true, end: null }))
      es.addEventListener("stats", (ev) => {
        const st = JSON.parse((ev as MessageEvent).data) as DockerStats
        setState((s) => ({
          ...s,
          now: st,
          live: true,
          history: [...s.history, st].slice(-STATS_HISTORY),
        }))
      })
      es.addEventListener("end", (ev) => {
        closed = true
        const end = JSON.parse((ev as MessageEvent).data) as DockerStreamEnd
        setState((s) => ({ ...s, end, live: false }))
        es?.close()
      })
      es.onerror = () => {
        setState((s) => ({ ...s, live: false }))
        es?.close()
        es = null
        if (!closed) timer = window.setTimeout(() => !closed && open(), 2000)
      }
    }
    const onVisible = () => {
      if (closed) return
      if (document.hidden) {
        es?.close()
        es = null
        setState((s) => ({ ...s, live: false }))
      } else if (!es) open()
    }
    document.addEventListener("visibilitychange", onVisible)
    open()
    return () => {
      closed = true
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      es?.close()
    }
  }, [id, c, enabled])

  return state
}

// --- Compose projects -------------------------------------------------------

export function useDockerProjects(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.projects(id ?? ""),
    queryFn: () => api.containers.listDockerProjects(id ?? ""),
    refetchInterval: POLL,
    enabled: !!id && enabled,
    retry,
  })
}

export function useDockerProject(id: string, name: string) {
  return useQuery({
    queryKey: dockerKeys.project(id, name),
    queryFn: () => api.containers.getDockerProject(id, seg(name)),
    refetchInterval: POLL,
    retry,
  })
}

// Live numbers for every compose project on a server (CPU, memory,
// network, health, restarts, a short history). Measuring takes a couple of
// seconds on the server, so this polls gently.
// fast: a deploy is running, so containers come and go by the second.
export function useProjectStats(
  id: string | undefined,
  enabled = true,
  fast = false,
) {
  return useQuery({
    queryKey: dockerKeys.projectStats(id ?? ""),
    queryFn: () => api.containers.dockerProjectStats(id ?? ""),
    refetchInterval: fast ? 4_000 : 12_000,
    placeholderData: keepPreviousData,
    enabled: !!id && enabled,
    retry,
  })
}

// The Dashboard's report: every container's state and live numbers, the
// networks and who talks to whom. Measuring reads the server, so it polls
// gently and keeps the last answer while the next one loads.
export function useDockerReport(id: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.report(id ?? ""),
    queryFn: () => api.containers.dockerReport(id ?? ""),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
    enabled: !!id,
    retry,
  })
}

export function useProjectLogs(
  id: string,
  name: string,
  tail: number,
  enabled = true,
) {
  return useQuery({
    queryKey: dockerKeys.projectLogs(id, name, tail),
    queryFn: () => api.containers.dockerProjectLogs(id, seg(name), { tail }),
    enabled,
    retry,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

// Follows every running container of a project from `since` on; reconnects
// after a failure and, when the stream ends because all of them stopped,
// tries again a little later (a redeploy makes new containers).
export function useProjectLogFollow(
  id: string,
  name: string,
  since: string | undefined,
  enabled: boolean,
) {
  const [lines, setLines] = useState<DockerProjectLogLine[]>([])
  const [end, setEnd] = useState<DockerStreamEnd | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    setLines([])
    setEnd(null)
    setLive(false)
    if (!enabled) return
    let after = since
    let es: EventSource | null = null
    let closed = false
    let timer = 0
    const open = () => {
      es = new EventSource(
        streamUrl(
          `/servers/${id}/docker/projects/${seg(name)}/logs/stream`,
          after ? { since: after } : undefined,
        ),
        { withCredentials: true },
      )
      es.onopen = () => {
        setLive(true)
        setEnd(null)
      }
      es.addEventListener("lines", (ev) => {
        const batch = JSON.parse(
          (ev as MessageEvent).data,
        ) as DockerProjectLogBatch
        const last = batch.lines.at(-1)?.time
        if (last) after = nextNano(last)
        setLines((prev) => {
          const next = prev.concat(batch.lines)
          return next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next
        })
      })
      es.addEventListener("end", (ev) => {
        setEnd(JSON.parse((ev as MessageEvent).data) as DockerStreamEnd)
        setLive(false)
        es?.close()
        if (!closed) timer = window.setTimeout(() => !closed && open(), 10_000)
      })
      es.onerror = () => {
        setLive(false)
        es?.close()
        if (!closed) timer = window.setTimeout(() => !closed && open(), 2000)
      }
    }
    open()
    return () => {
      closed = true
      window.clearTimeout(timer)
      es?.close()
    }
  }, [id, name, since, enabled])

  return { lines, end, live }
}

// The last look for compose projects on the server's disk. The first
// listing of its projects starts one by itself, so this polls while it runs.
export function useProjectScan(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.projectScan(id ?? ""),
    queryFn: () => api.containers.getDockerProjectScan(id ?? ""),
    enabled: !!id && enabled,
    refetchInterval: (q) => (q.state.data?.running ? 3_000 : 60_000),
    retry,
  })
}

export function useScanProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { server: string; paths?: string[]; depth?: number }) =>
      api.containers.scanDockerProjects(v.server, {
        paths: v.paths?.length ? v.paths : undefined,
        depth: v.depth || undefined,
      }),
    onSuccess: (r, v) => {
      qc.setQueryData(dockerKeys.projectScan(v.server), r)
    },
  })
}

export function useAddProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      server: string
      items: { path: string; name?: string }[]
    }) =>
      api.containers.addDockerProjects(v.server, {
        items: v.items.map((i) => ({
          path: i.path,
          name: i.name || undefined,
        })),
      }),
    onSettled: (_r, _e, v) => {
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) })
      qc.invalidateQueries({ queryKey: dockerKeys.projectScan(v.server) })
      qc.invalidateQueries({ queryKey: dockerKeys.projectStats(v.server) })
    },
  })
}

export function useForgetProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { server: string; project: string }) =>
      api.containers.forgetDockerProject(v.server, seg(v.project)),
    onSuccess: (_r, v) => {
      qc.setQueryData<DockerProject[]>(dockerKeys.projects(v.server), (old) =>
        old?.filter((p) => p.name !== v.project),
      )
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) })
      qc.invalidateQueries({ queryKey: dockerKeys.projectScan(v.server) })
      qc.invalidateQueries({ queryKey: dockerKeys.projectStats(v.server) })
    },
  })
}

export function useSaveProjectMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      server: string
      project: string
      title: string
      note: string
    }) =>
      api.containers.setDockerProjectMeta(v.server, seg(v.project), {
        title: v.title,
        note: v.note,
      }),
    onSuccess: (p: DockerProject, v) => {
      qc.setQueryData<DockerProject[]>(dockerKeys.projects(v.server), (old) =>
        old?.map((o) => (o.name === p.name ? { ...o, ...p } : o)),
      )
      qc.setQueryData<DockerProjectDetails>(
        dockerKeys.project(v.server, v.project),
        (old) => (old ? { ...old, title: p.title, note: p.note } : old),
      )
    },
  })
}

export type ProjectAction =
  | "up"
  | "down"
  | "start"
  | "stop"
  | "restart"
  | "pull"
  | "redeploy"
  | "destroy"

export function useProjectAction() {
  const jobs = useJobActions()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      server: string
      project: string
      action: ProjectAction
    }) =>
      api.containers.dockerProjectAction(v.server, seg(v.project), v.action),
    onSuccess: (job) => jobs.track(job),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) }),
  })
}

export function useCreateProject() {
  const jobs = useJobActions()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      server: string
      name: string
      compose: string
      env: string
      start: boolean
    }) =>
      api.containers.createDockerProject(v.server, {
        name: v.name,
        compose: v.compose,
        ...(v.env ? { env: v.env } : {}),
        ...(v.start ? { start: true } : {}),
      }),
    onSuccess: (res, v) => {
      // The answer is the list row, not the details with the files.
      qc.invalidateQueries({
        queryKey: dockerKeys.project(v.server, res.project.name),
      })
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) })
      if (res.job) jobs.track(res.job)
    },
  })
}

// `docker compose config` + a port check on the server, over a temporary
// copy of the files. Nothing is saved.
export function useCheckProject() {
  return useMutation({
    mutationFn: (v: {
      server: string
      name: string
      compose: string
      env: string
    }) =>
      api.containers.checkDockerProject(v.server, {
        compose: v.compose,
        ...(v.name ? { name: v.name } : {}),
        ...(v.env ? { env: v.env } : {}),
      }),
  })
}

export function useSaveProjectFiles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      server: string
      project: string
      compose: string
      env: string
      revision: string
      note?: string
    }) =>
      api.containers.saveDockerProjectFiles(v.server, seg(v.project), {
        compose: v.compose,
        env: v.env,
        ...(v.revision ? { revision: v.revision } : {}),
        ...(v.note?.trim() ? { note: v.note.trim() } : {}),
      }),
    onSuccess: (d: DockerProjectDetails, v) => {
      qc.setQueryData(dockerKeys.project(v.server, v.project), d)
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) })
      qc.invalidateQueries({
        queryKey: dockerKeys.versions(v.server, v.project),
      })
    },
  })
}

// --- Image updates ----------------------------------------------------------

export function useDockerUpdates(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.updates(id ?? ""),
    queryFn: () => api.containers.listDockerUpdates(id ?? ""),
    enabled: !!id && enabled,
    retry,
  })
}

export function useCheckUpdates() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: { server: string }) =>
      api.containers.checkDockerUpdates(v.server),
    onSuccess: (job) => jobs.track(job),
  })
}

export function useApplyUpdates() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: { server: string; containers: string[] }) =>
      api.containers.applyDockerUpdates(v.server, { containers: v.containers }),
    onSuccess: (job) => jobs.track(job),
  })
}

// --- Vulnerability scans ----------------------------------------------------

export function useDockerScans(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.scans(id ?? ""),
    queryFn: () => api.containers.listDockerScans(id ?? ""),
    enabled: !!id && enabled,
    retry,
  })
}

export function useDockerScan(id: string, image: string | null) {
  return useQuery({
    queryKey: dockerKeys.scan(id, image ?? ""),
    queryFn: () => api.containers.getDockerScan(id, seg(image ?? "")),
    enabled: !!image,
    retry,
  })
}

export function useScanImages() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: ({ server, ...body }: DockerScanBody & { server: string }) =>
      api.containers.scanDockerImages(server, body),
    onSuccess: (job) => jobs.track(job),
  })
}

// --- Event log --------------------------------------------------------------

export function useDockerEvents(id: string | undefined, q: EventQuery) {
  return useQuery({
    queryKey: dockerKeys.events(id ?? "", q),
    queryFn: () =>
      api.containers.listDockerEvents(id ?? "", {
        hours: q.hours,
        ...(q.type ? { type: q.type } : {}),
        ...(q.exec ? { exec: true } : {}),
      }),
    enabled: !!id,
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
    retry,
  })
}

// --- Workspace: settings, registries, templates ----------------------------

export function useDockerSettings(ws: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.settings(ws ?? ""),
    queryFn: () => api.containers.getDockerSettings(ws ?? ""),
    enabled: !!ws,
    retry,
  })
}

export function useSaveDockerSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ws, ...body }: DockerSettingsBody & { ws: string }) =>
      api.containers.updateDockerSettings(ws, body),
    onSuccess: (d, v) => {
      qc.setQueryData(dockerKeys.settings(v.ws), d)
      dropEffective(qc)
    },
  })
}

// A server's settings are its workspace's with its own laid over them.
const dropEffective = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({
    predicate: (q) =>
      q.queryKey[0] === "docker" &&
      q.queryKey[1] !== "ws" &&
      q.queryKey[2] === "settings",
  })

// Every environment that sets some of its own settings, with its last
// automatic clean-up.
export function useDockerServerSettings(ws: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.serverSettings(ws ?? ""),
    queryFn: () =>
      api.containers.listDockerServerSettings(ws ?? "").then((r) => r.items),
    enabled: !!ws,
    retry,
  })
}

// Saves one environment's own settings; none at all = it follows the
// workspace again.
export function useSaveDockerServerSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ws,
      server,
      overrides,
    }: {
      ws: string
      server: string
      overrides: DockerSettingsOverrides
    }) =>
      Object.keys(overrides).length === 0
        ? api.containers
            .deleteDockerServerSettings(ws, server)
            .then(() => undefined)
        : api.containers.updateDockerServerSettings(ws, server, overrides),
    onSuccess: (d, v) => {
      // Written at once, so the settings page never shows the old values
      // between the save and the refetch.
      qc.setQueryData<DockerServerSettings[]>(
        dockerKeys.serverSettings(v.ws),
        (list) =>
          list &&
          (d
            ? [...list.filter((x) => x.server_id !== v.server), d]
            : list.map((x) =>
                x.server_id === v.server ? { ...x, overrides: {} } : x,
              )),
      )
      qc.invalidateQueries({ queryKey: dockerKeys.serverSettings(v.ws) })
      qc.invalidateQueries({ queryKey: dockerKeys.effectiveSettings(v.server) })
    },
  })
}

// What a server actually uses (`overridden` = the keys it sets itself).
export function useEffectiveDockerSettings(server: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.effectiveSettings(server ?? ""),
    queryFn: () => api.containers.getServerDockerSettings(server ?? ""),
    enabled: !!server,
    retry,
  })
}

export function useDockerRegistries(ws: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.registries(ws ?? ""),
    queryFn: () =>
      api.containers.listDockerRegistries(ws ?? "").then((r) => r.items),
    enabled: !!ws,
    retry,
  })
}

export function useSaveRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ws,
      id,
      ...body
    }: DockerRegistryBody & { ws: string; id?: string }) =>
      id
        ? api.containers.updateDockerRegistry(ws, id, body)
        : api.containers.createDockerRegistry(ws, body),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.registries(v.ws) }),
  })
}

export function useDeleteRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { ws: string; id: string }) =>
      api.containers.deleteDockerRegistry(v.ws, v.id),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.registries(v.ws) }),
  })
}

export function useTestRegistry() {
  return useMutation({
    mutationFn: (v: {
      ws: string
      id?: string
      server: string
      address: string
      username: string
      password?: string
    }) =>
      api.containers.testDockerRegistry(v.ws, {
        address: v.address,
        username: v.username,
        server_id: v.server,
        ...(v.password ? { password: v.password } : {}),
        ...(v.id ? { registry_id: v.id } : {}),
      }),
  })
}

export function useDockerTemplates(ws: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.templates(ws ?? ""),
    queryFn: () => api.containers.listDockerTemplates(ws ?? ""),
    enabled: !!ws,
    staleTime: 60_000,
    retry,
  })
}

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ws,
      id,
      ...body
    }: DockerTemplateBody & { ws: string; id?: string }) =>
      id
        ? api.containers.updateDockerTemplate(ws, id, body)
        : api.containers.createDockerTemplate(ws, body),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.templates(v.ws) }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { ws: string; id: string }) =>
      api.containers.deleteDockerTemplate(v.ws, v.id),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.templates(v.ws) }),
  })
}

// A Docker job of one of these kinds still running on this server, from any
// page: its button shows the progress and doesn't start a second one.
export function useActiveDockerJob(serverId: string, kinds: string[]) {
  const { data } = useJobList()
  return data?.find(
    (j) =>
      isActive(j) &&
      kinds.includes(j.kind) &&
      (j.target?.server_id === serverId || j.refs.includes(serverId)),
  )
}

// --- Project file history ---------------------------------------------------

export function useProjectVersions(id: string, name: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.versions(id, name),
    queryFn: () => api.containers.listDockerProjectVersions(id, seg(name)),
    enabled,
    retry,
  })
}

export function useProjectVersion(id: string, name: string, v: string | null) {
  return useQuery({
    queryKey: dockerKeys.version(id, name, v ?? ""),
    queryFn: () =>
      api.containers.getDockerProjectVersion(id, seg(name), v ?? ""),
    enabled: !!v,
    // Old versions never change; the .env inside is a secret, so it isn't
    // kept around once nobody looks.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 60_000,
    retry,
  })
}

export function useRestoreVersion() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      server: string
      project: string
      version: string
      revision: string
      deploy: boolean
    }) =>
      api.containers.restoreDockerProjectVersion(
        v.server,
        seg(v.project),
        v.version,
        {
          ...(v.revision ? { revision: v.revision } : {}),
          ...(v.deploy ? { deploy: true } : {}),
        },
      ),
    onSuccess: (res, v) => {
      qc.setQueryData(dockerKeys.project(v.server, v.project), res.project)
      qc.invalidateQueries({
        queryKey: dockerKeys.versions(v.server, v.project),
      })
      if (res.job) jobs.track(res.job)
    },
  })
}

// --- Stats history ----------------------------------------------------------

export function useProjectHistory(
  id: string,
  name: string,
  range: HistoryRange,
) {
  return useQuery({
    queryKey: dockerKeys.history(id, name, range),
    queryFn: () =>
      api.containers.dockerProjectHistory(id, seg(name), { range }),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
    retry,
  })
}

// --- Git source -------------------------------------------------------------

export type GitForm = {
  repo_url: string
  branch: string
  compose_path: string
  username: string
  token: string
  clear_token: boolean
  auto_deploy: boolean
  poll_minutes: number
}

function gitBody(f: GitForm) {
  return {
    repo_url: f.repo_url.trim(),
    branch: f.branch.trim() || "main",
    auto_deploy: f.auto_deploy,
    poll_minutes: f.poll_minutes,
    ...(f.compose_path.trim() ? { compose_path: f.compose_path.trim() } : {}),
    ...(f.username.trim() ? { username: f.username.trim() } : {}),
    ...(f.token.trim() ? { token: f.token.trim() } : {}),
    ...(f.clear_token ? { clear_token: true } : {}),
  }
}

export function useProjectGit(id: string, name: string) {
  return useQuery({
    queryKey: dockerKeys.git(id, name),
    queryFn: () => api.containers.getDockerProjectGit(id, seg(name)),
    refetchInterval: (q) => (q.state.data?.source?.deploying ? 4_000 : 30_000),
    retry,
  })
}

export function useSaveGit() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      server: string
      project: string
      form: GitForm
      deploy: boolean
    }) =>
      api.containers.saveDockerProjectGit(v.server, seg(v.project), {
        ...gitBody(v.form),
        ...(v.deploy ? { deploy: true } : {}),
      }),
    onSuccess: (res, v) => {
      qc.setQueryData(dockerKeys.git(v.server, v.project), {
        source: res.source,
      })
      if (res.job) jobs.track(res.job)
    },
  })
}

export function useDeleteGit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { server: string; project: string }) =>
      api.containers.deleteDockerProjectGit(v.server, seg(v.project)),
    onSuccess: (_d, v) =>
      qc.setQueryData(dockerKeys.git(v.server, v.project), { source: null }),
  })
}

export function useDeployGit() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: { server: string; project: string; force: boolean }) =>
      api.containers.deployDockerProjectGit(v.server, seg(v.project), {
        ...(v.force ? { force: true } : {}),
      }),
    onSuccess: (job, v) => {
      jobs.track(job)
      qc.invalidateQueries({ queryKey: dockerKeys.git(v.server, v.project) })
    },
  })
}

export function useResetWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { server: string; project: string }) =>
      api.containers.resetDockerProjectWebhook(v.server, seg(v.project)),
    onSuccess: (source, v) =>
      qc.setQueryData(dockerKeys.git(v.server, v.project), { source }),
  })
}

export function useCreateFromGit() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      server: string
      name: string
      form: GitForm
      deploy?: boolean
    }) =>
      api.containers.createDockerProjectGit(v.server, {
        name: v.name,
        ...gitBody(v.form),
        ...(v.deploy ? { deploy: true } : {}),
      }),
    onSuccess: (res, v) => {
      qc.setQueryData(dockerKeys.git(v.server, v.name), { source: res.source })
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) })
      if (res.job) jobs.track(res.job)
    },
  })
}

// --- Volume backups ---------------------------------------------------------

export function useVolumeBackups(id: string, volume?: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.volumeBackups(id, volume),
    queryFn: () =>
      api.containers.listDockerVolumeBackups(id, volume ? { volume } : {}),
    refetchInterval: (q) =>
      q.state.data?.items.some((b) => b.state === "running") ? 4_000 : 30_000,
    enabled,
    retry,
  })
}

export function useBackupVolume() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      server: string
      volume: string
      storage: string
      folder: string
      stop: boolean
    }) =>
      api.containers.backupDockerVolume(v.server, seg(v.volume), {
        storage_id: v.storage,
        ...(v.folder.trim() ? { folder: v.folder.trim() } : {}),
        ...(v.stop ? { stop: true } : {}),
      }),
    onSuccess: (job, v) => {
      jobs.track(job)
      qc.invalidateQueries({ queryKey: ["docker", v.server, "volume-backups"] })
    },
  })
}

export function useRestoreVolumeBackup() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      server: string
      backup: string
      volume: string
      replace: boolean
      stop: boolean
    }) =>
      api.containers.restoreDockerVolumeBackup(v.server, v.backup, {
        ...(v.volume ? { volume: v.volume } : {}),
        ...(v.replace ? { replace: true } : {}),
        ...(v.stop ? { stop: true } : {}),
      }),
    onSuccess: (job, v) => {
      jobs.track(job)
      qc.invalidateQueries({ queryKey: dockerKeys.server(v.server) })
    },
  })
}

export function useDeleteVolumeBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { server: string; backup: string }) =>
      api.containers.deleteDockerVolumeBackup(v.server, v.backup),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({
        queryKey: ["docker", v.server, "volume-backups"],
      }),
  })
}

// Layer explorer: the first call starts reading the image on the backend;
// it answers `reading` with the bytes read until it is `ready`.
export function useImageLayers(id: string, image: string, enabled = true) {
  return useQuery({
    queryKey: dockerKeys.layers(id, image),
    queryFn: () => api.containers.getDockerImageLayers(id, seg(image)),
    refetchInterval: (q) => (q.state.data?.state === "reading" ? 1000 : false),
    enabled: enabled && !!image,
    retry,
  })
}

export function useReadLayersAgain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { server: string; image: string }) =>
      api.containers.getDockerImageLayers(v.server, seg(v.image), {
        refresh: true,
      }),
    onSuccess: (data, v) => {
      qc.removeQueries({
        queryKey: [...dockerKeys.layers(v.server, v.image), "files"],
      })
      qc.setQueryData(dockerKeys.layers(v.server, v.image), data)
    },
  })
}

export function useLayerFiles(
  id: string,
  image: string,
  layer: number,
  path: string,
  changes: boolean,
  enabled: boolean,
) {
  return useQuery({
    queryKey: dockerKeys.layerFiles(id, image, layer, path, changes),
    queryFn: () =>
      api.containers.listDockerImageLayerFiles(id, seg(image), {
        layer,
        ...(path ? { path } : {}),
        ...(changes ? { changes: true } : {}),
      }),
    placeholderData: keepPreviousData,
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
    retry,
  })
}

export function useExportImage() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      server: string
      image: string
      storage: string
      folder: string
    }) =>
      api.containers.exportDockerImage(v.server, seg(v.image), {
        storage_id: v.storage,
        ...(v.folder.trim() ? { folder: v.folder.trim() } : {}),
      }),
    onSuccess: (job) => jobs.track(job),
  })
}

export function useImportImage() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: { server: string; storage: string; path: string }) =>
      api.containers.importDockerImage(v.server, {
        storage_id: v.storage,
        path: v.path,
      }),
    onSuccess: (job) => jobs.track(job),
  })
}

export function useCopyImage() {
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: { server: string; image: string; targets: string[] }) =>
      api.containers.copyDockerImage(v.server, seg(v.image), {
        server_ids: v.targets,
      }),
    onSuccess: (job) => jobs.track(job),
  })
}

export function useRunContainer() {
  return useDockerWrite((v: { server: string; body: DockerRunBody }) =>
    api.containers.runDockerContainer(v.server, v.body),
  )
}

// --- Auto-update (Watchtower-like policies) ---------------------------------

export function useAutoUpdates(ws: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.autoUpdates(ws ?? ""),
    queryFn: () => api.containers.listDockerAutoUpdates(ws ?? ""),
    enabled: !!ws,
    // A run's state and next time move by themselves: keep it fresh.
    refetchInterval: (q) =>
      q.state.data?.items.some((p) => p.running) ? 3_000 : 15_000,
    retry,
  })
}

export function useAutoUpdate(ws: string | undefined, id: string | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: dockerKeys.autoUpdate(ws ?? "", id ?? ""),
    queryFn: () => api.containers.getDockerAutoUpdate(ws ?? "", id ?? ""),
    enabled: !!ws && !!id,
    initialData: () =>
      qc
        .getQueryData<{ items: DockerAutoUpdate[] }>(
          dockerKeys.autoUpdates(ws ?? ""),
        )
        ?.items.find((p) => p.id === id),
    initialDataUpdatedAt: 0,
    refetchInterval: (q) => (q.state.data?.running ? 3_000 : 15_000),
    retry,
  })
}

// Every write answers the fresh policy: put it in both caches.
function usePutAutoUpdate() {
  const qc = useQueryClient()
  return (ws: string, p: DockerAutoUpdate) => {
    qc.setQueryData(dockerKeys.autoUpdate(ws, p.id), p)
    qc.setQueryData<{ items: DockerAutoUpdate[] }>(
      dockerKeys.autoUpdates(ws),
      (old) =>
        old && {
          ...old,
          items: old.items.some((x) => x.id === p.id)
            ? old.items.map((x) => (x.id === p.id ? p : x))
            : [...old.items, p],
        },
    )
  }
}

export function useSaveAutoUpdate() {
  const qc = useQueryClient()
  const put = usePutAutoUpdate()
  return useMutation({
    mutationFn: ({
      ws,
      id,
      ...body
    }: DockerAutoUpdateBody & { ws: string; id?: string }) =>
      id
        ? api.containers.updateDockerAutoUpdate(ws, id, body)
        : api.containers.createDockerAutoUpdate(ws, body),
    onSuccess: (p, v) => put(v.ws, p),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.autoUpdates(v.ws) }),
  })
}

export function useSetAutoUpdateEnabled() {
  const put = usePutAutoUpdate()
  return useMutation({
    mutationFn: (v: { ws: string; id: string; enabled: boolean }) =>
      api.containers.setDockerAutoUpdateEnabled(v.ws, v.id, {
        enabled: v.enabled,
      }),
    onSuccess: (p, v) => put(v.ws, p),
  })
}

export function useResetAutoUpdateWebhook() {
  const put = usePutAutoUpdate()
  return useMutation({
    mutationFn: (v: { ws: string; id: string }) =>
      api.containers.resetDockerAutoUpdateWebhook(v.ws, v.id),
    onSuccess: (p, v) => put(v.ws, p),
  })
}

export function useDeleteAutoUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { ws: string; id: string }) =>
      api.containers.deleteDockerAutoUpdate(v.ws, v.id),
    onSuccess: (_d, v) => {
      qc.setQueryData<{ items: DockerAutoUpdate[] }>(
        dockerKeys.autoUpdates(v.ws),
        (old) =>
          old && { ...old, items: old.items.filter((x) => x.id !== v.id) },
      )
      qc.removeQueries({ queryKey: dockerKeys.autoUpdate(v.ws, v.id) })
    },
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: dockerKeys.autoUpdates(v.ws) }),
  })
}

export function useRunAutoUpdate() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: (v: {
      ws: string
      id: string
      checkOnly?: boolean
      server?: string
    }) =>
      api.containers.runDockerAutoUpdate(v.ws, v.id, {
        ...(v.checkOnly ? { check_only: true } : {}),
        ...(v.server ? { server: v.server } : {}),
      }),
    onSuccess: (job, v) => {
      jobs.track(job)
      qc.invalidateQueries({ queryKey: dockerKeys.autoUpdates(v.ws) })
    },
  })
}

// Which containers the rules take right now, on each server. The rules are
// the key, so the caller debounces them.
export function useAutoUpdatePreview(
  ws: string | undefined,
  rules: DockerAutoUpdateRules | null,
) {
  return useQuery({
    queryKey: dockerKeys.autoUpdatePreview(
      ws ?? "",
      rules ?? {
        servers: [],
        pick: "all",
        mode: "update",
        include_stopped: false,
      },
    ),
    queryFn: ({ signal }) =>
      api.containers.previewDockerAutoUpdate(
        ws ?? "",
        rules as DockerAutoUpdateRules,
        { signal },
      ),
    enabled: !!ws && !!rules && rules.servers.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    retry,
  })
}

export function useAutoUpdateEvents(
  ws: string | undefined,
  q: AutoUpdateEventQuery,
) {
  return useInfiniteQuery({
    queryKey: dockerKeys.autoUpdateEvents(ws ?? "", q),
    queryFn: ({ pageParam, signal }) =>
      api.containers.listDockerAutoUpdateEvents(
        ws ?? "",
        {
          ...(pageParam ? { before: pageParam } : {}),
          ...(q.policy ? { policy: q.policy } : {}),
          ...(q.server ? { server: q.server } : {}),
          ...(q.result ? { result: q.result } : {}),
        },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next || undefined,
    enabled: !!ws,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    retry,
  })
}

// Which of this server's containers some policy keeps up to date.
export function useServerAutoUpdate(server: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.serverAutoUpdate(server ?? ""),
    queryFn: () => api.containers.getServerDockerAutoUpdate(server ?? ""),
    enabled: !!server,
    staleTime: 30_000,
    retry,
  })
}

// Docker's own daemon.json on a server. Read as root/sudo; written by an
// Owner. A save answers the fresh file, written straight into the cache.
export function useDaemonConfig(server: string | undefined) {
  return useQuery({
    queryKey: dockerKeys.daemon(server ?? ""),
    queryFn: () => api.containers.getDockerDaemonConfig(server ?? ""),
    enabled: !!server,
    refetchOnWindowFocus: false,
    retry,
  })
}

function useDaemonDone() {
  const qc = useQueryClient()
  return (server: string, d: DockerDaemonResult) => {
    qc.setQueryData(dockerKeys.daemon(server), d.config)
    // A restart drops every container's connection and may change what the
    // engine reports (storage driver, log driver…).
    if (d.applied === "restart") {
      qc.invalidateQueries({ queryKey: dockerKeys.server(server) })
      qc.invalidateQueries({ queryKey: dockerKeys.fleet })
    } else if (d.applied === "reload") {
      qc.invalidateQueries({ queryKey: dockerKeys.engine(server) })
    }
  }
}

export function useSaveDaemonConfig() {
  const done = useDaemonDone()
  return useMutation({
    mutationFn: ({
      server,
      ...body
    }: DockerDaemonSaveBody & { server: string }) =>
      api.containers.saveDockerDaemonConfig(server, body),
    onSuccess: (d, v) => done(v.server, d),
  })
}

export function useApplyDaemon() {
  const done = useDaemonDone()
  return useMutation({
    mutationFn: ({
      server,
      apply,
    }: {
      server: string
      apply: "reload" | "restart"
    }) => api.containers.applyDockerDaemonConfig(server, { apply }),
    onSuccess: (d, v) => done(v.server, d),
  })
}
