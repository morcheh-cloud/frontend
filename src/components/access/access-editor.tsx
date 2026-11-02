"use client"

import { Check, ChevronDown, ChevronRight, Tag, X } from "lucide-react"
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import {
  atLeast,
  LEVELS,
  type Level,
  levelHints,
  levelLabel,
  levelLabels,
} from "@/components/auth/level"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { PanelGrant } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type AccessDraft,
  type AccessPick,
  keyOfGrant,
  kindOfKey,
  newPick,
} from "./access-draft"
import { Choice } from "./choice"
import { CreateSwitch, hintsFor, kindIcon, targetOf } from "./grants"
import type { Target, TargetGroup, TargetKind } from "./targets"
import { useAccessTargets } from "./targets"

type EditorState = {
  draft: AccessDraft
  inherited: PanelGrant[]
  // Phones share one level sheet; desktop levels are popovers on their trigger.
  editLevel: (key: string) => void
}

const EditorContext = createContext<EditorState | null>(null)

function useEditor() {
  const value = use(EditorContext)
  if (!value) throw new Error("useEditor outside AccessEditor")
  return value
}

const levelItems = LEVELS.map((value) => ({
  value,
  label: levelLabels[value],
}))

// A pill that's either on or off: a group, a server tag.
export function TogglePill({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-body-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-transparent aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-11 [&_svg]:size-3.5"
    >
      {children}
    </button>
  )
}

// A level, what it allows and, on a workspace, the switch for adding servers.
function LevelOptions({
  targetKey,
  pick,
  onPicked,
}: {
  targetKey: string
  pick: AccessPick
  onPicked: () => void
}) {
  const { draft } = useEditor()
  const kind = kindOfKey(targetKey)
  return (
    <div className="flex flex-col gap-0.5">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={pick.level === level}
          className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-14 max-md:py-2"
          onClick={() => {
            draft.update({ [targetKey]: newPick(level) })
            onPicked()
          }}
        >
          <Check
            className={cn(
              "mt-0.5 size-4 shrink-0 text-brand",
              pick.level !== level && "invisible",
            )}
          />
          <span className="min-w-0">
            <span className="block text-body-sm font-medium">
              {levelLabels[level]}
            </span>
            <span className="block text-caption text-muted-foreground">
              {hintsFor(kind)[level]}
            </span>
          </span>
        </button>
      ))}
      {kind === "workspace" && (
        <div className="mt-1 border-t border-border px-2 pt-2.5 pb-1">
          <CreateSwitch
            checked={pick.canCreate}
            onChange={(canCreate) =>
              draft.update({ [targetKey]: { ...pick, canCreate } })
            }
          />
        </div>
      )}
    </div>
  )
}

function LevelControl({
  targetKey,
  pick,
  name,
}: {
  targetKey: string
  pick: AccessPick
  name: string
}) {
  const phone = useIsPhone()
  const { editLevel } = useEditor()
  const [open, setOpen] = useState(false)
  const className =
    "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11 max-md:text-body-sm"
  const label = (
    <>
      {levelLabel(pick.level)}
      <ChevronDown className="size-3.5" />
    </>
  )
  if (phone) {
    return (
      <button
        type="button"
        aria-label={`Access level for ${name}: ${levelLabel(pick.level)}`}
        className={className}
        onClick={() => editLevel(targetKey)}
      >
        {label}
      </button>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Access level for ${name}: ${levelLabel(pick.level)}`}
        className={className}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1.5">
        <LevelOptions
          targetKey={targetKey}
          pick={pick}
          onPicked={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

// The strongest thing already covering this target, whoever gave it.
function coveredBy(
  target: Target,
  workspaceKey: string,
  picks: AccessDraft["picks"],
  inherited: PanelGrant[],
) {
  const found: { level: Level; via: string }[] = []
  const onWorkspace = picks.get(workspaceKey)
  if (target.kind !== "workspace" && onWorkspace) {
    found.push({ level: onWorkspace.level, via: "the workspace" })
  }
  for (const g of inherited) {
    const key = keyOfGrant(g)
    if (key === target.key || key === workspaceKey) {
      found.push({ level: g.level, via: g.group_name ?? "a group" })
    }
  }
  const best = found.reduce<(typeof found)[number] | undefined>(
    (top, f) => (!top || atLeast(f.level, top.level) ? f : top),
    undefined,
  )
  return best && `${levelLabel(best.level)} through ${best.via}`
}

function Row({
  target,
  workspaceKey,
  defaultLevel,
  lead,
  nested,
}: {
  target: Target
  workspaceKey: string
  defaultLevel: Level
  lead?: ReactNode
  nested?: boolean
}) {
  const { draft, inherited } = useEditor()
  const pick = draft.picks.get(target.key)
  const Icon = kindIcon[target.kind]
  const caption = [
    target.detail,
    target.tags.join(", "),
    coveredBy(target, workspaceKey, draft.picks, inherited),
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <li
      className={cn(
        "flex items-center gap-1 pe-2 hover:bg-subtle",
        lead === undefined && "ps-1",
        // Lines the checkbox up with the workspace row, past its fold button.
        nested && "ps-10 max-md:ps-13",
      )}
    >
      {lead}
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-1.5 md:min-h-10">
        <Checkbox
          data-pick={target.key}
          checked={!!pick}
          onCheckedChange={(on) =>
            draft.update({ [target.key]: on ? newPick(defaultLevel) : null })
          }
        />
        <Icon className="size-4 shrink-0 text-ash" aria-hidden />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-body-sm",
              target.kind === "workspace" && "font-medium",
            )}
          >
            {target.name}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {caption}
          </span>
        </span>
      </label>
      {pick && (
        <LevelControl targetKey={target.key} pick={pick} name={target.name} />
      )}
    </li>
  )
}

function useTagIndex(groups: TargetGroup[]) {
  const index = new Map<string, string[]>()
  for (const group of groups) {
    for (const item of group.items) {
      for (const tag of item.tags) {
        index.set(tag, [...(index.get(tag) ?? []), item.key])
      }
    }
  }
  return [...index].sort(([a], [b]) => a.localeCompare(b))
}

function Picker({
  groups,
  pending,
  error,
}: {
  groups: TargetGroup[]
  pending: boolean
  error: Error | null
}) {
  const phone = useIsPhone()
  const { draft } = useEditor()
  const [q, setQ] = useState("")
  const [level, setLevel] = useState<Level>("viewer")
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tags = useTagIndex(groups)

  // Don't raise the keyboard on touch devices.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      searchRef.current?.focus()
    }
  }, [])

  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const searching = terms.length > 0
  const matches = (t: Target) => {
    const text = [t.name, t.detail, ...t.tags].join(" ").toLowerCase()
    return terms.every((term) => text.includes(term))
  }
  const shown = groups
    .map((group) => ({
      group,
      own: searching && matches(group.workspace),
      items: searching ? group.items.filter(matches) : group.items,
    }))
    .filter((g) => !searching || g.own || g.items.length > 0)
  const results = searching
    ? shown.flatMap((g) => [...(g.own ? [g.group.workspace] : []), ...g.items])
    : []
  const allResultsPicked =
    results.length > 0 && results.every((t) => draft.picks.has(t.key))

  const pickAll = (keys: string[], on: boolean) =>
    draft.update(
      Object.fromEntries(
        keys
          // What's already picked keeps the level it was given.
          .filter((key) => on !== draft.picks.has(key))
          .map((key) => [key, on ? newPick(level) : null]),
      ),
    )

  const toggleFold = (key: string) =>
    setFolded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      listRef.current?.querySelector<HTMLElement>("[data-pick]")?.focus()
    }
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault()
      const first = results[0]
      draft.update({
        [first.key]: draft.picks.has(first.key) ? null : newPick(level),
      })
      setQ("")
    }
  }

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    const boxes = [
      ...(listRef.current?.querySelectorAll<HTMLElement>("[data-pick]") ?? []),
    ]
    const at = boxes.indexOf(document.activeElement as HTMLElement)
    if (at === -1) return
    e.preventDefault()
    const next = at + (e.key === "ArrowDown" ? 1 : -1)
    if (next < 0) searchRef.current?.focus()
    else boxes[next]?.focus()
  }

  const levelPicker = (
    <Segmented
      label="Level for what you pick next"
      items={levelItems}
      value={level}
      onChange={setLevel}
    />
  )
  const search = (
    <SearchBox
      value={q}
      onChange={setQ}
      inputRef={searchRef}
      onKeyDown={onSearchKey}
      placeholder="Search workspaces, servers, storage, tags…"
      label="Search what to give access to"
      className="min-w-0 flex-1 md:w-auto"
    />
  )

  return (
    <section className="flex min-w-0 flex-col gap-3">
      {phone ? (
        <>
          <div className="-mx-4 overflow-x-auto px-4">{levelPicker}</div>
          <div className="sticky top-0 z-10 -mx-4 bg-background px-4 py-2">
            {search}
          </div>
        </>
      ) : (
        <div className="sticky top-[calc(3rem+1px)] z-10 -my-2 flex flex-wrap items-center gap-3 bg-background py-2">
          {search}
          {levelPicker}
        </div>
      )}
      <p className="text-caption text-muted-foreground">
        What you pick gets{" "}
        <span className="font-medium">{levelLabels[level]}</span>.{" "}
        {levelHints[level]}
      </p>

      {tags.length > 0 && !searching && (
        <div className="flex flex-wrap gap-2">
          {tags.map(([tag, keys]) => {
            const all = keys.every((key) => draft.picks.has(key))
            return (
              <TogglePill
                key={tag}
                pressed={all}
                onClick={() => pickAll(keys, !all)}
              >
                <Tag />
                {tag}
                <span className="text-caption opacity-70">{keys.length}</span>
              </TogglePill>
            )
          })}
        </div>
      )}

      {searching && results.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="self-start max-md:h-11"
          onClick={() =>
            pickAll(
              results.map((t) => t.key),
              !allResultsPicked,
            )
          }
        >
          {allResultsPicked ? "Clear" : "Select"} all {results.length} results
        </Button>
      )}

      {pending && groups.length === 0 ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error && groups.length === 0 ? (
        <p className="py-3 text-body-sm text-destructive">{error.message}</p>
      ) : groups.length === 0 ? (
        <Empty
          icon={kindIcon.workspace}
          title="No workspaces yet"
          body="Create a workspace first, then give access to it here."
        />
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-muted-foreground">
          Nothing matches “{q.trim()}”.
        </p>
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: arrow keys only move focus between the checkboxes inside
        <div
          ref={listRef}
          onKeyDown={onListKey}
          className="flex flex-col gap-3 max-md:-mx-4"
        >
          {shown.map(({ group, items }) => {
            const key = group.workspace.key
            const open = searching || !folded.has(key)
            return (
              <ul
                key={key}
                className="divide-y divide-border overflow-hidden border-y border-border md:rounded-2xl md:border"
              >
                <Row
                  target={group.workspace}
                  workspaceKey={key}
                  defaultLevel={level}
                  lead={
                    <button
                      type="button"
                      aria-label={`${open ? "Fold" : "Unfold"} ${group.workspace.name}`}
                      aria-expanded={open}
                      disabled={searching || group.items.length === 0}
                      className="ms-1 flex size-8 shrink-0 items-center justify-center rounded-md text-ash outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:invisible max-md:size-11"
                      onClick={() => toggleFold(key)}
                    >
                      {open ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  }
                />
                {open &&
                  items.map((item) => (
                    <Row
                      key={item.key}
                      target={item}
                      workspaceKey={key}
                      defaultLevel={level}
                      nested
                    />
                  ))}
              </ul>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SelectedTag({
  targetKey,
  kind,
  name,
  pick,
}: {
  targetKey: string
  kind: TargetKind
  name: string
  pick: AccessPick
}) {
  const { draft } = useEditor()
  const Icon = kindIcon[kind]
  return (
    <li className="inline-flex h-8 max-w-full shrink-0 items-center gap-1 rounded-full border border-border bg-card ps-2.5 pe-1 text-body-sm max-md:h-11">
      <Icon className="size-3.5 shrink-0 text-ash" aria-hidden />
      <span className="min-w-0 truncate">{name}</span>
      <LevelControl targetKey={targetKey} pick={pick} name={name} />
      <button
        type="button"
        aria-label={`Remove access to ${name}`}
        title="Remove"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-md:size-11"
        onClick={() => draft.update({ [targetKey]: null })}
      >
        <X className="size-3.5" />
      </button>
    </li>
  )
}

function Selected({ groups }: { groups: TargetGroup[] }) {
  const phone = useIsPhone()
  const { draft, inherited } = useEditor()
  const known = new Set(
    groups.flatMap((g) => [g.workspace.key, ...g.items.map((t) => t.key)]),
  )
  const sections = [
    ...groups.map((group) => ({
      title: group.workspace.name,
      tags: [group.workspace, ...group.items].flatMap((target) => {
        const pick = draft.picks.get(target.key)
        return pick
          ? [{ key: target.key, kind: target.kind, name: target.name, pick }]
          : []
      }),
    })),
    {
      // Still loading, or in a workspace this list doesn't show.
      title: "Other",
      tags: [...draft.picks].flatMap(([key, pick]) => {
        const grant = draft.base.get(key)
        return !known.has(key) && grant
          ? [{ key, ...targetOf(grant), pick }]
          : []
      }),
    },
  ].filter((s) => s.tags.length > 0)
  const total = draft.picks.size

  const setAll = (level: string) =>
    draft.update(
      Object.fromEntries(
        [...draft.picks.keys()].map((key) => [key, newPick(level as Level)]),
      ),
    )

  const tag = (t: (typeof sections)[number]["tags"][number]) => (
    <SelectedTag
      key={t.key}
      targetKey={t.key}
      kind={t.kind}
      name={t.name}
      pick={t.pick}
    />
  )

  const fromGroups = [
    ...new Set(inherited.map((g) => g.group_name ?? "Group")),
  ].map((name) => ({
    name,
    grants: inherited.filter((g) => (g.group_name ?? "Group") === name),
  }))

  return (
    <>
      <section>
        <div className="mb-2 flex min-h-9 items-center justify-between gap-3">
          <h2 className="text-body-sm font-medium">
            Access
            {total > 0 && <span className="ms-1.5 text-ash">{total}</span>}
          </h2>
          {total > 1 && (
            <Choice
              label="Set the level of everything selected"
              value=""
              placeholder="Set all to…"
              items={levelItems}
              onChange={setAll}
              className="w-32"
            />
          )}
        </div>
        {total === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            Nothing yet. Tick what they should reach.
          </p>
        ) : phone ? (
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {sections.flatMap((s) => s.tags.map(tag))}
          </ul>
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((s) => (
              <div key={s.title}>
                <p className="mb-1.5 truncate text-caption text-muted-foreground">
                  {s.title}
                </p>
                <ul className="flex flex-wrap gap-1.5">{s.tags.map(tag)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {fromGroups.length > 0 && (
        <section>
          <h2 className="mb-2 text-body-sm font-medium">From groups</h2>
          <div className="flex flex-col gap-3">
            {fromGroups.map((group) => (
              <div key={group.name}>
                <p className="mb-1.5 truncate text-caption text-muted-foreground">
                  {group.name}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {group.grants.map((g) => {
                    const t = targetOf(g)
                    const Icon = kindIcon[t.kind]
                    return (
                      <li
                        key={g.id}
                        className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-dashed border-input px-2.5 text-body-sm text-muted-foreground"
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">{t.name}</span>
                        <span className="shrink-0 text-caption">
                          {levelLabel(g.level)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

// Pick what someone can reach. Everything stays in `draft` until the page saves
// it. `inherited` are the grants of their groups, shown but not editable here.
export function AccessEditor({
  draft,
  inherited = [],
  aside,
}: {
  draft: AccessDraft
  inherited?: PanelGrant[]
  aside?: ReactNode
}) {
  const targets = useAccessTargets()
  const [sheetOpen, setSheetOpen] = useOpen("access-level")
  const [sheetKey, setSheetKey] = useState<string>()
  const sheetPick = sheetKey ? draft.picks.get(sheetKey) : undefined

  return (
    <EditorContext
      value={{
        draft,
        inherited,
        editLevel: (key) => {
          setSheetKey(key)
          setSheetOpen(true)
        },
      }}
    >
      <div className="grid items-start gap-6 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[calc(3rem+1px+--spacing(5))] lg:order-last lg:max-h-[calc(100dvh-3rem-1px-(--spacing(10)))] lg:overflow-y-auto">
          {aside}
          <Selected groups={targets.groups} />
        </aside>
        <Picker
          groups={targets.groups}
          pending={targets.pending}
          error={targets.error}
        />
      </div>
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Access level"
      >
        {sheetKey && sheetPick && (
          <LevelOptions
            targetKey={sheetKey}
            pick={sheetPick}
            onPicked={() => setSheetOpen(false)}
          />
        )}
      </BottomSheet>
    </EditorContext>
  )
}

// Stays in reach while the page scrolls: floating on desktop, a bar above the
// tab bar on phones. `alwaysOn` is for pages whose action counts with no changes.
export function AccessSaveBar({
  draft,
  extra = [],
  label,
  pendingLabel,
  pending,
  alwaysOn,
  onSave,
  onDiscard,
}: {
  draft: AccessDraft
  extra?: string[]
  label: string
  pendingLabel: string
  pending: boolean
  alwaysOn?: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const { added, changed, removed } = draft.summary
  const parts = [
    added > 0 && `${added} added`,
    changed > 0 && `${changed} changed`,
    removed > 0 && `${removed} removed`,
    ...extra,
  ].filter((part): part is string => !!part)
  const dirty = parts.length > 0

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  if (!dirty && !alwaysOn) return null
  return (
    <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t border-border bg-background px-4 py-2 md:bottom-6 md:mx-auto md:w-fit md:rounded-2xl md:border md:bg-card md:p-1.5 md:ps-4 md:shadow-md">
      <p
        role="status"
        className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"
      >
        {parts.join(" · ") || "No access chosen yet"}
      </p>
      {dirty && (
        <Button
          variant="ghost"
          className="max-md:h-11"
          disabled={pending}
          onClick={onDiscard}
        >
          Discard
        </Button>
      )}
      <Button className="max-md:h-11" disabled={pending} onClick={onSave}>
        {pending ? pendingLabel : label}
      </Button>
    </div>
  )
}
