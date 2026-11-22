"use client"

import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/app/(panel)/cronjobs/components/task-fields"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { CodeBlock } from "@/components/code-block"
import { CredentialRow } from "@/components/credentials"
import { eventLabel, useEventCatalog } from "@/components/events/catalog"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { apiAddress } from "@/components/tokens/meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type {
  Automation,
  AutomationEventInput,
  AutomationRun,
} from "@/lib/services"
import {
  useCancelAutomationRun,
  useCreateHook,
  useDeleteAutomation,
  useDeleteHook,
  useRunAutomation,
  useSaveAutomation,
} from "../api"
import { DryRunView } from "./dry-run"
import { actsOnServers, automationHref, bodyOf } from "./meta"

type Actions = {
  // Asks how (an event or not, which server), then starts a run and opens it.
  run: (a: Automation) => void
  // Says what each step would do, nothing runs.
  test: (a: Automation) => void
  running: boolean
  setEnabled: (a: Automation, enabled: boolean) => void
  remove: (a: Automation, after?: () => void) => void
  // Makes the incoming URL (again) and shows it once.
  makeHook: (a: Automation) => void
  removeHook: (a: Automation) => void
  cancelRun: (r: Pick<AutomationRun, "id">) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useAutomationActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx)
    throw new Error("useAutomationActions outside AutomationActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Closes a layer, then acts once its history entry is gone (a navigation or
// a new layer pushed before that would be undone by the Back).
function thenAfter(close: (open: boolean) => void, act: () => void) {
  let done = false
  const go = () => {
    if (done) return
    done = true
    act()
  }
  window.addEventListener("popstate", go, { once: true })
  close(false)
  setTimeout(go, 400)
}

// Some step acts on "the event's server": a run by hand needs one picked.
const needsServer = (a: Automation) =>
  a.actions.some((s) => actsOnServers(s.kind) && (s.on || "event") === "event")

export function AutomationActionsProvider({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const jobs = useJobActions()
  const runMutation = useRunAutomation()
  const save = useSaveAutomation()
  const del = useDeleteAutomation()
  const cancel = useCancelAutomationRun()
  const createHook = useCreateHook()
  const deleteHook = useDeleteHook()

  const [runOpen, setRunOpen] = useOpen("automation-run")
  const [testOpen, setTestOpen] = useOpen("automation-test")
  const [rmOpen, setRmOpen] = useOpen("automation-remove")
  const [regenOpen, setRegenOpen] = useOpen("automation-hook-again")
  const [rmHookOpen, setRmHookOpen] = useOpen("automation-hook-remove")
  const [hookOpen, setHookOpen] = useOpen("automation-hook")
  const [cancelOpen, setCancelOpen] = useOpen("automation-run-cancel")
  const [target, setTarget] = useState<Automation>()
  const [after, setAfter] = useState<() => void>()
  const [hook, setHook] = useState<{ url: string; again: boolean }>()
  const [toCancel, setToCancel] = useState<string>()

  const start = (a: Automation, event: AutomationEventInput | undefined) =>
    runMutation.mutate(
      { id: a.id, event },
      {
        onSuccess: (out) => {
          if (out.job) jobs.track(out.job)
          else toast(out.run.reason || "It was skipped.")
          thenAfter(setRunOpen, () =>
            router.push(automationHref(a.id, out.run.id)),
          )
        },
        onError: errorToast,
      },
    )

  const makeHook = (a: Automation, again: boolean) =>
    createHook.mutate(a.id, {
      onSuccess: (h) => {
        setHook({ url: apiAddress() + h.path, again })
        if (again) thenAfter(setRegenOpen, () => setHookOpen(true))
        else setHookOpen(true)
      },
      onError: errorToast,
    })

  const actions: Actions = {
    run: (a) => {
      setTarget(a)
      setRunOpen(true)
    },
    test: (a) => {
      setTarget(a)
      setTestOpen(true)
    },
    running: runMutation.isPending,
    setEnabled: (a, enabled) =>
      save.mutate(
        { id: a.id, ws: a.workspace_id, body: bodyOf(a, { enabled }) },
        {
          onSuccess: () =>
            toast.success(enabled ? `${a.name} is on` : `${a.name} is off`),
          onError: errorToast,
        },
      ),
    remove: (a, then) => {
      setTarget(a)
      setAfter(() => then)
      setRmOpen(true)
    },
    makeHook: (a) => {
      setTarget(a)
      if (a.has_hook) setRegenOpen(true)
      else makeHook(a, false)
    },
    removeHook: (a) => {
      setTarget(a)
      setRmHookOpen(true)
    },
    cancelRun: (r) => {
      setToCancel(r.id)
      setCancelOpen(true)
    },
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      {target && (
        <RunDialog
          key={`run-${target.id}`}
          a={target}
          open={runOpen}
          onOpenChange={setRunOpen}
          pending={runMutation.isPending}
          onRun={(event) => start(target, event)}
        />
      )}
      {target && (
        <TestDialog
          key={`test-${target.id}`}
          a={target}
          open={testOpen}
          onOpenChange={setTestOpen}
        />
      )}
      <ConfirmDialog
        open={rmOpen}
        onOpenChange={setRmOpen}
        title={`Delete ${target?.name ?? "this automation"}?`}
        description="It stops reacting at once and its run history goes with it. A run going now is stopped."
        confirmLabel="Delete"
        pending={del.isPending}
        onConfirm={() => {
          if (!target) return
          del.mutate(target, {
            onSuccess: () => {
              setRmOpen(false)
              toast.success(`${target.name} deleted`)
              after?.()
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={regenOpen}
        onOpenChange={setRegenOpen}
        title="Make a new incoming URL?"
        description="The current URL stops working at once: whatever calls it gets 404 until it uses the new one."
        confirmLabel="Make a new URL"
        pending={createHook.isPending}
        onConfirm={() => target && makeHook(target, true)}
      />
      <ConfirmDialog
        open={rmHookOpen}
        onOpenChange={setRmHookOpen}
        title="Remove the incoming URL?"
        description="Calls to it get 404 from now on. You can make a new one later."
        confirmLabel="Remove"
        pending={deleteHook.isPending}
        onConfirm={() => {
          if (!target) return
          deleteHook.mutate(target.id, {
            onSuccess: () => {
              setRmHookOpen(false)
              toast.success("Incoming URL removed")
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Stop this run?"
        description="The step going now is stopped and the rest are skipped. What's done stays done."
        confirmLabel="Stop"
        pending={cancel.isPending}
        onConfirm={() => {
          if (!toCancel) return
          cancel.mutate(toCancel, {
            onSuccess: () => setCancelOpen(false),
            onError: errorToast,
          })
        }}
      />
      <HookDialog
        open={hookOpen}
        onOpenChange={(o) => {
          setHookOpen(o)
          if (!o) setHook(undefined)
        }}
        url={hook?.url ?? ""}
        again={!!hook?.again}
      />
    </ActionsContext.Provider>
  )
}

// ---- Run now ----

type Sample = { on: boolean; type: string; server: string }

function eventInput(
  a: Automation,
  s: Sample,
): AutomationEventInput | undefined {
  const event = a.trigger.kind === "event"
  if (event && !s.on) return undefined
  if (!event && !s.server) return undefined
  return {
    ...(event && s.type ? { type: s.type } : {}),
    ...(s.server ? { server_id: s.server } : {}),
  }
}

// The event fields of Run now and Test: a sample event (event triggers) and
// the server for steps on "the event's server".
function SampleFields({
  a,
  s,
  set,
  optional,
}: {
  a: Automation
  s: Sample
  set: (patch: Partial<Sample>) => void
  // Run now may go without an event; Test always uses one.
  optional: boolean
}) {
  const catalog = useEventCatalog()
  const servers = useServers({ limit: 200, sort: "name" })
  const event = a.trigger.kind === "event"
  const types = a.trigger.events ?? []
  const serverToo = needsServer(a) && (!event || s.on)
  return (
    <div className="flex flex-col gap-4">
      {event && optional && (
        <div className="flex flex-col gap-1.5">
          <Segmented
            label="Event"
            items={[
              { value: "none", label: "No event" },
              { value: "sample", label: "A sample event" },
            ]}
            value={s.on ? "sample" : "none"}
            onChange={(v) => set({ on: v === "sample" })}
          />
          <p className="text-caption text-muted-foreground">
            {s.on
              ? "The steps see the sample's title, text and data, like a real event."
              : "The steps get no event: its {{…}} values come out empty."}
          </p>
        </div>
      )}
      {event && s.on && types.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sample-type" className="text-body-sm font-medium">
            Sample of
          </label>
          <Choice
            id="sample-type"
            value={s.type}
            onChange={(type) => set({ type })}
            placeholder={eventLabel(catalog.data, types[0])}
            items={types.slice(1).map((t) => ({
              value: t,
              label: eventLabel(catalog.data, t),
            }))}
          />
        </div>
      )}
      {serverToo && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sample-server" className="text-body-sm font-medium">
            The event's server
          </label>
          <Choice
            id="sample-server"
            value={s.server}
            onChange={(server) => set({ server })}
            placeholder="None"
            items={(servers.data?.items ?? []).map((x) => ({
              value: x.id,
              label: x.name,
              detail: x.host,
            }))}
          />
          <p className="text-caption text-muted-foreground">
            {s.server
              ? "Steps on the event's server act on this one."
              : "Without one, steps on the event's server fail: “This event didn't happen on a server.”"}
          </p>
        </div>
      )}
    </div>
  )
}

function RunDialog({
  a,
  open,
  onOpenChange,
  pending,
  onRun,
}: {
  a: Automation
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onRun: (event: AutomationEventInput | undefined) => void
}) {
  const [s, setS] = useState<Sample>({ on: false, type: "", server: "" })
  const set = (patch: Partial<Sample>) => setS((x) => ({ ...x, ...patch }))
  const simple = a.trigger.kind !== "event" && !needsServer(a)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Run ${a.name} now?`}
      description={
        a.enabled
          ? "It runs right away, past the cooldown."
          : "It's turned off, but Run now still runs it, past the cooldown."
      }
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="max-md:h-11"
            disabled={pending}
            onClick={() => onRun(eventInput(a, s))}
          >
            {pending ? "Starting…" : "Run now"}
          </Button>
        </div>
      }
    >
      {simple ? (
        <p className="text-body-sm text-muted-foreground">
          {a.actions.length === 1
            ? "Its one step runs"
            : `Its ${a.actions.length} steps run in order`}{" "}
          with {a.run_as_name ? `${a.run_as_name}'s` : "its saver's"} access.
        </p>
      ) : (
        <SampleFields a={a} s={s} set={set} optional />
      )}
    </ResponsiveDialog>
  )
}

// ---- Test (dry run) ----

function TestDialog({
  a,
  open,
  onOpenChange,
}: {
  a: Automation
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [s, setS] = useState<Sample>({ on: true, type: "", server: "" })
  const set = (patch: Partial<Sample>) => setS((x) => ({ ...x, ...patch }))
  const event = {
    ...(s.type ? { type: s.type } : {}),
    ...(s.server ? { server_id: s.server } : {}),
  }
  const dry = useQuery({
    queryKey: ["automations", "test", a.id, a.updated_at, event],
    queryFn: () =>
      api.automations.testAutomation(a.id, { dry_run: true, event }),
    enabled: open,
    retry: false,
    gcTime: 0,
  })
  const showFields =
    (a.trigger.kind === "event" && (a.trigger.events?.length ?? 0) > 1) ||
    needsServer(a)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Test ${a.name}`}
      description="What each step would do with a sample event, as the person it runs as. Nothing runs."
      className="sm:max-w-xl"
      footer={
        <Button
          variant="outline"
          className="max-md:h-11 max-md:w-full"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {showFields && <SampleFields a={a} s={s} set={set} optional={false} />}
        {dry.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : dry.isError ? (
          <p className="flex gap-2 rounded-lg bg-destructive/5 px-3 py-2.5 text-body-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {dry.error.message}
          </p>
        ) : dry.data?.dry_run ? (
          <DryRunView
            d={dry.data.dry_run}
            manual={a.trigger.kind === "manual"}
          />
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}

// ---- Incoming URL ----

export function hookCurl(url: string) {
  return `curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n  -d '{"title": "Deploy finished", "branch": "main"}'`
}

function HookDialog({
  open,
  onOpenChange,
  url,
  again,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  again: boolean
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={again ? "Your new incoming URL" : "Copy the incoming URL"}
      className="sm:max-w-xl"
      footer={
        <Button
          className="max-md:h-11 max-md:w-full"
          onClick={() => onOpenChange(false)}
        >
          I've copied it
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex gap-2.5 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <span className="font-medium">It won't be shown again.</span>{" "}
            <span className="text-muted-foreground">
              The URL is the secret: anyone with it can start this automation.
              {again && " The old one stopped working just now."}
            </span>
          </span>
        </p>
        <CredentialRow label="Incoming URL" value={url} copyLabel="URL" wrap />
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-medium">Try it</p>
          <CodeBlock code={hookCurl(url)} label="curl example" />
          <p className="text-caption text-muted-foreground">
            POST JSON (up to 64 KB): it becomes the event's data, read as{" "}
            <code className="font-mono">{"{{data.branch}}"}</code> in the steps.
            30 calls a minute at most.
          </p>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
