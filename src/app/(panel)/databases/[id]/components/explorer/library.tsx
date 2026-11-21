"use client"

import {
  BookmarkPlus,
  Ellipsis,
  History,
  Pencil,
  Pin,
  PinOff,
  Play,
  Share2,
  Trash2,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, fieldErrors } from "@/lib/api"
import type { DatabaseQueryRun, DatabaseSavedQuery } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useDeleteSavedQuery,
  useQueryRuns,
  useSavedQueries,
  useSaveQuery,
} from "../../../api"
import { useDashboard } from "../parts"

const firstLine = (q: string) =>
  q
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("--")) ?? q.trim()

// Saved queries (shared + your own) and what ran before.
export function Library({
  onOpenSaved,
  onOpenRun,
  onRunSaved,
  onEditSaved,
  activeId,
}: {
  onOpenSaved: (s: DatabaseSavedQuery) => void
  onOpenRun: (r: DatabaseQueryRun) => void
  onRunSaved: (s: DatabaseSavedQuery) => void
  onEditSaved: (s: DatabaseSavedQuery) => void
  activeId?: string
}) {
  const { phone } = useDashboard()
  const [tab, setTab] = useState<"saved" | "history">("saved")
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex items-center border-b border-border p-3",
          phone && "px-4",
        )}
      >
        <Segmented
          label="Library"
          value={tab}
          onChange={setTab}
          items={[
            { value: "saved", label: "Saved" },
            { value: "history", label: "History" },
          ]}
        />
      </div>
      {tab === "saved" ? (
        <SavedList
          onOpen={onOpenSaved}
          onRun={onRunSaved}
          onEdit={onEditSaved}
          activeId={activeId}
        />
      ) : (
        <RunList onOpen={onOpenRun} />
      )}
    </div>
  )
}

function SavedList({
  onOpen,
  onRun,
  onEdit,
  activeId,
}: {
  onOpen: (s: DatabaseSavedQuery) => void
  onRun: (s: DatabaseSavedQuery) => void
  onEdit: (s: DatabaseSavedQuery) => void
  activeId?: string
}) {
  const { database: d, phone } = useDashboard()
  const saved = useSavedQueries(d.id)
  const [q, setQ] = useState("")
  const items = (saved.data?.items ?? []).filter((s) => {
    const t = q.trim().toLowerCase()
    return (
      !t ||
      s.title.toLowerCase().includes(t) ||
      s.query.toLowerCase().includes(t) ||
      s.description.toLowerCase().includes(t)
    )
  })
  return (
    <>
      <div className={cn("p-3 pb-2", phone && "px-4")}>
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Find a saved query"
          label="Find a saved query"
          className="md:w-full"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {saved.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <BookmarkPlus className="size-5 text-ash" />
            <p className="text-body-sm font-medium">
              {q ? "Nothing matches" : "No saved queries yet"}
            </p>
            {!q && (
              <p className="text-caption text-muted-foreground">
                Write a query and press Save to keep it here, for you or the
                whole team.
              </p>
            )}
          </div>
        ) : (
          <ul
            className={cn(
              phone && "divide-y divide-border border-y border-border",
            )}
          >
            {items.map((s) => (
              <SavedRow
                key={s.id}
                s={s}
                active={s.id === activeId}
                onOpen={() => onOpen(s)}
                onRun={() => onRun(s)}
                onEdit={() => onEdit(s)}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function SavedRow({
  s,
  active,
  onOpen,
  onRun,
  onEdit,
}: {
  s: DatabaseSavedQuery
  active: boolean
  onOpen: () => void
  onRun: () => void
  onEdit: () => void
}) {
  const { database: d, phone } = useDashboard()
  const save = useSaveQuery(d.id)
  const remove = useDeleteSavedQuery(d.id)
  const [sheet, setSheet] = useOpen(`saved-query-${s.id}`)
  const [confirm, setConfirm] = useOpen(`saved-query-delete-${s.id}`)
  const toggle = (patch: Partial<DatabaseSavedQuery>) =>
    save.mutate(
      {
        queryId: s.id,
        body: {
          title: s.title,
          description: s.description,
          database: s.database,
          query: s.query,
          shared: patch.shared ?? s.shared,
          pinned: patch.pinned ?? s.pinned,
        },
      },
      { onError: (e) => toast.error(e.message) },
    )

  const actions = [
    { label: "Run it", icon: Play, run: onRun, show: true },
    {
      label: "Rename or describe",
      icon: Pencil,
      run: onEdit,
      show: s.can_edit,
    },
    {
      label: s.pinned ? "Unpin" : "Pin to the top",
      icon: s.pinned ? PinOff : Pin,
      run: () => toggle({ pinned: !s.pinned }),
      show: s.can_edit,
    },
    {
      label: s.shared ? "Keep it to myself" : "Share with the team",
      icon: s.shared ? Users : Share2,
      run: () => toggle({ shared: !s.shared }),
      show: s.mine,
    },
  ].filter((a) => a.show)

  const meta = [
    s.shared
      ? s.mine
        ? "Shared by you"
        : `Shared by ${s.created_by_name}`
      : "Only you",
    s.database && `in ${s.database}`,
    s.run_count > 0 && `ran ${s.run_count}×`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="group relative">
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={onOpen}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 text-start outline-none",
          phone
            ? "min-h-16 px-4 py-2.5 pe-14 active:bg-muted"
            : "mx-1.5 w-[calc(100%-0.75rem)] rounded-lg px-2.5 py-2 pe-9 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current]:bg-brand-soft",
        )}
      >
        <span className="flex w-full items-center gap-1.5 text-body-sm font-medium">
          {s.pinned && (
            <Pin className="size-3 shrink-0 text-brand" aria-label="Pinned" />
          )}
          <span className="truncate">{s.title}</span>
        </span>
        <span className="w-full truncate font-mono text-[11.5px] text-muted-foreground">
          {firstLine(s.query)}
        </span>
        <span className="w-full truncate text-[11px] text-ash">{meta}</span>
      </button>
      {phone ? (
        <button
          type="button"
          aria-label={`${s.title} actions`}
          onClick={() => setSheet(true)}
          className="absolute end-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ash active:bg-muted"
        >
          <Ellipsis className="size-5" />
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`${s.title} actions`}
                className="absolute end-3 top-2 flex size-7 items-center justify-center rounded-md text-ash opacity-0 group-hover:opacity-100 hover:bg-card hover:text-foreground focus-visible:opacity-100 data-popup-open:opacity-100"
              />
            }
          >
            <Ellipsis className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {actions.map((a) => (
              <DropdownMenuItem key={a.label} onClick={a.run}>
                <a.icon />
                {a.label}
              </DropdownMenuItem>
            ))}
            {s.can_edit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {phone && (
        <BottomSheet open={sheet} onOpenChange={setSheet} title={s.title}>
          <div className="flex flex-col gap-1 px-2">
            {actions.map((a) => (
              <SheetAction
                key={a.label}
                icon={<a.icon />}
                label={a.label}
                onClick={() => {
                  setSheet(false)
                  a.run()
                }}
              />
            ))}
            {s.can_edit && (
              <SheetAction
                icon={<Trash2 />}
                label="Delete"
                destructive
                onClick={() => {
                  setSheet(false)
                  setConfirm(true)
                }}
              />
            )}
          </div>
        </BottomSheet>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete “${s.title}”?`}
        description={
          s.shared
            ? "It's shared: it goes for everyone."
            : "Only the saved copy goes; the database isn't touched."
        }
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(s.id, {
            onSuccess: () => setConfirm(false),
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </li>
  )
}

function RunList({ onOpen }: { onOpen: (r: DatabaseQueryRun) => void }) {
  const { database: d, phone, owner } = useDashboard()
  const [who, setWho] = useState<"mine" | "all">("mine")
  const runs = useQueryRuns(d.id, who)
  const items = runs.data?.pages.flatMap((p) => p.items) ?? []
  return (
    <>
      {owner && (
        <div className={cn("px-3 pt-3", phone && "px-4")}>
          <Segmented
            label="Whose"
            value={who}
            onChange={setWho}
            items={[
              { value: "mine", label: "Mine" },
              { value: "all", label: "Everyone's" },
            ]}
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {runs.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <History className="size-5 text-ash" />
            <p className="text-body-sm font-medium">Nothing ran yet</p>
            <p className="text-caption text-muted-foreground">
              Every query run here is kept for 90 days.
            </p>
          </div>
        ) : (
          <ul
            className={cn(
              phone && "divide-y divide-border border-y border-border",
            )}
          >
            {items.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  title={r.error || r.query}
                  className={cn(
                    "flex w-full items-start gap-2.5 text-start outline-none",
                    phone
                      ? "min-h-14 px-4 py-2.5 active:bg-muted"
                      : "mx-1.5 w-[calc(100%-0.75rem)] rounded-lg px-2.5 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  <span
                    title={r.ok ? "Worked" : "Failed"}
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      r.ok ? "bg-success" : "bg-destructive",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12px]">
                      {firstLine(r.query)}
                    </span>
                    <span className="block truncate text-[11px] text-ash">
                      {timeAgo(r.at)}
                      {who === "all" && ` · ${r.user_name}`}
                      {r.mode === "change" && " · with changes"}
                      {r.ok
                        ? ` · ${r.rows.toLocaleString()} rows · ${r.ms} ms`
                        : " · failed"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {runs.hasNextPage && (
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full"
              disabled={runs.isFetchingNextPage}
              onClick={() => runs.fetchNextPage()}
            >
              {runs.isFetchingNextPage ? "Loading…" : "Older"}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

export type SaveTarget = {
  // Editing this saved query; none = a new one.
  existing?: DatabaseSavedQuery
  query: string
  database: string
}

// Name a query and say who sees it.
export function SaveDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: SaveTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (s: DatabaseSavedQuery) => void
}) {
  const { database: d } = useDashboard()
  const save = useSaveQuery(d.id)
  const e = target.existing
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [shared, setShared] = useState(false)
  const [pinned, setPinned] = useState(false)
  const errors = fieldErrors(save.error)

  const { reset } = save
  useEffect(() => {
    if (!open) return
    setTitle(e?.title ?? "")
    setDescription(e?.description ?? "")
    setShared(e?.shared ?? false)
    setPinned(e?.pinned ?? false)
    reset()
  }, [open, e, reset])

  const submit = (asNew: boolean) =>
    save.mutate(
      {
        queryId: asNew ? undefined : e?.id,
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
          database: target.database || undefined,
          query: target.query,
          shared,
          pinned,
          revision: asNew ? undefined : e?.updated_at,
        },
      },
      {
        onSuccess: (s) => {
          onSaved(s)
          onOpenChange(false)
          toast.success(asNew || !e ? "Saved" : "Changes saved")
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.error(err.message, {
              description:
                "Save it as a new one, or open theirs from the list.",
            })
          }
        },
      },
    )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={e ? "Saved query" : "Save this query"}
      description={e ? undefined : "Keep it here to run again later."}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {e && (
            <Button
              variant="outline"
              disabled={!title.trim() || save.isPending}
              onClick={() => submit(true)}
            >
              Save as new
            </Button>
          )}
          <Button
            disabled={!title.trim() || save.isPending}
            onClick={() => submit(false)}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (title.trim()) submit(false)
        }}
      >
        <Field label="Name" error={errors.title}>
          {(p) => (
            <Input
              {...p}
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder="e.g. Orders waiting over a day"
              maxLength={200}
            />
          )}
        </Field>
        <Field
          label="Notes"
          hint="What it's for, what to look at in the answer. Optional."
        >
          {(p) => (
            <Textarea
              {...p}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              rows={3}
              maxLength={2000}
            />
          )}
        </Field>
        <label
          htmlFor="save-query-shared"
          className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
        >
          <span>
            <span className="block text-body-sm font-medium">
              Share with the team
            </span>
            <span className="block text-caption text-muted-foreground">
              Everyone who can query {d.name} sees and runs it. Only you
              {e && !e.mine ? " (or an Owner)" : " and Owners"} change it.
            </span>
          </span>
          <Switch
            id="save-query-shared"
            checked={shared}
            onCheckedChange={setShared}
            disabled={!!e && !e.mine}
          />
        </label>
        <label
          htmlFor="save-query-pinned"
          className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4"
        >
          <span className="text-body-sm font-medium">
            Pin to the top of the list
          </span>
          <Switch
            id="save-query-pinned"
            checked={pinned}
            onCheckedChange={setPinned}
          />
        </label>
        {save.error &&
          !errors.title &&
          !(save.error instanceof ApiError && save.error.status === 409) && (
            <p className="text-body-sm text-destructive">
              {save.error.message}
            </p>
          )}
      </form>
    </ResponsiveDialog>
  )
}
