"use client"

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { ApiError, api } from "@/lib/api"
import type {
  AnsibleOutputChunk,
  AnsibleRun,
  AnsibleRunDetail,
  AnsibleSelection,
  PlaybookBody,
  PlaybookDetail,
  PlaybookUpdate,
  RunEvent,
  StartRunBody,
} from "@/lib/services"

export type RunsQuery = NonNullable<
  Parameters<typeof api.ansible.listAnsibleRuns>[1]
>

export const ansibleKeys = {
  all: ["ansible"] as const,
  status: ["ansible", "status"] as const,
  playbooks: (ws: string) => ["ansible", "playbooks", ws] as const,
  playbook: (id: string) => ["ansible", "playbook", id] as const,
  runs: (ws: string, query: RunsQuery) =>
    ["ansible", "runs", ws, query] as const,
  run: (id: string) => ["ansible", "run", id] as const,
  preview: (ws: string, selection: AnsibleSelection) =>
    ["ansible", "preview", ws, selection] as const,
}

const notFound = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

export function useAnsibleStatus() {
  return useQuery({
    queryKey: ansibleKeys.status,
    queryFn: () => api.ansible.getAnsibleStatus(),
    staleTime: 60_000,
  })
}

export function usePlaybooks(ws: string | undefined) {
  return useQuery({
    queryKey: ansibleKeys.playbooks(ws ?? ""),
    queryFn: () => api.ansible.listPlaybooks(ws ?? ""),
    select: (d) => d.items,
    enabled: !!ws,
  })
}

export function usePlaybook(id: string | undefined) {
  return useQuery({
    queryKey: ansibleKeys.playbook(id ?? ""),
    queryFn: () => api.ansible.getPlaybook(id ?? ""),
    enabled: !!id,
    retry: notFound,
    // A save in another tab shouldn't overwrite what's being typed: the
    // editor keeps its own draft, and 409 tells about the other save.
    refetchOnWindowFocus: false,
  })
}

// Polls while any run on the page is still going, so states and recaps move.
export function useRuns(ws: string | undefined, query: RunsQuery) {
  return useQuery({
    queryKey: ansibleKeys.runs(ws ?? "", query),
    queryFn: () => api.ansible.listAnsibleRuns(ws ?? "", query),
    enabled: !!ws,
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => !runFinished(r.state)) ? 3000 : 15_000,
  })
}

export function runFinished(state: AnsibleRun["state"]) {
  return state !== "queued" && state !== "running"
}

function putPlaybook(qc: QueryClient, p: PlaybookDetail) {
  qc.setQueryData(ansibleKeys.playbook(p.id), p)
  qc.invalidateQueries({ queryKey: ansibleKeys.playbooks(p.workspace_id) })
}

export function useCreatePlaybook(ws: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PlaybookBody) => api.ansible.createPlaybook(ws, body),
    onSuccess: (p) => putPlaybook(qc, p),
  })
}

export function useUpdatePlaybook(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PlaybookUpdate) => api.ansible.updatePlaybook(id, body),
    onSuccess: (p) => putPlaybook(qc, p),
  })
}

export function useDeletePlaybook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; ws: string }) =>
      api.ansible.deletePlaybook(id),
    onSuccess: (_, { id, ws }) => {
      qc.removeQueries({ queryKey: ansibleKeys.playbook(id) })
      qc.invalidateQueries({ queryKey: ansibleKeys.playbooks(ws) })
    },
  })
}

export function usePreview(
  ws: string | undefined,
  selection: AnsibleSelection,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ansibleKeys.preview(ws ?? "", selection),
    queryFn: () => api.ansible.previewAnsibleTargets(ws ?? "", { selection }),
    select: (d) => d.hosts,
    enabled: enabled && !!ws,
    placeholderData: keepPreviousData,
  })
}

export function useStartRun(ws: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StartRunBody) => api.ansible.startAnsibleRun(ws, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ansible", "runs"] }),
  })
}

export function useCancelRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.ansible.cancelAnsibleRun(id),
    onSuccess: (run) => {
      qc.setQueryData(ansibleKeys.run(run.id), run)
      qc.invalidateQueries({ queryKey: ["ansible", "runs"] })
    },
  })
}

export function useDeleteRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.ansible.deleteAnsibleRun(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ansibleKeys.run(id) })
      qc.invalidateQueries({ queryKey: ["ansible", "runs"] })
      qc.invalidateQueries({ queryKey: ["ansible", "playbooks"] })
    },
  })
}

// ---- One run, live ----

export type LiveRun = {
  run: AnsibleRunDetail | undefined
  error: Error | null
  // The stream is open and up to date.
  live: boolean
}

// The run with its output and results as they happen. A snapshot (on
// connect, and whenever the run changes state) replaces everything; output
// chunks append from the snapshot's offset, so a reconnect never doubles
// text; events update plays and tasks the way the backend's Log does.
export function useLiveRun(id: string): LiveRun {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ansibleKeys.run(id),
    queryFn: () => api.ansible.getAnsibleRun(id),
    retry: notFound,
    refetchOnWindowFocus: false,
  })
  const [live, setLive] = useState(false)
  const finished = query.data ? runFinished(query.data.state) : false
  const known = !!query.data

  useEffect(() => {
    if (!known || finished) return
    const key = ansibleKeys.run(id)
    const update = (fn: (r: AnsibleRunDetail) => AnsibleRunDetail) =>
      qc.setQueryData<AnsibleRunDetail>(key, (r) => (r ? fn(r) : r))

    // Output arrives in many small chunks: batch them per frame.
    let pending: AnsibleOutputChunk[] = []
    let frame = 0
    const flush = () => {
      frame = 0
      const chunks = pending
      pending = []
      update((r) => {
        let output = r.output
        let offset = r.output_offset
        // Offsets count bytes (UTF-8), not JavaScript characters.
        for (const c of chunks) {
          const bytes = utf8.encode(c.text)
          const end = c.offset + bytes.length
          if (end <= offset) continue
          output +=
            c.offset >= offset
              ? c.text
              : new TextDecoder().decode(bytes.subarray(offset - c.offset))
          offset = end
        }
        return { ...r, output, output_offset: offset }
      })
    }

    let source: EventSource | null = null
    let retry = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let closed = false

    const open = () => {
      source = new EventSource(runStreamUrl(id), { withCredentials: true })
      source.addEventListener("snapshot", (e) => {
        retry = 0
        setLive(true)
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        pending = []
        const run = JSON.parse((e as MessageEvent).data) as AnsibleRunDetail
        qc.setQueryData(key, run)
        if (runFinished(run.state)) {
          stop()
          qc.invalidateQueries({ queryKey: ["ansible", "runs"] })
          qc.invalidateQueries({ queryKey: ["ansible", "playbooks"] })
        }
      })
      source.addEventListener("output", (e) => {
        pending.push(JSON.parse((e as MessageEvent).data))
        if (!frame) frame = requestAnimationFrame(flush)
      })
      source.addEventListener("event", (e) => {
        const ev = JSON.parse((e as MessageEvent).data) as RunEvent
        update((r) => applyEvent(r, ev))
      })
      source.onerror = () => {
        setLive(false)
        source?.close()
        if (closed) return
        // The run may have ended while we were away: ask once, then retry.
        retry++
        timer = setTimeout(
          () => {
            qc.invalidateQueries({ queryKey: key })
            open()
          },
          Math.min(1000 * 2 ** retry, 15_000),
        )
      }
    }
    const stop = () => {
      closed = true
      clearTimeout(timer)
      source?.close()
      setLive(false)
    }
    open()
    return () => {
      stop()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [id, known, finished, qc])

  return { run: query.data, error: query.error, live }
}

const utf8 = new TextEncoder()

// The stream isn't usable through the generated client (EventSource).
export function runStreamUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  return new URL(`/ansible/runs/${id}/stream`, base).toString()
}

const when = (t: number) =>
  t ? new Date(t * 1000).toISOString() : new Date().toISOString()

// The TypeScript twin of the backend's ansible.Log.Apply.
export function applyEvent(
  run: AnsibleRunDetail,
  ev: RunEvent,
): AnsibleRunDetail {
  const plays = run.plays ?? []
  switch (ev.e) {
    case "play":
      return {
        ...run,
        plays: [
          ...plays,
          {
            id: ev.id ?? "",
            name: ev.name ?? "",
            hosts: ev.hosts ?? "",
            tasks: [],
          },
        ],
      }
    case "no_hosts":
      return {
        ...run,
        plays: plays.map((p) =>
          p.id === ev.play
            ? { ...p, no_hosts: ev.reason as "matched" | "remaining" }
            : p,
        ),
      }
    case "task": {
      if (plays.some((p) => p.tasks.some((t) => t.id === ev.id))) return run
      const task = {
        id: ev.id ?? "",
        name: ev.name ?? "",
        action: ev.action ?? "",
        handler: !!ev.handler,
        path: ev.path,
        started_at: when(ev.t),
        results: {},
      }
      const has = plays.some((p) => p.id === ev.play)
      const next = has
        ? plays
        : [...plays, { id: ev.play ?? "", name: "", hosts: "", tasks: [] }]
      return {
        ...run,
        plays: next.map((p) =>
          p.id === ev.play ? { ...p, tasks: [...p.tasks, task] } : p,
        ),
      }
    }
    case "start":
    case "retry":
    case "result":
      return {
        ...run,
        plays: plays.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) => {
            if (t.id !== ev.task || !ev.host) return t
            const old = t.results[ev.host]
            let result = old
            if (ev.e === "start") {
              result = { status: "running", started_at: when(ev.t) }
            } else if (ev.e === "retry") {
              if (!old) return t
              result = { ...old, attempts: ev.attempt }
            } else {
              result = {
                status: (ev.status ?? "ok") as typeof old.status,
                msg: ev.msg,
                rc: ev.rc,
                stdout: ev.stdout,
                stderr: ev.stderr,
                diff: ev.diff,
                items: ev.items,
                data: ev.data,
                started_at: old?.started_at ?? when(ev.t),
                ended_at: when(ev.t),
              }
            }
            return { ...t, results: { ...t.results, [ev.host]: result } }
          }),
        })),
      }
    case "stats":
      return { ...run, recap: ev.stats ?? {} }
  }
  return run
}
