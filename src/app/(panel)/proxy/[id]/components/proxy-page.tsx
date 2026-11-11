"use client"

import {
  CirclePlay,
  Container,
  Ellipsis,
  FileCheck,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { ItemMenu } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { JobBar } from "@/components/jobs/meta"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { ProxyDetail, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useInspection, useProxy, useSetupJob } from "../../api"
import {
  canWrite,
  inContainer,
  needsSetup,
  ProxyStatusDot,
  type ProxyTab,
  placeText,
  proxyStatusMeta,
} from "../../components/meta"
import {
  ActionSheet,
  AppBar,
  Missing,
  PageLoading,
} from "../../components/parts"
import { useProxyCan } from "../../components/permissions"
import { useProxyActions, useProxyMenu } from "../../components/proxy-actions"
import { ProxyTile } from "../../components/proxy-view"
import { ExistingTab } from "./existing-tab"
import { HistoryTab } from "./history-tab"
import { LogsTab } from "./logs-tab"
import { ReportTab } from "./report-tab"
import { SitesTab } from "./sites-tab"
import { useTab } from "./toolbar"

// One reverse proxy: its live report, its sites, what else is on the
// server, logs, history.
export function ProxyPageView() {
  const { id } = useParams<{ id: string }>()
  const query = useProxy(id)
  const isPhone = useIsPhone()
  const detail = query.data

  usePageCrumbs(
    detail ? [{ href: `/proxy/${id}`, label: detail.proxy.server_name }] : [],
  )
  useFollowWorkspace(detail?.proxy.workspace_id)

  if (isPhone === null) return null
  if (!detail) {
    if (query.error) {
      const gone = query.error instanceof ApiError && query.error.status === 404
      return (
        <Missing
          title={gone ? "Proxy not found" : "Couldn't load this proxy"}
          body={
            gone
              ? "It was removed, or you don't have access to it."
              : query.error.message
          }
          href="/proxy"
          label="All proxies"
          onRetry={gone ? undefined : () => query.refetch()}
        />
      )
    }
    return <PageLoading />
  }
  return isPhone ? (
    <PhonePage detail={detail} />
  ) : (
    <DesktopPage detail={detail} />
  )
}

function useRemoved() {
  const router = useRouter()
  return () => router.replace("/proxy")
}

function TabBody({ detail, tab }: { detail: ProxyDetail; tab: ProxyTab }) {
  if (tab === "existing") return <ExistingTab detail={detail} />
  if (tab === "logs") return <LogsTab detail={detail} />
  if (tab === "history") return <HistoryTab proxy={detail.proxy} />
  if (tab === "sites") return <SitesTab detail={detail} />
  return <ReportTab detail={detail} />
}

function DesktopPage({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const actions = useProxyActions()
  const can = useProxyCan()
  const menu = useProxyMenu()
  const onRemoved = useRemoved()
  const t = useTab(p)
  const busy = actions.running(p)
  const operator = can(p, "operator")
  const live = canWrite(p) || p.status === "config_error"

  return (
    <div className="flex flex-col pb-24">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <ProxyTile className="size-12 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">
            {p.server_name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <ProxyStatusDot status={p.status} />
              {proxyStatusMeta[p.status].label}
            </span>
            <span>
              {p.kind_label}
              {p.version && ` ${p.version}`}
            </span>
            <Link
              href={`/servers/${p.server_id}`}
              className="font-mono text-caption hover:text-brand hover:underline"
            >
              {p.server_host}
            </Link>
            {inContainer(p) && (
              <button
                type="button"
                onClick={() => actions.container(p)}
                title={placeText(p)}
                className="inline-flex h-5 items-center gap-1 rounded-full bg-muted px-2 text-caption text-muted-foreground outline-none hover:bg-mist hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Container className="size-3" />
                Container
              </button>
            )}
            {p.last_checked_at && (
              <span className="text-caption text-ash">
                Checked {timeAgo(p.last_checked_at).toLowerCase()}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {operator && live && (
            <>
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() => actions.run(p, "test")}
              >
                <FileCheck />
                {busy === "test" ? "Testing…" : "Test"}
              </Button>
              <Button
                variant="outline"
                disabled={!!busy || p.status === "stopped"}
                onClick={() => actions.run(p, "reload")}
              >
                <RefreshCw
                  className={cn(busy === "reload" && "animate-spin")}
                />
                {busy === "reload" ? "Reloading…" : "Reload"}
              </Button>
            </>
          )}
          <ItemMenu
            groups={menu(p, { onRemoved }).map((g) =>
              g.filter(
                (i) =>
                  i.key !== "new-site" &&
                  i.key !== "test" &&
                  i.key !== "reload",
              ),
            )}
            label="Proxy actions"
            trigger={
              <Button variant="outline" size="icon" aria-label="Proxy actions">
                <Ellipsis />
              </Button>
            }
          />
        </div>
      </div>
      <ProxyBanner proxy={p} className="mx-6 mb-3" />

      <div className="flex flex-col gap-4 px-6 pt-2">
        <TabBody detail={detail} tab={t.tab} />
      </div>
    </div>
  )
}

function PhonePage({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const menu = useProxyMenu()
  const back = useBack("/proxy")
  const onRemoved = useRemoved()
  const t = useTab(p)
  const [menuOpen, setMenuOpen] = useOpen("proxy-sheet")

  return (
    <div className="flex min-h-svh flex-col pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <AppBar
        title={p.server_name}
        subtitle={
          <>
            <ProxyStatusDot status={p.status} />
            {proxyStatusMeta[p.status].label} · {p.kind_label}
            {inContainer(p) && (
              <span className="inline-flex items-center gap-1">
                · <Container className="size-3" /> Container
              </span>
            )}
          </>
        }
        path={`/proxy/${p.id}`}
        onBack={back}
        onMenu={() => setMenuOpen(true)}
        menuLabel="Proxy actions"
      />
      <ProxyBanner proxy={p} />
      <TabBody detail={detail} tab={t.tab} />

      <ActionSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={p.server_name}
        head={
          <p className="px-4 pb-3 text-center font-mono text-caption text-muted-foreground">
            {p.server_host}
            {p.version && ` · ${p.kind_label} ${p.version}`}
          </p>
        }
        groups={menu(p, { onRemoved })}
      />
    </div>
  )
}

// What stands between the proxy and serving sites, with the way out.
export function ProxyBanner({
  proxy: p,
  className,
}: {
  proxy: ReverseProxy
  className?: string
}) {
  const actions = useProxyActions()
  const can = useProxyCan()
  const job = useSetupJob(p.id)
  const inspection = useInspection(p.id, p.status === "config_error")
  const engineer = can(p, "engineer")
  const operator = can(p, "operator")
  const boxed = inContainer(p)

  if (job) {
    return (
      <Banner tone="brand" icon={Wrench} className={className}>
        <p className="font-medium">Setting up {p.kind_label}…</p>
        <p className="truncate text-muted-foreground">
          {job.progress.current || job.progress.phase || job.title}
        </p>
        <JobBar job={job} className="mt-2" />
      </Banner>
    )
  }
  if (needsSetup(p)) {
    return (
      <Banner
        tone="brand"
        icon={Wrench}
        className={className}
        action={
          engineer &&
          !(boxed && p.status === "not_installed") && (
            <Button size="sm" onClick={() => actions.setup(p)}>
              Set up
            </Button>
          )
        }
      >
        <p className="font-medium">
          {p.status === "not_installed"
            ? boxed
              ? `No ${p.kind_label} found in ${p.container}`
              : `${p.kind_label} isn't installed yet`
            : `${p.kind_label} isn't set up for Morche yet`}
        </p>
        <p className="text-muted-foreground">
          {p.status === "not_installed"
            ? boxed
              ? `Morche looks for ${p.kind_label} at its usual paths inside the container and doesn't install anything there. Check the container's image, or remove this proxy and add the right container.`
              : "Set up installs it with the server's package manager, then wires in a folder for Morche's sites. Sites already on the server keep working."
            : boxed
              ? "Set up adds one include line and a folder for Morche's sites inside the container, and log rotation on the server. Nothing already there is changed."
              : "Set up adds one include line and a folder for Morche's sites. Nothing already there is changed."}
          {!engineer &&
            !(boxed && p.status === "not_installed") &&
            " Someone with Engineer access on the server can do it."}
        </p>
      </Banner>
    )
  }
  if (p.status === "config_error") {
    const text = inspection.data?.config_error || p.status_message
    return (
      <Banner
        tone="destructive"
        icon={TriangleAlert}
        className={className}
        action={
          operator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.run(p, "test")}
            >
              Test again
            </Button>
          )
        }
      >
        <p className="font-medium">The configuration test fails</p>
        <p className="text-muted-foreground">
          {p.kind_label} keeps serving what it loaded last, but no change can be
          loaded until this is fixed.
        </p>
        {text && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-background/60 p-2 font-mono text-caption whitespace-pre-wrap">
            {text}
          </pre>
        )}
      </Banner>
    )
  }
  if (p.status === "stopped") {
    return (
      <Banner
        tone="warning"
        icon={TriangleAlert}
        className={className}
        action={
          operator && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!actions.running(p)}
              onClick={() => actions.run(p, "start")}
            >
              <CirclePlay />
              Start
            </Button>
          )
        }
      >
        <p className="font-medium">
          {boxed
            ? `The container ${p.container} isn't running`
            : `${p.kind_label} is stopped`}
        </p>
        <p className="text-muted-foreground">
          {boxed
            ? "None of its sites answer until it runs again. Start runs the container again."
            : "None of its sites answer until it runs again."}
        </p>
      </Banner>
    )
  }
  if (p.status === "unreachable" || p.status === "error") {
    return (
      <Banner tone="destructive" icon={TriangleAlert} className={className}>
        <p className="font-medium">
          {proxyStatusMeta[p.status].label} on the last check
        </p>
        <p className="text-muted-foreground">
          {p.status_message || proxyStatusMeta[p.status].hint}
        </p>
      </Banner>
    )
  }
  return null
}

function Banner({
  tone,
  icon: Icon,
  action,
  className,
  children,
}: {
  tone: "brand" | "warning" | "destructive"
  icon: typeof Wrench
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y p-4 md:rounded-2xl md:border md:px-5 md:py-3",
        tone === "brand" && "border-brand/20 bg-brand-soft/60",
        tone === "warning" && "border-warning/25 bg-warning/5",
        tone === "destructive" && "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "brand" && "text-brand",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
        )}
      />
      <div className="min-w-0 flex-1 text-body-sm">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
