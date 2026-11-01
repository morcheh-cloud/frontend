"use client"

import {
  Ellipsis,
  FilePen,
  FileSliders,
  FolderOpen,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { filesHref } from "@/components/files/file-manager"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useNow } from "@/hooks/useNow"
import { formatSize } from "@/lib/format"
import type { ServiceDetails as Details, Service } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  afterClose,
  Facts,
  type Item,
  ItemMenu,
  Segmented,
  SheetItems,
  StateDot,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { fullTime } from "../../users/components/meta"
import { useServiceDetails } from "../api"
import {
  bootHints,
  bootLabel,
  cpuTime,
  serviceState,
  shortName,
  stateLabel,
  stateMeta,
  upFor,
} from "./meta"
import { ServiceLogs } from "./service-logs"
import { useServiceMenu, useServicesActions } from "./services-actions"

export type DetailsTab = "overview" | "logs" | "files"

type Fact = { label: string; value: ReactNode; wide?: boolean; mono?: boolean }

// One service: what it is and does, its journal and its unit files, with
// what can be done to it.
export function ServiceDetails({
  open,
  onOpenChange,
  service: s,
  tab: initialTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service
  tab: DetailsTab
}) {
  const { server, phone } = useServerPage()
  const a = useServicesActions()
  const menu = useServiceMenu(s)
  const [tab, setTab] = useState<DetailsTab>(initialTab)
  const query = useServiceDetails(server.id, open ? s.name : null)
  const d = query.data
  const now = useNow(30_000, open)

  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "overview", label: "Overview" },
        { value: "logs", label: "Logs" },
        ...(a.systemd
          ? [{ value: "files" as const, label: "Unit files" }]
          : []),
      ]}
      value={tab}
      onChange={setTab}
    />
  )

  let body: ReactNode
  if (tab === "logs") {
    body = <ServiceLogs service={s} active={open} />
  } else if (!d) {
    body = (
      <div className="flex flex-1 items-center justify-center gap-2 py-16 text-body-sm text-muted-foreground">
        {query.error ? (
          <p role="alert">{query.error.message}</p>
        ) : (
          <>
            <Loader2 className="size-4 animate-spin" />
            Reading {shortName(s.name)}…
          </>
        )}
      </div>
    )
  } else if (tab === "files") {
    body = <Files details={d} />
  } else {
    body = <Overview service={s} details={d} now={now} />
  }

  const state = serviceState(s)
  const meta = stateMeta[state]
  const status = (
    <span className="flex min-w-0 items-center gap-2 text-body-sm">
      {s.name in a.busy ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Working…
        </span>
      ) : (
        <StateDot tone={meta.tone} label={stateLabel(s)} />
      )}
      <span className="truncate text-muted-foreground">
        {s.description || meta.hint}
      </span>
    </span>
  )

  // Actions keep this layer open so their result shows in it; the editors
  // close it first, so they get the Back entry.
  const items = menu.map((group) =>
    group.map((item): Item => {
      if (item.key === "logs") {
        return { ...item, stay: true, onSelect: () => setTab("logs") }
      }
      if (item.key === "override" || item.key === "file") {
        return phone
          ? item
          : { ...item, onSelect: () => afterClose(onOpenChange, item.onSelect) }
      }
      return { ...item, stay: true }
    }),
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={s.name}
        header={
          <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 pb-3">
            <div className="px-2">
              <p className="truncate text-subheading font-medium">
                {shortName(s.name)}
              </p>
              {status}
            </div>
            <div className="-mx-4 flex [scrollbar-width:none] overflow-x-auto px-4">
              {tabs}
            </div>
          </div>
        }
        className={cn(
          tab === "logs" ? "flex flex-col overflow-hidden px-0" : "pt-3",
        )}
      >
        {tab === "overview" && (
          <SheetItems groups={items.slice(0, 1)} onOpenChange={onOpenChange} />
        )}
        {body}
        {tab === "overview" && (
          <div className="mt-3">
            <SheetItems groups={items.slice(1)} onOpenChange={onOpenChange} />
          </div>
        )}
      </BottomSheet>
    )
  }

  // Start/stop/restart sit in the footer; the rest in ⋯.
  const buttons = items[0]
  const rest = items.slice(1)

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="gap-2 border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{s.name}</SheetTitle>
          <SheetDescription render={<div />}>{status}</SheetDescription>
          <div className="mt-2">{tabs}</div>
        </SheetHeader>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            tab !== "logs" && "overflow-y-auto p-6",
          )}
        >
          {body}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4">
          {buttons.map((item, i) => (
            <Button
              key={item.key}
              variant={i === 0 ? "default" : "outline"}
              disabled={item.disabled}
              onClick={item.onSelect}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
          {rest.some((g) => g.length > 0) && (
            <ItemMenu
              groups={rest}
              label={`More actions for ${s.name}`}
              trigger={
                <Button variant="outline" size="icon" aria-label="More actions">
                  <Ellipsis />
                </Button>
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---- Overview ----

function Overview({
  service: s,
  details: d,
  now,
}: {
  service: Service
  details: Details
  now: number
}) {
  const { phone } = useServerPage()
  const facts = overviewFacts(s, d, now)
  return (
    <div className="flex flex-col gap-4">
      {s.protected && (
        <p className="mx-2 flex gap-3 rounded-2xl border border-border p-4 text-body-sm text-muted-foreground md:mx-0">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-ash" />
          <span>
            Morcheh or the system relies on it. Stopping, disabling or masking
            it asks you to confirm first: this server may stop answering over
            SSH.
          </span>
        </p>
      )}
      {d.status_text && (
        <p className="mx-2 rounded-2xl bg-subtle p-4 text-body-sm md:mx-0">
          <span className="block text-caption text-ash">It reports</span>
          {d.status_text}
        </p>
      )}
      {phone ? (
        <Facts items={facts} />
      ) : (
        <dl className="divide-y divide-border text-body-sm">
          {facts.map((f) => (
            <div key={f.label} className="flex gap-4 py-2.5">
              <dt className="w-36 shrink-0 text-muted-foreground">{f.label}</dt>
              <dd
                className={
                  f.mono
                    ? "min-w-0 font-mono text-caption break-all whitespace-pre-line"
                    : "min-w-0 break-words"
                }
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function list(items: string[] | undefined) {
  return items?.length ? items.join("\n") : null
}

function overviewFacts(s: Service, d: Details, now: number): Fact[] {
  const st = serviceState(s)
  const out: (Fact | null)[] = []

  let state: ReactNode = stateLabel(s)
  const up = upFor(s, now)
  if (up) state = `${state} for ${up}`
  else if (s.since) state = `${state} since ${fullTime(s.since)}`
  out.push({
    label: "State",
    value: (
      <span title={fullTime(s.since)}>
        {state}
        <span className="text-muted-foreground">
          {" "}
          · {s.active}/{s.sub}
        </span>
      </span>
    ),
    wide: true,
  })
  if (st === "failed" || (s.result && s.result !== "success")) {
    out.push({
      label: "Last run",
      value: lastRun(s),
      wide: true,
    })
  }

  out.push({
    label: "At boot",
    value: (
      <span>
        {bootLabel(s)}
        {bootHints[s.enabled] && (
          <span className="text-muted-foreground">
            {" "}
            · {bootHints[s.enabled]}
          </span>
        )}
      </span>
    ),
    wide: true,
  })
  if (s.preset && s.preset !== s.enabled) {
    out.push({ label: "Preset", value: s.preset })
  }
  if (s.main_pid > 0) out.push({ label: "Main PID", value: s.main_pid })
  if (s.memory != null) {
    out.push({ label: "Memory", value: formatSize(s.memory) })
  }
  if (s.cpu_ns != null) {
    out.push({ label: "CPU time", value: cpuTime(s.cpu_ns) })
  }
  if (s.tasks != null) out.push({ label: "Tasks", value: s.tasks })
  if (s.restarts > 0) {
    out.push({ label: "Auto restarts", value: s.restarts })
  }
  if (d.init === "systemd") {
    out.push({ label: "Runs as", value: s.user || "root" })
  }
  if (s.type) out.push({ label: "Type", value: s.type })
  if (d.restart) {
    out.push({
      label: "Restart",
      value:
        d.restart === "no"
          ? "Never by itself"
          : `${d.restart}${d.restart_sec ? `, after ${d.restart_sec}` : ""}`,
    })
  }
  out.push(
    d.exec_start.length
      ? {
          label: d.exec_start.length > 1 ? "Commands" : "Command",
          value: d.exec_start.join("\n"),
          wide: true,
          mono: true,
        }
      : null,
  )
  if (d.working_directory) {
    out.push({
      label: "Working folder",
      value: d.working_directory,
      wide: true,
      mono: true,
    })
  }
  const env = list(d.environment)
  if (env)
    out.push({ label: "Environment", value: env, wide: true, mono: true })
  const envFiles = list(d.environment_files)
  if (envFiles) {
    out.push({
      label: "Environment files",
      value: envFiles,
      wide: true,
      mono: true,
    })
  }
  if (s.path) {
    out.push({ label: "Unit file", value: s.path, wide: true, mono: true })
  }
  const drop = list(s.drop_ins)
  if (drop) out.push({ label: "Drop-ins", value: drop, wide: true, mono: true })
  const triggered = list(s.triggered_by)
  if (triggered) out.push({ label: "Started by", value: triggered, wide: true })
  const wantedBy = [...d.wanted_by, ...d.required_by].join(", ")
  if (wantedBy) out.push({ label: "Pulled in by", value: wantedBy, wide: true })
  const needs = [...d.requires, ...d.wants].join(", ")
  if (needs) out.push({ label: "Needs", value: needs, wide: true })
  if (d.after.length) {
    out.push({ label: "Starts after", value: d.after.join(", "), wide: true })
  }
  if (d.conflicts.length) {
    out.push({
      label: "Conflicts with",
      value: d.conflicts.join(", "),
      wide: true,
    })
  }
  if (d.documentation.length) {
    out.push({
      label: "Documentation",
      value: (
        <span className="flex flex-col">
          {d.documentation.map((doc) =>
            /^https?:\/\//.test(doc) ? (
              <a
                key={doc}
                href={doc}
                target="_blank"
                rel="noreferrer"
                className="truncate text-brand hover:underline"
              >
                {doc}
              </a>
            ) : (
              <span key={doc} className="font-mono text-caption">
                {doc}
              </span>
            ),
          )}
        </span>
      ),
      wide: true,
    })
  }
  return out.filter((f): f is Fact => f !== null)
}

const results: Record<string, string> = {
  "exit-code": "exited with an error",
  signal: "was killed by a signal",
  "core-dump": "crashed (core dump)",
  timeout: "timed out",
  watchdog: "missed its watchdog",
  "start-limit-hit": "restarted too often, systemd gave up",
  resources: "couldn't get what it needed (files, users…)",
  protocol: "broke the service protocol",
  "oom-kill": "ran out of memory and was killed",
}

function lastRun(s: Service) {
  const why = s.result ? (results[s.result] ?? s.result) : "failed"
  return (
    <span>
      It {why}
      {s.exit_code !== 0 && (
        <span className="text-muted-foreground"> · code {s.exit_code}</span>
      )}
    </span>
  )
}

// ---- Unit files ----

function Files({ details: d }: { details: Details }) {
  const { server } = useServerPage()
  const a = useServicesActions()
  const s = a.overview.services.find((x) => x.name === d.name)
  const hasOverride = d.files.some((f) => f.path === d.override)
  const folder = (p: string) => p.slice(0, p.lastIndexOf("/")) || "/"

  return (
    <div className="flex flex-col gap-4 max-md:px-2">
      <p className="text-body-sm text-muted-foreground">
        As systemd reads them, in order: later files change earlier ones.
        Packaged files are replaced on updates, so changes go in an override.
      </p>
      {s && a.canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => a.edit(s, "override")}>
            <FileSliders />
            {hasOverride ? "Edit override" : "Add an override"}
          </Button>
          {d.custom && (
            <Button variant="outline" onClick={() => a.edit(s, "file")}>
              <FilePen />
              Edit unit file
            </Button>
          )}
        </div>
      )}
      {d.files.length === 0 && (
        <p className="rounded-2xl border border-border p-4 text-body-sm text-muted-foreground">
          No unit file was found for it.
        </p>
      )}
      {d.files.map((f) => (
        <section
          key={f.path}
          className="overflow-hidden rounded-2xl border border-border"
        >
          <header className="flex items-center gap-2 border-b border-border bg-subtle px-4 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-caption">
              {f.path}
            </span>
            {f.drop_in && (
              <span className="shrink-0 rounded-full bg-muted px-2 text-caption text-muted-foreground">
                {f.path === d.override ? "override" : "drop-in"}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="max-md:size-11"
              aria-label="Open its folder"
              title="Open its folder"
              render={
                <Link
                  href={`/servers/${server.id}/files${filesHref({ path: folder(f.path) })}`}
                />
              }
              nativeButton={false}
            >
              <FolderOpen />
            </Button>
          </header>
          <pre className="max-h-96 overflow-auto p-4 font-mono text-caption leading-relaxed whitespace-pre">
            {f.content}
          </pre>
        </section>
      ))}
    </div>
  )
}
