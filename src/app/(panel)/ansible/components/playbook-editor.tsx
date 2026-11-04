"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Ellipsis, FileCode2, Play, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useId, useState } from "react"
import { toast } from "sonner"

import {
  Empty,
  type Item,
  ItemMenu,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api } from "@/lib/api"
import type { PlaybookDetail } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  ansibleKeys,
  useCreatePlaybook,
  usePlaybook,
  useRuns,
  useUpdatePlaybook,
} from "../api"
import { useAnsibleActions } from "./ansible-actions"
import { RecapText, RunStateBadge, templates } from "./meta"
import { useAnsibleCan } from "./permissions"
import { YamlEditor, yamlProblems } from "./yaml-editor"

type Draft = {
  name: string
  description: string
  content: string
  variables: string
}

const fromSaved = (p: PlaybookDetail): Draft => ({
  name: p.name,
  description: p.description,
  content: p.content,
  variables: p.variables ?? "",
})

const same = (a: Draft, b: Draft) =>
  a.name === b.name &&
  a.description === b.description &&
  a.content === b.content &&
  a.variables === b.variables

// /ansible/playbooks/new and /ansible/playbooks/[id].
export function PlaybookPage({ id }: { id?: string }) {
  const phone = useIsPhone()
  const query = usePlaybook(id)
  if (phone === null) return null
  if (id && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={FileCode2}
          title={
            gone ? "This playbook isn't here" : "Couldn't load the playbook"
          }
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/ansible" />}
              nativeButton={false}
            >
              Back to Ansible
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <Editor
      // A new playbook's page becomes the saved one's: start over then.
      key={query.data?.id ?? "new"}
      saved={query.data}
      phone={phone}
    />
  )
}

type Pane = "playbook" | "variables" | "details" | "runs"

function Editor({
  saved,
  phone,
}: {
  saved: PlaybookDetail | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const can = useAnsibleCan()
  const a = useAnsibleActions()
  const router = useRouter()
  const qc = useQueryClient()
  const back = useBack("/ansible")
  const readOnly = !can.edit

  const base: Draft = saved
    ? fromSaved(saved)
    : {
        name: "",
        description: "",
        content: templates[0].content,
        variables: "",
      }
  const [draft, setDraft] = useState<Draft>(base)
  // What the draft started from: the save sends its time, a 409 means
  // someone else saved in between.
  const [revision, setRevision] = useState(saved?.updated_at)
  const [conflict, setConflict] = useOpen("ansible-playbook-conflict")
  const [pane, setPane] = useState<Pane>("playbook")
  const [touched, setTouched] = useState(false)

  const create = useCreatePlaybook(ws)
  const update = useUpdatePlaybook(saved?.id ?? "")
  const saving = create.isPending || update.isPending
  const dirty = !saved || !same(draft, fromSaved(saved))

  usePageCrumbs([
    {
      href: saved ? `/ansible/playbooks/${saved.id}` : "/ansible/playbooks/new",
      label: saved?.name ?? "New playbook",
    },
  ])

  // Don't lose typing to a closed tab.
  useEffect(() => {
    if (!dirty || readOnly || (!saved && !touched)) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, readOnly, saved, touched])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const contentProblem = yamlProblems(draft.content, "playbook")[0]?.message
  const varsProblem = yamlProblems(draft.variables, "vars")[0]?.message
  const nameProblem = draft.name.trim() ? "" : "Give it a name."
  const invalid = !!(contentProblem || varsProblem || nameProblem)

  const body = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    content: draft.content,
    variables: draft.variables,
  }

  const save = (opts?: {
    overwrite?: boolean
    andThen?: (p: PlaybookDetail) => void
  }) => {
    if (invalid) {
      if (nameProblem) setPane("details")
      toast.error(nameProblem || contentProblem || varsProblem)
      return
    }
    const done = (p: PlaybookDetail) => {
      setRevision(p.updated_at)
      if (!saved) {
        toast.success("Playbook saved")
        router.replace(`/ansible/playbooks/${p.id}`)
      } else {
        toast.success("Saved")
      }
      opts?.andThen?.(p)
    }
    const failed = (err: Error) => {
      if (err instanceof ApiError && err.status === 409) setConflict(true)
      else toast.error(err.message)
    }
    if (!saved) {
      create.mutate(body, { onSuccess: done, onError: failed })
    } else {
      update.mutate(
        { ...body, revision: opts?.overwrite ? undefined : revision },
        { onSuccess: done, onError: failed },
      )
    }
  }

  // Runs what's saved: save the changes first.
  const run = () => {
    const open = (p: PlaybookDetail) =>
      a.run({ playbookId: p.id, name: p.name, variables: p.variables ?? "" })
    if (saved && (!dirty || readOnly)) open(saved)
    else save({ andThen: open })
  }

  const loadTheirs = () => {
    setConflict(false)
    if (!saved) return
    api.ansible.getPlaybook(saved.id).then(
      (p) => {
        qc.setQueryData(ansibleKeys.playbook(p.id), p)
        setDraft(fromSaved(p))
        setRevision(p.updated_at)
      },
      (err: Error) => toast.error(err.message),
    )
  }

  const menu: Item[][] = [
    saved && can.edit
      ? [
          {
            key: "delete",
            label: "Delete playbook",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () =>
              a.removePlaybook(saved, () => router.replace("/ansible")),
          },
        ]
      : [],
  ]

  const runButton = can.run && (
    <Button
      variant={dirty && !readOnly ? "outline" : "default"}
      className="md:h-9"
      disabled={saving}
      onClick={run}
    >
      <Play />
      {dirty && !readOnly ? "Save and run" : "Run"}
    </Button>
  )
  const saveButton = !readOnly && (
    <Button
      className="md:h-9"
      disabled={saving || (!!saved && !dirty)}
      onClick={() => save()}
    >
      {saving ? "Saving…" : saved ? "Save" : "Create"}
    </Button>
  )

  const editor = (kind: "playbook" | "variables") => (
    <div className="flex min-h-0 flex-1 flex-col">
      {kind === "playbook" && !saved && !touched && (
        <TemplatePicker
          onPick={(content) => setDraft((d) => ({ ...d, content }))}
          current={draft.content}
        />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          !phone && "rounded-2xl border border-border",
        )}
      >
        {kind === "playbook" ? (
          <YamlEditor
            kind="playbook"
            value={draft.content}
            onChange={(content) => set({ content })}
            readOnly={readOnly}
          />
        ) : (
          <YamlEditor
            kind="vars"
            value={draft.variables}
            onChange={(variables) => set({ variables })}
            readOnly={readOnly}
            placeholder={
              "# Defaults for this playbook's variables, e.g.\napp_port: 8080"
            }
          />
        )}
      </div>
      <Problem
        text={kind === "playbook" ? contentProblem : varsProblem}
        hint={
          kind === "variables"
            ? "Pre-filled as extra variables each time it runs; change them in the run sheet."
            : undefined
        }
      />
    </div>
  )

  const details = (
    <div className="flex flex-col gap-4">
      <Labeled label="Name" error={touched ? nameProblem : ""}>
        {(fid) => (
          <Input
            id={fid}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Update packages"
            maxLength={100}
            readOnly={readOnly}
          />
        )}
      </Labeled>
      <Labeled label="Description">
        {(fid) => (
          <Textarea
            id={fid}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="What it's for, what it changes"
            maxLength={2000}
            rows={3}
            readOnly={readOnly}
          />
        )}
      </Labeled>
      {saved && (
        <p className="text-caption text-ash">
          Changed {timeAgo(saved.updated_at)}
        </p>
      )}
    </div>
  )

  const runs = saved && can.runs ? <RecentRuns playbookId={saved.id} /> : null

  const conflictDialog = (
    <ResponsiveDialog
      open={conflict}
      onOpenChange={setConflict}
      title="Someone else saved this playbook"
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={loadTheirs}
          >
            Load theirs
          </Button>
          <Button
            variant="destructive"
            className="h-11 md:h-9"
            onClick={() => {
              setConflict(false)
              save({ overwrite: true })
            }}
          >
            Overwrite
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-muted-foreground">
        It changed after you opened it. Load their version (your changes go), or
        save yours over it.
      </p>
    </ResponsiveDialog>
  )

  if (phone) {
    const panes: { value: Pane; label: string }[] = [
      { value: "playbook", label: "Playbook" },
      { value: "variables", label: "Variables" },
      { value: "details", label: "Details" },
      ...(runs ? [{ value: "runs" as const, label: "Runs" }] : []),
    ]
    return (
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {draft.name || (saved ? saved.name : "New playbook")}
          </h1>
          {!readOnly && (
            <Button
              variant="ghost"
              className="h-11 px-3 text-brand"
              disabled={saving || (!!saved && !dirty)}
              onClick={() => save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
          <PhoneMenu groups={menu} />
        </header>
        <div className="flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3">
          <Segmented
            label="Show"
            items={panes}
            value={pane}
            onChange={setPane}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {pane === "playbook" && editor("playbook")}
          {pane === "variables" && editor("variables")}
          {pane === "details" && <div className="px-4 py-2">{details}</div>}
          {pane === "runs" && <div className="overflow-y-auto">{runs}</div>}
        </div>
        {can.run && (
          <div className="shrink-0 border-t border-border bg-background p-3">
            <Button className="h-11 w-full" disabled={saving} onClick={run}>
              <Play />
              {dirty && !readOnly ? "Save and run" : "Run"}
            </Button>
          </div>
        )}
        {conflictDialog}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-3rem-1px)] flex-col gap-4 px-6 pt-5 pb-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileCode2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">
            {draft.name || (saved ? saved.name : "New playbook")}
          </h1>
          <p className="truncate text-caption text-ash">
            {readOnly
              ? "Read-only: editing needs Engineer access to this workspace."
              : dirty && (saved || touched)
                ? "Unsaved changes"
                : saved
                  ? `Saved ${timeAgo(saved.updated_at)}`
                  : "Not saved yet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {runButton}
          {saveButton}
          <ItemMenu groups={menu} label="Playbook actions" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Segmented
            label="Edit"
            items={[
              { value: "playbook", label: "Playbook" },
              { value: "variables", label: "Variables" },
            ]}
            value={pane === "variables" ? "variables" : "playbook"}
            onChange={setPane}
          />
          {editor(pane === "variables" ? "variables" : "playbook")}
        </div>
        <aside className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto">
          {details}
          {runs}
        </aside>
      </div>
      {conflictDialog}
    </div>
  )
}

function TemplatePicker({
  onPick,
  current,
}: {
  onPick: (content: string) => void
  current: string
}) {
  return (
    <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 pb-3 md:px-0">
      <span className="shrink-0 text-caption text-ash">Start from</span>
      {templates.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={current === t.content}
          onClick={() => onPick(t.content)}
          className={cn(
            "h-9 shrink-0 rounded-full border px-3 text-body-sm md:h-7",
            current === t.content
              ? "border-brand bg-brand-soft text-brand-strong"
              : "border-border hover:bg-muted",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function Problem({ text, hint }: { text?: string; hint?: string }) {
  if (!text && !hint) return null
  return (
    <p
      role={text ? "alert" : undefined}
      className={cn(
        "px-4 pt-2 text-caption md:px-0",
        text ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {text || hint}
    </p>
  )
}

function RecentRuns({ playbookId }: { playbookId: string }) {
  const { workspace } = useWorkspace()
  const runs = useRuns(workspace?.id, { playbook_id: playbookId, limit: 10 })
  const items = runs.data?.items ?? []
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-body-sm font-medium md:px-0">Recent runs</h2>
      {runs.isPending ? (
        <Skeleton className="mx-4 h-24 rounded-2xl md:mx-0" />
      ) : items.length === 0 ? (
        <p className="px-4 text-body-sm text-muted-foreground md:px-0">
          It hasn't run yet.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                href={`/ansible/runs/${r.id}`}
                className="flex min-h-14 flex-col justify-center gap-0.5 px-4 py-2 outline-none hover:bg-subtle active:bg-muted md:min-h-12 md:px-3"
              >
                <span className="flex items-center gap-2">
                  <RunStateBadge state={r.state} />
                  <span className="ms-auto text-caption text-ash">
                    {timeAgo(r.created_at)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="truncate text-caption text-muted-foreground">
                    {r.hosts.length === 1
                      ? r.hosts[0].name
                      : `${r.hosts.length} servers`}
                    {r.options.check && " · Dry run"}
                  </span>
                  <RecapText recap={r.recap} className="ms-auto shrink-0" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PhoneMenu({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("ansible-playbook-menu")
  if (groups.every((g) => g.length === 0)) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="More"
        onClick={() => setOpen(true)}
      >
        <Ellipsis className="size-5" />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Playbook">
        <SheetItems groups={groups} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

function Labeled({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium">
        {label}
      </label>
      {children(id)}
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4 pt-5", phone ? "px-4" : "px-6")}>
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-[60dvh] rounded-2xl" />
    </div>
  )
}

export function PlaybookFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <PlaybookPage id={id} />
}
