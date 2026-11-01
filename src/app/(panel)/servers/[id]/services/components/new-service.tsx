"use client"

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
import { Textarea } from "@/components/ui/textarea"
import { fieldErrors } from "@/lib/api"
import type { Service } from "@/lib/services"
import { Field, Segmented } from "../../../components/fields"
import { IniEditor } from "../../components/ini-editor"
import { afterClose } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { Problem, ToggleRow } from "../../users/components/fields"
import { useCreateService } from "../api"
import {
  type NewService,
  restartPolicies,
  UNIT_NAME_RE,
  unitText,
} from "./meta"
import { useServicesActions } from "./services-actions"

const FORM_ID = "services-new"

// A new systemd service in /etc/systemd/system: from a short form, or as a
// whole unit file. Remounted on every open.
export function NewServiceEditor({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (s: Service) => void
}) {
  const { phone } = useServerPage()
  const [pending, setPending] = useState(false)
  const title = "New service"
  const form = (
    <NewServiceForm
      onPending={setPending}
      onDone={(s) =>
        s ? afterClose(onOpenChange, () => onCreated(s)) : onOpenChange(false)
      }
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
              {pending ? "Adding…" : "Add"}
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
            Runs a program as a systemd service: started at boot, restarted when
            it fails, logged to the journal.
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
            {pending ? "Adding…" : "Add service"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function NewServiceForm({
  onPending,
  onDone,
}: {
  onPending: (pending: boolean) => void
  onDone: (s: Service | null) => void
}) {
  const { server } = useServerPage()
  const a = useServicesActions()
  const create = useCreateService(server.id)
  const [name, setName] = useState("")
  const [v, setV] = useState<NewService>({
    description: "",
    command: "",
    user: "",
    directory: "",
    restart: "on-failure",
    environment: "",
  })
  // Once edited by hand, the unit file is what's sent; the form is put away.
  const [raw, setRaw] = useState<string | null>(null)
  const [enable, setEnable] = useState(true)
  const [start, setStart] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)

  const set = <K extends keyof NewService>(k: K, value: NewService[K]) =>
    setV((prev) => ({ ...prev, [k]: value }))
  const content = raw ?? unitText(v)

  function submit(e: FormEvent) {
    e.preventDefault()
    const unit = name.trim().replace(/\.service$/, "")
    const errs: Record<string, string> = {}
    if (!unit) errs.name = "Give it a name."
    else if (!UNIT_NAME_RE.test(unit))
      errs.name = "Letters, digits and : _ . - only."
    else if (a.overview.services.some((s) => s.name === `${unit}.service`))
      errs.name = `${unit}.service already exists.`
    if (raw === null && !v.command.trim()) errs.command = "What should it run?"
    setErrors(errs)
    setProblem(null)
    if (Object.keys(errs).length) return

    onPending(true)
    create.mutate(
      { name: unit, content, enable, start },
      {
        onSuccess: (s) => {
          toast.success(start ? `${unit} added and started` : `${unit} added`)
          onDone(s)
        },
        onError: (err) => {
          onPending(false)
          // It was written; only starting it failed.
          if (err.status === 422 && err.message.startsWith("Added ")) {
            toast.error(err.message)
            onDone(null)
            return
          }
          const fields = fieldErrors(err)
          if (fields.name) setErrors({ name: fields.name })
          else setProblem(err.message)
        },
      },
    )
  }

  return (
    <form
      id={FORM_ID}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6"
    >
      {problem && <Problem>{problem}</Problem>}

      <Field
        label="Name"
        hint="Becomes <name>.service in /etc/systemd/system."
        error={errors.name}
      >
        {(p) => (
          <Input
            {...p}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="myapp"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
      </Field>

      {raw === null ? (
        <>
          <Field label="Description">
            {(p) => (
              <Input
                {...p}
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="My app's API server"
              />
            )}
          </Field>
          <Field
            label="Command"
            hint="The program and its arguments; a full path is safest. It should stay in the foreground."
            error={errors.command}
          >
            {(p) => (
              <Input
                {...p}
                value={v.command}
                onChange={(e) => set("command", e.target.value)}
                placeholder="/usr/bin/node /srv/myapp/server.js"
                className="font-mono"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Run as" hint="Empty runs it as root.">
              {(p) => (
                <Input
                  {...p}
                  value={v.user}
                  onChange={(e) => set("user", e.target.value)}
                  placeholder="www-data"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              )}
            </Field>
            <Field label="Working folder">
              {(p) => (
                <Input
                  {...p}
                  value={v.directory}
                  onChange={(e) => set("directory", e.target.value)}
                  placeholder="/srv/myapp"
                  className="font-mono"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              )}
            </Field>
          </div>
          <Field label="Restart it">
            {() => (
              <Segmented
                label="Restart it"
                value={v.restart}
                onChange={(r) => set("restart", r)}
                options={[...restartPolicies]}
              />
            )}
          </Field>
          <Field label="Environment" hint="One KEY=value per line.">
            {(p) => (
              <Textarea
                {...p}
                value={v.environment}
                onChange={(e) => set("environment", e.target.value)}
                placeholder={"NODE_ENV=production\nPORT=8080"}
                rows={3}
                className="font-mono"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-sm font-medium">Unit file</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRaw(raw === null ? content : null)}
          >
            {raw === null ? "Edit by hand" : "Back to the form"}
          </Button>
        </div>
        <div className="flex h-72 flex-col overflow-hidden rounded-lg border border-input">
          {raw === null ? (
            <IniEditor readOnly value={content} />
          ) : (
            <IniEditor value={raw} onChange={setRaw} />
          )}
        </div>
        <p className="text-caption text-muted-foreground">
          {raw === null
            ? "Made from the form. Edit by hand for anything it doesn't cover (Type=forking, limits, sandboxing…)."
            : "Sent as written. Going back to the form drops these edits. systemd-analyze checks it before it's kept."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleRow
          label="Start at boot"
          hint="systemctl enable"
          checked={enable}
          onChange={setEnable}
        />
        <ToggleRow label="Start it now" checked={start} onChange={setStart} />
      </div>
    </form>
  )
}
