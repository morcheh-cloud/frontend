"use client"

import {
  Activity,
  ArrowLeft,
  Check,
  CircleAlert,
  Container,
  Ellipsis,
  ExternalLink,
  FileKey,
  Globe,
  HeartPulse,
  KeyRound,
  Lock,
  LockOpen,
  RotateCcw,
  ScrollText,
  Split,
  Warehouse,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import type { ReactNode } from "react"

import { projectHref } from "@/app/(panel)/containers/components/project-actions"
import { newMonitorHref } from "@/app/(panel)/monitoring/components/meta"
import { hostHref } from "@/app/(panel)/proxy/components/meta"
import {
  Empty,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { CodeTabs, CopyCode } from "@/components/code-block"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar, progressText } from "@/components/jobs/meta"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { HeaderIcon } from "@/components/panel/header/header-icon"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { PackageRegistry } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRegistry } from "../api"
import { AccountsTab } from "./accounts-tab"
import { ContentsTab } from "./contents-tab"
import {
  dockerSamples,
  kindMeta,
  npmSamples,
  RegistryLogo,
  StatusPill,
  statusOf,
  toneText,
} from "./meta"
import { DeploySteps, jobRunning, useRegistryJob } from "./parts"
import { useRegistryCan } from "./permissions"
import { useRegistryActions, useRegistryMenu } from "./registry-actions"
import { SettingsTab } from "./settings-tab"

const tabs = ["overview", "contents", "access", "settings"] as const
type Tab = (typeof tabs)[number]

export function RegistryFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <RegistryPage id={id} />
}

function RegistryPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const q = useRegistry(id)
  useFollowWorkspace(q.data?.workspace_id)
  usePageCrumbs(
    q.data ? [{ href: `/registries/${id}`, label: q.data.name }] : [],
  )
  if (phone === null) return null
  if (q.isPending)
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  if (q.isError || !q.data)
    return (
      <div className="p-6">
        <Empty
          icon={Warehouse}
          title="Registry not found"
          body={q.error?.message ?? "It may have been removed."}
          action={
            <Button
              render={<Link href="/registries" />}
              nativeButton={false}
              variant="outline"
            >
              All registries
            </Button>
          }
        />
      </div>
    )
  return <Loaded r={q.data} phone={phone} />
}

function useTab() {
  return useQueryState(
    "tab",
    parseAsStringLiteral(tabs)
      .withDefault("overview")
      .withOptions({ history: "replace" }),
  )
}

const tabLabel = (r: PackageRegistry, t: Tab) =>
  ({
    overview: "Overview",
    contents: r.kind === "harbor" ? "Repositories" : "Packages",
    access: r.kind === "harbor" ? "Robot accounts" : "Users",
    settings: "Settings",
  })[t]

function Loaded({ r, phone }: { r: PackageRegistry; phone: boolean }) {
  const [tab, setTab] = useTab()
  const can = useRegistryCan()
  const shown = tabs.filter((t) => t !== "access" || can(r, "operator"))
  const current = shown.includes(tab) ? tab : "overview"
  const body = (
    <>
      {current === "overview" && (
        <OverviewTab r={r} phone={phone} onTab={setTab} />
      )}
      {current === "contents" && <ContentsTab r={r} phone={phone} />}
      {current === "access" && <AccountsTab r={r} phone={phone} />}
      {current === "settings" && <SettingsTab r={r} phone={phone} />}
    </>
  )
  if (phone)
    return (
      <PhoneShell r={r} tabs={shown} tab={current} onTab={setTab}>
        {body}
      </PhoneShell>
    )
  return (
    <div className="flex min-w-0 flex-col pb-16">
      <Hero r={r} />
      <nav
        aria-label="Registry sections"
        className="sticky top-[calc(3rem+1px)] z-10 flex h-11 items-end gap-1 border-b border-border bg-background/95 px-6 backdrop-blur"
      >
        {shown.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={t === current ? "page" : undefined}
            onClick={() => setTab(t === "overview" ? null : t)}
            className="relative h-11 px-3 text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-brand"
          >
            {tabLabel(r, t)}
            {t === "contents" && r.state === "ready" && (
              <span className="ms-1.5 text-caption text-ash">{r.items}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="px-6 pt-6">{body}</div>
    </div>
  )
}

function Hero({ r }: { r: PackageRegistry }) {
  const a = useRegistryActions()
  const menu = useRegistryMenu()
  const can = useRegistryCan()
  const meta = kindMeta[r.kind]
  const ready = r.state === "ready"
  return (
    <header className="flex min-w-0 items-center gap-4 px-6 pt-6 pb-5">
      <RegistryLogo kind={r.kind} className="size-14 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-subheading font-normal">{r.name}</h1>
          <StatusPill r={r} />
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-2 text-body-sm text-muted-foreground">
          <span className="shrink-0">
            {meta.label} {r.version}
          </span>
          <span className="text-mist">·</span>
          <span className="flex min-w-0 items-center gap-1">
            {r.https ? (
              <Lock className="size-3.5 shrink-0 text-success" />
            ) : (
              <LockOpen className="size-3.5 shrink-0" />
            )}
            <span className="truncate font-mono text-caption">{r.address}</span>
            <CopyCode
              text={r.address}
              label="address"
              className="size-7 bg-transparent"
            />
          </span>
          <span className="text-mist">·</span>
          <Link
            href={`/servers/${r.server_id}`}
            className="truncate hover:text-foreground"
          >
            {r.server_name}
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {ready && can(r, "operator") && (
          <HeaderIcon
            label="Check now"
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={a.pending.has(r.id)}
                onClick={() => a.check(r)}
              />
            }
          >
            <Activity className={cn(a.pending.has(r.id) && "animate-pulse")} />
          </HeaderIcon>
        )}
        {ready && (
          <Button
            variant="outline"
            render={
              <a href={r.url} target="_blank" rel="noopener noreferrer" />
            }
            nativeButton={false}
          >
            <ExternalLink />
            Open {meta.label}
          </Button>
        )}
        <ItemMenu
          groups={menu(r, { onPage: true })}
          label={`${r.name} actions`}
        />
      </div>
    </header>
  )
}

function PhoneShell({
  r,
  tabs: shown,
  tab,
  onTab,
  children,
}: {
  r: PackageRegistry
  tabs: Tab[]
  tab: Tab
  onTab: (t: Tab | null) => void
  children: ReactNode
}) {
  const back = useBack("/registries")
  const menu = useRegistryMenu()
  const [open, setOpen] = useOpen("registry-page-sheet")
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon-lg" aria-label="Back" onClick={back}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-body font-medium">
          {r.name}
        </h1>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Actions"
          onClick={() => setOpen(true)}
        >
          <Ellipsis className="size-5" />
        </Button>
      </header>
      <div className="flex items-center gap-3 px-4 pt-4">
        <RegistryLogo kind={r.kind} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-caption">{r.address}</p>
          <p className={cn("text-caption", toneText[statusOf(r).tone])}>
            {statusOf(r).label}
          </p>
        </div>
      </div>
      <div className="mt-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {shown.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === tab}
            onClick={() => onTab(t === "overview" ? null : t)}
            className="h-9 shrink-0 rounded-full border border-border px-4 text-body-sm whitespace-nowrap aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {tabLabel(r, t)}
          </button>
        ))}
      </div>
      <div className="flex-1 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomSheet open={open} onOpenChange={setOpen} title={r.name}>
        <SheetItems groups={menu(r, { onPage: true })} onOpenChange={setOpen} />
      </BottomSheet>
    </div>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────

function OverviewTab({
  r,
  phone,
  onTab,
}: {
  r: PackageRegistry
  phone: boolean
  onTab: (t: Tab) => void
}) {
  const job = useRegistryJob(r)
  if (r.state === "deploying" || r.state === "removing" || r.state === "failed")
    return <DeployPanel r={r} job={job} phone={phone} />
  return (
    <div
      className={cn(
        "grid gap-6",
        !phone && "xl:grid-cols-[minmax(0,1fr)_22rem]",
      )}
    >
      <div className="grid min-w-0 content-start gap-6">
        {jobRunning(job) && job && <RunningJob title={job.title} job={job} />}
        <Tiles r={r} phone={phone} onTab={onTab} />
        {r.problem && (
          <div
            className={cn(
              "flex gap-3 rounded-2xl border border-border bg-subtle p-4 text-body-sm",
              phone && "mx-4",
            )}
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="min-w-0">{r.problem}</p>
          </div>
        )}
        <UseIt r={r} phone={phone} />
      </div>
      <div className="grid min-w-0 content-start gap-6">
        <Checklist r={r} phone={phone} />
        <About r={r} phone={phone} />
      </div>
    </div>
  )
}

function RunningJob({
  title,
  job,
}: {
  title: string
  job: NonNullable<ReturnType<typeof useRegistryJob>>
}) {
  const jobs = useJobActions()
  return (
    <div className="grid gap-2 rounded-2xl border border-border p-4">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-body-sm font-medium">
          {title}
        </p>
        <Button variant="ghost" size="sm" onClick={() => jobs.show(job.id)}>
          Details
        </Button>
      </div>
      <JobBar job={job} />
      <p className="truncate text-caption text-muted-foreground">
        {progressText(job)}
      </p>
    </div>
  )
}

function DeployPanel({
  r,
  job,
  phone,
}: {
  r: PackageRegistry
  job: ReturnType<typeof useRegistryJob>
  phone: boolean
}) {
  const jobs = useJobActions()
  const a = useRegistryActions()
  const can = useRegistryCan()
  const failed = r.state === "failed"
  return (
    <section
      className={cn(
        "grid gap-6 border-border p-6",
        phone
          ? "border-y"
          : "rounded-3xl border md:grid-cols-[minmax(0,1fr)_18rem]",
      )}
    >
      <div className="min-w-0">
        <p className="font-label text-[11px] tracking-label text-ash uppercase">
          {r.state === "removing"
            ? "Removing"
            : failed
              ? "Deploy failed"
              : "Deploying"}
        </p>
        <h2 className="mt-1 text-subheading font-normal">
          {failed
            ? `${r.name} didn't come up`
            : r.state === "removing"
              ? `Taking ${r.name} down`
              : `Setting up ${kindMeta[r.kind].label} on ${r.server_name}`}
        </h2>
        {failed ? (
          <p className="mt-2 text-body-sm text-destructive">
            {r.problem || "The deploy job failed."}
          </p>
        ) : (
          job && (
            <div className="mt-4 grid gap-2">
              <JobBar job={job} />
              <p className="truncate text-caption text-muted-foreground">
                {progressText(job)}
              </p>
              {job.progress.current && (
                <p className="truncate font-mono text-caption text-ash">
                  {job.progress.current}
                </p>
              )}
            </div>
          )
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {job && (
            <Button variant="outline" onClick={() => jobs.show(job.id)}>
              <ScrollText />
              {failed ? "Show the log" : "Follow the log"}
            </Button>
          )}
          {failed && can(r, "engineer") && (
            <Button onClick={() => a.redeploy(r)}>
              <RotateCcw />
              Deploy again
            </Button>
          )}
          {failed && can(r, "owner") && (
            <Button variant="ghost" onClick={() => a.remove(r)}>
              Remove it
            </Button>
          )}
        </div>
        {r.kind === "harbor" && r.state === "deploying" && (
          <p className="mt-4 text-caption text-ash">
            Harbor pulls about ten images: the first deploy takes a few minutes.
            You can leave this page; it carries on.
          </p>
        )}
      </div>
      {r.state !== "removing" && <DeploySteps r={r} job={job} />}
    </section>
  )
}

function Tiles({
  r,
  phone,
  onTab,
}: {
  r: PackageRegistry
  phone: boolean
  onTab: (t: Tab) => void
}) {
  const meta = kindMeta[r.kind]
  const s = statusOf(r)
  const tiles: {
    label: string
    value: string
    hint: string
    tone?: string
    onClick?: () => void
  }[] = [
    {
      label: "Status",
      value: s.label,
      hint: r.checked_at
        ? `Checked ${timeAgo(r.checked_at)}`
        : "Not checked yet",
      tone: toneText[s.tone],
    },
    {
      label: meta.nouns,
      value: String(r.items),
      hint: `Browse ${meta.nouns}`,
      onClick: () => onTab("contents"),
    },
    { label: "Stored", value: formatSize(r.usage_bytes), hint: `in ${r.dir}` },
    {
      label: "Mirror",
      value: r.settings.mirror
        ? r.kind === "harbor"
          ? "Docker Hub"
          : "npmjs"
        : "Off",
      hint: r.settings.mirror
        ? r.kind === "harbor"
          ? `Project ${r.settings.mirror_project || "dockerhub"}`
          : "Fetched once, kept here"
        : "Turn it on in Settings",
    },
  ]
  return (
    <div
      className={cn(
        "grid gap-3",
        phone ? "grid-cols-2 px-4" : "grid-cols-2 lg:grid-cols-4",
      )}
    >
      {tiles.map((t) => {
        const inner = (
          <>
            <span className="text-caption text-ash capitalize">{t.label}</span>
            <span
              className={cn("truncate text-subheading font-normal", t.tone)}
            >
              {t.value}
            </span>
            <span className="truncate text-caption text-muted-foreground">
              {t.hint}
            </span>
          </>
        )
        return t.onClick ? (
          <button
            key={t.label}
            type="button"
            onClick={t.onClick}
            className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-border p-4 text-start outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {inner}
          </button>
        ) : (
          <div
            key={t.label}
            className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-border p-4"
          >
            {inner}
          </div>
        )
      })}
    </div>
  )
}

function UseIt({ r, phone }: { r: PackageRegistry; phone: boolean }) {
  const samples = r.kind === "harbor" ? dockerSamples(r) : npmSamples(r)
  return (
    <section
      className={cn(
        "grid gap-3 border-border",
        phone ? "border-y px-4 py-5" : "rounded-2xl border p-6",
      )}
    >
      <div>
        <h2 className="text-body font-medium">Use it</h2>
        <p className="text-caption text-muted-foreground">
          {r.kind === "harbor"
            ? "Sign in with a robot account (Robot accounts tab), not the admin."
            : "Sign in with a user from the Users tab. USER and PASSWORD are theirs."}
        </p>
      </div>
      <CodeTabs samples={samples} label="example" />
    </section>
  )
}

type SetupCheck = {
  key: string
  label: string
  done: boolean
  detail: string
  action?: ReactNode
}

// What's set up around it, with a way to finish what isn't.
function Checklist({ r, phone }: { r: PackageRegistry; phone: boolean }) {
  const a = useRegistryActions()
  const can = useRegistryCan()
  const engineer = can(r, "engineer")
  const checks: SetupCheck[] = [
    {
      key: "running",
      label: "Deployed",
      done: r.health === "online",
      detail: `Compose project ${r.project}`,
      action: (
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={projectHref(r.server_id, r.project)} />}
          nativeButton={false}
        >
          <Container />
          Containers
        </Button>
      ),
    },
  ]
  if (r.domain) {
    checks.push({
      key: "site",
      label: "On the reverse proxy",
      done: !!r.proxy_host_id,
      detail: r.proxy_host_id ? r.domain : "No site yet",
      action:
        r.proxy_id && r.proxy_host_id ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={hostHref(r.proxy_id, r.proxy_host_id)} />}
            nativeButton={false}
          >
            <Split />
            Site
          </Button>
        ) : engineer ? (
          <Button variant="ghost" size="sm" onClick={() => a.secure(r)}>
            <Globe />
            Publish
          </Button>
        ) : undefined,
    })
    checks.push({
      key: "https",
      label: "HTTPS",
      done: r.https,
      detail: r.https ? "Let's Encrypt, renewed by itself" : "Still plain http",
      action:
        !r.https && engineer ? (
          <Button variant="ghost" size="sm" onClick={() => a.secure(r)}>
            <FileKey />
            Get HTTPS
          </Button>
        ) : undefined,
    })
  } else {
    checks.push({
      key: "port",
      label: "Reachable on the port",
      done: true,
      detail: `Plain http on ${r.address}`,
    })
  }
  if (r.kind === "harbor")
    checks.push({
      key: "login",
      label: "Containers login",
      done: !!r.docker_registry_id,
      detail: r.docker_registry_id
        ? "Pulls and update checks use a robot login"
        : "No login in Containers › Registries",
      action: (
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/containers/registries" />}
          nativeButton={false}
        >
          <KeyRound />
          Registries
        </Button>
      ),
    })
  checks.push({
    key: "monitor",
    label: "Watched",
    done: false,
    detail: "Get alerted when it stops answering",
    action: (
      <Button
        variant="ghost"
        size="sm"
        render={
          <Link
            href={newMonitorHref("/monitoring/new", {
              kind: "http",
              url: `${r.url}${r.kind === "harbor" ? "/api/v2.0/ping" : "/-/ping"}`,
            })}
          />
        }
        nativeButton={false}
      >
        <HeartPulse />
        Add a monitor
      </Button>
    ),
  })
  return (
    <section
      className={cn("border-border", phone ? "border-y" : "rounded-2xl border")}
    >
      <h2
        className={cn(
          "text-body font-medium",
          phone ? "px-4 pt-5" : "px-5 pt-5",
        )}
      >
        Setup
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {checks.map((c) => (
          <li
            key={c.key}
            className={cn(
              "flex items-center gap-3 py-3",
              phone ? "px-4" : "px-5",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                c.done ? "bg-success/15 text-success" : "bg-muted text-ash",
              )}
            >
              {c.done ? (
                <Check className="size-3.5" />
              ) : (
                <span className="size-1.5 rounded-full bg-ash" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-medium">{c.label}</p>
              <p className="truncate text-caption text-muted-foreground">
                {c.detail}
              </p>
            </div>
            {c.action}
          </li>
        ))}
      </ul>
    </section>
  )
}

function About({ r, phone }: { r: PackageRegistry; phone: boolean }) {
  const rows: [string, ReactNode][] = [
    [
      "Server",
      <Link
        key="s"
        href={`/servers/${r.server_id}`}
        className="hover:underline"
      >
        {r.server_name}
      </Link>,
    ],
    [
      "Folder",
      <span key="d" className="font-mono text-caption break-all">
        {r.dir}
      </span>,
    ],
    ["Port", r.domain ? `127.0.0.1:${r.port}` : `Every address, ${r.port}`],
    ["Admin user", r.admin_user],
    ["Deployed by", r.created_by_name || "—"],
    ["Added", new Date(r.created_at).toLocaleDateString()],
  ]
  if (r.note) rows.unshift(["Note", r.note])
  return (
    <section
      className={cn(
        "border-border",
        phone ? "border-y px-4 py-5" : "rounded-2xl border p-5",
      )}
    >
      <h2 className="text-body font-medium">About</h2>
      <dl className="mt-3 grid gap-3">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-body-sm"
          >
            <dt className="text-ash">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
