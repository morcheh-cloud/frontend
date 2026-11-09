"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { isActive, useJobList } from "@/components/jobs/api"
import { proxiesQuery, STATUS_POLL } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type {
  CertRequest,
  HostConfig,
  ProxyActionRequest,
  ProxyDetail,
  ProxyHostBody,
  Proxy as ReverseProxy,
  UpstreamTLS,
} from "@/lib/services"

// Everything about one proxy sits under ["proxies", id], so removing it
// drops its inspection, logs and history with it.
export const proxyKeys = {
  list: proxiesQuery.queryKey,
  proxy: (id: string) => ["proxies", id] as const,
  onServer: (server: string) => ["proxies", "on-server", server] as const,
  inspect: (id: string) => ["proxies", id, "inspect"] as const,
  history: (id: string) => ["proxies", id, "history"] as const,
  change: (id: string, change: string) =>
    ["proxies", id, "history", change] as const,
  logs: (id: string, host: string, log: string, lines: number) =>
    ["proxies", id, "logs", host, log, lines] as const,
  fleet: ["proxy-hosts"] as const,
  kinds: ["proxy-kinds"] as const,
  authorities: ["proxy-certificate-authorities"] as const,
  traffic: (proxy: string) => ["proxy-traffic", proxy] as const,
}

// The backend reads the access logs at most every 4 s per proxy.
const TRAFFIC_POLL = 5_000

const notFound = (error: Error) =>
  error instanceof ApiError && error.status === 404

// Reading the server (nginx -T, the files) is an SSH round trip: not as
// often as statuses.
const INSPECT_POLL = 30_000

export function useProxies() {
  return useQuery(proxiesQuery)
}

// The proxies running on one server, for its Overview.
export function useServerProxies(server: string) {
  return useQuery({
    queryKey: proxyKeys.onServer(server),
    queryFn: () => api.reverseProxy.listProxies({ server_id: server }),
    select: (d) => d.items,
    refetchInterval: STATUS_POLL,
  })
}

export function useProxyKinds() {
  return useQuery({
    queryKey: proxyKeys.kinds,
    queryFn: () => api.reverseProxy.listProxyKinds(),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProxy(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: proxyKeys.proxy(id),
    queryFn: () => api.reverseProxy.getProxy(id),
    refetchInterval: STATUS_POLL,
    placeholderData: () => {
      const p = queryClient
        .getQueryData<{ items: ReverseProxy[] }>(proxyKeys.list)
        ?.items.find((x) => x.id === id)
      return p && p.host_count === 0 ? { proxy: p, hosts: [] } : undefined
    },
    retry: (count, error) => !notFound(error) && count < 2,
  })
}

export function useInspection(id: string, enabled = true) {
  return useQuery({
    queryKey: proxyKeys.inspect(id),
    queryFn: () => api.reverseProxy.inspectProxy(id),
    refetchInterval: INSPECT_POLL,
    enabled,
    retry: (count, error) => !notFound(error) && count < 1,
  })
}

export function useFleetHosts() {
  return useQuery({
    queryKey: proxyKeys.fleet,
    queryFn: () => api.reverseProxy.listProxyHostsEverywhere(),
    refetchInterval: STATUS_POLL,
  })
}

// Requests per minute for the last 30 minutes, per site; "" = every proxy.
export function useProxyTraffic(proxy: string, enabled = true) {
  return useQuery({
    queryKey: proxyKeys.traffic(proxy),
    enabled,
    queryFn: () =>
      api.reverseProxy.getProxyTraffic(proxy ? { proxy_id: proxy } : {}),
    refetchInterval: TRAFFIC_POLL,
    placeholderData: (previous) => previous,
  })
}

export function useProxyHistory(id: string, enabled = true) {
  return useQuery({
    queryKey: proxyKeys.history(id),
    queryFn: () => api.reverseProxy.listProxyHistory(id),
    enabled,
  })
}

export function useProxyChange(id: string, change: string | null) {
  return useQuery({
    queryKey: proxyKeys.change(id, change ?? ""),
    queryFn: () => api.reverseProxy.getProxyChange(id, change ?? ""),
    enabled: !!change,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProxyLogs(
  id: string,
  {
    host,
    log,
    lines,
    live,
  }: { host: string; log: "access" | "error"; lines: number; live: boolean },
) {
  return useQuery({
    queryKey: proxyKeys.logs(id, host, log, lines),
    queryFn: () =>
      api.reverseProxy.getProxyLogs(id, {
        host: host || undefined,
        log,
        lines,
      }),
    refetchInterval: live ? 5_000 : false,
    retry: false,
  })
}

// The config a site would get, rendered without saving. Problems come back
// as a list, never as an error.
export function useHostPreview(
  id: string,
  host: string | undefined,
  config: HostConfig | null,
) {
  return useQuery({
    queryKey: ["proxies", id, "preview", host ?? "", config] as const,
    queryFn: ({ signal }) =>
      api.reverseProxy.previewProxyHost(
        id,
        { host, config: config as HostConfig },
        { signal },
      ),
    enabled: !!config,
    placeholderData: (prev) => prev,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30_000,
    retry: false,
  })
}

// A proxy the API answered goes straight into the list and its page; the
// list and the fleet then refetch in the background (counts, order).
function storeProxy(queryClient: QueryClient, p: ReverseProxy) {
  queryClient.setQueryData<ProxyDetail>(
    proxyKeys.proxy(p.id),
    (d) => d && { ...d, proxy: p },
  )
  queryClient.setQueryData<{ items: ReverseProxy[] }>(
    proxyKeys.list,
    (data) =>
      data && {
        ...data,
        items: data.items.some((x) => x.id === p.id)
          ? data.items.map((x) => (x.id === p.id ? p : x))
          : [...data.items, p],
      },
  )
  queryClient.invalidateQueries({ queryKey: proxyKeys.list, exact: true })
}

// A write answers the proxy with every site as it is now. The server's files
// changed too, so its inspection and history are read again.
function storeDetail(queryClient: QueryClient, d: ProxyDetail) {
  queryClient.setQueryData(proxyKeys.proxy(d.proxy.id), d)
  storeProxy(queryClient, d.proxy)
  queryClient.invalidateQueries({ queryKey: proxyKeys.inspect(d.proxy.id) })
  queryClient.invalidateQueries({ queryKey: proxyKeys.history(d.proxy.id) })
  queryClient.invalidateQueries({ queryKey: proxyKeys.fleet })
}

export function useCreateProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { server_id: string; kind: string }) =>
      api.reverseProxy.createProxy(body),
    onSuccess: (p) => storeProxy(queryClient, p),
  })
}

// The setup job running for a proxy, if any (installing takes minutes).
export function useSetupJob(id: string) {
  const jobs = useJobList()
  return jobs.data?.find(
    (j) => j.kind === "proxy-setup" && j.refs[0] === id && isActive(j),
  )
}

export function useSetupProxy() {
  return useMutation({
    mutationFn: (id: string) => api.reverseProxy.setupProxy(id),
  })
}

// Turning the IP-to-country lookup on runs as job proxy-geo.
export function useGeoJob(id: string) {
  const jobs = useJobList()
  return jobs.data?.find(
    (j) => j.kind === "proxy-geo" && j.refs[0] === id && isActive(j),
  )
}

export function useSetupGeo() {
  return useMutation({
    mutationFn: (id: string) => api.reverseProxy.setupProxyGeo(id),
  })
}

export function useDeleteProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, removeFiles }: { id: string; removeFiles: boolean }) =>
      api.reverseProxy.deleteProxy(id, { remove_files: removeFiles }),
    onSuccess: (_, { id }) => {
      queryClient.setQueryData<{ items: ReverseProxy[] }>(
        proxyKeys.list,
        (data) => data && { items: data.items.filter((p) => p.id !== id) },
      )
      queryClient.removeQueries({ queryKey: proxyKeys.proxy(id) })
      queryClient.invalidateQueries({ queryKey: proxyKeys.list, exact: true })
      queryClient.invalidateQueries({ queryKey: proxyKeys.fleet })
    },
  })
}

export function useProxyAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string
      action: ProxyActionRequest["action"]
    }) => api.reverseProxy.proxyAction(id, { action }),
    onSettled: (_, __, { id }) => {
      // The backend checks again in the background: read the status soon.
      for (const delay of [1500, 5000]) {
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: proxyKeys.proxy(id),
            exact: true,
          })
          queryClient.invalidateQueries({ queryKey: proxyKeys.inspect(id) })
          queryClient.invalidateQueries({
            queryKey: proxyKeys.list,
            exact: true,
          })
        }, delay)
      }
    },
  })
}

export type HostSave = { id: string; host?: string; body: ProxyHostBody }

export function useSaveHost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, host, body }: HostSave) =>
      host
        ? api.reverseProxy.updateProxyHost(id, host, body)
        : api.reverseProxy.createProxyHost(id, body),
    onSuccess: (d) => storeDetail(queryClient, d),
  })
}

// Runs the site's config through the proxy's own test (nginx -t) on the
// server with the other sites beside it; nothing is saved or reloaded.
export function useTestHost() {
  return useMutation({
    mutationFn: ({
      id,
      host,
      config,
    }: {
      id: string
      host?: string
      config: HostConfig
    }) => api.reverseProxy.testProxyHost(id, { host, config }),
  })
}

// Asks the proxy's server to reach an upstream (curl), as the site would.
export function useTestUpstream() {
  return useMutation({
    mutationFn: ({
      id,
      upstream,
      tls,
    }: {
      id: string
      upstream: string
      tls?: UpstreamTLS
    }) =>
      api.reverseProxy.testProxyUpstream(id, { upstream, upstream_tls: tls }),
  })
}

// Empties a site's own cache on the proxy (Capabilities.cache).
export function usePurgeHostCache() {
  return useMutation({
    mutationFn: ({ id, host }: { id: string; host: string }) =>
      api.reverseProxy.purgeProxyHostCache(id, host),
  })
}

export function useSetHostEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      host,
      enabled,
    }: {
      id: string
      host: string
      enabled: boolean
    }) => api.reverseProxy.setProxyHostEnabled(id, host, { enabled }),
    onSuccess: (d) => storeDetail(queryClient, d),
  })
}

export function useDeleteHost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, host }: { id: string; host: string }) =>
      api.reverseProxy.deleteProxyHost(id, host),
    onSuccess: (d) => storeDetail(queryClient, d),
  })
}

export function useRestoreChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: string }) =>
      api.reverseProxy.restoreProxyChange(id, change),
    onSuccess: (d) => storeDetail(queryClient, d),
  })
}

// The ACME authorities offered by name; the same list for every proxy.
export function useCertificateAuthorities(proxy: string, enabled = true) {
  return useQuery({
    queryKey: proxyKeys.authorities,
    queryFn: () =>
      api.reverseProxy
        .listProxyCertificateAuthorities(proxy)
        .then((r) => r.authorities),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  })
}

// Getting, making or saving a certificate runs as job proxy-certificate; its
// result names the files.
export function useCreateCertificate() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CertRequest }) =>
      api.reverseProxy.createProxyCertificate(id, body),
  })
}
