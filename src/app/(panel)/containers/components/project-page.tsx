"use client"

import {
  Ellipsis,
  Layers,
  Loader2,
  RefreshCcw,
  Rocket,
  Save,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { yamlProblems } from "@/app/(panel)/ansible/components/yaml-editor"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { DockerFleetServer, DockerProjectDetails } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  ItemMenu,
  type Note,
  Notices,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { useDockerProject, useProjectStats, useSaveProjectFiles } from "../api"
import { ComposeFiles } from "./compose-files"
import { ProjectAlerts, useContainerRules } from "./container-alerts"
import { DeployPanel } from "./deploy-panel"
import { EnvPage } from "./env-page"
import { Dot } from "./meta"
import { useDockerCan } from "./permissions"
import {
  projectHref,
  projectStateMeta,
  useProjectActions,
} from "./project-actions"
import { ProjectContainers } from "./project-containers"
import {
  type DeployAction,
  serviceRows,
  useProjectDeploy,
} from "./project-deploy"
import { ProjectEnv } from "./project-env"
import { ProjectGit } from "./project-git"
import { ProjectHistory } from "./project-history"
import { ProjectLogs } from "./project-logs"
import { ProjectOverview, type ProjectTab } from "./project-overview"
import { ProjectProduction } from "./project-production"

const tabs = [
  "overview",
  "containers",
  "logs",
  "production",
  "alerts",
  "files",
  "environment",
  "history",
  "git",
] as const satisfies readonly ProjectTab[]
const tabParsers = {
  tab: parseAsStringLiteral(tabs).withDefault("overview"),
  // Logs tab: only this service ("" = every one).
  svc: parseAsString.withDefault(""),
}

// /containers/projects/[name]: one compose project of the environment.
export function ProjectPage() {
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params.name)
  return (
    <EnvPage title={name} parent="/containers/projects" anyState>
      {(ctx) => <Project {...ctx} name={name} />}
    </EnvPage>
  )
}

function Project({
  env,
  phone,
  name,
}: {
  env: DockerFleetServer
  phone: boolean
  name: string
}) {
  const id = env.server_id
  const query = useDockerProject(id, name)
  const actions = useProjectActions(id, env.workspace_id)
  const can = useDockerCan(id, env.workspace_id)
  const deploy = useProjectDeploy(id, query.data)
  // While a deploy runs, containers appear by the second.
  const statsQuery = useProjectStats(id, true, !!deploy?.active)
  const alerts = useContainerRules({
    server: { id, name: env.name },
    project: name,
  })
  const [{ tab, svc }, setTabs] = useQueryStates(tabParsers, {
    history: "replace",
  })
  const [sheet, setSheet] = useOpen("docker-project-sheet")
  // The nav already gives Containers › Projects; add the project itself.
  usePageCrumbs([
    { href: projectHref(id, name), label: query.data?.title || name },
  ])

  const p = query.data
  if (!p) {
    if (query.isError) {
      const gone = query.error instanceof ApiError && query.error.status === 404
      return (
        <Empty
          icon={Layers}
          title={gone ? "Project not found" : "Couldn't load the project"}
          body={
            gone
              ? `No project called ${name} on ${env.name}: it was destroyed, or it lives on another server.`
              : query.error.message
          }
          className="mt-6"
          action={
            <Button
              variant="outline"
              render={<Link href="/containers/projects" />}
              nativeButton={false}
            >
              All projects
            </Button>
          }
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  const stats = statsQuery.data?.projects.find((x) => x.name === p.name)
  // A project without containers isn't in the stats at all.
  const containers = stats?.containers ?? (statsQuery.data ? [] : undefined)
  const rows = containers && serviceRows(p, containers, deploy)
  const firing = alerts.list.filter((r) =>
    r.states.some((s) => s.state === "firing"),
  ).length
  // Files need Engineer, and the backend says whether it could read them.
  const showFiles = actions.can.manage && (p.readable || p.missing)
  const editOnly = new Set<ProjectTab>(["files", "environment"])
  const shown = tabs.filter(
    (t) =>
      (!editOnly.has(t) || showFiles) &&
      (t !== "history" || actions.can.manage),
  )
  const current: ProjectTab = shown.includes(tab) ? tab : "overview"
  const setTab = (t: ProjectTab, service?: string) =>
    setTabs({
      tab: t === "overview" ? null : t,
      svc: t === "logs" && service ? service : null,
    })
  const apply = () => actions.run(p.name, "up")
  const menu = actions.menu(p)
  const deployed = p.state !== "not-deployed"
  const primary = actions.can.manage && !p.missing && (
    <Button
      disabled={actions.pending || !!deploy?.active}
      onClick={() => actions.run(p.name, deployed ? "redeploy" : "up")}
      className={cn(phone && "h-11 flex-1")}
    >
      {actions.pending ? (
        <Loader2 className="animate-spin" />
      ) : deployed ? (
        <RefreshCcw />
      ) : (
        <Rocket />
      )}
      {deployed ? "Redeploy" : "Deploy"}
    </Button>
  )
  // A running deploy says so in place of "Not deployed" / "Partly running".
  const meta = deploy?.active
    ? {
        label: `${deployLabels[deploy.action] ?? "Working"}…`,
        tone: "brand" as const,
      }
    : projectStateMeta[p.state]
  const count = (t: ProjectTab) =>
    t === "containers" ? p.total : t === "alerts" ? firing : 0
  const tabBar = (
    <TabBar
      tabs={shown}
      current={current}
      onChange={(t) => setTab(t)}
      count={count}
      phone={phone}
    />
  )

  let body: ReactNode
  switch (current) {
    case "containers":
      body = (
        <ProjectContainers
          serverId={id}
          rows={rows}
          pending={statsQuery.isPending}
          can={can}
          phone={phone}
          onLogs={(s) => setTab("logs", s)}
        />
      )
      break
    case "logs":
      body = (
        <ProjectLogs
          serverId={id}
          project={p.name}
          services={p.services}
          service={svc}
          onService={(s) => setTabs({ svc: s || null })}
          phone={phone}
        />
      )
      break
    case "production":
      body = (
        <ProjectProduction
          p={p}
          stats={stats}
          pending={statsQuery.isPending}
          serverId={id}
          canEdit={actions.can.manage && p.readable && !p.missing}
          phone={phone}
          onApply={apply}
          onFiles={showFiles ? () => setTab("files") : undefined}
        />
      )
      break
    case "alerts":
      body = (
        <ProjectAlerts
          server={{ id, name: env.name }}
          project={p.name}
          phone={phone}
        />
      )
      break
    case "files":
      body = (
        <FilesTab
          key={p.name}
          p={p}
          serverId={id}
          phone={phone}
          onApply={apply}
        />
      )
      break
    case "environment":
      body = (
        <ProjectEnv
          key={p.name}
          p={p}
          serverId={id}
          phone={phone}
          onApply={apply}
        />
      )
      break
    case "history":
      body = (
        <ProjectHistory
          p={p}
          serverId={id}
          phone={phone}
          onApplied={() =>
            toast("Files put back", {
              description: "Containers still run the old ones.",
              action: { label: "Apply now", onClick: apply },
            })
          }
        />
      )
      break
    case "git":
      body = (
        <ProjectGit
          p={p}
          serverId={id}
          canEdit={actions.can.manage}
          phone={phone}
        />
      )
      break
    default:
      body = (
        <ProjectOverview
          p={p}
          stats={stats}
          statsPending={statsQuery.isPending}
          serverId={id}
          canManage={actions.can.manage}
          canFiles={showFiles}
          firing={firing}
          rows={rows}
          deploying={!!deploy?.active}
          phone={phone}
          onTab={(t) => setTab(t)}
        />
      )
  }

  return (
    <div className="flex flex-col gap-5">
      {phone ? (
        <div className="flex flex-col gap-3">
          <div className="text-center">
            {p.title && (
              <p className="truncate text-body font-medium">{p.title}</p>
            )}
            <p className="flex items-center justify-center gap-1.5 text-body-sm text-muted-foreground">
              <Dot tone={meta.tone} />
              {meta.label}
              {p.total > 0 && ` · ${p.running} of ${p.total} containers up`}
            </p>
          </div>
          <div className="flex gap-2">
            {primary}
            {menu.some((g) => g.length > 0) && (
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setSheet(true)}
              >
                <Ellipsis />
                Actions
              </Button>
            )}
          </div>
          {tabBar}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
              <Layers className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-subheading font-medium">
                  {p.title || p.name}
                </span>
                {p.title && (
                  <span className="shrink-0 font-mono text-caption text-muted-foreground">
                    {p.name}
                  </span>
                )}
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Dot tone={meta.tone} />
                  {meta.label}
                </span>
                {p.total > 0 && (
                  <span>
                    {p.running}/{p.total} containers running
                  </span>
                )}
                <span>on {env.name}</span>
                {!p.managed && <span>outside the projects folder</span>}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {primary}
              <ItemMenu groups={menu} label="Project actions" />
            </div>
          </div>
          {tabBar}
        </div>
      )}
      {deploy && (
        <DeployPanel
          key={deploy.job.id}
          d={deploy}
          phone={phone}
          canRun={actions.can.manage && !p.missing}
          onRun={(a) => a !== "git" && actions.run(p.name, a)}
          onTab={(t) => setTab(t)}
          tabs={shown}
        />
      )}
      {body}
      {actions.dialog}
      <BottomSheet open={sheet} onOpenChange={setSheet} title={p.name}>
        <SheetItems groups={menu} onOpenChange={setSheet} />
      </BottomSheet>
    </div>
  )
}

const deployLabels: Partial<Record<DeployAction, string>> = {
  up: "Deploying",
  redeploy: "Redeploying",
  git: "Deploying",
  pull: "Pulling images",
  down: "Taking down",
  destroy: "Destroying",
  start: "Starting",
  stop: "Stopping",
  restart: "Restarting",
}

const tabLabels: Record<ProjectTab, string> = {
  overview: "Overview",
  containers: "Containers",
  logs: "Logs",
  production: "Production",
  alerts: "Alerts",
  files: "Files",
  environment: "Environment",
  history: "History",
  git: "Git",
}

// Underlined tabs on desktop, a scrolling chip row on phones.
function TabBar({
  tabs,
  current,
  onChange,
  count,
  phone,
}: {
  tabs: ProjectTab[]
  current: ProjectTab
  onChange: (t: ProjectTab) => void
  count: (t: ProjectTab) => number
  phone: boolean
}) {
  if (phone)
    return (
      <div
        role="tablist"
        aria-label="Project section"
        className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4"
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={current === t}
            ref={current === t ? scrollIntoView : undefined}
            onClick={() => onChange(t)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-body-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              current === t
                ? "border-brand bg-brand-soft text-brand-strong"
                : "border-border text-muted-foreground",
            )}
          >
            {tabLabels[t]}
            <TabCount tab={t} n={count(t)} />
          </button>
        ))}
      </div>
    )
  return (
    <div
      role="tablist"
      aria-label="Project section"
      className="flex gap-5 overflow-x-auto border-b border-border"
    >
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={current === t}
          onClick={() => onChange(t)}
          className={cn(
            "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-body-sm whitespace-nowrap outline-none focus-visible:text-brand",
            current === t
              ? "border-brand font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tabLabels[t]}
          <TabCount tab={t} n={count(t)} />
        </button>
      ))}
    </div>
  )
}

function TabCount({ tab, n }: { tab: ProjectTab; n: number }) {
  if (!n) return null
  return (
    <span
      className={cn(
        "rounded-full px-1.5 text-caption tabular-nums",
        tab === "alerts"
          ? "bg-destructive text-white"
          : "bg-muted text-muted-foreground",
      )}
    >
      {n}
    </span>
  )
}

// Links can open a late tab; keep it in view on phones.
function scrollIntoView(el: HTMLButtonElement | null) {
  el?.scrollIntoView({ block: "nearest", inline: "center" })
}

type Draft = { compose: string; env: string }

function FilesTab({
  p,
  serverId,
  phone,
  onApply,
}: {
  p: DockerProjectDetails
  serverId: string
  phone: boolean
  onApply: () => void
}) {
  const save = useSaveProjectFiles()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [conflict, setConflict] = useState(false)
  const [note, setNote] = useState("")
  const shown: Draft = draft ?? { compose: p.compose, env: p.env }
  const dirty =
    draft !== null && (draft.compose !== p.compose || draft.env !== p.env)
  const problem = dirty ? yamlProblems(shown.compose, "compose")[0] : undefined
  const refused =
    save.error instanceof ApiError && save.error.status === 422
      ? save.error.message
      : undefined

  const write = (apply: boolean, overwrite = false) =>
    save.mutate(
      {
        server: serverId,
        project: p.name,
        compose: shown.compose,
        env: shown.env,
        revision: overwrite ? "" : p.revision,
        note,
      },
      {
        onSuccess: () => {
          setDraft(null)
          setConflict(false)
          setNote("")
          toast.success(apply ? "Saved, applying the changes" : "Saved")
          if (apply) onApply()
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409) setConflict(true)
          else if (!(e instanceof ApiError && e.status === 422))
            toast.error("Couldn't save", { description: e.message })
        },
      },
    )

  const notes: Note[] = []
  if (conflict) {
    notes.push({
      key: "conflict",
      title: "The files changed on the server meanwhile",
      body: "Someone saved them since you opened this page. Load their version (your edits are dropped), or overwrite it with yours.",
      warn: true,
      action: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(null)
              setConflict(false)
              save.reset()
            }}
          >
            Load theirs
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => write(false, true)}
          >
            Overwrite
          </Button>
        </div>
      ),
    })
  }
  if (refused) {
    notes.push({
      key: "refused",
      title: "docker compose refused the file",
      body: (
        <span className="font-mono text-caption whitespace-pre-wrap">
          {refused}
        </span>
      ),
      warn: true,
    })
  } else if (problem) {
    notes.push({
      key: "yaml",
      title: "YAML problem",
      body: problem.message,
      warn: true,
    })
  }

  const buttons = (
    <>
      <Button
        variant="outline"
        disabled={!dirty || save.isPending}
        onClick={() => {
          setDraft(null)
          save.reset()
        }}
        className={cn(phone && "h-11")}
      >
        Discard
      </Button>
      <Button
        variant="outline"
        disabled={!dirty || save.isPending || !!problem}
        onClick={() => write(false)}
        className={cn(phone && "h-11 flex-1")}
      >
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save
      </Button>
      <Button
        disabled={!dirty || save.isPending || !!problem}
        onClick={() => write(true)}
        className={cn(phone && "h-11 flex-1")}
      >
        <Rocket />
        Save and apply
      </Button>
    </>
  )

  return (
    <div className="flex flex-col gap-3">
      <Notices notes={notes} className="max-md:-mx-4" />
      {p.missing ? (
        <Empty
          icon={Layers}
          title="No compose file to edit"
          body="The file this project was made from isn't on the server any more."
        />
      ) : (
        <ComposeFiles
          compose={shown.compose}
          env={shown.env}
          onCompose={(v) => setDraft({ ...shown, compose: v })}
          onEnv={(v) => setDraft({ ...shown, env: v })}
          height={phone ? "55vh" : "calc(100dvh - 17rem)"}
          aside={
            !phone && (
              <>
                <span className="text-caption text-ash">
                  {dirty ? "Unsaved changes" : p.files[0]}
                </span>
                {buttons}
              </>
            )
          }
        />
      )}
      {dirty && (
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="What changed (kept in the history, optional)"
          aria-label="What changed"
        />
      )}
      {phone && !p.missing && (
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-2 border-t border-border bg-background px-4 py-2">
          {buttons}
        </div>
      )}
    </div>
  )
}
