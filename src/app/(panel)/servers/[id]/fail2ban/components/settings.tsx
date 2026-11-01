"use client"

import { FileCode, TriangleAlert } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { fieldErrors } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useServerPage } from "../../components/server-page"
import { useEdit } from "../api"
import { useF2bActions } from "./fail2ban-actions"
import {
  defaultKeys,
  fileLabel,
  inheritedDefault,
  JAIL_LOCAL,
  localValue,
  settingMeta,
} from "./meta"
import { diffSettings, SettingField, settingError } from "./setting-field"

// Sections of [DEFAULT], in the order people look for them.
const groups: { title: string; keys: readonly string[] }[] = [
  {
    title: "When to ban",
    keys: ["maxretry", "findtime", "bantime", "ignoreip"],
  },
  {
    title: "Repeat offenders",
    keys: ["bantime.increment", "bantime.factor", "bantime.maxtime"],
  },
  { title: "How", keys: ["banaction", "backend"] },
]

// [DEFAULT]: what every jail inherits unless it sets its own.
export function SettingsTab() {
  const a = useF2bActions()
  return (
    <>
      {/* Start over from the server's values whenever jail.local changes. */}
      <DefaultsForm key={a.overview.config.revision} />
      <Files />
    </>
  )
}

function DefaultsForm() {
  const { server, phone } = useServerPage()
  const a = useF2bActions()
  const o = a.overview
  const edit = useEdit(server.id)
  const initial = Object.fromEntries(
    defaultKeys.map((k) => [
      k,
      localValue(o.defaults.origin, o.defaults.settings, k),
    ]),
  )
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)
  const { set, unset, changed } = diffSettings(initial, values)
  const readOnly = o.access === "user"

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    for (const k of defaultKeys) {
      const err = settingError(settingMeta[k], values[k])
      if (err) next[`set.${k}`] = err
    }
    setErrors(next)
    if (Object.keys(next).length || !changed) return
    setProblem(null)
    edit.mutate(
      { kind: "defaults", set, unset },
      {
        onSuccess: () => toast.success("Defaults saved, fail2ban reloaded"),
        onError: (err) => {
          const f = fieldErrors(err)
          if (Object.keys(f).length) setErrors(f)
          setProblem(err.message)
        },
      },
    )
  }

  function discard() {
    setValues(initial)
    setErrors({})
    setProblem(null)
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 max-md:gap-0"
    >
      {problem && (
        <div
          role="alert"
          className="flex gap-3 p-4 text-body-sm max-md:mt-4 max-md:border-y max-md:border-border md:rounded-2xl md:border md:border-border md:bg-subtle"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="min-w-0 break-words whitespace-pre-wrap">{problem}</p>
        </div>
      )}
      {groups.map((g) => (
        <section
          key={g.title}
          className="max-md:mt-6 md:rounded-2xl md:border md:border-border md:p-6"
        >
          <h3 className="px-4 pb-3 font-label text-caption tracking-label text-muted-foreground uppercase md:px-0 md:pb-5">
            {g.title}
          </h3>
          <div className="grid gap-x-8 gap-y-6 max-md:border-y max-md:border-border max-md:px-4 max-md:py-5 md:grid-cols-2">
            {g.keys.map((k) => (
              <SettingField
                key={k}
                meta={settingMeta[k]}
                value={values[k]}
                inherited={inheritedDefault(o, k)}
                onChange={(v) => setValues((s) => ({ ...s, [k]: v }))}
                error={errors[`set.${k}`]}
                suggestions={k === "banaction" ? o.actions : undefined}
              />
            ))}
          </div>
        </section>
      ))}
      {!readOnly && (
        <div
          className={cn(
            "sticky z-30 flex items-center gap-2 border-border bg-card",
            "max-md:bottom-[calc(--spacing(16)+1px+env(safe-area-inset-bottom))] max-md:mt-6 max-md:border-y max-md:px-4 max-md:py-3",
            "md:bottom-6 md:mx-auto md:w-fit md:rounded-2xl md:border md:p-1.5 md:shadow-md",
            !changed && "hidden",
          )}
        >
          <span className="flex-1 px-3 text-body-sm text-muted-foreground md:flex-none">
            Unsaved changes
          </span>
          <Button
            type="button"
            variant="ghost"
            size={phone ? "default" : "sm"}
            className="max-md:h-11"
            onClick={discard}
          >
            Discard
          </Button>
          <Button
            type="submit"
            size={phone ? "default" : "sm"}
            className="max-md:h-11"
            disabled={edit.isPending}
          >
            {edit.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </form>
  )
}

// The files fail2ban reads, and the way to edit jail.local by hand.
function Files() {
  const a = useF2bActions()
  const o = a.overview
  return (
    <section className="max-md:mt-6 md:rounded-2xl md:border md:border-border md:p-6">
      <div className="flex items-end justify-between gap-3 px-4 pb-3 md:px-0 md:pb-4">
        <div>
          <h3 className="font-label text-caption tracking-label text-muted-foreground uppercase">
            Files
          </h3>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Read in this order; a later file wins. Changes made here go to
            jail.local.
          </p>
        </div>
        {o.access !== "user" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 max-md:hidden"
            onClick={() => a.editConfig()}
          >
            <FileCode />
            Edit jail.local
          </Button>
        )}
      </div>
      <ol className="divide-y divide-border border-border max-md:border-y md:rounded-lg md:border">
        {o.files.map((f, i) => (
          <li
            key={f}
            className="flex min-h-11 items-center gap-3 px-4 py-2 font-mono text-caption"
          >
            <span className="w-5 shrink-0 font-sans text-ash tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{fileLabel(f)}</span>
            {f === JAIL_LOCAL && (
              <span className="shrink-0 font-sans text-ash">Yours</span>
            )}
          </li>
        ))}
        {!o.files.includes(JAIL_LOCAL) && (
          <li className="flex min-h-11 items-center gap-3 px-4 py-2 font-mono text-caption text-ash">
            <span className="w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">jail.local</span>
            <span className="shrink-0 font-sans">Created on first save</span>
          </li>
        )}
      </ol>
      {o.access !== "user" && (
        <div className="px-4 pt-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => a.editConfig()}
          >
            <FileCode />
            Edit jail.local as text
          </Button>
        </div>
      )}
    </section>
  )
}
