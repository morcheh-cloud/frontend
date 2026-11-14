"use client"

import { type FormEvent, useCallback, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import type { CloudServer } from "@/lib/services"
import { type PowerAction, useCloudPower, useRenameCloudServer } from "../api"
import { serverNamePattern } from "./meta"

const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

export const powerMeta: Record<
  PowerAction,
  {
    label: string
    title: (name: string) => string
    body: string
    done: string
    // Ask for the server's name before doing it.
    typeName: boolean
  }
> = {
  on: {
    label: "Turn on",
    title: (n) => `Turn on ${n}?`,
    body: "The provider starts it; it takes a minute or so to come up.",
    done: "Turning on",
    typeName: false,
  },
  off: {
    label: "Turn off",
    title: (n) => `Turn off ${n}?`,
    body: "Everything running on it stops and its sites and services go down until it's turned on again. Its disks and addresses stay.",
    done: "Turning off",
    typeName: true,
  },
  reboot: {
    label: "Restart",
    title: (n) => `Restart ${n}?`,
    body: "Everything running on it stops for a minute or two while it starts again.",
    done: "Restarting",
    typeName: true,
  },
}

export function PowerDialog({
  open,
  onOpenChange,
  server,
  action,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: CloudServer
  action: PowerAction
}) {
  const power = useCloudPower()
  const meta = powerMeta[action]
  const [typed, setTyped] = useState("")
  const focus = useCallback(focusOnPointer, [])
  const ready = !meta.typeName || typed.trim() === server.name

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    power.mutate(
      { server, action },
      {
        onSuccess: (s) => {
          toast.success(`${meta.done} ${s.name}`, {
            description: "The list follows it until it's done.",
          })
          onOpenChange(false)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={meta.title(server.name)}
      description={`${server.account_name} · ${server.region_name || server.region}`}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="cloud-power"
            variant={action === "on" ? "default" : "destructive"}
            disabled={!ready || power.isPending}
            className="max-md:h-11"
          >
            {meta.label}
          </Button>
        </>
      }
    >
      <form
        id="cloud-power"
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4"
      >
        <p className="text-body-sm text-muted-foreground">{meta.body}</p>
        {meta.typeName && (
          <Field
            label={`Type ${server.name} to confirm`}
            hint="This is a real server at your provider."
          >
            {(p) => (
              <Input
                {...p}
                ref={focus}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={server.name}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
              />
            )}
          </Field>
        )}
      </form>
    </ResponsiveDialog>
  )
}

export function RenameDialog({
  open,
  onOpenChange,
  server,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: CloudServer
}) {
  const rename = useRenameCloudServer()
  const [name, setName] = useState(server.name)
  const [error, setError] = useState("")
  const focus = useCallback((el: HTMLInputElement | null) => {
    if (el && matchMedia("(pointer: fine)").matches) {
      el.focus()
      el.select()
    }
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const next = name.trim()
    if (!next) return setError("Give it a name")
    if (next.length > 63) return setError("At most 63 characters")
    if (!serverNamePattern.test(next)) {
      return setError(
        "Letters, digits, dots and dashes only, starting with a letter or digit",
      )
    }
    if (next === server.name) return onOpenChange(false)
    rename.mutate(
      { server, name: next },
      {
        onSuccess: (s) => {
          toast.success(`Renamed to ${s.name}`)
          onOpenChange(false)
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          setError(fields.name ?? Object.values(fields)[0] ?? "")
          if (!Object.keys(fields).length) toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Rename ${server.name}`}
      description="Changes the name at the provider. Servers added to Morche keep their own name."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="cloud-rename"
            disabled={rename.isPending}
            className="max-md:h-11"
          >
            Rename
          </Button>
        </>
      }
    >
      <form id="cloud-rename" onSubmit={submit} noValidate>
        <Field label="Name" error={error}>
          {(p) => (
            <Input
              {...p}
              ref={focus}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="font-mono"
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}
