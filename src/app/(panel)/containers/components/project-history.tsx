"use client"

import {
  Eye,
  EyeOff,
  GitCompareArrows,
  History,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DiffLines, lineDiff } from "@/components/diff"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { DockerProjectDetails, DockerProjectVersion } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  Notices,
  Segmented,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useProjectVersion,
  useProjectVersions,
  useRestoreVersion,
} from "../api"
import { ComposeFiles } from "./compose-files"
import { PhoneRow, Rows, Table, Tag, Tr } from "./kit"

const reasonLabel: Record<DockerProjectVersion["reason"], string> = {
  found: "As found",
  save: "Saved",
  create: "Created",
  restore: "Restored",
  git: "From git",
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

// Tab History of a project: every version of its compose + .env Morche
// wrote, compared with the files now and put back with one click.
export function ProjectHistory({
  p,
  serverId,
  phone,
  onApplied,
}: {
  p: DockerProjectDetails
  serverId: string
  phone: boolean
  // After a restore without deploying, offer to apply.
  onApplied: () => void
}) {
  const query = useProjectVersions(serverId, p.name)
  const [picked, setPicked] = useState<DockerProjectVersion | null>(null)
  const [open, setOpen] = useOpen("docker-project-version")
  const [restoring, setRestoring] = useState<DockerProjectVersion | null>(null)
  const [confirm, setConfirm] = useOpen("docker-project-restore")

  const show = (v: DockerProjectVersion) => {
    setPicked(v)
    setOpen(true)
  }
  const restore = (v: DockerProjectVersion) => {
    setRestoring(v)
    setConfirm(true)
  }
  const menu = (v: DockerProjectVersion): Item[][] => [
    [
      {
        key: "view",
        label: v.current ? "View files" : "Compare with now",
        icon: v.current ? <Eye /> : <GitCompareArrows />,
        onSelect: () => show(v),
      },
    ],
    v.current
      ? []
      : [
          {
            key: "restore",
            label: "Put this version back…",
            icon: <RotateCcw />,
            onSelect: () => restore(v),
          },
        ],
  ]

  if (query.isPending)
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    )
  if (query.isError)
    return (
      <Empty
        icon={History}
        title="Couldn't load the history"
        body={query.error.message}
      />
    )
  const items = query.data.items
  if (items.length === 0)
    return (
      <Empty
        icon={History}
        title="No versions yet"
        body="Each time the files are saved here, restored or deployed from git, the version before and after is kept, so a change can be compared and undone. The last 50 are kept."
      />
    )
  const drift = !!query.data.revision && !items.some((v) => v.current)

  const layers = (
    <>
      {picked && (
        <VersionLayer
          open={open}
          onOpenChange={setOpen}
          v={picked}
          p={p}
          serverId={serverId}
          onRestore={() => {
            setOpen(false)
            restore(picked)
          }}
        />
      )}
      {restoring && (
        <RestoreDialog
          open={confirm}
          onOpenChange={setConfirm}
          v={restoring}
          p={p}
          serverId={serverId}
          onDone={(deployed) => {
            if (!deployed) onApplied()
          }}
        />
      )}
    </>
  )

  const notes = drift
    ? [
        {
          key: "drift",
          title: "The files on the server were changed outside Morche",
          body: "None of these versions matches them. The next save or restore keeps them first, so they can be got back.",
        },
      ]
    : []

  if (phone)
    return (
      <div className="-mx-4 flex flex-col gap-3">
        <Notices notes={notes} />
        <Rows>
          {items.map((v) => (
            <PhoneRow
              key={v.id}
              id={v.id}
              title={v.note || reasonLabel[v.reason]}
              sub={
                <>
                  {timeAgo(v.created_at)}
                  {v.by && ` · ${v.by}`}
                  {v.current && " · On the server now"}
                </>
              }
              onOpen={() => show(v)}
              menu={menu(v)}
            />
          ))}
        </Rows>
        <p className="px-4 text-caption text-ash">
          The last 50 versions are kept.
        </p>
        {layers}
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      <Notices notes={notes} />
      <Table
        head={[
          { label: "When" },
          { label: "What" },
          { label: "By", className: "hidden @2xl:table-cell" },
          { label: "Size", className: "hidden @3xl:table-cell" },
          { label: "" },
        ]}
      >
        {items.map((v) => (
          <Tr
            key={v.id}
            onOpen={() => show(v)}
            label={when(v.created_at)}
            menu={menu(v)}
            cells={[
              {
                node: (
                  <span title={when(v.created_at)}>
                    {when(v.created_at)}
                    {v.current && <Tag>Now</Tag>}
                  </span>
                ),
              },
              {
                node: (
                  <span className="flex min-w-0 flex-col">
                    <span>{reasonLabel[v.reason]}</span>
                    {v.note && (
                      <span className="truncate text-caption text-muted-foreground">
                        {v.note}
                      </span>
                    )}
                  </span>
                ),
                className: "max-w-96",
              },
              {
                node: v.by || <span className="text-ash">Morche</span>,
                className: "hidden @2xl:table-cell text-muted-foreground",
              },
              {
                node: (
                  <>
                    {formatSize(v.compose_size)}
                    {v.has_env && " + .env"}
                  </>
                ),
                className:
                  "hidden @3xl:table-cell tabular-nums text-muted-foreground",
              },
              {
                node: !v.current && (
                  <Button variant="ghost" size="sm" onClick={() => restore(v)}>
                    <RotateCcw />
                    Put back
                  </Button>
                ),
                className: "text-end",
              },
            ]}
          />
        ))}
      </Table>
      <p className="text-caption text-ash">The last 50 versions are kept.</p>
      {layers}
    </div>
  )
}

// One version: what changed compared with the files now, or the files.
function VersionLayer({
  open,
  onOpenChange,
  v,
  p,
  serverId,
  onRestore,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  v: DockerProjectVersion
  p: DockerProjectDetails
  serverId: string
  onRestore: () => void
}) {
  const q = useProjectVersion(serverId, p.name, open ? v.id : null)
  const [view, setView] = useState<"changes" | "files">(
    v.current ? "files" : "changes",
  )
  const [reveal, setReveal] = useState(false)
  const f = q.data
  const compose = f ? lineDiff(p.compose, f.compose) : []
  const env = f ? lineDiff(p.env, f.env) : []

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${reasonLabel[v.reason]} · ${when(v.created_at)}`}
      description={v.note || (v.by ? `By ${v.by}` : undefined)}
      className="sm:max-w-4xl"
      footer={
        !v.current && (
          <Button onClick={onRestore}>
            <RotateCcw />
            Put this version back…
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!v.current && (
            <Segmented
              label="Show"
              value={view}
              onChange={setView}
              items={[
                { value: "changes", label: "Changes" },
                { value: "files", label: "Files" },
              ]}
            />
          )}
          {view === "changes" && (env.length > 0 || v.has_env) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReveal(!reveal)}
              className="ms-auto"
            >
              {reveal ? <EyeOff /> : <Eye />}
              {reveal ? "Hide .env values" : "Show .env values"}
            </Button>
          )}
        </div>
        {!f ? (
          q.isError ? (
            <p className="text-body-sm text-destructive">{q.error.message}</p>
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )
        ) : view === "files" ? (
          <ComposeFiles
            compose={f.compose}
            env={f.env}
            readOnly
            height="55vh"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-caption text-muted-foreground">
              <span className="text-destructive">−</span> on the server now,{" "}
              <span className="text-success">+</span> in this version.
            </p>
            <DiffBlock title="compose.yaml" lines={compose} />
            <DiffBlock title=".env" lines={env} mask={!reveal} />
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function DiffBlock({
  title,
  lines,
  mask,
}: {
  title: string
  lines: ReturnType<typeof lineDiff>
  mask?: boolean
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-mono text-caption text-muted-foreground">{title}</h3>
      {lines.length === 0 ? (
        <p className="rounded-lg bg-subtle px-3 py-2 text-body-sm text-ash">
          Same as now.
        </p>
      ) : (
        <DiffLines lines={lines} mask={mask} className="max-h-[50vh]" />
      )}
    </section>
  )
}

function RestoreDialog({
  open,
  onOpenChange,
  v,
  p,
  serverId,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  v: DockerProjectVersion
  p: DockerProjectDetails
  serverId: string
  onDone: (deployed: boolean) => void
}) {
  const restore = useRestoreVersion()
  const deployed = p.state !== "not-deployed"
  const [deploy, setDeploy] = useState(deployed)
  const conflict =
    restore.error instanceof ApiError && restore.error.status === 409
  const refused =
    restore.error instanceof ApiError && restore.error.status === 422
      ? restore.error.message
      : null

  const go = (overwrite = false) =>
    restore.mutate(
      {
        server: serverId,
        project: p.name,
        version: v.id,
        revision: overwrite ? "" : p.revision,
        deploy,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success(
            deploy ? "Version put back, deploying it" : "Version put back",
            {
              description: deploy
                ? undefined
                : "The containers still run the old files until you apply.",
            },
          )
          onDone(deploy)
        },
        onError: (e) => {
          if (
            !(e instanceof ApiError && (e.status === 409 || e.status === 422))
          )
            toast.error("Couldn't put it back", { description: e.message })
        },
      },
    )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) restore.reset()
        onOpenChange(o)
      }}
      title="Put this version back?"
      description={`compose.yaml${v.has_env ? " and .env" : ""} from ${when(v.created_at)} replace the files on the server. The files now are kept in the history, so this can be undone too.`}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="max-md:h-11"
          >
            Cancel
          </Button>
          {conflict ? (
            <Button
              variant="destructive"
              disabled={restore.isPending}
              onClick={() => go(true)}
              className="max-md:h-11"
            >
              Put it back anyway
            </Button>
          ) : (
            <Button
              disabled={restore.isPending}
              onClick={() => go()}
              className="max-md:h-11"
            >
              {restore.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              Put it back
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label
          htmlFor="restore-deploy"
          className={cn(
            "flex items-start gap-3 rounded-xl border border-border p-3",
            "cursor-pointer",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body-sm font-medium">
              Deploy after putting it back
            </span>
            <span className="text-caption text-muted-foreground">
              Runs compose up so the containers use these files. Off = only the
              files change.
            </span>
          </span>
          <Switch
            id="restore-deploy"
            checked={deploy}
            onCheckedChange={setDeploy}
          />
        </label>
        {conflict && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-body-sm text-warning">
            Someone changed the files since you opened this page. Putting the
            version back still keeps their files in the history.
          </p>
        )}
        {refused && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 font-mono text-caption whitespace-pre-wrap text-destructive">
            {refused}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
