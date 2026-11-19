"use client"

import { ArrowUpRight, Plus, RefreshCcwDot } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import type {
  DockerAutoUpdate,
  DockerProjectContainer,
  DockerServerAutoUpdate,
  DockerServerAutoUpdateCover,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { cronText } from "../../cronjobs/components/meta"
import { Empty } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useServerAutoUpdate } from "../api"
import { usePolicyActions } from "./auto-update-actions"
import { AutoUpdateEvents } from "./auto-update-events"
import {
  AUTO_UPDATE,
  autoUpdateHref,
  coverText,
  lastStateMeta,
  namesProject,
  newAutoUpdateHref,
} from "./auto-update-meta"
import { MonthCounts, PolicyIcon } from "./auto-update-view"
import { PageBar, PhoneRow, Rows, Table, Tag, Tr } from "./kit"
import { containerHref, Dot, type Tone } from "./meta"

// How a policy relates to this project.
type Relation = "covers" | "paused" | "leaves-out"

type Row = { p: DockerAutoUpdate; rel: Relation }

// The policies naming this server that touch the project: the ones that
// take one of its containers now (the backend's own pick), paused ones that
// would, and ones that leave it out on purpose.
export function projectPolicies(
  data: DockerServerAutoUpdate | undefined,
  project: string,
  names: Set<string>,
): { rows: Row[]; covers: Map<string, DockerServerAutoUpdateCover> } {
  const covers = new Map<string, DockerServerAutoUpdateCover>()
  if (!data) return { rows: [], covers }
  const taking = new Set<string>()
  for (const c of data.containers) {
    if (!names.has(c.container)) continue
    covers.set(c.container, c)
    for (const id of c.policies) taking.add(id)
  }
  const rows: Row[] = []
  for (const p of data.policies) {
    if (taking.has(p.id)) rows.push({ p, rel: "covers" })
    else if (namesProject(p.exclude, project))
      rows.push({ p, rel: "leaves-out" })
    else if (
      !p.enabled &&
      (p.pick === "all" ||
        (p.pick === "chosen" && namesProject(p.include, project)))
    )
      rows.push({ p, rel: "paused" })
  }
  const order: Record<Relation, number> = {
    covers: 0,
    paused: 1,
    "leaves-out": 2,
  }
  rows.sort(
    (a, b) => order[a.rel] - order[b.rel] || a.p.name.localeCompare(b.p.name),
  )
  return { rows, covers }
}

// The number on the project's Auto-update tab: policies that take it now.
export function useProjectAutoUpdateCount(
  server: string,
  containers: DockerProjectContainer[] | undefined,
) {
  const query = useServerAutoUpdate(server)
  const names = new Set((containers ?? []).map((c) => c.name))
  const ids = new Set<string>()
  for (const c of query.data?.containers ?? [])
    if (names.has(c.container)) for (const id of c.policies) ids.add(id)
  return ids.size
}

// A project page's Auto-update tab.
export function ProjectAutoUpdate({
  server,
  workspace,
  project,
  containers,
  phone,
}: {
  server: { id: string; name: string }
  workspace: string
  project: string
  containers: DockerProjectContainer[] | undefined
  phone: boolean
}) {
  const router = useRouter()
  const query = useServerAutoUpdate(server.id)
  const a = usePolicyActions(workspace)
  const names = new Set((containers ?? []).map((c) => c.name))
  const { rows, covers } = projectPolicies(query.data, project, names)
  const taking = rows.filter((r) => r.rel === "covers")
  const others = (query.data?.policies.length ?? 0) - rows.length
  const newHref = newAutoUpdateHref({ server: server.id, project })
  const create = () => router.push(newHref)

  const updating = [...covers.values()].filter((c) => !c.monitor).length
  const reported = covers.size - updating
  const total = containers?.length ?? 0
  const caption = query.isPending
    ? "Loading…"
    : taking.length === 0
      ? "Nothing updates this project by itself"
      : [
          `${taking.length} ${taking.length === 1 ? "policy" : "policies"}`,
          updating > 0 &&
            `${updating} of ${total} container${total === 1 ? "" : "s"} update by themselves`,
          reported > 0 && `${reported} only reported`,
        ]
          .filter(Boolean)
          .join(" · ")

  const bar = (
    <PageBar
      phone={phone}
      caption={
        <span className="text-caption text-muted-foreground">{caption}</span>
      }
      refresh={{ busy: query.isFetching, run: () => query.refetch() }}
      primary={
        a.can.edit
          ? { label: "New policy", icon: <Plus />, run: create }
          : undefined
      }
      aside={
        phone ? undefined : (
          <Button
            variant="ghost"
            render={<Link href={AUTO_UPDATE} />}
            nativeButton={false}
          >
            All policies
          </Button>
        )
      }
    />
  )

  if (query.isPending || !containers) {
    return (
      <div className="flex flex-col gap-4">
        {bar}
        <div className={cn("flex flex-col gap-2", phone && "px-4")}>
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex flex-col gap-4">
        {bar}
        <Empty
          icon={RefreshCcwDot}
          title="Couldn't read the auto-update policies"
          body={query.error.message}
        />
      </div>
    )
  }

  const empty = rows.length === 0

  return (
    <div className="flex flex-col gap-6 max-md:gap-5 max-md:pb-24">
      {bar}

      {empty ? (
        <Empty
          icon={RefreshCcwDot}
          title="Nothing keeps this project up to date"
          body={
            <>
              A policy looks for newer images of {project}'s containers on a
              schedule, pulls them and recreates the containers with the same
              settings, rolling back if they don't come up. It can also only
              tell you when a new image is out.
              {others > 0 &&
                ` ${others} ${others === 1 ? "policy" : "policies"} on ${server.name} ${others === 1 ? "doesn't" : "don't"} take it in.`}
            </>
          }
          action={
            a.can.edit ? (
              <Button render={<Link href={newHref} />} nativeButton={false}>
                <Plus />
                Keep {project} up to date
              </Button>
            ) : (
              <span className="text-body-sm text-muted-foreground">
                Ask someone with Engineer access to this workspace to add one.
              </span>
            )
          }
        />
      ) : (
        <Section
          title="Policies"
          caption={`Auto-update policies on ${server.name} that take in this project's containers, or name it.`}
          phone={phone}
        >
          <Policies rows={rows} phone={phone} a={a} />
        </Section>
      )}

      {!empty && total > 0 && (
        <Section
          title="Containers"
          caption="What happens to each one when a policy runs."
          phone={phone}
        >
          <ContainerCover
            serverId={server.id}
            containers={containers}
            covers={covers}
            policies={query.data?.policies ?? []}
            phone={phone}
          />
        </Section>
      )}

      {!empty && (
        <Section title="Recent activity" phone={phone}>
          <AutoUpdateEvents
            ws={workspace}
            phone={phone}
            fixedServer={server.id}
            match={(e) => names.has(e.container)}
            limit={10}
            showPolicy
            emptyText="No policy has updated, found a new image for or failed on these containers yet."
          />
        </Section>
      )}

      {a.dialogs}
    </div>
  )
}

const relationTag: Record<Exclude<Relation, "covers">, string> = {
  paused: "Paused",
  "leaves-out": "Leaves it out",
}

function Policies({
  rows,
  phone,
  a,
}: {
  rows: Row[]
  phone: boolean
  a: ReturnType<typeof usePolicyActions>
}) {
  const router = useRouter()
  const open = (p: DockerAutoUpdate) => router.push(autoUpdateHref(p.id))

  if (phone) {
    return (
      <Rows>
        {rows.map(({ p, rel }) => {
          const last = lastStateMeta(p)
          return (
            <PhoneRow
              key={p.id}
              id={p.id}
              title={
                <>
                  {p.name}
                  {rel !== "covers" && <Tag>{relationTag[rel]}</Tag>}
                </>
              }
              sub={
                <span className="inline-flex items-center gap-1.5">
                  <Dot tone={p.enabled ? last.tone : "muted"} />
                  {p.enabled ? last.label : "Paused"} ·{" "}
                  {p.cron ? cronText(p.cron) : "By hand or webhook"}
                </span>
              }
              lead={<PolicyIcon p={p} />}
              onOpen={() => open(p)}
              menu={a.menu(p)}
            />
          )
        })}
      </Rows>
    )
  }

  return (
    <Table
      head={[
        { label: "Policy" },
        { label: "Does" },
        { label: "Runs" },
        { label: "Last run" },
        { label: "Last 30 days", className: "hidden @4xl:table-cell" },
        { label: "On", className: "w-16" },
      ]}
    >
      {rows.map(({ p, rel }) => {
        const last = lastStateMeta(p)
        return (
          <Tr
            key={p.id}
            label={p.name}
            onOpen={() => open(p)}
            menu={a.menu(p)}
            cells={[
              {
                node: (
                  <span className="flex items-center gap-3">
                    <PolicyIcon p={p} />
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center">
                        <span className="truncate font-medium">{p.name}</span>
                        {rel !== "covers" && <Tag>{relationTag[rel]}</Tag>}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {coverText(p)}
                      </span>
                    </span>
                  </span>
                ),
              },
              {
                node:
                  p.mode === "monitor" ? (
                    <Tag tone="brand">Only tells</Tag>
                  ) : (
                    <span className="text-muted-foreground">Updates</span>
                  ),
                className: "[&>span]:ms-0",
              },
              {
                node: (
                  <span className="block">
                    <span className="block">
                      {p.cron ? cronText(p.cron) : "By hand or webhook"}
                    </span>
                    {p.enabled && p.next_run_at && (
                      <span className="block text-caption text-ash">
                        Next {timeAgo(p.next_run_at)}
                      </span>
                    )}
                  </span>
                ),
                className: "text-muted-foreground",
              },
              {
                node: (
                  <span className="block">
                    <span className="flex items-center gap-1.5">
                      <Dot tone={last.tone} />
                      {last.label}
                    </span>
                    {p.last_run_at && (
                      <span className="block text-caption text-ash">
                        {timeAgo(p.last_run_at)}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                node: <MonthCounts p={p} />,
                className: "hidden @4xl:table-cell",
              },
              {
                node: a.can.edit ? (
                  <Switch
                    aria-label={p.enabled ? "Pause" : "Turn on"}
                    checked={p.enabled}
                    disabled={a.toggling}
                    onCheckedChange={(on) => a.setEnabled(p, on)}
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {p.enabled ? "On" : "Paused"}
                  </span>
                ),
              },
            ]}
          />
        )
      })}
    </Table>
  )
}

function coverState(
  c: DockerProjectContainer,
  cover: DockerServerAutoUpdateCover | undefined,
): { label: string; tone: Tone } {
  if (cover && !cover.monitor)
    return { label: "Updates by itself", tone: "success" }
  if (cover) return { label: "Only reported", tone: "brand" }
  if (c.state !== "running")
    return { label: "Not running, so left out", tone: "muted" }
  return { label: "Not covered", tone: "muted" }
}

function ContainerCover({
  serverId,
  containers,
  covers,
  policies,
  phone,
}: {
  serverId: string
  containers: DockerProjectContainer[]
  covers: Map<string, DockerServerAutoUpdateCover>
  policies: DockerAutoUpdate[]
  phone: boolean
}) {
  const nameOf = new Map(policies.map((p) => [p.id, p.name]))
  const sorted = [...containers].sort((a, b) =>
    (a.service || a.name).localeCompare(b.service || b.name),
  )
  return (
    <ul
      className={cn(
        "divide-y divide-border",
        phone
          ? "border-y border-border"
          : "overflow-hidden rounded-2xl border border-border",
      )}
    >
      {sorted.map((c) => {
        const cover = covers.get(c.name)
        const s = coverState(c, cover)
        const by = (cover?.policies ?? [])
          .map((id) => nameOf.get(id))
          .filter(Boolean)
          .join(", ")
        return (
          <li key={c.id}>
            <Link
              href={containerHref(serverId, c.name)}
              className={cn(
                "flex min-w-0 items-center gap-3 px-4 hover:bg-subtle/60 active:bg-muted",
                phone ? "min-h-16 py-2" : "py-2.5",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium">
                  {c.service || c.name}
                </span>
                <span className="block truncate font-mono text-caption text-muted-foreground">
                  {c.image}
                </span>
              </span>
              <span className="flex min-w-0 shrink-0 flex-col items-end text-end">
                <span className="inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap">
                  <Dot tone={s.tone} />
                  {s.label}
                </span>
                {by && (
                  <span className="max-w-60 truncate text-caption text-ash">
                    {by}
                  </span>
                )}
              </span>
              {!phone && <ArrowUpRight className="size-4 shrink-0 text-ash" />}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Section({
  title,
  caption,
  phone,
  children,
}: {
  title: string
  caption?: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className={cn(phone && "px-4")}>
        <h3 className="text-body-sm font-medium">{title}</h3>
        {caption && (
          <p className="text-caption text-muted-foreground">{caption}</p>
        )}
      </div>
      {children}
    </section>
  )
}
