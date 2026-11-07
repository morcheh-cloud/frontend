"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useId, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ServerChecklist } from "@/app/(panel)/servers/components/server-checklist"
import { BottomSheet } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { ScriptParam } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useStartScriptRun } from "../api"
import { CodeEditor } from "./code-editor"
import {
  type Interpreter,
  interpreterLabels,
  type RunAs,
  runAsHints,
} from "./meta"
import { useScriptsCan } from "./permissions"

// What to run: a saved script, or text that isn't saved (a quick command,
// or a past run's copy of a script deleted since).
export type RunSource = {
  scriptId?: string
  name: string
  params?: ScriptParam[]
  content?: string
  interpreter?: Interpreter
  runAs?: RunAs
  timeoutSeconds?: number
  // A quick command: the text is typed here.
  adhoc?: boolean
}

export type RunPreset = {
  servers?: { id: string; name: string }[]
  env?: Record<string, string>
}

export function RunLayer({
  open,
  onOpenChange,
  source,
  preset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: RunSource | null
  preset?: RunPreset
}) {
  const phone = useIsPhone()
  const title = !source
    ? "Run"
    : source.adhoc
      ? "Run a command"
      : `Run “${source.name}”`
  const body = source && (
    <RunForm
      key={`${source.scriptId ?? source.name}-${open}`}
      source={source}
      preset={preset}
      phone={!!phone}
      onDone={() => onOpenChange(false)}
    />
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            {source?.adhoc
              ? "Type it, choose the servers, then start it. It isn't saved as a script, but the run keeps a copy."
              : "Choose the servers and fill in the values, then start it."}
          </SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function RunForm({
  source,
  preset,
  phone,
  onDone,
}: {
  source: RunSource
  preset?: RunPreset
  phone: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const jobs = useJobActions()
  const can = useScriptsCan()
  const start = useStartScriptRun()
  const params = source.params ?? []

  const [servers, setServers] = useState(
    () => new Map((preset?.servers ?? []).map((s) => [s.id, s.name])),
  )
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const p of params) v[p.name] = preset?.env?.[p.name] ?? p.default ?? ""
    return v
  })
  const [content, setContent] = useState(source.content ?? "")
  const [name, setName] = useState(source.adhoc ? "" : source.name)
  const [interpreter, setInterpreter] = useState<Interpreter>(
    source.interpreter ?? "bash",
  )
  const [runAs, setRunAs] = useState<RunAs>(source.runAs ?? "user")
  const [touched, setTouched] = useState(false)

  const saved = !!source.scriptId
  const missing = params.filter((p) => p.required && !values[p.name]?.trim())
  const noText = !saved && !content.trim()
  const canRun =
    !start.isPending && servers.size > 0 && missing.length === 0 && !noText

  const run = () => {
    setTouched(true)
    if (!canRun) return
    const env: Record<string, string> = {}
    for (const p of params) {
      if (values[p.name] !== "") env[p.name] = values[p.name]
    }
    start.mutate(
      saved
        ? {
            script_id: source.scriptId,
            server_ids: [...servers.keys()],
            env,
          }
        : {
            server_ids: [...servers.keys()],
            name: name.trim() || firstLine(content) || "Command",
            content,
            interpreter,
            run_as: runAs,
            timeout_seconds: source.timeoutSeconds,
            env: preset?.env,
          },
      {
        onSuccess: ({ run, job }) => {
          jobs.track(job)
          onDone()
          router.push(`/scripts/runs/${run.id}`)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const n = servers.size
  const runLabel = start.isPending
    ? "Starting…"
    : `Run on ${n || ""} ${n === 1 ? "server" : "servers"}`

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:px-6 md:py-5">
        {source.adhoc && (
          <Section title="Command">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Interpreter"
                value={interpreter}
                onChange={setInterpreter}
                items={(["bash", "sh", "python3"] as const).map((v) => ({
                  value: v,
                  label: interpreterLabels[v],
                }))}
              />
              <Segmented
                label="Run as"
                value={runAs}
                onChange={setRunAs}
                items={[
                  { value: "user", label: "Login user" },
                  { value: "root", label: "root" },
                ]}
              />
            </div>
            <div className="h-48 overflow-hidden rounded-lg border border-input">
              <CodeEditor
                value={content}
                onChange={setContent}
                interpreter={interpreter}
              />
            </div>
            <p
              className={cn(
                "text-caption",
                touched && noText
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {touched && noText ? "Type what to run." : runAsHints[runAs]}
            </p>
            <Labeled label="Name (optional)" hint="How the run is listed.">
              {(id) => (
                <Input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={firstLine(content) || "Check disk space"}
                  maxLength={100}
                />
              )}
            </Labeled>
          </Section>
        )}

        <Section
          title={n ? `Servers · ${n}` : "Servers"}
          aside="Only servers where you have Engineer access are listed."
        >
          <div className="rounded-2xl border border-border">
            <ServerChecklist
              value={servers}
              onChange={setServers}
              phone={phone}
              canPick={can.canRunOn}
            />
          </div>
          {touched && n === 0 && (
            <p className="text-caption text-destructive">Tick a server.</p>
          )}
        </Section>

        {params.length > 0 && (
          <Section title="Values">
            <div className="grid gap-4 md:grid-cols-2">
              {params.map((p) => {
                const bad = touched && missing.includes(p)
                return (
                  <Labeled
                    key={p.name}
                    label={`${p.label || p.name}${p.required ? "" : " (optional)"}`}
                    hint={
                      bad ? "A value is needed." : `$${p.name} in the script`
                    }
                    error={bad}
                  >
                    {(id) => (
                      <Input
                        id={id}
                        value={values[p.name] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [p.name]: e.target.value }))
                        }
                        aria-invalid={bad || undefined}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    )}
                  </Labeled>
                )
              })}
            </div>
            <Callout title="Values are kept with the run">
              Anyone who can open the run sees them. Keep passwords and tokens
              out: read them on the server instead (a file only root can read, a
              secrets manager).
            </Callout>
          </Section>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 md:px-6 md:py-4">
        {!phone && (
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button
          className="h-11 flex-1 md:ms-auto md:h-9 md:flex-none"
          disabled={start.isPending}
          onClick={run}
        >
          {runLabel}
        </Button>
      </div>
    </>
  )
}

const firstLine = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#!"))
    ?.slice(0, 100) ?? ""

function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-body font-medium">{title}</h3>
        {aside && <span className="text-caption text-ash">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

export function Labeled({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: boolean
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && (
        <p
          className={cn(
            "text-caption",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
