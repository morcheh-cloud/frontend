"use client"

import {
  ChevronRight,
  Loader2,
  Play,
  Server,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounced } from "@/hooks/useDebounced"
import type {
  DockerAutoUpdateCandidate,
  DockerAutoUpdatePreviewServer,
  DockerAutoUpdateRules,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAutoUpdatePreview } from "../api"
import { candidateMeta } from "./auto-update-meta"
import { containerHref, Dot, imageName } from "./meta"

// What a policy's rules take in right now, server by server: the included
// containers with the state of their image, and the left-out ones (folded)
// with why. Used live in the editor and on the policy's overview.
export function CoverPreview({
  ws,
  rules,
  phone,
  onRunServer,
  runDisabled,
  runLabel = "Run here",
}: {
  ws: string
  rules: DockerAutoUpdateRules
  phone: boolean
  onRunServer?: (server: string) => void
  runDisabled?: boolean
  runLabel?: string
}) {
  const settled = useDebounced(rules, 500)
  const query = useAutoUpdatePreview(ws, settled)

  if (rules.servers.length === 0) {
    return (
      <p className="rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
        Pick a server to see which containers this takes in.
      </p>
    )
  }
  if (query.isPending) return <Skeleton className="h-32 w-full rounded-lg" />
  if (query.isError) {
    return (
      <p className="rounded-lg bg-subtle p-3 text-body-sm text-destructive">
        Couldn't read the containers: {query.error.message}
      </p>
    )
  }
  const p = query.data
  const servers = p.servers.length
  return (
    <div
      className={cn(
        "flex flex-col gap-3 transition-opacity",
        query.isFetching && query.isPlaceholderData && "opacity-60",
      )}
    >
      <p className="flex items-center gap-2 text-body-sm">
        {query.isFetching && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
        <span>
          <span className="font-medium">
            {p.included} container{p.included === 1 ? "" : "s"}
          </span>
          {servers > 1 && ` on ${servers} servers`}
          {p.waiting > 0 && (
            <span className="text-brand">
              {" "}
              · {p.waiting} with a new image waiting
            </span>
          )}
        </span>
      </p>
      <div className="flex flex-col gap-3">
        {p.servers.map((s) => (
          <ServerCover
            key={s.id}
            s={s}
            phone={phone}
            many={servers > 1}
            onRun={onRunServer && (() => onRunServer(s.id))}
            runDisabled={runDisabled}
            runLabel={runLabel}
          />
        ))}
      </div>
    </div>
  )
}

function ServerCover({
  s,
  phone,
  many,
  onRun,
  runDisabled,
  runLabel,
}: {
  s: DockerAutoUpdatePreviewServer
  phone: boolean
  many: boolean
  onRun?: () => void
  runDisabled?: boolean
  runLabel: string
}) {
  const [showOut, setShowOut] = useState(false)
  const inside = s.containers.filter((c) => c.included)
  const out = s.containers.filter((c) => !c.included)
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {(many || onRun) && (
        <div className="flex min-h-11 items-center gap-2 border-b border-border bg-subtle px-3 py-1.5">
          <Server className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
            {s.name}
          </span>
          <span className="shrink-0 text-caption text-ash">
            {inside.length} in
          </span>
          {onRun && !s.error && inside.length > 0 && (
            <Button
              variant="ghost"
              size={phone ? "sm" : "xs"}
              className="shrink-0"
              disabled={runDisabled}
              onClick={onRun}
            >
              <Play />
              {runLabel}
            </Button>
          )}
        </div>
      )}
      {s.error ? (
        <p className="flex gap-2 p-3 text-body-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {s.error}
        </p>
      ) : (
        <>
          {inside.length === 0 ? (
            <p className="p-3 text-body-sm text-muted-foreground">
              No container here matches.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {inside.map((c) => (
                <CandidateRow key={c.id} c={c} server={s.id} />
              ))}
            </ul>
          )}
          {out.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={showOut}
                onClick={() => setShowOut((v) => !v)}
                className="flex min-h-11 w-full items-center gap-1.5 border-t border-border px-3 text-start text-caption text-muted-foreground hover:bg-subtle md:min-h-9"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform",
                    showOut && "rotate-90",
                  )}
                />
                Left out ({out.length})
              </button>
              {showOut && (
                <ul className="divide-y divide-border border-t border-border bg-subtle/50">
                  {out.map((c) => (
                    <CandidateRow key={c.id} c={c} server={s.id} out />
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function CandidateRow({
  c,
  server,
  out,
}: {
  c: DockerAutoUpdateCandidate
  server: string
  out?: boolean
}) {
  const meta = candidateMeta[c.update]
  const notes = [
    c.state !== "running" && c.state,
    c.monitor_only && "only tells (label)",
    c.no_pull && "never pulls (label)",
    c.hooks && c.hooks.length > 0 && `hooks: ${c.hooks.join(", ")}`,
  ].filter(Boolean) as string[]
  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={containerHref(server, c.name)}
            className={cn(
              "truncate text-body-sm font-medium hover:underline",
              out && "text-muted-foreground",
            )}
          >
            {c.name}
          </Link>
          {c.project && (
            <span className="text-caption text-ash">
              {c.project}
              {c.service && ` · ${c.service}`}
            </span>
          )}
        </div>
        <p className="truncate font-mono text-caption text-muted-foreground">
          {imageName(c.image)}
        </p>
        {out ? (
          <p className="text-caption text-muted-foreground">{c.why}</p>
        ) : (
          notes.length > 0 && (
            <p className="text-caption text-ash">{notes.join(" · ")}</p>
          )
        )}
      </div>
      {!out && (
        <span
          className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground"
          title={c.why}
        >
          <Dot tone={meta.tone} />
          {meta.label}
        </span>
      )}
    </li>
  )
}
