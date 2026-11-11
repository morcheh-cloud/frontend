"use client"

import {
  CirclePause,
  CirclePlay,
  Container,
  Copy,
  CopyPlus,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  ListTree,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
  Wrench,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type {
  ProxyActionRequest,
  ProxyActionResult,
  ProxyChangeSummary,
  ProxyHost,
  Proxy as ReverseProxy,
  Site,
} from "@/lib/services"
import {
  useDeleteHost,
  useDeleteProxy,
  useProxyAction,
  useRestoreChange,
  useSetHostEnabled,
  useSetupProxy,
} from "../api"
import { AddProxyDialog } from "./add-proxy"
import { ContainerLayer } from "./container-layer"
import {
  canWrite,
  domainsText,
  duplicateHostHref,
  hostHref,
  hostName,
  inContainer,
  needsSetup,
  newHostHref,
  proxyHref,
  proxyName,
  siteUrl,
} from "./meta"
import { useProxyCan } from "./permissions"
import { PurgeLayer, type PurgePreset } from "./purge-layer"

type Action = ProxyActionRequest["action"]

type Actions = {
  add: (serverId?: string) => void
  setup: (p: ReverseProxy) => void
  run: (p: ReverseProxy, action: Action) => void
  // An action in flight on this proxy, for spinners.
  running: (p: ReverseProxy) => Action | null
  remove: (p: ReverseProxy, done?: () => void) => void
  toggleHost: (p: ReverseProxy, host: ProxyHost) => void
  deleteHost: (p: ReverseProxy, host: ProxyHost, done?: () => void) => void
  restore: (p: ReverseProxy, change: ProxyChangeSummary) => void
  viewSite: (p: ReverseProxy, site: Site) => void
  // The Clear cache layer for a saved site, optionally on a group/addresses.
  purgeCache: (p: ReverseProxy, host: ProxyHost, preset?: PurgePreset) => void
  // What the runtime says about a container proxy's container.
  container: (p: ReverseProxy) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useProxyActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useProxyActions outside ProxyActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

export async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`, { description: text })
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

// Run `fn` once the layer's history entry is gone (it may navigate).
function whenClosed(close: (open: boolean) => void, fn?: () => void) {
  if (fn) window.addEventListener("popstate", fn, { once: true })
  close(false)
}

const actionWords: Record<Action, { doing: string; done: string }> = {
  test: { doing: "Testing", done: "Config test passed" },
  reload: { doing: "Reloading", done: "Reloaded" },
  start: { doing: "Starting", done: "Started" },
  restart: { doing: "Restarting", done: "Restarted" },
  stop: { doing: "Stopping", done: "Stopped" },
}

// Owns every dialog and sheet of the proxy pages, so the list, a proxy's page
// and a site's page start the same flows.
export function ProxyActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const jobs = useJobActions()

  const [addOpen, setAddOpen] = useOpen("proxy-add")
  const [addKey, setAddKey] = useState(0)
  const [addServer, setAddServer] = useState<string>()

  const [removeOpen, setRemoveOpen] = useOpen("proxy-remove")
  const [toRemove, setToRemove] = useState<{
    proxy: ReverseProxy
    done?: () => void
  }>()
  const [removeFiles, setRemoveFiles] = useState(true)

  const [askOpen, setAskOpen] = useOpen("proxy-ask")
  const [toAsk, setToAsk] = useState<{ proxy: ReverseProxy; action: Action }>()

  const [resultOpen, setResultOpen] = useOpen("proxy-result")
  const [result, setResult] = useState<{
    proxy: ReverseProxy
    action: Action
    result: ProxyActionResult
  }>()

  const [hostDeleteOpen, setHostDeleteOpen] = useOpen("proxy-host-delete")
  const [hostToDelete, setHostToDelete] = useState<{
    proxy: ReverseProxy
    host: ProxyHost
    done?: () => void
  }>()

  const [restoreOpen, setRestoreOpen] = useOpen("proxy-restore")
  const [toRestore, setToRestore] = useState<{
    proxy: ReverseProxy
    change: ProxyChangeSummary
  }>()

  const [siteOpen, setSiteOpen] = useOpen("proxy-site")
  const [site, setSite] = useState<{ proxy: ReverseProxy; site: Site }>()

  const [purgeOpen, setPurgeOpen] = useOpen("proxy-purge")
  const [purgeKey, setPurgeKey] = useState(0)
  const [toPurge, setToPurge] = useState<{
    proxy: ReverseProxy
    host: ProxyHost
    preset?: PurgePreset
  }>()

  const [boxOpen, setBoxOpen] = useOpen("proxy-container")
  const [box, setBox] = useState<ReverseProxy>()

  const setupMutation = useSetupProxy()
  const action = useProxyAction()
  const removeProxy = useDeleteProxy()
  const setEnabled = useSetHostEnabled()
  const removeHost = useDeleteHost()
  const restoreChange = useRestoreChange()

  const setup = (p: ReverseProxy) =>
    setupMutation.mutate(p.id, {
      onSuccess: (job) => jobs.track(job),
      onError: errorToast,
    })

  const runNow = (p: ReverseProxy, a: Action) =>
    action.mutate(
      { id: p.id, action: a },
      {
        onSuccess: (r) => {
          if (a === "test") {
            setResult({ proxy: p, action: a, result: r })
            setResultOpen(true)
            return
          }
          if (r.ok) {
            toast.success(`${actionWords[a].done} ${p.kind_label}`, {
              description: proxyName(p),
            })
            return
          }
          setResult({ proxy: p, action: a, result: r })
          setResultOpen(true)
        },
        onError: errorToast,
      },
    )

  const actions: Actions = {
    add: (serverId) => {
      setAddServer(serverId)
      setAddKey((k) => k + 1)
      setAddOpen(true)
    },
    setup,
    run: (p, a) => {
      // Stopping or restarting takes every site down, even briefly: ask.
      if (a === "stop" || a === "restart") {
        setToAsk({ proxy: p, action: a })
        setAskOpen(true)
        return
      }
      runNow(p, a)
    },
    running: (p) =>
      action.isPending && action.variables?.id === p.id
        ? action.variables.action
        : null,
    remove: (p, done) => {
      setToRemove({ proxy: p, done })
      setRemoveFiles(true)
      setRemoveOpen(true)
    },
    toggleHost: (p, host) =>
      setEnabled.mutate(
        { id: p.id, host: host.id, enabled: !host.enabled },
        {
          onSuccess: () =>
            toast.success(
              `${hostName(host)} ${host.enabled ? "turned off" : "turned on"}`,
              {
                description: host.enabled
                  ? `${p.kind_label} stops answering for it.`
                  : undefined,
                action: {
                  label: "Undo",
                  onClick: () =>
                    setEnabled.mutate(
                      { id: p.id, host: host.id, enabled: host.enabled },
                      { onError: errorToast },
                    ),
                },
              },
            ),
          onError: errorToast,
        },
      ),
    deleteHost: (p, host, done) => {
      setHostToDelete({ proxy: p, host, done })
      setHostDeleteOpen(true)
    },
    restore: (p, change) => {
      setToRestore({ proxy: p, change })
      setRestoreOpen(true)
    },
    viewSite: (p, s) => {
      setSite({ proxy: p, site: s })
      setSiteOpen(true)
    },
    purgeCache: (p, host, preset) => {
      setToPurge({ proxy: p, host, preset })
      setPurgeKey((k) => k + 1)
      setPurgeOpen(true)
    },
    container: (p) => {
      setBox(p)
      setBoxOpen(true)
    },
  }

  // "Add reverse proxy" from the command palette, on any page.
  useIntent("add-proxy", () => actions.add())

  return (
    <ActionsContext value={actions}>
      {children}

      <AddProxyDialog
        key={`add-${addKey}`}
        open={addOpen}
        onOpenChange={setAddOpen}
        serverId={addServer}
        onAdded={(p, setupNow) => {
          if (setupNow) setup(p)
          whenClosed(setAddOpen, () => router.push(proxyHref(p.id)))
        }}
        onOpenProxy={(id) =>
          whenClosed(setAddOpen, () => router.push(proxyHref(id)))
        }
      />

      <ConfirmDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        title={
          toAsk?.action === "stop"
            ? `Stop ${toAsk.proxy.kind_label} on ${proxyName(toAsk.proxy)}?`
            : `Restart ${toAsk?.proxy.kind_label} on ${toAsk ? proxyName(toAsk.proxy) : ""}?`
        }
        description={
          toAsk?.action === "stop"
            ? "Every site it serves stops answering, including ones not made in Morche, until you start it again."
            : "Open connections drop for a moment. A reload applies changes without that."
        }
        confirmLabel={toAsk?.action === "stop" ? "Stop" : "Restart"}
        destructive={toAsk?.action === "stop"}
        pending={action.isPending}
        onConfirm={() => {
          if (!toAsk) return
          setAskOpen(false)
          runNow(toAsk.proxy, toAsk.action)
        }}
      />

      {result && (
        <ResultDialog
          open={resultOpen}
          onOpenChange={setResultOpen}
          proxy={result.proxy}
          action={result.action}
          result={result.result}
        />
      )}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${toRemove?.proxy.kind_label} on ${toRemove ? proxyName(toRemove.proxy) : ""}?`}
        description={
          <div className="flex flex-col gap-3">
            <p>
              Morche forgets this proxy and its sites.{" "}
              {toRemove?.proxy.kind_label} itself stays installed on the server.
            </p>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox renders the control inside */}
            <label className="flex min-h-11 items-start gap-2 text-foreground md:min-h-0">
              <Checkbox
                className="mt-0.5"
                checked={removeFiles}
                onCheckedChange={(v) => setRemoveFiles(v)}
              />
              <span>
                Take Morche's sites off the server too
                <span className="block text-caption text-muted-foreground">
                  Untick to leave them running as they are, unmanaged.
                </span>
              </span>
            </label>
          </div>
        }
        confirmLabel="Remove proxy"
        pending={removeProxy.isPending}
        onConfirm={() =>
          toRemove &&
          removeProxy.mutate(
            { id: toRemove.proxy.id, removeFiles },
            {
              onSuccess: () => {
                whenClosed(setRemoveOpen, toRemove.done)
                toast.success("Proxy removed")
              },
              onError: errorToast,
            },
          )
        }
      />

      <ConfirmDialog
        open={hostDeleteOpen}
        onOpenChange={setHostDeleteOpen}
        title={`Delete ${hostToDelete ? hostName(hostToDelete.host) : "this site"}?`}
        description={`Its file is taken off ${hostToDelete ? proxyName(hostToDelete.proxy) : ""} and ${hostToDelete?.proxy.kind_label} reloads. History keeps a copy, so you can bring it back.`}
        confirmLabel="Delete site"
        pending={removeHost.isPending}
        onConfirm={() =>
          hostToDelete &&
          removeHost.mutate(
            { id: hostToDelete.proxy.id, host: hostToDelete.host.id },
            {
              onSuccess: () => {
                whenClosed(setHostDeleteOpen, hostToDelete.done)
                toast.success("Site deleted")
              },
              onError: errorToast,
            },
          )
        }
      />

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Go back to this point?"
        description={
          toRestore && (
            <>
              <p>
                Every site becomes what it was right after “
                {toRestore.change.summary}”. Sites made since then are taken off
                the server.
              </p>
              <p className="mt-2">This is a change too: you can undo it.</p>
            </>
          )
        }
        confirmLabel="Go back"
        destructive={false}
        pending={restoreChange.isPending}
        onConfirm={() =>
          toRestore &&
          restoreChange.mutate(
            { id: toRestore.proxy.id, change: toRestore.change.id },
            {
              onSuccess: () => {
                setRestoreOpen(false)
                toast.success("Sites restored")
              },
              onError: errorToast,
            },
          )
        }
      />

      {site && (
        <SiteLayer
          open={siteOpen}
          onOpenChange={setSiteOpen}
          proxy={site.proxy}
          site={site.site}
        />
      )}

      {toPurge && (
        <PurgeLayer
          key={`purge-${purgeKey}`}
          open={purgeOpen}
          onOpenChange={setPurgeOpen}
          proxy={toPurge.proxy}
          host={toPurge.host}
          preset={toPurge.preset}
        />
      )}

      {box && (
        <ContainerLayer open={boxOpen} onOpenChange={setBoxOpen} proxy={box} />
      )}
    </ActionsContext>
  )
}

function ResultDialog({
  open,
  onOpenChange,
  proxy,
  action,
  result,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: ReverseProxy
  action: Action
  result: ProxyActionResult
}) {
  const title = result.ok
    ? actionWords[action].done
    : action === "test"
      ? "Config test failed"
      : `${actionWords[action].doing} failed`
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${proxy.kind_label} on ${proxyName(proxy)}${result.ok ? "" : ` · exit code ${result.exit_code}`}`}
      className="sm:max-w-2xl"
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <pre
        className={`max-h-[50svh] overflow-auto rounded-lg border p-3 font-mono text-caption whitespace-pre-wrap ${result.ok ? "border-border bg-subtle" : "border-destructive/20 bg-destructive/5"}`}
      >
        {result.output.trim() || "No output."}
      </pre>
    </ResponsiveDialog>
  )
}

// A hand-written site, read-only.
function SiteLayer({
  open,
  onOpenChange,
  proxy,
  site,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: ReverseProxy
  site: Site
}) {
  const isMobile = useIsMobile()
  const title = domainsText(site.domains)
  const where = `${site.file}:${site.line}`
  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 max-md:px-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">Answers</dt>
        <dd className="min-w-0 font-mono text-caption break-all">
          {site.domains.join(" ") || "Any name (default)"}
        </dd>
        <dt className="text-muted-foreground">Listens</dt>
        <dd className="font-mono text-caption">{site.listen.join(", ")}</dd>
        {site.upstream && (
          <>
            <dt className="text-muted-foreground">Proxies to</dt>
            <dd className="font-mono text-caption break-all">
              {site.upstream}
            </dd>
          </>
        )}
        {site.redirect && (
          <>
            <dt className="text-muted-foreground">Redirects to</dt>
            <dd className="font-mono text-caption break-all">
              {site.redirect}
            </dd>
          </>
        )}
        {site.root && (
          <>
            <dt className="text-muted-foreground">Serves</dt>
            <dd className="font-mono text-caption break-all">{site.root}</dd>
          </>
        )}
        <dt className="text-muted-foreground">File</dt>
        <dd className="flex min-w-0 items-center gap-1 font-mono text-caption break-all">
          {where}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy path"
            onClick={() => copyText(site.file, "Path")}
          >
            <Copy />
          </Button>
        </dd>
      </dl>
      <p className="text-caption text-muted-foreground">
        Written by hand on the server, so Morche only shows it. To change it,
        edit the file (Files tab of the server) or make a new site here for the
        same name and remove this one.
      </p>
      {site.text ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-subtle p-3 font-mono text-caption">
          {site.text}
        </pre>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          Its text needs Operator access.
        </p>
      )}
    </div>
  )
  const description = `${site.tls ? "https" : "http"} · ${proxy.kind_label} on ${proxyName(proxy)}`
  if (isMobile) {
    return (
      <BottomSheet full open={open} onOpenChange={onOpenChange} title={title}>
        <p className="-mt-1 px-4 text-body-sm text-muted-foreground">
          {description}
        </p>
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

// A proxy's actions. `open` adds the link to its page (lists only).
export function useProxyMenu() {
  const a = useProxyActions()
  const can = useProxyCan()
  const router = useRouter()
  return (
    p: ReverseProxy,
    {
      open = false,
      onRemoved,
    }: { open?: boolean; onRemoved?: () => void } = {},
  ): Item[][] => {
    const engineer = can(p, "engineer")
    const operator = can(p, "operator")
    const live = canWrite(p) || p.status === "config_error"
    return [
      open
        ? [
            {
              key: "open",
              label: "Open",
              icon: <ListTree />,
              onSelect: () => router.push(proxyHref(p.id)),
            },
          ]
        : [],
      engineer && canWrite(p)
        ? [
            {
              key: "new-site",
              label: "New site",
              icon: <Plus />,
              onSelect: () => router.push(newHostHref(p.id)),
            },
          ]
        : [],
      operator && live
        ? [
            {
              key: "test",
              label: "Test config",
              icon: <FileCheck />,
              onSelect: () => a.run(p, "test"),
            },
            {
              key: "reload",
              label: "Reload",
              icon: <RefreshCw />,
              disabled: p.status === "stopped",
              onSelect: () => a.run(p, "reload"),
            },
            ...(p.status === "stopped"
              ? [
                  {
                    key: "start",
                    label: "Start",
                    icon: <CirclePlay />,
                    onSelect: () => a.run(p, "start"),
                  },
                ]
              : [
                  {
                    key: "restart",
                    label: "Restart",
                    icon: <RotateCw />,
                    onSelect: () => a.run(p, "restart"),
                  },
                ]),
            ...(engineer && p.status !== "stopped"
              ? [
                  {
                    key: "stop",
                    label: "Stop",
                    icon: <CirclePause />,
                    onSelect: () => a.run(p, "stop"),
                  },
                ]
              : []),
          ]
        : [],
      [
        ...(engineer &&
        p.status !== "unreachable" &&
        !(inContainer(p) && p.status === "not_installed")
          ? [
              {
                key: "setup",
                label: needsSetup(p) ? "Set up" : "Run setup again",
                icon: <Wrench />,
                onSelect: () => a.setup(p),
              },
            ]
          : []),
        ...(inContainer(p)
          ? [
              {
                key: "container",
                label: "Container",
                icon: <Container />,
                onSelect: () => a.container(p),
              },
            ]
          : []),
        {
          key: "server",
          label: "Open server",
          icon: <ExternalLink />,
          onSelect: () => router.push(`/servers/${p.server_id}`),
        },
      ],
      can(p, "owner")
        ? [
            {
              key: "remove",
              label: "Remove proxy",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.remove(p, onRemoved),
            },
          ]
        : [],
    ]
  }
}

// A site's actions.
export function useHostMenu() {
  const a = useProxyActions()
  const can = useProxyCan()
  const router = useRouter()
  return (
    p: ReverseProxy,
    host: ProxyHost,
    { onDeleted }: { onDeleted?: () => void } = {},
  ): Item[][] => {
    const engineer = can(p, "engineer") && canWrite(p)
    const stream = host.config.type === "stream"
    const url = stream
      ? null
      : siteUrl(host.domains[0] ?? "", !!host.config.tls?.enabled)
    // A stream is reached at the proxy's server and its port.
    const address = stream
      ? `${p.server_host}:${host.config.listen_port ?? ""}`
      : (host.domains[0] ?? "")
    return [
      [
        {
          key: "edit",
          label: engineer ? "Edit" : "View",
          icon: <Pencil />,
          onSelect: () => router.push(hostHref(p.id, host.id)),
        },
        ...(engineer
          ? [
              {
                key: "duplicate",
                label: "Duplicate",
                icon: <CopyPlus />,
                onSelect: () => router.push(duplicateHostHref(p.id, host.id)),
              },
              {
                key: "toggle",
                label: host.enabled ? "Turn off" : "Turn on",
                icon: host.enabled ? <EyeOff /> : <Eye />,
                onSelect: () => a.toggleHost(p, host),
              },
            ]
          : []),
      ],
      [
        ...(url && host.enabled
          ? [
              {
                key: "visit",
                label: "Visit site",
                icon: <ExternalLink />,
                onSelect: () =>
                  window.open(url, "_blank", "noopener,noreferrer"),
              },
            ]
          : []),
        {
          key: "copy",
          label: stream ? "Copy address" : "Copy domain",
          icon: <Copy />,
          onSelect: () => copyText(address, stream ? "Address" : "Domain"),
        },
        // Off, not hidden, while the site keeps nothing.
        ...(host.config.type === "proxy" && can(p, "operator") && canWrite(p)
          ? [
              {
                key: "purge",
                label: "Clear cache…",
                icon: <Eraser />,
                disabled:
                  !host.config.cache?.enabled &&
                  !host.config.cache?.always_online?.mode,
                onSelect: () => a.purgeCache(p, host),
              },
            ]
          : []),
      ],
      engineer
        ? [
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.deleteHost(p, host, onDeleted),
            },
          ]
        : [],
    ]
  }
}
