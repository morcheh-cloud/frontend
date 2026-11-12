"use client"

import { Layers, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { DockerFleetServer, DockerProject } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { useDockerProjects } from "../api"
import { EnvPage } from "./env-page"
import { NoMatch, PageBar, PhoneRow, Rows, Table, Tag, Tr } from "./kit"
import { Dot } from "./meta"
import {
  newProjectHref,
  projectHref,
  projectStateMeta,
  useProjectActions,
} from "./project-actions"

const shows = ["all", "running", "stopped"] as const
type Show = (typeof shows)[number]

const filterParsers = {
  show: parseAsStringLiteral(shows).withDefault("all"),
  q: parseAsString.withDefault(""),
}

export function ProjectsPage() {
  return (
    <EnvPage title="Projects" bleed>
      {(ctx) => <ProjectsView {...ctx} />}
    </EnvPage>
  )
}

function ProjectState({ p }: { p: DockerProject }) {
  const meta = projectStateMeta[p.state]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Dot tone={meta.tone} />
      {meta.label}
    </span>
  )
}

// /containers/projects: the environment's compose projects, running ones
// and folders in the workspace's projects folder that hold a compose file.
export function ProjectsView({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const id = env.server_id
  const router = useRouter()
  const query = useDockerProjects(id)
  const actions = useProjectActions(id, env.workspace_id)
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
  })

  const items = [...(query.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const running = items.filter(
    (p) => p.state === "running" || p.state === "partial",
  )
  const q = filters.q.trim().toLowerCase()
  const shown = items.filter(
    (p) =>
      (filters.show === "all" ||
        (filters.show === "running"
          ? p.state === "running" || p.state === "partial"
          : p.state === "stopped" || p.state === "not-deployed")) &&
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.services.some((s) => s.toLowerCase().includes(q)) ||
        p.images.some((s) => s.toLowerCase().includes(q))),
  )
  const open = (p: DockerProject) => router.push(projectHref(id, p.name))

  let body: React.ReactNode
  if (query.isPending) {
    body = <Skeleton className="h-72 rounded-2xl max-md:mx-4" />
  } else if (query.isError) {
    body = (
      <Empty
        icon={Layers}
        title="Couldn't read the projects"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={Layers}
        title="No compose projects yet"
        body="A project is a compose file and the containers it makes. Start one from a template or paste your own compose file; projects started by hand on the server show up here too."
        className="max-md:mt-4"
        action={
          actions.can.manage && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                render={<Link href={newProjectHref(id)} />}
                nativeButton={false}
              >
                <Plus />
                New project
              </Button>
              <Button
                variant="outline"
                render={<Link href="/containers/templates" />}
                nativeButton={false}
              >
                Browse templates
              </Button>
            </div>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body = <NoMatch onReset={() => setFilters({ q: null, show: null })} />
  } else if (phone) {
    body = (
      <Rows>
        {shown.map((p) => (
          <PhoneRow
            key={p.name}
            id={p.name}
            title={p.name}
            sub={
              <span className="inline-flex items-center gap-1.5">
                <Dot tone={projectStateMeta[p.state].tone} />
                {projectStateMeta[p.state].label}
                {p.total > 0 && ` · ${p.running}/${p.total} running`}
                {!p.managed && " · outside the projects folder"}
              </span>
            }
            onOpen={() => open(p)}
            menu={actions.menu(p)}
          />
        ))}
      </Rows>
    )
  } else {
    body = (
      <Table
        head={[
          { label: "Project" },
          { label: "State" },
          { label: "Containers" },
          { label: "Services", className: "hidden @3xl:table-cell" },
          { label: "Folder", className: "hidden @5xl:table-cell" },
        ]}
      >
        {shown.map((p) => (
          <Tr
            key={p.name}
            label={p.name}
            onOpen={() => open(p)}
            menu={actions.menu(p)}
            cells={[
              {
                node: (
                  <span className="font-medium">
                    {p.name}
                    {!p.managed && <Tag>External</Tag>}
                  </span>
                ),
              },
              { node: <ProjectState p={p} /> },
              {
                node:
                  p.total === 0 ? (
                    <span className="text-ash">None</span>
                  ) : (
                    <span className="tabular-nums">
                      {p.running}/{p.total} running
                    </span>
                  ),
                className: "text-muted-foreground",
              },
              {
                node: (
                  <span className="block max-w-72 truncate">
                    {p.services.join(", ") || "—"}
                  </span>
                ),
                className: "hidden text-muted-foreground @3xl:table-cell",
              },
              {
                node: (
                  <span className="block max-w-80 truncate" title={p.dir}>
                    {p.dir || "—"}
                  </span>
                ),
                className:
                  "hidden font-mono text-caption text-muted-foreground @5xl:table-cell",
              },
            ]}
          />
        ))}
      </Table>
    )
  }

  return (
    <>
      <PageBar
        phone={phone}
        tabs={
          <Segmented
            label="Show"
            value={filters.show}
            onChange={(v: Show) => setFilters({ show: v === "all" ? null : v })}
            items={[
              { value: "all", label: `All ${items.length}` },
              { value: "running", label: `Running ${running.length}` },
              {
                value: "stopped",
                label: `Stopped ${items.length - running.length}`,
              },
            ]}
          />
        }
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search projects, services, images"
            label="Search projects"
            className="md:max-w-72"
          />
        }
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
        primary={
          actions.can.manage
            ? {
                label: "New project",
                icon: <Plus />,
                run: () => router.push(newProjectHref(id)),
              }
            : undefined
        }
      />
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>
      {actions.dialog}
    </>
  )
}
