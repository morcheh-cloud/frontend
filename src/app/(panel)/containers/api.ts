"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { isActive, useJobList } from "@/components/jobs/api"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ApiError, api } from "@/lib/api"
import type {
  DockerContainer,
  DockerLogBatch,
  DockerLogLine,
  DockerNetworkBody,
  DockerProjectDetails,
  DockerPruneBody,
  DockerRegistryBody,
  DockerScanBody,
  DockerSettingsBody,
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
  project: (id: string, name: string) =>
    ["docker", id, "project", name] as const,
  updates: (id: string) => ["docker", id, "updates"] as const,
  scans: (id: string) => ["docker", id, "scans"] as const,
  scan: (id: string, image: string) => ["docker", id, "scan", image] as const,
  events: (id: string, q: EventQuery) => ["docker", id, "events", q] as const,
  workspace: (ws: string) => ["docker", "ws", ws] as const,
  settings: (ws: string) => ["docker", "ws", ws, "settings"] as const,
  registries: (ws: string) => ["docker", "ws", ws, "registries"] as const,
  templates: (ws: string) => ["docker", "ws", ws, "templates"] as const,
}

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

export function useSaveProjectFiles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      server: string
      project: string
      compose: string
      env: string
      revision: string
    }) =>
      api.containers.saveDockerProjectFiles(v.server, seg(v.project), {
        compose: v.compose,
        env: v.env,
        ...(v.revision ? { revision: v.revision } : {}),
      }),
    onSuccess: (d: DockerProjectDetails, v) => {
      qc.setQueryData(dockerKeys.project(v.server, v.project), d)
      qc.invalidateQueries({ queryKey: dockerKeys.projects(v.server) })
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
    onSuccess: (d, v) => qc.setQueryData(dockerKeys.settings(v.ws), d),
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
