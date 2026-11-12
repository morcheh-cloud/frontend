"use client"

import {
  ChevronRight,
  Ellipsis,
  Layers,
  Loader2,
  RefreshCcw,
  Rocket,
  Save,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsStringLiteral, useQueryStates } from "nuqs"
import { useState } from "react"
import { toast } from "sonner"

import { yamlProblems } from "@/app/(panel)/ansible/components/yaml-editor"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
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
  Segmented,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useDockerProject, useSaveProjectFiles } from "../api"
import { ComposeFiles } from "./compose-files"
import { EnvPage } from "./env-page"
import { containerHref, Dot, stateOf } from "./meta"
import { Block, CopyButton, Pairs, Quiet } from "./parts"
import {
  projectHref,
  projectStateMeta,
  useProjectActions,
} from "./project-actions"

const tabs = ["overview", "files"] as const
type Tab = (typeof tabs)[number]
const tabParsers = {
  tab: parseAsStringLiteral(tabs).withDefault("overview"),
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
  const [{ tab }, setTabs] = useQueryStates(tabParsers, { history: "replace" })
  const [sheet, setSheet] = useOpen("docker-project-sheet")
  usePageCrumbs([
    { href: "/containers/projects", label: "Projects" },
    { href: projectHref(id, name), label: name },
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

  // Files need Engineer, and the backend says whether it could read them.
  const showFiles = actions.can.manage && (p.readable || p.missing)
  const current: Tab = tab === "files" && showFiles ? "files" : "overview"
  const setTab = (t: Tab) => setTabs({ tab: t === "overview" ? null : t })
  const menu = actions.menu(p)
  const deployed = p.state !== "not-deployed"
  const primary = actions.can.manage && !p.missing && (
    <Button
      disabled={actions.pending}
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
  const meta = projectStateMeta[p.state]

  const tabBar = showFiles && (
    <Segmented
      label="Project section"
      value={current}
      onChange={setTab}
      items={[
        { value: "overview", label: "Overview" },
        { value: "files", label: "Files" },
      ]}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      {phone ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center justify-center gap-1.5 text-body-sm text-muted-foreground">
            <Dot tone={meta.tone} />
            {meta.label}
            {p.total > 0 && ` · ${p.running}/${p.total} running`}
          </p>
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
          {tabBar && <div className="flex justify-center">{tabBar}</div>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <Layers className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-subheading font-medium">{p.name}</p>
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
          {tabBar}
          <div className="flex shrink-0 gap-2">
            {primary}
            <ItemMenu groups={menu} label="Project actions" />
          </div>
        </div>
      )}
      {current === "files" ? (
        <FilesTab
          key={p.name}
          p={p}
          serverId={id}
          phone={phone}
          onApply={() => actions.run(p.name, "up")}
        />
      ) : (
        <Overview
          p={p}
          serverId={id}
          canEdit={showFiles}
          onFiles={() => setTab("files")}
        />
      )}
      {actions.dialog}
      <BottomSheet open={sheet} onOpenChange={setSheet} title={p.name}>
        <SheetItems groups={menu} onOpenChange={setSheet} />
      </BottomSheet>
    </div>
  )
}

function Overview({
  p,
  serverId,
  canEdit,
  onFiles,
}: {
  p: DockerProjectDetails
  serverId: string
  canEdit: boolean
  onFiles: () => void
}) {
  const notes: Note[] = []
  if (p.missing) {
    notes.push({
      key: "missing",
      title: "Its compose file isn't on the server",
      body: "The containers are still there, but the file they were made from was moved or deleted. You can stop or take them down; to deploy again, put the file back.",
      warn: true,
    })
  } else if (p.state === "partial") {
    notes.push({
      key: "partial",
      title: "Some of its containers aren't running",
      body: "Open a stopped one to read its logs, or Redeploy to bring every service up.",
      warn: true,
    })
  }
  if (!p.managed && !p.missing) {
    notes.push({
      key: "external",
      title: "Started outside Morche",
      body: "It lives outside the workspace's projects folder. Morche runs the same compose commands on it, and Destroy leaves its folder alone.",
    })
  }
  return (
    <div className="flex flex-col gap-6">
      <Notices notes={notes} className="max-md:-mx-4" />
      <div className="@container">
        <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-2">
          <Block title={`Containers ${p.containers.length}`}>
            {p.containers.length === 0 ? (
              <Quiet>
                None yet. Deploy creates one for each service in the compose
                file.
              </Quiet>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {[...p.containers]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => {
                    const s = stateOf(c)
                    return (
                      <li key={c.id}>
                        <Link
                          href={containerHref(serverId, c.name)}
                          className="flex min-h-11 items-center gap-3 py-2 outline-none hover:text-brand focus-visible:text-brand"
                        >
                          <Dot tone={s.tone} />
                          <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                            {c.name}
                          </span>
                          <span className="text-caption text-muted-foreground">
                            {s.label}
                          </span>
                          <ChevronRight className="size-4 text-ash rtl:rotate-180" />
                        </Link>
                      </li>
                    )
                  })}
              </ul>
            )}
          </Block>
          <Block
            title="About"
            aside={
              canEdit && (
                <Button variant="ghost" size="sm" onClick={onFiles}>
                  Edit files
                </Button>
              )
            }
          >
            <Pairs
              rows={[
                {
                  label: "Folder",
                  value: p.dir ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-caption">
                        {p.dir}
                      </span>
                      <CopyButton value={p.dir} label="Copy the folder" />
                    </span>
                  ) : (
                    ""
                  ),
                },
                {
                  label: p.files.length > 1 ? "Compose files" : "Compose file",
                  value: p.files.join("\n"),
                  mono: true,
                },
                { label: ".env", value: p.has_env ? "Yes" : "No" },
                { label: "Services", value: p.services.join(", ") },
                { label: "Images", value: p.images.join("\n"), mono: true },
                {
                  label: "Created",
                  value: p.created ? timeAgo(p.created) : "",
                },
              ]}
            />
          </Block>
        </div>
      </div>
    </div>
  )
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
      },
      {
        onSuccess: () => {
          setDraft(null)
          setConflict(false)
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
      {phone && !p.missing && (
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-2 border-t border-border bg-background px-4 py-2">
          {buttons}
        </div>
      )}
    </div>
  )
}
