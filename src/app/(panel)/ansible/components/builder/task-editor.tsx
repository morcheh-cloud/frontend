"use client"

import { BookOpen, ChevronDown, Replace, TriangleAlert } from "lucide-react"
import { type ReactNode, useDeferredValue, useId, useState } from "react"

import { SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { ModuleDoc, ModuleOption } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useModuleDoc } from "../../api"
import { ModuleIcon, plain } from "../modules/meta"
import { OptionField, wideField, YamlField } from "./fields"
import {
  type Args,
  type ModuleStep,
  type RawStep,
  type Step,
  shortName,
} from "./model"

// Task keywords worth a proper field; the rest go in "Other settings" YAML.
const settings: ModuleOption[] = [
  {
    name: "when",
    type: "raw",
    required: false,
    description: [
      'Run this task only when this condition is true, e.g. C(ansible_facts.os_family == "Debian"). No C({{ }}) needed.',
    ],
  },
  {
    name: "loop",
    type: "list",
    elements: "raw",
    required: false,
    description: [
      "Run the task once per item; use C({{ item }}) in the options. Or a variable: C({{ packages }}).",
    ],
  },
  {
    name: "become",
    type: "bool",
    required: false,
    description: ["Run as another user (root unless C(become_user) says)."],
  },
  {
    name: "become_user",
    type: "str",
    required: false,
    description: ["The user to become, e.g. C(postgres)."],
  },
  {
    name: "register",
    type: "str",
    required: false,
    description: [
      "Keep the task's result in this variable for later tasks, e.g. C(result).",
    ],
  },
  {
    name: "notify",
    type: "list",
    elements: "str",
    required: false,
    description: [
      "Handlers to run at the end of the play when this task changed something.",
    ],
  },
  {
    name: "ignore_errors",
    type: "bool",
    required: false,
    description: ["Carry on with the play even if this task fails."],
  },
  {
    name: "changed_when",
    type: "raw",
    required: false,
    description: [
      "When to report a change, e.g. C(false) for read-only commands, or C(\"'created' in result.stdout\").",
    ],
  },
  {
    name: "failed_when",
    type: "raw",
    required: false,
    description: ["When to treat the result as failed, e.g. C(result.rc > 1)."],
  },
  {
    name: "tags",
    type: "list",
    elements: "str",
    required: false,
    description: ["Labels to run or skip just some tasks (the run's Tags)."],
  },
  {
    name: "delegate_to",
    type: "str",
    required: false,
    description: ["Run this task on another host instead, e.g. C(localhost)."],
  },
  {
    name: "run_once",
    type: "bool",
    required: false,
    description: ["Run on the first server only, not on every one."],
  },
  {
    name: "no_log",
    type: "bool",
    required: false,
    description: ["Hide this task's values from the output (passwords)."],
  },
]
const settingNames = new Set(settings.map((s) => s.name))

// The key an option is written under in args: its name or one of its aliases.
function keyOf(o: ModuleOption, args: Args) {
  for (const k of [o.name, ...(o.aliases ?? [])]) if (k in args) return k
  return o.name
}

function put(obj: Args, key: string, value: unknown): Args {
  const next = { ...obj }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

// Splits a module's options into what shows up front (required, the usual
// ones, anything already set) and the rest.
export function splitOptions(doc: ModuleDoc, args: Args) {
  const set = (o: ModuleOption) => keyOf(o, args) in args
  // free_form only names the bare argument, which has its own box.
  const shown = (o: ModuleOption) => o.name !== "free_form" || set(o)
  const front: ModuleOption[] = []
  const add = (o: ModuleOption | undefined) => {
    if (o && !front.includes(o)) front.push(o)
  }
  for (const o of doc.options) if (o.required) add(o)
  for (const n of doc.main) add(doc.options.find((o) => o.name === n))
  for (const o of doc.options) if (set(o)) add(o)
  const rest = doc.options.filter((o) => !front.includes(o) && shown(o))
  const known = new Set(
    doc.options.flatMap((o) => [o.name, ...(o.aliases ?? [])]),
  )
  return { front, rest, known }
}

// What a task can't run without: shown on its card.
export function missingOptions(doc: ModuleDoc, step: ModuleStep) {
  const missing = doc.options
    .filter((o) => o.required && !(keyOf(o, step.args) in step.args))
    .map((o) => o.name)
  const empty = !step.free && Object.keys(step.args).length === 0
  return doc.free_form && empty ? ["command", ...missing] : missing
}

// Everything about one module task. `onDocs` / `onChangeModule` open layers
// the builder owns.
export function TaskEditor({
  step,
  onChange,
  onChangeModule,
  onDocs,
  handler,
}: {
  step: ModuleStep
  onChange: (step: ModuleStep) => void
  onChangeModule: () => void
  onDocs: (module: string) => void
  handler?: boolean
}) {
  const doc = useModuleDoc(step.module)
  const d = doc.data
  const nameId = useId()
  const setArg = (o: ModuleOption, v: unknown) =>
    onChange({ ...step, args: put(step.args, keyOf(o, step.args), v) })

  const split = d ? splitOptions(d, step.args) : undefined
  const extra = Object.fromEntries(
    Object.entries(step.args).filter(([k]) => !split?.known.has(k)),
  )
  const free = d?.free_form || step.free !== undefined

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-body-sm font-medium">
          {handler ? "Handler name" : "Task name"}
        </label>
        <Input
          id={nameId}
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          placeholder={
            handler
              ? "e.g. Restart nginx"
              : "What this step does, e.g. Install nginx"
          }
        />
        {handler && (
          <p className="text-caption text-ash">
            Tasks run it by listing this name under notify.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
        <ModuleIcon category={d?.category ?? "other"} className="bg-card" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-body-sm font-medium">
            {step.module}
          </p>
          <p className="truncate text-caption text-muted-foreground">
            {d ? plain(d.description) : doc.isError ? "Unknown module" : "…"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 md:h-8"
          onClick={() => onDocs(step.module)}
          disabled={!d}
        >
          <BookOpen />
          <span className="hidden sm:inline">Docs</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 md:h-8"
          onClick={onChangeModule}
        >
          <Replace />
          <span className="hidden sm:inline">Change</span>
        </Button>
      </div>

      {doc.isError && (
        <p className="flex gap-2 text-body-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            This module isn't installed on the Morcheh host, so its options
            can't be listed. Write them as YAML below; the run will fail if the
            servers' Ansible doesn't have it either.
          </span>
        </p>
      )}
      {d?.deprecated && (
        <p className="flex gap-2 text-body-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            This module is on its way out; see Docs for what replaces it.
          </span>
        </p>
      )}

      {free && (
        <FreeField
          value={step.free}
          onChange={(v) => onChange({ ...step, free: v })}
          module={shortName(step.module)}
        />
      )}

      {!d && !doc.isError ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : (
        split && (
          <>
            {split.front.length > 0 && (
              <Fields options={split.front} args={step.args} onSet={setArg} />
            )}
            {split.front.length === 0 && !free && (
              <p className="text-body-sm text-muted-foreground">
                {d?.options.length
                  ? "Nothing to fill in by default."
                  : "It takes no options."}
              </p>
            )}
            {split.rest.length > 0 && (
              <MoreOptions
                options={split.rest}
                args={step.args}
                onSet={setArg}
              />
            )}
          </>
        )
      )}

      {(doc.isError || Object.keys(extra).length > 0) && (
        <section className="flex flex-col gap-1.5">
          <h4 className="text-body-sm font-medium">
            {doc.isError ? "Options" : "Other options"}
          </h4>
          {!doc.isError && (
            <p className="text-caption text-ash">
              Not in this module's docs: check the spelling.
            </p>
          )}
          <YamlField
            value={Object.keys(extra).length ? extra : undefined}
            placeholder="name: value"
            onChange={(v) => {
              const known = Object.fromEntries(
                Object.entries(step.args).filter(([k]) => split?.known.has(k)),
              )
              const typed =
                v && typeof v === "object" && !Array.isArray(v)
                  ? (v as Args)
                  : {}
              onChange({ ...step, args: { ...known, ...typed } })
            }}
          />
        </section>
      )}

      <TaskSettings
        keywords={step.keywords}
        onChange={(keywords) => onChange({ ...step, keywords })}
        handler={handler}
      />
    </div>
  )
}

function FreeField({
  value,
  onChange,
  module,
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  module: string
}) {
  const id = useId()
  const label =
    module === "script"
      ? "Script"
      : module.startsWith("include") || module.startsWith("import")
        ? "File"
        : "Command"
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium">
        {label}
        <span className="ms-0.5 text-destructive" aria-hidden>
          *
        </span>
        <span className="sr-only"> (required)</span>
      </label>
      <Textarea
        id={id}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : e.target.value)
        }
        placeholder={
          module === "shell"
            ? "e.g. df -h | tail -n +2"
            : module === "command"
              ? "e.g. /usr/bin/uptime"
              : ""
        }
        rows={Math.min(10, Math.max(2, (value ?? "").split("\n").length))}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="font-mono text-caption md:text-caption"
      />
      {module === "command" && (
        <p className="text-caption text-ash">
          Runs without a shell: pipes, &gt; and $VARS need the shell module.
        </p>
      )}
    </div>
  )
}

function Fields({
  options,
  args,
  onSet,
}: {
  options: ModuleOption[]
  args: Args
  onSet: (o: ModuleOption, v: unknown) => void
}) {
  return (
    <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
      {options.map((o) => {
        const v = args[keyOf(o, args)]
        return (
          <div key={o.name} className={cn(wideField(o, v) && "lg:col-span-2")}>
            <OptionField option={o} value={v} onChange={(x) => onSet(o, x)} />
          </div>
        )
      })}
    </div>
  )
}

function Fold({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string
  hint?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-11 items-center gap-2 self-stretch rounded-lg text-start text-body-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            !open && "-rotate-90",
          )}
        />
        <span className="shrink-0">{title}</span>
        {hint && (
          <span className="min-w-0 truncate font-normal text-ash">{hint}</span>
        )}
      </button>
      {open && children}
    </section>
  )
}

function MoreOptions({
  options,
  args,
  onSet,
}: {
  options: ModuleOption[]
  args: Args
  onSet: (o: ModuleOption, v: unknown) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const needle = useDeferredValue(q.trim().toLowerCase())
  const shown = needle
    ? options.filter(
        (o) =>
          o.name.includes(needle) ||
          o.aliases?.some((a) => a.includes(needle)) ||
          o.description.some((d) => d.toLowerCase().includes(needle)),
      )
    : options
  return (
    <Fold
      title={`More options (${options.length})`}
      hint={
        open
          ? undefined
          : options
              .slice(0, 6)
              .map((o) => o.name)
              .join(", ")
      }
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      {options.length > 6 && (
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search options"
          label="Search options"
          className="md:w-full"
        />
      )}
      {shown.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No option matches.</p>
      ) : (
        <Fields options={shown} args={args} onSet={onSet} />
      )}
    </Fold>
  )
}

function TaskSettings({
  keywords,
  onChange,
  handler,
}: {
  keywords: Args
  onChange: (k: Args) => void
  handler?: boolean
}) {
  const used = Object.keys(keywords)
  const [open, setOpen] = useState(false)
  const shown = handler ? settings.filter((s) => s.name !== "notify") : settings
  const other = Object.fromEntries(
    Object.entries(keywords).filter(([k]) => !settingNames.has(k)),
  )
  return (
    <Fold
      title="Task settings"
      hint={
        used.length
          ? used.join(", ")
          : "conditions, loops, run as, register, notify…"
      }
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <Fields
        options={shown}
        args={keywords}
        onSet={(o, v) => onChange(put(keywords, o.name, v))}
      />
      <section className="flex flex-col gap-1.5">
        <h4 className="text-body-sm font-medium">Other settings</h4>
        <p className="text-caption text-ash">
          Any other task keyword as YAML, e.g. environment, retries, until,
          loop_control{handler ? ", listen" : ""}.
        </p>
        <YamlField
          value={Object.keys(other).length ? other : undefined}
          placeholder={"retries: 3\ndelay: 5"}
          onChange={(v) => {
            const kept = Object.fromEntries(
              Object.entries(keywords).filter(([k]) => settingNames.has(k)),
            )
            const typed =
              v && typeof v === "object" && !Array.isArray(v) ? (v as Args) : {}
            onChange({ ...kept, ...typed })
          }}
        />
      </section>
    </Fold>
  )
}

// A step the visual editor doesn't take apart (block, include with
// unusual keys…): edited as YAML.
export function RawStepEditor({
  step,
  onChange,
}: {
  step: RawStep
  onChange: (step: Step) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-muted-foreground">
        This step uses a form the visual editor doesn't take apart (a block, an
        action line…). Edit it as YAML here.
      </p>
      <YamlField
        value={step.value}
        onChange={(v) => onChange({ ...step, value: v })}
        rows={10}
      />
    </div>
  )
}
