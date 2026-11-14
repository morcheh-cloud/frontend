"use client"

import {
  keepPreviousData,
  type QueryClient,
  useQuery,
} from "@tanstack/react-query"
import { useSyncExternalStore } from "react"

import { type ApiError, api } from "@/lib/api"
import type { Job } from "@/lib/services"

export const jobKeys = {
  all: ["jobs"] as const,
  list: ["jobs", "list"] as const,
  detail: (id: string) => ["jobs", "detail", id] as const,
}

export function isActive(job: Pick<Job, "state">) {
  return job.state === "queued" || job.state === "running"
}

// The newest jobs, kept live by the stream in JobsProvider, so the button,
// the page and the details all read one list.
export function useJobList() {
  const query = useQuery<Job[], ApiError>({
    queryKey: jobKeys.list,
    queryFn: fetchJobs,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  // A Suspense boundary can hydrate after the list has arrived; it has to
  // start from what the server rendered, which is no list.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  return hydrated ? query : { ...query, data: undefined, isPending: true }
}

const subscribeNever = () => () => {}

async function fetchJobs({ client }: { client: QueryClient }) {
  const { items } = await api.jobs.listJobs({ limit: 200 })
  return mergeJobs(client.getQueryData<Job[]>(jobKeys.list), items)
}

// A list that was on its way while events arrived mustn't undo them: a job
// that has finished stays finished, and one started since stays in it. Only
// running jobs are kept, or clearing the finished ones would bring them back.
function mergeJobs(prev: Job[] | undefined, next: Job[]) {
  const had = new Map(prev?.map((j) => [j.id, j]))
  const merged = next.map((j) => {
    const known = had.get(j.id)
    return known && isActive(j) && !isActive(known) ? known : j
  })
  const newest = next.length ? Date.parse(next[0].created_at) : 0
  const started = prev?.filter(
    (j) => isActive(j) && Date.parse(j.created_at) > newest,
  )
  return [...(started ?? []), ...merged]
}

// One job with its log; the list carries everything else, live.
export function useJobLog(id: string, state: Job["state"] | undefined) {
  return useQuery<Job, ApiError>({
    queryKey: [...jobKeys.detail(id), state],
    queryFn: () => api.jobs.getJob(id),
    placeholderData: keepPreviousData,
    enabled: state !== undefined,
    refetchInterval: state === "running" ? 2000 : false,
    retry: false,
  })
}

export function putJob(qc: QueryClient, job: Job) {
  qc.setQueryData<Job[]>(jobKeys.list, (list = []) => {
    const known = list.find((j) => j.id === job.id)
    if (!known) return [job, ...list]
    // A quick job can end before the response that started it arrives.
    if (isActive(job) && !isActive(known)) return list
    return list.map((j) => (j.id === job.id ? job : j))
  })
}

export function dropJob(qc: QueryClient, id: string) {
  qc.setQueryData<Job[]>(jobKeys.list, (list = []) =>
    list.filter((j) => j.id !== id),
  )
}

// What a finished job may have changed. Open files in an editor aren't
// included: reloading one would replace what's being typed.
export function refreshAfterJob(qc: QueryClient, job: Job) {
  // Proxmox: the machines, their snapshots/backups and the storages; a new
  // machine may also have become a server.
  if (job.kind.startsWith("pve-")) {
    qc.invalidateQueries({ queryKey: ["pve"] })
    qc.invalidateQueries({ queryKey: ["pve-clusters"] })
    if (job.kind === "pve-create")
      qc.invalidateQueries({ queryKey: ["servers"] })
    return
  }
  if (job.kind === "ansible-run") {
    qc.invalidateQueries({ queryKey: ["ansible"] })
    return
  }
  if (job.kind === "software-run" || job.kind === "software-scan") {
    qc.invalidateQueries({ queryKey: ["software"] })
    return
  }
  if (job.kind.startsWith("docker-")) {
    qc.invalidateQueries({ queryKey: ["docker"] })
    // A saved image is a new file on the storage.
    if (job.kind === "docker-image-export" && job.target?.storage_id)
      qc.invalidateQueries({
        queryKey: ["storage-files", job.target.storage_id],
      })
    return
  }
  // Log archives, put-backs and compactions change the log tables' sizes,
  // the archive list and the policies' last runs.
  if (job.kind.startsWith("log-")) {
    qc.invalidateQueries({ queryKey: ["log-retention"] })
    return
  }
  if (job.kind === "script-run") {
    qc.invalidateQueries({ queryKey: ["scripts"] })
    return
  }
  // A cron job's sync also wrote into its destinations' folders (below).
  if (job.kind === "schedule-sync") {
    qc.invalidateQueries({ queryKey: ["cronjobs"] })
  }
  // Any other cron job: it may have started a script or Ansible run, checked
  // backups or rebooted servers.
  if (job.kind === "schedule-run") {
    for (const root of [
      "cronjobs",
      "scripts",
      "ansible",
      "database-backups",
      "software",
    ]) {
      qc.invalidateQueries({ queryKey: [root] })
    }
    qc.invalidateQueries({ queryKey: ["servers"] })
  }
  // A backup also wrote into its storage's folder (below).
  if (job.kind.startsWith("database-backup")) {
    qc.invalidateQueries({ queryKey: ["database-backups"] })
  }
  // A measurement: Insights shows it, nothing in the files changed.
  if (job.kind === "storage-scan") {
    qc.invalidateQueries({ queryKey: ["storage-insights"] })
    return
  }
  // The proxy's status and the fleet's sites (the job's first ref is the
  // proxy).
  // A certificate shows in the proxy's inspection (["proxies", id, …]).
  if (
    job.kind === "proxy-setup" ||
    job.kind === "proxy-geo" ||
    job.kind === "proxy-brotli" ||
    job.kind === "proxy-waf" ||
    job.kind === "proxy-image-filter" ||
    job.kind === "proxy-stream-geo" ||
    job.kind === "proxy-certificate"
  ) {
    qc.invalidateQueries({ queryKey: ["proxies"] })
    qc.invalidateQueries({ queryKey: ["proxy-hosts"] })
    return
  }
  for (const ref of job.refs) {
    if (job.kind === "firewall-install" || job.kind === "firewall-apply") {
      qc.invalidateQueries({ queryKey: ["firewall", ref] })
    }
    if (job.kind.startsWith("fail2ban-")) {
      qc.invalidateQueries({ queryKey: ["fail2ban", ref] })
    }
    // Any package change, fail2ban's too, changes the package list.
    if (job.kind.startsWith("package-") || job.kind.startsWith("fail2ban-")) {
      qc.invalidateQueries({ queryKey: ["packages", ref] })
    }
    for (const root of ["files", "storage-files"]) {
      for (const part of ["list", "size", "search"]) {
        qc.invalidateQueries({ queryKey: [root, ref, part] })
      }
    }
  }
}

// The stream isn't in the generated client (EventSource can't use it).
export function jobStreamUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  return new URL("/jobs/stream", base).toString()
}
