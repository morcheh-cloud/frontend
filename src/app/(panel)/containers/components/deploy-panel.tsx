"use client"

import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleX,
  ListChecks,
  Loader2,
  Pencil,
  RotateCw,
  Square,
  X,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar, progressText, tookText } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import { CopyButton } from "./parts"
import {
  type Deploy,
  type DeployAction,
  isErrorLine,
  type Step,
  stepOf,
} from "./project-deploy"
import type { ProjectTab } from "./project-overview"

const SEEN_KEY = "morcheh.docker.deploy.seen"
// A finished job that went well stays this long, then goes by itself.
const SHOW_DONE_MS = 5 * 60_000

const running: Record<DeployAction, string> = {
  up: "Deploying",
  redeploy: "Redeploying",
  git: "Deploying from git",
  pull: "Pulling the images",
  down: "Taking down",
  destroy: "Destroying",
  start: "Starting",
  stop: "Stopping",
  restart: "Restarting",
}
const noun: Record<DeployAction, string> = {
  up: "Deploy",
  redeploy: "Redeploy",
  git: "Deploy from git",
  pull: "Pulling the images",
  down: "Taking down",
  destroy: "Destroy",
  start: "Start",
  stop: "Stop",
  restart: "Restart",
}
const done: Record<DeployAction, string> = {
  up: "Deployed",
  redeploy: "Redeployed",
  git: "Deployed from git",
  pull: "Images pulled",
  down: "Taken down",
  destroy: "Destroyed",
  start: "Started",
  stop: "Stopped",
  restart: "Restarted",
}

const stepLabels: Record<Step, string> = {
  read: "Read the compose file",
  pull: "Pull the images",
  compose: "Create and start",
  done: "Done",
}

type Fix = "files" | "environment" | "registries"
const hints: [RegExp, string, Fix | null][] = [
  [
    /port is already allocated|address already in use/i,
    "Another container or program on the server already uses one of the host ports. Change the host side of that port (left of the colon) in the compose file, or stop what holds it.",
    "files",
  ],
  [
    /toomanyrequests|rate limit/i,
    "Docker Hub's download limit was reached. Add a Docker Hub login under Registries, or try again later.",
    "registries",
  ],
  [
    /pull access denied|repository does not exist|manifest unknown|manifest for \S+ not found|not found: manifest/i,
    "The image or its tag wasn't found. Check the name and the tag; a private image needs its registry's login under Registries.",
    "registries",
  ],
  [
    /unauthorized|authentication required/i,
    "The registry refused the download. Add its login under Registries.",
    "registries",
  ],
  [
    /no matching manifest|exec format error/i,
    "The image isn't made for this server's processor (for example arm64 and amd64). Pick a tag built for it.",
    "files",
  ],
  [
    /no space left on device/i,
    "The server's disk is full. Remove unused images or volumes, then try again.",
    null,
  ],
  [
    /declared as external, but could not be found/i,
    "The file uses an external network or volume that doesn't exist on this server. Create it, or drop `external: true`.",
    "files",
  ],
  [
    /variable is not set|required variable|missing a value/i,
    "A variable the file needs has no value. Set it under Environment.",
    "environment",
  ],
  [
    /yaml:|validating|additional propert|invalid compose project|must be a mapping|is not supported/i,
    "The compose file has a mistake. Fix it under Files, then try again.",
    "files",
  ],
  [
    /cannot connect to the docker daemon|docker\.sock/i,
    "Docker isn't reachable on the server. Check that the engine is running.",
    null,
  ],
  [
    /exited with code|is unhealthy|dependency failed/i,
    "A container stopped on its own while starting. Its own log usually says why: open the Logs tab.",
    null,
  ],
]

function readSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

// The last compose job on the project, shown above every tab: its steps,
// progress, what went wrong and the output as it comes.
export function DeployPanel({
  d,
  phone,
  canRun,
  onRun,
  onTab,
  tabs,
}: {
  d: Deploy
  phone: boolean
  canRun: boolean
  onRun: (a: DeployAction) => void
  onTab: (t: ProjectTab) => void
  // Tabs this person can open (Files, Environment need Engineer).
  tabs: ProjectTab[]
}) {
  const jobs = useJobActions()
  const [seen, setSeen] = useState<string[] | null>(null)
  useEffect(() => setSeen(readSeen()), [])
  const now = useNow(30_000, d.job.state === "succeeded")
  const { job, action } = d

  if (seen === null || seen.includes(job.id)) return null
  const canceled = job.state === "canceled"
  if (job.state === "succeeded") {
    const ended = job.finished_at ? Date.parse(job.finished_at) : 0
    if (now - ended > SHOW_DONE_MS) return null
    // Taking down / destroying is told by the toast and the header.
    if (action === "down" || action === "destroy") return null
  }

  const dismiss = () => {
    const next = [job.id, ...seen].slice(0, 50)
    setSeen(next)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next))
    } catch {}
  }
  const retry = () => (action === "git" ? jobs.retry(job) : onRun(action))
  const step = stepOf(d)
  const showSteps =
    d.log?.step != null &&
    (action === "up" || action === "redeploy" || action === "pull")
  const steps: Step[] =
    action === "pull"
      ? ["read", "pull", "done"]
      : ["read", "pull", "compose", "done"]
  const message = (job.error || "").trim()
  const hint = d.failed ? hintFor(message, d.log?.lines ?? []) : null

  const title = d.active
    ? running[action]
    : d.failed
      ? job.state === "interrupted"
        ? `${noun[action]} was cut short`
        : `${noun[action]} failed`
      : canceled
        ? `${noun[action]} canceled`
        : done[action]
  const Icon = d.active
    ? Loader2
    : d.failed
      ? CircleX
      : canceled
        ? CircleAlert
        : CircleCheck

  const fixButton = (fix: Fix | null) => {
    if (fix === "registries")
      return (
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/containers/registries" />}
          nativeButton={false}
        >
          Registries
        </Button>
      )
    if (fix && tabs.includes(fix))
      return (
        <Button variant="outline" size="sm" onClick={() => onTab(fix)}>
          <Pencil />
          {fix === "files" ? "Edit files" : "Environment"}
        </Button>
      )
    return null
  }

  return (
    <section
      aria-label={title}
      aria-live="polite"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-5",
        d.failed ? "border-destructive/40" : "border-border",
        phone && "-mx-4 rounded-none border-x-0 p-4",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Icon
          className={cn(
            "size-5 shrink-0",
            d.active && "animate-spin text-brand",
            d.failed && "text-destructive",
            canceled && "text-muted-foreground",
            job.state === "succeeded" && "text-success",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium">{title}</p>
          <p className="text-caption text-muted-foreground">
            {d.active
              ? progressText(job)
              : [
                  tookText(job) && `Took ${tookText(job)}`,
                  job.state === "interrupted" &&
                    "Morche restarted while it ran",
                ]
                  .filter(Boolean)
                  .join(" · ") || " "}
          </p>
        </div>
        {!phone && (
          <Actions
            d={d}
            canRun={canRun}
            onCancel={() => jobs.cancel(job)}
            onRetry={retry}
            onShow={() => jobs.show(job.id)}
            onDismiss={dismiss}
          />
        )}
      </div>

      {d.active && <JobBar job={job} />}

      {showSteps && step && (
        <Steps steps={steps} step={step} d={d} phone={phone} />
      )}

      {d.failed && message && (
        <div className="flex flex-col gap-2 rounded-xl bg-destructive/5 p-3">
          <pre className="max-h-40 overflow-auto font-mono text-caption break-words whitespace-pre-wrap text-destructive">
            {message}
          </pre>
          {hint && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="min-w-0 flex-1 text-body-sm text-foreground">
                {hint[0]}
              </p>
              {fixButton(hint[1])}
            </div>
          )}
        </div>
      )}

      <Output d={d} phone={phone} />

      {phone && (
        <Actions
          d={d}
          canRun={canRun}
          phone
          onCancel={() => jobs.cancel(job)}
          onRetry={retry}
          onShow={() => jobs.show(job.id)}
          onDismiss={dismiss}
        />
      )}
    </section>
  )
}

function hintFor(message: string, lines: string[]) {
  const text = [message, ...lines.filter(isErrorLine)].join("\n")
  const hit = hints.find(([re]) => re.test(text))
  return hit ? ([hit[1], hit[2]] as const) : null
}

function Actions({
  d,
  canRun,
  phone,
  onCancel,
  onRetry,
  onShow,
  onDismiss,
}: {
  d: Deploy
  canRun: boolean
  phone?: boolean
  onCancel: () => void
  onRetry: () => void
  onShow: () => void
  onDismiss: () => void
}) {
  const big = phone ? "h-11 flex-1" : undefined
  const again =
    (d.failed || d.job.state === "canceled") && canRun && d.action !== "destroy"
  return (
    <div className={cn("flex shrink-0 items-center gap-2", phone && "w-full")}>
      {d.active && canRun && !d.job.progress.locked && (
        <Button variant="outline" size="sm" className={big} onClick={onCancel}>
          <Square />
          Cancel
        </Button>
      )}
      {again && (
        <Button size="sm" className={big} onClick={onRetry}>
          <RotateCw />
          Try again
        </Button>
      )}
      <Button
        variant="ghost"
        size={phone ? "sm" : "icon-sm"}
        className={big}
        aria-label="Open the task"
        title="Open the task"
        onClick={onShow}
      >
        <ListChecks />
        {phone && "Task"}
      </Button>
      {!d.active && (
        <Button
          variant="ghost"
          size={phone ? "sm" : "icon-sm"}
          className={big}
          aria-label="Hide"
          title="Hide"
          onClick={onDismiss}
        >
          <X />
          {phone && "Hide"}
        </Button>
      )}
    </div>
  )
}

function Steps({
  steps,
  step,
  d,
  phone,
}: {
  steps: Step[]
  step: Step
  d: Deploy
  phone: boolean
}) {
  const at = steps.indexOf(step)
  const p = d.job.progress
  return (
    <ol
      className={cn(
        "flex gap-2",
        phone ? "flex-col" : "flex-wrap items-center",
      )}
    >
      {steps.map((s, i) => {
        const finished =
          i < at || (i === at && (s === "done" || d.job.state === "succeeded"))
        const here = i === at && !finished
        const broke = here && (d.failed || d.job.state === "canceled")
        const extra =
          here && d.active && s === "pull" && p.items_total > 0
            ? ` · ${Math.min(p.items + 1, p.items_total)} of ${p.items_total}`
            : ""
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && !phone && <span className="h-px w-6 bg-mist" />}
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-caption",
                finished && "border-success bg-success text-background",
                here && d.active && "border-brand text-brand",
                broke && "border-destructive bg-destructive text-background",
                !finished && !here && "border-mist text-ash",
              )}
            >
              {finished ? (
                <Check className="size-3" />
              ) : broke ? (
                <X className="size-3" />
              ) : here && d.active ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "text-body-sm",
                finished && "text-foreground",
                here && "font-medium text-foreground",
                broke && "text-destructive",
                !finished && !here && "text-muted-foreground",
              )}
            >
              {stepLabels[s]}
              {extra}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// What the job printed: the last lines while folded, all of it unfolded,
// following the end while it's in view.
function Output({ d, phone }: { d: Deploy; phone: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null)
  const shown = open ?? d.failed
  const box = useRef<HTMLPreElement>(null)
  const stick = useRef(true)
  const lines = d.log?.lines ?? []
  const count = lines.length
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when lines arrive or it unfolds
  useEffect(() => {
    const el = box.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [count, shown])

  if (!d.log)
    return d.active ? (
      <p className="text-caption text-muted-foreground">Reading the output…</p>
    ) : null
  if (count === 0) return null
  const visible = shown ? lines : lines.slice(-4)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!shown)}
          aria-expanded={shown}
          className={cn(
            "flex items-center gap-1 rounded-lg text-body-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            phone && "min-h-11",
          )}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              !shown && "-rotate-90",
            )}
          />
          Output
          <span className="font-normal text-muted-foreground tabular-nums">
            {count} {count === 1 ? "line" : "lines"}
          </span>
        </button>
        <CopyButton
          value={lines.join("\n")}
          label="Copy the output"
          className="ms-auto"
        />
      </div>
      <pre
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
        }}
        className={cn(
          "overflow-auto rounded-xl bg-subtle p-3 font-mono text-caption leading-relaxed",
          shown ? "max-h-80" : "max-h-28",
        )}
      >
        {visible.map((line, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: lines only grow
            key={i}
            className={cn(
              "block break-words whitespace-pre-wrap",
              line.startsWith("==> ") && "mt-1 font-medium text-foreground",
              isErrorLine(line) && "text-destructive",
              !line.startsWith("==> ") &&
                !isErrorLine(line) &&
                "text-muted-foreground",
            )}
          >
            {line.startsWith("==> ") ? line.slice(4) : line || " "}
          </span>
        ))}
      </pre>
    </div>
  )
}
