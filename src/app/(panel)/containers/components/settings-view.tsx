"use client"

import { Loader2, Lock, Settings2 } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useEffect, useId, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import type { DockerSettings } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, Notices } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useDockerSettings, useSaveDockerSettings } from "../api"
import { type WsCtx, WsPage } from "./env-page"
import { ChoiceChip } from "./kit"
import { useDockerWorkspaceCan } from "./permissions"

// The periods the event log offers; the setting picks its starting one.
export const eventPeriods = ["1", "6", "24", "72", "168"] as const
export const eventPeriodLabels: Record<(typeof eventPeriods)[number], string> =
  {
    "1": "Last hour",
    "6": "6 hours",
    "24": "24 hours",
    "72": "3 days",
    "168": "7 days",
  }

type Draft = {
  projects_dir: string
  update_check: boolean
  scanner_image: string
  events_hours: number
}

function draftOf(s: DockerSettings): Draft {
  return {
    projects_dir: s.projects_dir,
    update_check: s.update_check,
    scanner_image: s.scanner_image,
    events_hours: s.events_hours,
  }
}

function dirProblem(v: string) {
  const t = v.trim()
  if (!t.startsWith("/") || t === "/") {
    return "Use a full folder path like /opt/projects."
  }
  return undefined
}

export function SettingsPage() {
  return <WsPage title="Settings">{(ctx) => <SettingsView {...ctx} />}</WsPage>
}

// /containers/settings: the workspace's container settings. Owners change
// them; everyone else reads.
function SettingsView({ ws, phone }: WsCtx) {
  const query = useDockerSettings(ws.id)
  if (query.isPending) {
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <Empty
        icon={Settings2}
        title="Couldn't read the settings"
        body={query.error.message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  return (
    <SettingsForm
      // A save elsewhere starts the form again from what's stored.
      key={query.data.updated_at ?? "default"}
      ws={ws}
      phone={phone}
      saved={query.data}
    />
  )
}

function SettingsForm({ ws, phone, saved }: WsCtx & { saved: DockerSettings }) {
  const can = useDockerWorkspaceCan(ws.id)
  const save = useSaveDockerSettings()
  const [draft, setDraft] = useState(() => draftOf(saved))
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const start = draftOf(saved)
  const dirty = (Object.keys(start) as (keyof Draft)[]).some(
    (k) => start[k] !== draft[k],
  )
  const errors = fieldErrors(save.error)
  const dirError = dirProblem(draft.projects_dir) ?? errors.projects_dir
  const imageError =
    (/\s/.test(draft.scanner_image.trim())
      ? "An image name has no spaces."
      : undefined) ?? errors.scanner_image
  const general =
    save.error && Object.keys(errors).length === 0
      ? save.error.message
      : undefined

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const submit = () => {
    if (dirProblem(draft.projects_dir) || imageError) return
    save.mutate(
      {
        ws: ws.id,
        projects_dir: draft.projects_dir.trim(),
        update_check: draft.update_check,
        scanner_image: draft.scanner_image.trim(),
        events_hours: draft.events_hours,
      },
      { onSuccess: () => toast.success("Settings saved") },
    )
  }

  const period = eventPeriods.includes(String(draft.events_hours) as never)
    ? (String(draft.events_hours) as (typeof eventPeriods)[number])
    : undefined

  return (
    <div className="flex max-w-3xl flex-col gap-4 max-md:gap-0">
      {!can.own && (
        <Notices
          className="max-md:-mx-4 max-md:mt-0 max-md:mb-4"
          notes={[
            {
              key: "read-only",
              title: "Only a workspace Owner can change these",
              body: `You can read the settings of ${ws.name}.`,
            },
          ]}
        />
      )}
      <fieldset
        disabled={!can.own || save.isPending}
        className="flex flex-col gap-4"
      >
        <Group title="Projects">
          <Row
            label="Projects folder"
            hint={
              <>
                Where a new compose project is saved on each server, one folder
                per project. Projects already made stay where they are.
              </>
            }
            error={dirError}
            phone={phone}
          >
            {(p) => (
              <Input
                {...p}
                value={draft.projects_dir}
                onChange={(e) => set({ projects_dir: e.target.value })}
                placeholder="/opt/projects"
                className="font-mono"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Row>
        </Group>

        <Group title="Updates and security">
          <Row
            label="Check for image updates"
            hint={
              <>
                Once a day, ask each registry whether a running image has a
                newer version. Results show in{" "}
                <Link
                  href="/containers/updates"
                  className="text-brand hover:underline"
                >
                  Updates
                </Link>
                ; nothing is pulled on its own.
              </>
            }
            phone={phone}
            inline
          >
            {(p) => (
              <Switch
                id={p.id}
                aria-describedby={p["aria-describedby"]}
                checked={draft.update_check}
                onCheckedChange={(v) => set({ update_check: v })}
              />
            )}
          </Row>
          <Row
            label="Scanner image"
            hint={
              <>
                Scans for{" "}
                <Link
                  href="/containers/security"
                  className="text-brand hover:underline"
                >
                  vulnerabilities
                </Link>{" "}
                run Trivy installed on the server, or else this image in a
                throwaway container.
              </>
            }
            error={imageError}
            phone={phone}
          >
            {(p) => (
              <Input
                {...p}
                value={draft.scanner_image}
                onChange={(e) => set({ scanner_image: e.target.value })}
                placeholder="aquasec/trivy:latest"
                className="font-mono"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Row>
        </Group>

        <Group title="Event log">
          <Row
            label="Starting period"
            hint="How far back the event log reads when it opens. Longer periods take a little longer on busy servers."
            phone={phone}
            inline
          >
            {() => (
              <ChoiceChip
                phone={phone}
                label="Period"
                value={period ?? "24"}
                options={eventPeriods.map((v) => ({
                  value: v,
                  label: eventPeriodLabels[v],
                }))}
                onChange={(v) => set({ events_hours: Number(v) })}
              />
            )}
          </Row>
        </Group>
      </fieldset>

      {general && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm text-destructive max-md:mt-4"
        >
          {general}
        </p>
      )}

      {saved.updated_at && !dirty && (
        <p className="text-caption text-ash max-md:mt-4">
          Last changed {timeAgo(saved.updated_at)}
        </p>
      )}

      {can.own && dirty && (
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-30 -mx-4 flex items-center gap-2 border-t border-border bg-background px-4 py-2 max-md:mt-4 md:bottom-6 md:mx-0 md:w-fit md:rounded-2xl md:border md:bg-card md:p-1.5 md:ps-4 md:shadow-md">
          <p
            role="status"
            className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"
          >
            Unsaved changes
          </p>
          <Button
            variant="ghost"
            className="max-md:h-11"
            disabled={save.isPending}
            onClick={() => {
              save.reset()
              setDraft(draftOf(saved))
            }}
          >
            Discard
          </Button>
          <Button
            className="max-md:h-11"
            disabled={save.isPending}
            onClick={submit}
          >
            {save.isPending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      )}
      {!can.own && (
        <p className="flex items-center gap-1.5 text-caption text-ash max-md:mt-4">
          <Lock className="size-3.5" />
          Read only
        </p>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-label text-caption tracking-label text-ash uppercase max-md:px-0">
        {title}
      </h2>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {children}
      </div>
    </section>
  )
}

// One setting: what it is on the start, the control on the end (desktop);
// stacked on phones, with switches kept beside their label.
function Row({
  label,
  hint,
  error,
  phone,
  inline = false,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string
  phone: boolean
  inline?: boolean
  children: (props: {
    id: string
    "aria-invalid"?: true
    "aria-describedby"?: string
  }) => ReactNode
}) {
  const id = useId()
  const noteId = `${id}-note`
  const control = children({
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": noteId,
  })
  const side = !phone || inline
  return (
    <div
      className={cn(
        "flex gap-3 p-4 md:gap-6 md:px-5",
        side ? "items-start justify-between" : "flex-col",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={id} className="text-body-sm font-medium">
          {label}
        </label>
        {hint && (
          <p id={noteId} className="text-caption text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col gap-1.5",
          side && !inline && "w-72",
          !side && "w-full",
        )}
      >
        {control}
        {error && (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
