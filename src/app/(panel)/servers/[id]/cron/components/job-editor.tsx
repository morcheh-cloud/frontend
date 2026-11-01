"use client"

import { Play, TriangleAlert } from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { fieldErrors } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Field } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useEditTable } from "../api"
import { useCronActions } from "./cron-actions"
import { envValue, type JobRow, runUsers, targets } from "./meta"
import type { RunRequest } from "./run-dialog"
import {
  type Builder,
  commandHints,
  describe,
  formatAt,
  fromBuilder,
  type Mode,
  minuteSteps,
  modes,
  nextRuns,
  presets,
  scheduleError,
  toBuilder,
  weekdays,
} from "./schedule"

export type JobEditorMode =
  | { kind: "new"; table?: string }
  | { kind: "edit"; row: JobRow }
  | { kind: "duplicate"; row: JobRow }

const FORM_ID = "cron-job-form"

// Add, edit or duplicate a job: a side sheet on desktop, a full-height sheet
// on phones. `round` changes on every open, starting the form afresh.
export function JobEditor({
  open,
  onOpenChange,
  mode,
  round,
  onRun,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: JobEditorMode
  round: number
  onRun: (req: RunRequest) => void
}) {
  const { phone } = useServerPage()
  const [pending, setPending] = useState(false)
  const title =
    mode.kind === "edit"
      ? "Edit job"
      : mode.kind === "duplicate"
        ? "Duplicate job"
        : "New job"
  const saveLabel = mode.kind === "edit" ? "Save" : "Add job"

  const form = (
    <JobForm
      key={round}
      mode={mode}
      phone={phone}
      onPending={setPending}
      onDone={() => onOpenChange(false)}
      onRun={onRun}
    />
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <span aria-hidden className="truncate text-body font-medium">
              {title}
            </span>
            <Button
              type="submit"
              form={FORM_ID}
              variant="ghost"
              disabled={pending}
              className="h-11 justify-self-end text-body text-brand"
            >
              {mode.kind === "edit" ? "Save" : "Add"}
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {form}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            Times are the server's clock. Changes are written straight to the
            crontab.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{form}</div>
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          <Button
            type="submit"
            form={FORM_ID}
            name="intent"
            value="test"
            variant="outline"
          >
            <Play />
            Test run
          </Button>
          <span className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {saveLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function initial(mode: JobEditorMode, defaultTable: string, login: string) {
  if (mode.kind === "new") {
    return {
      name: "",
      schedule: "0 3 * * *",
      command: "",
      table: mode.table ?? defaultTable,
      user: login,
      enabled: true,
    }
  }
  const r = mode.row
  return {
    name:
      mode.kind === "duplicate" && r.name ? `${r.name} (copy)` : r.name || "",
    schedule: r.schedule,
    command: r.command,
    table: r.table.id,
    user: r.user,
    enabled: mode.kind === "duplicate" ? true : r.enabled,
  }
}

function JobForm({
  mode,
  phone,
  onPending,
  onDone,
  onRun,
}: {
  mode: JobEditorMode
  phone: boolean
  onPending: (pending: boolean) => void
  onDone: () => void
  onRun: (req: RunRequest) => void
}) {
  const { server } = useServerPage()
  const { overview, clock } = useCronActions()
  const edit = useEditTable(server.id)
  const options = targets(overview)
  const login = overview.login_user
  const defaultTable =
    options.find((o) => o.value === "user:root")?.value ??
    options.find((o) => o.value === `user:${overview.login_user}`)?.value ??
    options[0]?.value ??
    `user:${overview.login_user}`
  const start = initial(mode, defaultTable, login)

  const [name, setName] = useState(start.name)
  const [builder, setBuilder] = useState<Builder>(() =>
    toBuilder(start.schedule),
  )
  const [command, setCommand] = useState(start.command)
  const [tableId, setTableId] = useState(start.table)
  const [user, setUser] = useState(start.user)
  const [enabled, setEnabled] = useState(start.enabled)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const table = overview.tables.find((t) => t.id === tableId)
  const system = table?.kind === "system"
  const schedule = fromBuilder(builder)
  const runAs = system ? user : tableId.replace(/^user:/, "")
  const mailto = table ? envValue(table, "MAILTO") : undefined
  const hints = commandHints(command, mailto)

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null
    const next: Record<string, string> = {}
    const se = scheduleError(schedule)
    if (se) next["job.schedule"] = se
    if (!command.trim()) next["job.command"] = "Enter a command"
    if (command.includes("\n")) {
      next["job.command"] =
        "Cron runs a single line. Put longer commands in a script."
    }
    if (submitter?.value === "test") {
      if (next["job.command"]) return setErrors(next)
      onRun({
        title: name || "Test run",
        command: command.trim(),
        user: runAs,
        table: table ? tableId : undefined,
      })
      return
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const job = {
      name: name.trim() || undefined,
      schedule,
      command: command.trim(),
      user: system ? user : undefined,
      enabled,
    }
    onPending(true)
    const done = {
      onSuccess: () => {
        toast.success(mode.kind === "edit" ? "Job saved" : "Job added")
        onDone()
      },
      onError: (err: Error) => {
        const fields = fieldErrors(err)
        setErrors(fields)
        if (Object.keys(fields).length === 0) toast.error(err.message)
      },
      onSettled: () => onPending(false),
    }
    if (mode.kind === "edit") {
      edit.mutate(
        {
          kind: "update",
          table: mode.row.table.id,
          revision: mode.row.table.revision,
          line: mode.row.line,
          job,
        },
        done,
      )
    } else {
      edit.mutate({ kind: "add", table: tableId, job }, done)
    }
  }

  return (
    <form
      id={FORM_ID}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          hint="Optional. Saved as a comment above the job."
          error={errors["job.name"]}
        >
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nightly backup"
              autoComplete="off"
              enterKeyHint="next"
            />
          )}
        </Field>
        <Field
          label="Command"
          error={errors["job.command"]}
          hint="Runs with sh from the user's home folder, with a minimal PATH."
        >
          {(p) => (
            <Textarea
              {...p}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1"
              rows={3}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-20 font-mono text-body-sm max-md:text-base"
            />
          )}
        </Field>
        {hints.length > 0 && (
          <ul className="-mt-2 flex flex-col gap-2">
            {hints.map((h) => (
              <li
                key={h.key}
                className="flex items-start gap-2 rounded-lg bg-subtle px-3 py-2 text-caption text-muted-foreground"
              >
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-ash" />
                <span className="min-w-0 flex-1">{h.text}</span>
                {h.fix && (
                  <button
                    type="button"
                    onClick={() => h.fix && setCommand(h.fix.apply(command))}
                    className="shrink-0 font-medium text-brand outline-none hover:text-brand-strong focus-visible:underline max-md:min-h-6"
                  >
                    {h.fix.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <ScheduleField
        builder={builder}
        onChange={setBuilder}
        error={errors["job.schedule"]}
        phone={phone}
        cronTz={table ? envValue(table, "CRON_TZ") : undefined}
        clockLabel={clock.label}
      />

      <Separator />

      <div className="flex flex-col gap-4">
        {mode.kind === "edit" ? (
          <Field label="Saved in">
            {(p) => (
              <Input
                {...p}
                readOnly
                value={
                  options.find((o) => o.value === tableId)?.label ??
                  mode.row.table.path
                }
                className="text-muted-foreground"
              />
            )}
          </Field>
        ) : (
          <Field label="Save in" error={errors.table}>
            {(p) => (
              <Choice
                id={p.id}
                phone={phone}
                value={tableId}
                onChange={(v) => {
                  setTableId(v)
                  const t = overview.tables.find((x) => x.id === v)
                  if (t?.kind === "system" && !user) setUser("root")
                }}
                items={options}
              />
            )}
          </Field>
        )}
        {system && (
          <Field
            label="Run as"
            hint="System tables name the user each job runs as."
            error={errors["job.user"]}
          >
            {(p) => (
              <Choice
                id={p.id}
                phone={phone}
                value={user}
                onChange={setUser}
                items={runUsers(overview.users).map((u) => ({
                  value: u.name,
                  label: u.uid === 0 ? `${u.name} (uid 0)` : u.name,
                }))}
              />
            )}
          </Field>
        )}
        {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch inside is the control */}
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 select-none">
          <span>
            <span className="block text-body-sm font-medium">Turned on</span>
            <span className="block text-caption text-muted-foreground">
              A job that is off stays in the crontab, commented out.
            </span>
          </span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>
      </div>

      {phone && (
        <Button
          type="submit"
          name="intent"
          value="test"
          variant="outline"
          size="lg"
        >
          <Play />
          Test run
        </Button>
      )}
    </form>
  )
}

// A native picker on phones, Base UI's select on desktop.
function Choice({
  id,
  phone,
  value,
  onChange,
  items,
}: {
  id?: string
  phone: boolean
  value: string
  onChange: (value: string) => void
  items: { value: string; label: string }[]
}) {
  if (phone) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v !== null && onChange(v)}
    >
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const pad = (n: number) => String(n).padStart(2, "0")

function TimeInput({
  b,
  onChange,
  label = "At",
}: {
  b: Builder
  onChange: (b: Builder) => void
  label?: string
}) {
  return (
    <Field label={label} className="w-36">
      {(p) => (
        <Input
          {...p}
          type="time"
          value={`${pad(b.hour)}:${pad(b.minute)}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number)
            if (Number.isFinite(h) && Number.isFinite(m)) {
              onChange({ ...b, hour: h, minute: m })
            }
          }}
          className="tabular-nums"
        />
      )}
    </Field>
  )
}

function ScheduleField({
  builder: b,
  onChange,
  error,
  phone,
  cronTz,
  clockLabel,
}: {
  builder: Builder
  onChange: (b: Builder) => void
  error?: string
  phone: boolean
  cronTz?: string
  clockLabel: string
}) {
  const { clock } = useCronActions()
  const schedule = fromBuilder(b)
  const problem =
    error ?? (b.mode === "custom" ? null : scheduleError(schedule))
  const customProblem = b.mode === "custom" ? scheduleError(schedule) : null
  const description = describe(schedule)
  const runs =
    problem || customProblem ? [] : nextRuns(schedule, clock, 3, cronTz)

  function setMode(mode: Mode) {
    // Switching to Custom starts from what the builder showed.
    onChange({ ...b, mode, custom: mode === "custom" ? schedule : b.custom })
  }

  let controls: ReactNode = null
  switch (b.mode) {
    case "minutes":
      controls = (
        <Field label="Every" className="w-44">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={String(b.every)}
              onChange={(v) => onChange({ ...b, every: Number(v) })}
              items={minuteSteps.map((n) => ({
                value: String(n),
                label: n === 1 ? "minute" : `${n} minutes`,
              }))}
            />
          )}
        </Field>
      )
      break
    case "hourly":
      controls = (
        <Field label="At minute" className="w-36">
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={b.minute}
              onChange={(e) =>
                onChange({
                  ...b,
                  minute: Math.min(
                    59,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className="tabular-nums"
            />
          )}
        </Field>
      )
      break
    case "daily":
      controls = <TimeInput b={b} onChange={onChange} />
      break
    case "weekly":
      controls = (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">On</span>
            <div className="grid grid-cols-7 gap-1 md:flex">
              {weekdays.map((d, i) => {
                const on = b.days.includes(i)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const days = on
                        ? b.days.filter((x) => x !== i)
                        : [...b.days, i]
                      if (days.length > 0) onChange({ ...b, days })
                    }}
                    className="h-11 rounded-lg border border-input text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-brand-soft aria-pressed:font-medium aria-pressed:text-brand-strong md:h-9 md:w-12"
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
          <TimeInput b={b} onChange={onChange} />
        </div>
      )
      break
    case "monthly":
      controls = (
        <div className="flex gap-3">
          <Field label="On day" className="w-28">
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={b.dom}
                onChange={(e) =>
                  onChange({
                    ...b,
                    dom: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                  })
                }
                className="tabular-nums"
              />
            )}
          </Field>
          <TimeInput b={b} onChange={onChange} />
        </div>
      )
      break
    case "custom":
      controls = (
        <div className="flex flex-col gap-3">
          <Field
            label="Expression"
            error={customProblem ?? undefined}
            hint="minute · hour · day of month · month · day of week"
          >
            {(p) => (
              <Input
                {...p}
                value={b.custom}
                onChange={(e) => onChange({ ...b, custom: e.target.value })}
                placeholder="*/15 * * * *"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.schedule}
                type="button"
                onClick={() => onChange({ ...b, custom: p.schedule })}
                className="h-9 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )
      break
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 text-body-sm font-medium">Schedule</legend>
      <Field label="Repeat">
        {(p) => (
          <Choice
            id={p.id}
            phone={phone}
            value={b.mode}
            onChange={(v) => setMode(v as Mode)}
            items={modes}
          />
        )}
      </Field>
      {controls}
      <div
        className={cn(
          "rounded-2xl border border-border bg-subtle px-4 py-3",
          (problem || customProblem) && "border-destructive/40",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <code className="font-mono text-body-sm font-medium">
            {schedule || "—"}
          </code>
          <span className="text-caption text-ash">{cronTz || clockLabel}</span>
        </div>
        {problem || customProblem ? (
          <p className="mt-1 text-caption text-destructive">
            {problem ?? customProblem}
          </p>
        ) : (
          <>
            {description && (
              <p className="mt-1 text-body-sm text-muted-foreground">
                {description}
              </p>
            )}
            {runs.length > 0 && (
              <ul className="mt-2 flex flex-col gap-0.5 text-caption text-muted-foreground tabular-nums">
                {runs.map((d, i) => (
                  <li key={d.toISOString()}>
                    <span className="text-ash">
                      {i === 0 ? "Next" : "Then"}
                    </span>{" "}
                    {formatAt(d, clock)}
                  </li>
                ))}
              </ul>
            )}
            {b.mode === "reboot" && (
              <p className="mt-2 text-caption text-ash">
                Runs once each time the cron daemon starts, usually at boot.
              </p>
            )}
          </>
        )}
      </div>
    </fieldset>
  )
}
