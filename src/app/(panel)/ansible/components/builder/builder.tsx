"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronDown,
  Code2,
  Copy,
  Ellipsis,
  FileWarning,
  GripVertical,
  Info,
  Layers,
  Plus,
  Trash2,
} from "lucide-react"
import { type ReactNode, useId, useState } from "react"

import {
  afterClose,
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { Module } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useModuleDoc, useModules } from "../../api"
import { ModuleIcon } from "../modules/meta"
import { ModuleDetailsLayer } from "../modules/module-details"
import { YamlField } from "./fields"
import {
  type Args,
  argsSummary,
  type Model,
  narrowedTo,
  newId,
  newPlay,
  newStep,
  type Parsed,
  type Play,
  parsePlaybook,
  printPlaybook,
  type RawPlay,
  type Step,
  shortName,
} from "./model"
import { ModulePicker } from "./module-picker"
import { missingOptions, RawStepEditor, TaskEditor } from "./task-editor"

type List = "tasks" | "handlers"
type Target = { play: string; list: List; replace?: string }

// Play keys with their own field; written first, in this order.
const playKeys = ["name", "hosts", "become", "gather_facts"]

function setPlayField(fields: Args, key: string, value: unknown): Args {
  const next: Args = {}
  const all = { ...fields, [key]: value }
  for (const k of playKeys) if (all[k] !== undefined) next[k] = all[k]
  for (const [k, v] of Object.entries(all)) {
    if (!playKeys.includes(k) && v !== undefined) next[k] = v
  }
  return next
}

function clone<T extends Step | Play | RawPlay>(x: T): T {
  const copy = structuredClone(x)
  copy.id = newId()
  if (copy.kind === "play") {
    copy.tasks = copy.tasks.map((s) => ({ ...s, id: newId() }))
    copy.handlers = copy.handlers.map((s) => ({ ...s, id: newId() }))
  }
  return copy
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list
  return arrayMove(list, from, to)
}

const stepTitle = (s: Step) =>
  s.kind === "raw"
    ? "Block or other step"
    : s.name.trim() || shortName(s.module)

// The playbook as plays and task cards. `value` (the YAML) stays the truth:
// it's parsed when it changes from outside, and every edit here writes it
// back with printPlaybook.
export function PlaybookBuilder({
  value,
  onChange,
  readOnly,
  phone,
  onYaml,
}: {
  value: string
  onChange: (text: string) => void
  readOnly: boolean
  phone: boolean
  /** Switch the editor to YAML (shown when the text doesn't parse). */
  onYaml: () => void
}) {
  const [state, setState] = useState<{ text: string; parsed: Parsed }>(() => ({
    text: value,
    parsed: parsePlaybook(value),
  }))
  if (state.text !== value) {
    setState({ text: value, parsed: parsePlaybook(value) })
  }

  const [expanded, setExpanded] = useState<string>()
  const [target, setTarget] = useState<Target>()
  const [picker, setPicker] = useOpen("ansible-builder-picker")
  const [docName, setDocName] = useState<string>()
  const [docs, setDocs] = useOpen("ansible-builder-docs")
  const [sheetStep, setSheetStep] = useState<{
    play: string
    list: List
    id: string
  }>()
  const [stepSheet, setStepSheet] = useOpen("ansible-builder-step")
  const modules = useModules()
  const categories = new Map(
    (modules.data?.items ?? []).flatMap((m) => [
      [m.name, m.category],
      [m.short_name, m.category],
    ]),
  )

  if (!state.parsed.ok) {
    return (
      <Empty
        icon={FileWarning}
        title="The YAML has a mistake"
        body={
          <>
            Fix it in YAML first, then come back.
            <span className="mt-2 block font-mono text-caption">
              {state.parsed.error.split("\n")[0]}
            </span>
          </>
        }
        action={
          <Button className="h-11 w-full md:h-9 md:w-auto" onClick={onYaml}>
            <Code2 />
            Edit in YAML
          </Button>
        }
      />
    )
  }
  const model = state.parsed.model
  const comments = state.parsed.comments

  const commit = (next: Model) => {
    if (readOnly) return
    const text = printPlaybook(next)
    setState({ text, parsed: { ok: true, model: next, comments: false } })
    onChange(text)
  }
  const updatePlay = (id: string, fn: (p: Play) => Play) =>
    commit(model.map((p) => (p.id === id && p.kind === "play" ? fn(p) : p)))
  const updateList = (play: string, list: List, fn: (s: Step[]) => Step[]) =>
    updatePlay(play, (p) => ({ ...p, [list]: fn(p[list]) }))
  const setStep = (play: string, list: List, step: Step) =>
    updateList(play, list, (l) => l.map((s) => (s.id === step.id ? step : s)))

  const openStep = (play: string, list: List, id: string) => {
    if (phone) {
      setSheetStep({ play, list, id })
      setStepSheet(true)
    } else {
      setExpanded((e) => (e === id ? undefined : id))
    }
  }

  const addTask = (play: string, list: List) => {
    setTarget({ play, list })
    setPicker(true)
  }
  const changeModule = (play: string, list: List, id: string) => {
    setTarget({ play, list, replace: id })
    setPicker(true)
  }
  const picked = (m: Module) => {
    const t = target
    if (!t) return
    if (t.replace) {
      const id = t.replace
      updateList(t.play, t.list, (l) =>
        l.map((s) =>
          s.id === id && s.kind === "module" ? { ...s, module: m.name } : s,
        ),
      )
      setPicker(false)
      return
    }
    const step = newStep(m.name)
    updateList(t.play, t.list, (l) => [...l, step])
    if (phone) {
      afterClose(setPicker, () => openStep(t.play, t.list, step.id))
    } else {
      setPicker(false)
      setExpanded(step.id)
    }
  }
  const showDocs = (name: string) => {
    setDocName(name)
    setDocs(true)
  }

  const sheetPlay = model.find((p) => p.id === sheetStep?.play)
  const sheetItem =
    sheetPlay?.kind === "play" && sheetStep
      ? sheetPlay[sheetStep.list].find((s) => s.id === sheetStep.id)
      : undefined

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {readOnly && (
        <Notice>
          Read-only: editing needs Engineer access to this workspace.
        </Notice>
      )}
      {comments && !readOnly && (
        <Notice>
          This playbook has YAML comments. A change made here rewrites the YAML
          without them; edit in YAML to keep them.
        </Notice>
      )}

      {model.length === 0 && (
        <Empty
          icon={Layers}
          title="Empty playbook"
          body="A playbook is one or more plays: which servers, then the tasks to run on them."
        />
      )}

      {model.map((p, i) => {
        const menu: Item[] = [
          {
            key: "up",
            label: "Move up",
            icon: <ArrowUp />,
            disabled: i === 0,
            onSelect: () => commit(move(model, i, i - 1)),
          },
          {
            key: "down",
            label: "Move down",
            icon: <ArrowDown />,
            disabled: i === model.length - 1,
            onSelect: () => commit(move(model, i, i + 1)),
          },
          {
            key: "dup",
            label: "Duplicate play",
            icon: <Copy />,
            onSelect: () =>
              commit([
                ...model.slice(0, i + 1),
                clone(p),
                ...model.slice(i + 1),
              ]),
          },
          {
            key: "remove",
            label: "Remove play",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => commit(model.filter((x) => x.id !== p.id)),
          },
        ]
        return p.kind === "raw" ? (
          <PlayShell
            key={p.id}
            index={i}
            title="Imported playbook or other entry"
            menu={readOnly ? [] : menu}
            phone={phone}
          >
            <p className="text-body-sm text-muted-foreground">
              The visual editor doesn't take this entry apart; edit it as YAML.
            </p>
            <YamlField
              value={p.value}
              onChange={(v) =>
                commit(
                  model.map((x) => (x.id === p.id ? { ...p, value: v } : x)),
                )
              }
              rows={8}
            />
          </PlayShell>
        ) : (
          <PlayCard
            key={p.id}
            index={i}
            play={p}
            menu={readOnly ? [] : menu}
            phone={phone}
            readOnly={readOnly}
            categories={categories}
            expanded={expanded}
            onFields={(fields) => updatePlay(p.id, (x) => ({ ...x, fields }))}
            onList={(list, fn) => updateList(p.id, list, fn)}
            onOpenStep={(list, id) => openStep(p.id, list, id)}
            onAdd={(list) => addTask(p.id, list)}
            editor={(list, s) =>
              s.kind === "raw" ? (
                <RawStepEditor
                  step={s}
                  onChange={(next) => setStep(p.id, list, next)}
                />
              ) : (
                <TaskEditor
                  step={s}
                  handler={list === "handlers"}
                  onChange={(next) => setStep(p.id, list, next)}
                  onChangeModule={() => changeModule(p.id, list, s.id)}
                  onDocs={showDocs}
                />
              )
            }
          />
        )
      })}

      {!readOnly && (
        <Button
          variant="outline"
          className={cn("h-11 md:h-9", phone ? "mx-4" : "self-start")}
          onClick={() => commit([...model, newPlay()])}
        >
          <Plus />
          {model.length ? "Add another play" : "Add a play"}
        </Button>
      )}

      <ModulePicker
        open={picker}
        onOpenChange={setPicker}
        phone={phone}
        onPick={picked}
        title={
          target?.replace
            ? "Change the module"
            : target?.list === "handlers"
              ? "Add a handler"
              : "Add a task"
        }
      />
      <ModuleDetailsLayer
        name={docName}
        open={docs}
        onOpenChange={setDocs}
        phone={phone}
      />
      {phone && (
        <BottomSheet
          open={stepSheet && !!sheetItem}
          onOpenChange={setStepSheet}
          title={sheetItem ? stepTitle(sheetItem) : "Task"}
          full
          footer={
            <Button className="h-11 w-full" onClick={() => setStepSheet(false)}>
              Done
            </Button>
          }
        >
          <div className="px-4 pb-4">
            {sheetItem &&
              sheetStep &&
              (sheetItem.kind === "raw" ? (
                <RawStepEditor
                  step={sheetItem}
                  onChange={(next) =>
                    setStep(sheetStep.play, sheetStep.list, next)
                  }
                />
              ) : (
                <TaskEditor
                  step={sheetItem}
                  handler={sheetStep.list === "handlers"}
                  onChange={(next) =>
                    setStep(sheetStep.play, sheetStep.list, next)
                  }
                  onChangeModule={() =>
                    changeModule(sheetStep.play, sheetStep.list, sheetItem.id)
                  }
                  onDocs={showDocs}
                />
              ))}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mx-4 flex gap-2 rounded-2xl bg-subtle p-3 text-body-sm text-muted-foreground md:mx-0">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function PlayShell({
  index,
  title,
  menu,
  phone,
  children,
}: {
  index: number
  title: ReactNode
  menu: Item[]
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 py-4",
        phone
          ? "border-y border-border px-4"
          : "rounded-2xl border border-border px-5",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-label text-caption tracking-label text-muted-foreground uppercase">
          Play {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-caption text-ash">
          {title}
        </span>
        <Menu items={menu} phone={phone} label="Play actions" />
      </div>
      {children}
    </section>
  )
}

// ⋯ on desktop, an action sheet on phones.
function Menu({
  items,
  phone,
  label,
}: {
  items: Item[]
  phone: boolean
  label: string
}) {
  const id = useId()
  const [open, setOpen] = useOpen(`ansible-builder-menu-${id}`)
  if (items.length === 0) return null
  if (!phone) return <ItemMenu groups={[items]} label={label} />
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Ellipsis />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={label} hideTitle>
        <SheetItems
          groups={[items.filter((x) => !x.disabled)]}
          onOpenChange={setOpen}
        />
      </BottomSheet>
    </>
  )
}

function PlayCard({
  index,
  play,
  menu,
  phone,
  readOnly,
  categories,
  expanded,
  onFields,
  onList,
  onOpenStep,
  onAdd,
  editor,
}: {
  index: number
  play: Play
  menu: Item[]
  phone: boolean
  readOnly: boolean
  categories: Map<string, string>
  expanded: string | undefined
  onFields: (fields: Args) => void
  onList: (list: List, fn: (s: Step[]) => Step[]) => void
  onOpenStep: (list: List, id: string) => void
  onAdd: (list: List) => void
  editor: (list: List, s: Step) => ReactNode
}) {
  const id = useId()
  const f = play.fields
  const set = (key: string, v: unknown) => onFields(setPlayField(f, key, v))
  const [more, setMore] = useState(false)
  const other = Object.fromEntries(
    Object.entries(f).filter(([k]) => !playKeys.includes(k) && k !== "vars"),
  )
  const narrowed = narrowedTo(f.hosts)
  // What's set behind the fold, so a closed section still says so.
  const moreSet = [
    f.become === true ? "run as root" : "",
    f.gather_facts === false ? "no facts" : "",
    f.vars !== undefined ? "vars" : "",
    ...Object.keys(other),
  ].filter(Boolean)
  const name = typeof f.name === "string" ? f.name : ""

  return (
    <PlayShell
      index={index}
      title={`${play.tasks.length} task${play.tasks.length === 1 ? "" : "s"}${
        play.handlers.length
          ? ` · ${play.handlers.length} handler${play.handlers.length === 1 ? "" : "s"}`
          : ""
      }`}
      menu={menu}
      phone={phone}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-name`} className="text-body-sm font-medium">
          Play name
        </label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => set("name", e.target.value || undefined)}
          placeholder="e.g. Set up the web servers"
        />
      </div>
      {narrowed !== null && (
        <div className="flex flex-col gap-2 rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            From the servers picked in a run, this play only takes{" "}
            <code className="font-mono text-foreground">{narrowed}</code>.
          </p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-11 shrink-0 md:h-8"
              onClick={() => set("hosts", "all")}
            >
              Run on all of them
            </Button>
          )}
        </div>
      )}
      <section className="flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
          className="flex min-h-11 items-center gap-2 self-start rounded-lg text-body-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", !more && "-rotate-90")}
          />
          More play settings
          {!more && moreSet.length > 0 && (
            <span className="font-normal text-ash">{moreSet.join(", ")}</span>
          )}
        </button>
        {more && (
          <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
            <div className="flex flex-wrap gap-x-6 gap-y-2 lg:col-span-2">
              <Toggle
                label="Run as root (become)"
                checked={f.become === true}
                onChange={(v) => set("become", v || undefined)}
                disabled={readOnly}
              />
              <Toggle
                label="Gather facts"
                checked={f.gather_facts !== false}
                onChange={(v) => set("gather_facts", v ? undefined : false)}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-body-sm font-medium">Variables (vars)</span>
              <YamlField
                value={f.vars}
                onChange={(v) => set("vars", v)}
                placeholder={"app_port: 8080\npackages:\n  - nginx"}
              />
              <p className="text-caption text-ash">
                Use them in tasks as{" "}
                <code className="font-mono">{"{{ app_port }}"}</code>.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-body-sm font-medium">Other settings</span>
              <YamlField
                value={Object.keys(other).length ? other : undefined}
                placeholder={"serial: 1\nbecome_user: deploy"}
                onChange={(v) => {
                  const typed =
                    v && typeof v === "object" && !Array.isArray(v)
                      ? (v as Args)
                      : {}
                  const kept: Args = {}
                  for (const k of [...playKeys, "vars"]) {
                    if (f[k] !== undefined) kept[k] = f[k]
                  }
                  onFields(setPlayField({ ...kept, ...typed }, "name", f.name))
                }}
              />
              <p className="text-caption text-ash">
                Any play keyword: serial, remote_user, pre_tasks, roles…
              </p>
            </div>
          </div>
        )}
      </section>

      <Steps
        title="Tasks"
        list="tasks"
        steps={play.tasks}
        phone={phone}
        readOnly={readOnly}
        categories={categories}
        expanded={expanded}
        onList={onList}
        onOpenStep={onOpenStep}
        onAdd={onAdd}
        editor={editor}
        empty="No tasks yet. Add the first one: install a package, copy a file, run a command…"
      />
      {(play.handlers.length > 0 || !readOnly) && (
        <Steps
          title="Handlers"
          list="handlers"
          steps={play.handlers}
          phone={phone}
          readOnly={readOnly}
          categories={categories}
          expanded={expanded}
          onList={onList}
          onOpenStep={onOpenStep}
          onAdd={onAdd}
          editor={editor}
          quiet
          empty="Tasks that run once at the end, only when a task notifies them (e.g. restart nginx after its config changed)."
        />
      )}
    </PlayShell>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the switch is inside
    <label className="flex min-h-11 items-center gap-2.5 text-body-sm md:min-h-8">
      <Switch
        checked={checked}
        onCheckedChange={(v) => onChange(v)}
        disabled={disabled}
      />
      {label}
    </label>
  )
}

function Steps({
  title,
  list,
  steps,
  phone,
  readOnly,
  categories,
  expanded,
  onList,
  onOpenStep,
  onAdd,
  editor,
  empty,
  quiet,
}: {
  title: string
  list: List
  steps: Step[]
  phone: boolean
  readOnly: boolean
  categories: Map<string, string>
  expanded: string | undefined
  onList: (list: List, fn: (s: Step[]) => Step[]) => void
  onOpenStep: (list: List, id: string) => void
  onAdd: (list: List) => void
  editor: (list: List, s: Step) => ReactNode
  empty: string
  quiet?: boolean
}) {
  // Mouse, not pointer: a finger would start a drag while scrolling; touch
  // waits for a long press on the grip.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = steps.findIndex((s) => s.id === e.active.id)
    const to = steps.findIndex((s) => s.id === e.over?.id)
    if (from >= 0 && to >= 0) onList(list, (l) => arrayMove(l, from, to))
  }
  const addLabel = list === "handlers" ? "Add handler" : "Add task"

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3
          className={cn(
            "text-body-sm font-medium",
            quiet && "text-muted-foreground",
          )}
        >
          {title}
        </h3>
        {quiet && <Bell className="size-3.5 text-ash" />}
      </div>
      {steps.length === 0 ? (
        <p className="text-caption text-ash">{empty}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <StepCard
                  key={s.id}
                  step={s}
                  index={i}
                  phone={phone}
                  readOnly={readOnly}
                  category={
                    s.kind === "module"
                      ? (categories.get(s.module) ?? "other")
                      : "flow"
                  }
                  open={!phone && expanded === s.id}
                  onOpen={() => onOpenStep(list, s.id)}
                  menu={
                    readOnly
                      ? []
                      : [
                          {
                            key: "up",
                            label: "Move up",
                            icon: <ArrowUp />,
                            disabled: i === 0,
                            onSelect: () =>
                              onList(list, (l) => move(l, i, i - 1)),
                          },
                          {
                            key: "down",
                            label: "Move down",
                            icon: <ArrowDown />,
                            disabled: i === steps.length - 1,
                            onSelect: () =>
                              onList(list, (l) => move(l, i, i + 1)),
                          },
                          {
                            key: "dup",
                            label: "Duplicate",
                            icon: <Copy />,
                            onSelect: () =>
                              onList(list, (l) => [
                                ...l.slice(0, i + 1),
                                clone(s),
                                ...l.slice(i + 1),
                              ]),
                          },
                          {
                            key: "remove",
                            label: "Remove",
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: () =>
                              onList(list, (l) =>
                                l.filter((x) => x.id !== s.id),
                              ),
                          },
                        ]
                  }
                >
                  {editor(list, s)}
                </StepCard>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {!readOnly && (
        <Button
          variant={quiet ? "ghost" : "outline"}
          size="sm"
          className={cn(
            "h-11 self-start md:h-8",
            quiet && "text-muted-foreground",
          )}
          onClick={() => onAdd(list)}
        >
          <Plus />
          {addLabel}
        </Button>
      )}
    </section>
  )
}

function StepCard({
  step,
  index,
  phone,
  readOnly,
  category,
  open,
  onOpen,
  menu,
  children,
}: {
  step: Step
  index: number
  phone: boolean
  readOnly: boolean
  category: string
  open: boolean
  onOpen: () => void
  menu: Item[]
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled: readOnly })
  const module = step.kind === "module" ? step : undefined
  const marks = module
    ? ["when", "loop", "become", "notify", "register"].filter(
        (k) => k in module.keywords,
      )
    : []
  const summary = module ? argsSummary(module) : ""
  const doc = useModuleDoc(module?.module)
  const missing = module && doc.data ? missingOptions(doc.data, module) : []
  // Fold an open task as soon as it's grabbed, before the drag measures: a
  // tall card's centre barely moves, so it would never pass its neighbours.
  const fold = () => {
    if (open && !phone) onOpen()
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "rounded-2xl border border-border bg-card",
        isDragging && "relative z-10 shadow-md",
        open && "border-mist",
      )}
    >
      <div className="flex items-center gap-1 pe-1">
        {!readOnly && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onMouseDownCapture={(e) => {
              if (e.button === 0) fold()
            }}
            onKeyDownCapture={(e) => {
              if (e.key === " " || e.key === "Enter") fold()
            }}
            aria-label={`Drag ${stepTitle(step)}`}
            className="flex h-14 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-s-2xl text-ash outline-none select-none [-webkit-touch-callout:none] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing md:h-12"
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <button
          type="button"
          aria-expanded={phone ? undefined : open}
          onClick={onOpen}
          className={cn(
            "flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-12",
            readOnly && "ps-3",
          )}
        >
          <ModuleIcon category={category} className="size-8" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-caption text-ash tabular-nums">
                {index + 1}
              </span>
              <span className="truncate text-body-sm font-medium">
                {stepTitle(step)}
              </span>
              {marks.length > 0 && (
                <span className="hidden shrink-0 text-caption text-ash sm:inline">
                  {marks.join(" · ")}
                </span>
              )}
            </span>
            <span className="truncate font-mono text-caption text-muted-foreground">
              {module
                ? `${shortName(module.module)}${summary ? `  ${summary}` : ""}`
                : "YAML"}
            </span>
            {missing.length > 0 && (
              <span className="truncate text-caption text-warning">
                Needs {missing.join(", ")}
              </span>
            )}
          </span>
          {!phone && (
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-ash transition-transform",
                !open && "-rotate-90",
              )}
            />
          )}
        </button>
        <Menu items={menu} phone={phone} label="Task actions" />
      </div>
      {open && (
        <div className="border-t border-border px-5 pt-4 pb-5">{children}</div>
      )}
    </li>
  )
}
