"use client"

import { TriangleAlert } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import type { Fail2BanJail } from "@/lib/services"
import { Field } from "../../../components/fields"
import { afterClose } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useEdit } from "../api"
import { useF2bActions } from "./fail2ban-actions"
import {
  fileLabel,
  inheritedJail,
  inLocal,
  jailKeys,
  localValue,
  settingMeta,
} from "./meta"
import { diffSettings, SettingField, settingError } from "./setting-field"

const FORM_ID = "f2b-jail-form"
const NAME_RE = /^[A-Za-z0-9_.@-]{1,64}$/

// Add a jail, or change what jail.local says for one: a side sheet on
// desktop, a full-height sheet on phones. Remounted on every open.
export function JailEditor({
  open,
  onOpenChange,
  jail,
  isNew,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jail: Fail2BanJail | null
  isNew: boolean
}) {
  const { phone } = useServerPage()
  const [pending, setPending] = useState(false)
  const title = isNew ? "New jail" : (jail?.name ?? "Jail")
  if (!isNew && !jail) return null

  const form = (
    <JailForm
      jail={isNew ? null : jail}
      onPending={setPending}
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
              {isNew ? "Add" : "Save"}
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
            Saved to jail.local; fail2ban checks it and reloads. Empty fields
            inherit.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{form}</div>
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          <span className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {isNew ? "Add jail" : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function JailForm({
  jail,
  onPending,
  onDone,
}: {
  jail: Fail2BanJail | null
  onPending: (pending: boolean) => void
  onDone: () => void
}) {
  const { server } = useServerPage()
  const a = useF2bActions()
  const o = a.overview
  const edit = useEdit(server.id)
  const initial = Object.fromEntries(
    jailKeys.map((k) => [
      k,
      jail ? localValue(jail.origin, jail.settings, k) : "",
    ]),
  )
  const [name, setName] = useState("")
  const [enabled, setEnabled] = useState(jail ? jail.enabled : true)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const target = jail?.name ?? name.trim()
    if (!jail) {
      if (!NAME_RE.test(target) || target === "DEFAULT") {
        next.name = "Letters, digits and _ . @ - only"
      } else if (o.jails.some((j) => j.name === target)) {
        next.name = "A jail with this name exists; edit it instead"
      }
      if (!values.filter.trim()) next["set.filter"] = "Pick the filter to use"
    }
    for (const k of jailKeys) {
      const err = settingError(settingMeta[k], values[k])
      if (err) next[`set.${k}`] = err
    }
    setErrors(next)
    if (Object.keys(next).length) return

    const { set, unset, changed } = diffSettings(initial, values)
    if (!jail || enabled !== jail.enabled) {
      set.enabled = enabled ? "true" : "false"
    }
    if (jail && !changed && !("enabled" in set)) return onDone()

    setProblem(null)
    onPending(true)
    edit.mutate(
      { kind: "jail", jail: target, set, unset },
      {
        onSuccess: (fresh) => {
          const now = fresh.jails.find((j) => j.name === target)
          if (enabled && now && !now.active) {
            toast.warning(`${target} saved, but fail2ban didn't start it`, {
              description: "Check that its log files exist.",
            })
          } else {
            toast.success(jail ? `${target} saved` : `${target} added`)
          }
          onDone()
        },
        onError: (err) => {
          const f = fieldErrors(err)
          if (Object.keys(f).length) setErrors(f)
          setProblem(err.message)
        },
        onSettled: () => onPending(false),
      },
    )
  }

  const local = jail && inLocal(jail)

  return (
    <form
      id={FORM_ID}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6"
    >
      {problem && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl border border-border bg-subtle p-4 text-body-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="min-w-0 break-words whitespace-pre-wrap">{problem}</p>
        </div>
      )}

      {jail ? (
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
          <div>
            <dt className="text-caption text-ash">Defined in</dt>
            <dd className="mt-0.5 truncate font-mono text-caption">
              {fileLabel(jail.source)}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-ash">Watching</dt>
            <dd className="mt-0.5 truncate font-mono text-caption">
              {jail.status?.files.join(", ") ||
                jail.status?.journal_matches ||
                "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <Field
          label="Name"
          hint="Shown in bans and logs, e.g. nginx-login."
          error={errors.name}
        >
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-app"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="next"
            />
          )}
        </Field>
      )}

      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch inside is the control */}
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
        <span>
          <span className="block text-body-sm font-medium">Turned on</span>
          <span className="block text-caption text-muted-foreground">
            {jail && jail.enabled !== enabled
              ? "Changes when you save"
              : "fail2ban watches for this jail's failures"}
          </span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div className="flex flex-col gap-5">
        {jailKeys.map((k) => (
          <SettingField
            key={k}
            meta={settingMeta[k]}
            value={values[k]}
            inherited={inheritedJail(o, jail, k)}
            onChange={(v) => setValues((s) => ({ ...s, [k]: v }))}
            error={errors[`set.${k}`]}
            suggestions={
              k === "filter"
                ? o.filters
                : k === "banaction"
                  ? o.actions
                  : undefined
            }
          />
        ))}
      </div>

      {local && (
        <div className="flex flex-col gap-2 border-t border-border pt-5">
          <p className="text-body-sm text-muted-foreground">
            {jail.custom
              ? "This jail only exists in jail.local."
              : `jail.local changes some of what ${fileLabel(jail.source)} sets.`}
          </p>
          <Button
            type="button"
            variant="outline"
            className="self-start text-destructive max-md:h-11"
            onClick={() => afterClose(onDone, () => a.resetJail(jail))}
          >
            {jail.custom ? "Delete jail…" : "Reset to shipped settings…"}
          </Button>
        </div>
      )}
    </form>
  )
}
