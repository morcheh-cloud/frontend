"use client"

import { type FormEvent, type ReactNode, useId, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  DockerContainer,
  DockerImage,
  DockerNetwork,
  DockerPruneBody,
  DockerVolume,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useConnectNetwork,
  useCreateNetwork,
  useCreateVolume,
  useDockerContainers,
  useDockerUsage,
  useKillContainer,
  usePrune,
  usePullImage,
  useRemoveContainer,
  useRemoveImage,
  useRemoveVolume,
  useRenameContainer,
  useTagImage,
} from "../api"
import { imageName, signals } from "./meta"

type Open = { open: boolean; onOpenChange: (open: boolean) => void }

// --- Small form pieces -----------------------------------------------------

function Footer({
  form,
  label,
  pending,
  destructive,
  onCancel,
}: {
  form: string
  label: string
  pending: boolean
  destructive?: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
      <Button
        type="button"
        variant="ghost"
        className="max-md:h-11"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={form}
        variant={destructive ? "destructive" : "default"}
        disabled={pending}
        className="max-md:h-11"
      >
        {pending ? "Working…" : label}
      </Button>
    </div>
  )
}

// A tick with a label and an optional line under it; the whole row is the
// target, 44px tall on phones.
export function Tick({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-2 md:min-h-0",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-body-sm">{label}</span>
        {hint && (
          <span className="text-caption text-muted-foreground">{hint}</span>
        )}
      </span>
    </label>
  )
}

type Option = { value: string; label: string }

export function Choice({
  id,
  items,
  value,
  onChange,
}: {
  id?: string
  items: Option[]
  value: string
  onChange: (value: string) => void
}) {
  const phone = useIsPhone()
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

const text = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

// "key=value" per line → a map; a line without "=" is a problem.
function parsePairs(value: string): Record<string, string> | string {
  const out: Record<string, string> = {}
  for (const raw of value.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const i = line.indexOf("=")
    if (i <= 0) return `"${line}" needs the form key=value`
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}

function failed(err: unknown, set: (e: Record<string, string>) => void) {
  const fields = fieldErrors(err)
  if (Object.keys(fields).length > 0) set(fields)
  else toast.error(err instanceof Error ? err.message : "That didn't work")
}

// --- Containers ------------------------------------------------------------

export function KillDialog({
  server,
  container,
  open,
  onOpenChange,
}: Open & { server: string; container: DockerContainer }) {
  const form = useId()
  const [signal, setSignal] = useState("SIGKILL")
  const kill = useKillContainer()
  function submit(e: FormEvent) {
    e.preventDefault()
    kill.mutate(
      { server, container: container.id, signal },
      {
        onSuccess: () => {
          toast.success(`Sent ${signal} to ${container.name}`)
          onOpenChange(false)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Send a signal to ${container.name}`}
      description="Kill sends a signal to the container's main process. SIGKILL ends it at once, without a chance to clean up."
      footer={
        <Footer
          form={form}
          label={`Send ${signal}`}
          pending={kill.isPending}
          destructive={signal === "SIGKILL"}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit}>
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">Signal</legend>
          {signals.map((s) => (
            <label
              key={s.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted has-checked:bg-brand-soft md:min-h-0"
            >
              <input
                type="radio"
                name="signal"
                value={s.value}
                checked={signal === s.value}
                onChange={() => setSignal(s.value)}
                className="accent-[var(--color-brand)]"
              />
              <span className="font-mono text-body-sm">{s.value}</span>
              <span className="ms-auto text-caption text-muted-foreground">
                {s.hint}
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </ResponsiveDialog>
  )
}

const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/

export function RenameDialog({
  server,
  container,
  open,
  onOpenChange,
}: Open & { server: string; container: DockerContainer }) {
  const form = useId()
  const [name, setName] = useState(container.name)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const rename = useRenameContainer()
  const problem =
    name && !NAME.test(name)
      ? "Letters, digits, _ . - only, starting with a letter or digit"
      : undefined
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name || problem || name === container.name) return
    rename.mutate(
      { server, container: container.id, name },
      {
        onSuccess: () => {
          toast.success(`Renamed to ${name}`)
          onOpenChange(false)
        },
        onError: (err) => failed(err, setErrors),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename container"
      description={
        container.project
          ? "It belongs to a compose project: compose finds it by its labels, but the next `up` may create one with the old name again."
          : undefined
      }
      footer={
        <Footer
          form={form}
          label="Rename"
          pending={rename.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit}>
        <Field label="Name" error={problem ?? errors.name}>
          {(p) => (
            <Input
              {...p}
              {...text}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}

export function RemoveContainersDialog({
  server,
  containers,
  open,
  onOpenChange,
  onDone,
}: Open & {
  server: string
  containers: DockerContainer[]
  onDone?: () => void
}) {
  const running = containers.filter((c) => c.state === "running").length
  const [force, setForce] = useState(running > 0)
  const [volumes, setVolumes] = useState(false)
  const [pending, setPending] = useState(false)
  const remove = useRemoveContainer()
  const one = containers.length === 1 ? containers[0] : null

  async function confirm() {
    setPending(true)
    let failures = 0
    for (const c of containers) {
      try {
        await remove.mutateAsync({ server, container: c.id, force, volumes })
      } catch (err) {
        failures++
        toast.error(`${c.name}: ${(err as Error).message}`)
      }
    }
    setPending(false)
    if (failures < containers.length) {
      toast.success(
        one ? `Removed ${one.name}` : `Removed ${containers.length - failures}`,
      )
      onDone?.()
    }
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        one ? `Remove ${one.name}?` : `Remove ${containers.length} containers?`
      }
      description="The container and its writable layer go. Named volumes stay unless you tick below; the image stays."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11"
            disabled={pending || (running > 0 && !force)}
            onClick={confirm}
          >
            {pending ? "Removing…" : "Remove"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col">
        {!one && (
          <ul className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-border px-3 py-2 font-mono text-caption">
            {containers.map((c) => (
              <li key={c.id} className="truncate">
                {c.name}
              </li>
            ))}
          </ul>
        )}
        <Tick
          checked={force}
          onChange={setForce}
          label="Stop it first if it's running"
          hint={
            running > 0
              ? `${running === 1 && one ? "It is" : `${running} are`} running: Docker refuses to remove a running container without this.`
              : "Nothing here is running."
          }
        />
        <Tick
          checked={volumes}
          onChange={setVolumes}
          label="Also remove its anonymous volumes"
          hint="Unnamed volumes created for it. Named volumes are never removed here."
        />
      </div>
    </ResponsiveDialog>
  )
}

// --- Images ----------------------------------------------------------------

export function PullDialog({
  server,
  initial = "",
  open,
  onOpenChange,
}: Open & { server: string; initial?: string }) {
  const form = useId()
  const [image, setImage] = useState(initial)
  const [platform, setPlatform] = useState("")
  const [more, setMore] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const pull = usePullImage()
  function submit(e: FormEvent) {
    e.preventDefault()
    const ref = image.trim()
    if (!ref) return setErrors({ image: "Name an image, like nginx:1.27" })
    pull.mutate(
      { server, image: ref, platform: platform.trim() || undefined },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => failed(err, setErrors),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pull an image"
      description="The server downloads it from its registry. It runs as a background task; you can close this."
      footer={
        <Footer
          form={form}
          label="Pull"
          pending={pull.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Image"
          hint="name[:tag] or a full reference. No tag = latest."
          error={errors.image}
        >
          {(p) => (
            <Input
              {...p}
              {...text}
              value={image}
              placeholder="nginx:1.27-alpine"
              onChange={(e) => setImage(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
        {more ? (
          <Field
            label="Platform"
            hint="Only for an image built for several: linux/amd64, linux/arm64…"
            error={errors.platform}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={platform}
                placeholder="linux/amd64"
                onChange={(e) => setPlatform(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setMore(true)}
            className="self-start text-body-sm text-brand hover:underline"
          >
            More options
          </button>
        )}
      </form>
    </ResponsiveDialog>
  )
}

export function TagDialog({
  server,
  image,
  open,
  onOpenChange,
}: Open & { server: string; image: DockerImage }) {
  const form = useId()
  const [repo, setRepo] = useState(
    image.tags[0] ? imageName(image.tags[0]).replace(/:[^:/]+$/, "") : "",
  )
  const [tag, setTag] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useTagImage()
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!repo.trim()) return setErrors({ repo: "Name a repository" })
    save.mutate(
      { server, image: image.id, repo: repo.trim(), tag: tag.trim() },
      {
        onSuccess: () => {
          toast.success(`Tagged ${repo.trim()}:${tag.trim() || "latest"}`)
          onOpenChange(false)
        },
        onError: (err) => failed(err, setErrors),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a tag"
      description="Another name for the same image. Nothing is copied."
      footer={
        <Footer
          form={form}
          label="Add tag"
          pending={save.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit} className="grid gap-4 md:grid-cols-3">
        <Field label="Repository" error={errors.repo} className="md:col-span-2">
          {(p) => (
            <Input
              {...p}
              {...text}
              value={repo}
              placeholder="registry.example.com/team/app"
              onChange={(e) => setRepo(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Tag" error={errors.tag}>
          {(p) => (
            <Input
              {...p}
              {...text}
              value={tag}
              placeholder="latest"
              onChange={(e) => setTag(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}

export function RemoveImageDialog({
  server,
  image,
  open,
  onOpenChange,
}: Open & { server: string; image: DockerImage }) {
  const [force, setForce] = useState(false)
  const remove = useRemoveImage()
  const name = image.tags[0] ? imageName(image.tags[0]) : image.id.slice(7, 19)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${name}?`}
      description={
        image.tags.length > 1
          ? `It has ${image.tags.length} tags; all of them go with it.`
          : "Pulling it again later downloads it again."
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(
                { server, image: image.id, force },
                {
                  onSuccess: () => {
                    toast.success(`Removed ${name}`)
                    onOpenChange(false)
                  },
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            {remove.isPending ? "Removing…" : "Remove"}
          </Button>
        </div>
      }
    >
      <Tick
        checked={force}
        onChange={setForce}
        label="Remove even if a stopped container uses it"
        hint={
          image.containers > 0
            ? `${image.containers} container${image.containers === 1 ? "" : "s"} use it. A running one always keeps it.`
            : "No container uses it."
        }
      />
    </ResponsiveDialog>
  )
}

// Several images at once, three at a time, one toast for the lot.
// Several volumes at once (the Volumes page's selection). Docker refuses a
// volume a container still uses, even stopped, so those are left out.
export function RemoveVolumesDialog({
  server,
  volumes,
  onDone,
  open,
  onOpenChange,
}: Open & { server: string; volumes: DockerVolume[]; onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState("")
  const remove = useRemoveVolume()
  const free = volumes.filter((v) => v.used_by.length === 0)
  const used = volumes.filter((v) => v.used_by.length > 0)
  const nameOf = (v: DockerVolume) =>
    v.anonymous ? v.name.slice(0, 12) : v.name
  const named = free.filter((v) => !v.anonymous).length
  const word = `remove ${free.length}`
  const ready = named === 0 || typed.trim().toLowerCase() === word

  async function run() {
    setBusy(true)
    const queue = [...free]
    const failed: string[] = []
    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, async () => {
        for (let v = queue.shift(); v; v = queue.shift()) {
          try {
            await remove.mutateAsync({ server, volume: v.name, force: false })
          } catch (err) {
            failed.push(`${nameOf(v)}: ${(err as Error).message}`)
          }
        }
      }),
    )
    setBusy(false)
    const ok = free.length - failed.length
    if (failed.length === 0)
      toast.success(`Removed ${ok} volume${ok === 1 ? "" : "s"}`)
    else
      toast.warning(`Removed ${ok} of ${free.length}`, {
        description: failed.slice(0, 3).join("\n"),
      })
    onDone?.()
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${free.length} volume${free.length === 1 ? "" : "s"}?`}
      description="Their data is deleted for good. Back up what you may need first."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11"
            disabled={busy || free.length === 0 || !ready}
            onClick={run}
          >
            {busy ? "Removing…" : `Remove ${free.length}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {free.length > 0 && (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {free.map((v) => (
              <li
                key={v.name}
                className="flex items-center gap-3 px-3 py-2 text-body-sm"
              >
                <span className="min-w-0 flex-1 truncate font-mono">
                  {nameOf(v)}
                </span>
                {v.project && (
                  <span className="text-caption text-muted-foreground">
                    {v.project}
                  </span>
                )}
                {v.size >= 0 && (
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {formatSize(v.size)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {used.length > 0 && (
          <p className="rounded-xl bg-warning/10 px-3 py-2 text-body-sm text-foreground">
            {used.length} in use {used.length === 1 ? "stays" : "stay"}:{" "}
            {used.map(nameOf).join(", ")}. Remove the containers using{" "}
            {used.length === 1 ? "it" : "them"} first.
          </p>
        )}
        {named > 0 && (
          <Field label={`Type "${word}" to confirm`}>
            {(p) => (
              <Input
                {...p}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Field>
        )}
      </div>
    </ResponsiveDialog>
  )
}

export function RemoveImagesDialog({
  server,
  images,
  onDone,
  open,
  onOpenChange,
}: Open & { server: string; images: DockerImage[]; onDone?: () => void }) {
  const [force, setForce] = useState(false)
  const [busy, setBusy] = useState(false)
  const remove = useRemoveImage()
  const used = images.filter((i) => i.containers > 0).length
  const size = images.reduce((n, i) => n + i.size, 0)
  const nameOf = (i: DockerImage) =>
    i.tags[0] ? imageName(i.tags[0]) : i.id.slice(7, 19)

  async function run() {
    setBusy(true)
    const queue = [...images]
    const failed: string[] = []
    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, async () => {
        for (let i = queue.shift(); i; i = queue.shift()) {
          try {
            await remove.mutateAsync({ server, image: i.id, force })
          } catch (err) {
            failed.push(`${nameOf(i)}: ${(err as Error).message}`)
          }
        }
      }),
    )
    setBusy(false)
    const ok = images.length - failed.length
    if (failed.length === 0) toast.success(`Removed ${ok} images`)
    else
      toast.warning(`Removed ${ok} of ${images.length}`, {
        description: failed.slice(0, 3).join("\n"),
      })
    onDone?.()
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${images.length} image${images.length === 1 ? "" : "s"}?`}
      description={`Up to ${formatSize(size)} back (layers shared with other images stay). Pulling them again later downloads them again.`}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11"
            disabled={busy}
            onClick={run}
          >
            {busy ? "Removing…" : `Remove ${images.length}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {images.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-3 px-3 py-2 text-body-sm"
            >
              <span className="min-w-0 flex-1 truncate font-mono">
                {nameOf(i)}
              </span>
              {i.containers > 0 && (
                <span className="text-caption text-warning">
                  {i.containers} using it
                </span>
              )}
              <span className="text-caption text-muted-foreground tabular-nums">
                {formatSize(i.size)}
              </span>
            </li>
          ))}
        </ul>
        {used > 0 && (
          <Tick
            checked={force}
            onChange={setForce}
            label="Remove even if a stopped container uses it"
            hint={`${used} of them ${used === 1 ? "is" : "are"} used by a container. A running one always keeps its image; Docker refuses that one and the rest go ahead.`}
          />
        )}
      </div>
    </ResponsiveDialog>
  )
}

// --- Volumes and networks --------------------------------------------------

export function NewVolumeDialog({
  server,
  open,
  onOpenChange,
}: Open & { server: string }) {
  const form = useId()
  const [name, setName] = useState("")
  const [driver, setDriver] = useState("local")
  const [options, setOptions] = useState("")
  const [labels, setLabels] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateVolume()
  function submit(e: FormEvent) {
    e.preventDefault()
    const opts = parsePairs(options)
    const labs = parsePairs(labels)
    if (typeof opts === "string") return setErrors({ options: opts })
    if (typeof labs === "string") return setErrors({ labels: labs })
    if (name && !NAME.test(name))
      return setErrors({ name: "Letters, digits, _ . - only" })
    create.mutate(
      {
        server,
        name: name.trim(),
        ...(driver.trim() && driver !== "local"
          ? { driver: driver.trim() }
          : {}),
        ...(Object.keys(opts).length ? { options: opts } : {}),
        ...(Object.keys(labs).length ? { labels: labs } : {}),
      },
      {
        onSuccess: (v) => {
          toast.success(`Created volume ${v.name}`)
          onOpenChange(false)
        },
        onError: (err) => failed(err, setErrors),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New volume"
      description="Storage that outlives containers. Mount it by name when you start one."
      className="sm:max-w-lg"
      footer={
        <Footer
          form={form}
          label="Create"
          pending={create.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Name"
          hint="Leave blank for a random name."
          error={errors.name}
        >
          {(p) => (
            <Input
              {...p}
              {...text}
              value={name}
              placeholder="app-data"
              onChange={(e) => setName(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Driver" error={errors.driver}>
          {(p) => (
            <Input
              {...p}
              {...text}
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Driver options"
          hint="key=value per line, e.g. type=nfs, o=addr=10.0.0.5,rw, device=:/export"
          error={errors.options}
        >
          {(p) => (
            <Textarea
              {...p}
              {...text}
              rows={3}
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="font-mono text-caption"
            />
          )}
        </Field>
        <Field label="Labels" hint="key=value per line" error={errors.labels}>
          {(p) => (
            <Textarea
              {...p}
              {...text}
              rows={2}
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="font-mono text-caption"
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}

const drivers: Option[] = [
  { value: "bridge", label: "bridge — containers on this server" },
  { value: "overlay", label: "overlay — across a swarm" },
  { value: "macvlan", label: "macvlan — own address on the LAN" },
  { value: "ipvlan", label: "ipvlan — shares the host's MAC" },
]

export function NewNetworkDialog({
  server,
  open,
  onOpenChange,
}: Open & { server: string }) {
  const form = useId()
  const [name, setName] = useState("")
  const [driver, setDriver] = useState("bridge")
  const [subnet, setSubnet] = useState("")
  const [gateway, setGateway] = useState("")
  const [range, setRange] = useState("")
  const [internal, setInternal] = useState(false)
  const [attachable, setAttachable] = useState(false)
  const [ipv6, setIpv6] = useState(false)
  const [parent, setParent] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateNetwork()
  const vlan = driver === "macvlan" || driver === "ipvlan"
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErrors({ name: "Name the network" })
    if (!NAME.test(name.trim()))
      return setErrors({ name: "Letters, digits, _ . - only" })
    if (gateway && !subnet)
      return setErrors({ gateway: "A gateway needs a subnet" })
    create.mutate(
      {
        server,
        name: name.trim(),
        driver,
        ...(subnet.trim() ? { subnet: subnet.trim() } : {}),
        ...(gateway.trim() ? { gateway: gateway.trim() } : {}),
        ...(range.trim() ? { ip_range: range.trim() } : {}),
        ...(internal ? { internal } : {}),
        ...(attachable ? { attachable } : {}),
        ...(ipv6 ? { ipv6 } : {}),
        ...(vlan && parent.trim()
          ? { options: { parent: parent.trim() } }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Created network ${name.trim()}`)
          onOpenChange(false)
        },
        onError: (err) => failed(err, setErrors),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New network"
      description="Containers on the same network reach each other by name."
      className="sm:max-w-lg"
      footer={
        <Footer
          form={form}
          label="Create"
          pending={create.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              {...text}
              value={name}
              placeholder="backend"
              onChange={(e) => setName(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Driver" error={errors.driver}>
          {(p) => (
            <Choice
              id={p.id}
              items={drivers}
              value={driver}
              onChange={setDriver}
            />
          )}
        </Field>
        {vlan && (
          <Field
            label="Parent interface"
            hint="The server's network card the containers ride on, e.g. eth0."
            error={errors["options.parent"]}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={parent}
                placeholder="eth0"
                onChange={(e) => setParent(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Subnet"
            hint="Blank = Docker picks one."
            error={errors.subnet}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={subnet}
                placeholder="172.30.0.0/24"
                onChange={(e) => setSubnet(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
          <Field label="Gateway" error={errors.gateway}>
            {(p) => (
              <Input
                {...p}
                {...text}
                value={gateway}
                placeholder="172.30.0.1"
                onChange={(e) => setGateway(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
        </div>
        {subnet && (
          <Field
            label="Hand out addresses from"
            hint="A smaller range inside the subnet, so fixed addresses outside it stay free."
            error={errors.ip_range}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={range}
                placeholder="172.30.0.128/25"
                onChange={(e) => setRange(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
        )}
        <div className="flex flex-col">
          <Tick
            checked={internal}
            onChange={setInternal}
            label="Internal"
            hint="No way out to the internet; containers only reach each other."
          />
          <Tick
            checked={attachable}
            onChange={setAttachable}
            label="Attachable"
            hint="Plain containers may join an overlay network too."
            disabled={driver !== "overlay"}
          />
          <Tick checked={ipv6} onChange={setIpv6} label="IPv6" />
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export function ConnectDialog({
  server,
  network,
  open,
  onOpenChange,
}: Open & { server: string; network: DockerNetwork }) {
  const form = useId()
  const list = useDockerContainers(server, open)
  const joined = new Set(network.containers.map((m) => m.id))
  const choices = (list.data ?? [])
    .filter((c) => !joined.has(c.id))
    .map((c) => ({ value: c.id, label: c.name }))
  const [container, setContainer] = useState("")
  const [aliases, setAliases] = useState("")
  const [ipv4, setIpv4] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const connect = useConnectNetwork()
  const picked = container || choices[0]?.value || ""
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!picked) return
    connect.mutate(
      {
        server,
        network: network.id,
        container: picked,
        aliases: aliases.split(/[\s,]+/).filter(Boolean),
        ipv4: ipv4.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Connected to ${network.name}`)
          onOpenChange(false)
        },
        onError: (err) => failed(err, setErrors),
      },
    )
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Connect a container to ${network.name}`}
      footer={
        <Footer
          form={form}
          label="Connect"
          pending={connect.isPending || !picked}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit} className="flex flex-col gap-4">
        {list.isPending ? (
          <p className="text-body-sm text-muted-foreground">Loading…</p>
        ) : choices.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            Every container on this server is already on it.
          </p>
        ) : (
          <Field label="Container" error={errors.container}>
            {(p) => (
              <Choice
                id={p.id}
                items={choices}
                value={picked}
                onChange={setContainer}
              />
            )}
          </Field>
        )}
        <Field
          label="Other names on this network"
          hint="Optional, separated by spaces."
          error={errors.aliases}
        >
          {(p) => (
            <Input
              {...p}
              {...text}
              value={aliases}
              placeholder="db primary"
              onChange={(e) => setAliases(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
        {network.subnets.length > 0 && (
          <Field
            label="Fixed address"
            hint={`Optional, inside ${network.subnets.map((s) => s.subnet).join(", ")}.`}
            error={errors.ipv4}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                inputMode="decimal"
                value={ipv4}
                onChange={(e) => setIpv4(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
        )}
      </form>
    </ResponsiveDialog>
  )
}

// --- Clean up --------------------------------------------------------------

export type PrunePreset = Partial<
  Pick<Required<DockerPruneBody>, "containers" | "networks" | "build_cache"> & {
    images: "none" | "dangling" | "all"
    volumes: "none" | "anonymous" | "all"
  }
>

export function PruneDialog({
  server,
  preset,
  open,
  onOpenChange,
}: Open & { server: string; preset?: PrunePreset }) {
  const usage = useDockerUsage(server, open)
  const u = usage.data
  const [containers, setContainers] = useState(preset?.containers ?? true)
  const [networks, setNetworks] = useState(preset?.networks ?? true)
  const [cache, setCache] = useState(preset?.build_cache ?? true)
  const [images, setImages] = useState(preset?.images ?? "dangling")
  const [volumes, setVolumes] = useState(preset?.volumes ?? "none")
  const prune = usePrune()
  const size = (n?: number) => (n ? `up to ${formatSize(n)}` : undefined)
  const nothing =
    !containers &&
    !networks &&
    !cache &&
    images === "none" &&
    volumes === "none"

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Clean up Docker"
      description="Removes what nothing uses. Runs as a background task."
      className="sm:max-w-lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11"
            disabled={prune.isPending || nothing}
            onClick={() =>
              prune.mutate(
                {
                  server,
                  containers,
                  networks,
                  build_cache: cache,
                  images,
                  volumes,
                },
                {
                  onSuccess: () => onOpenChange(false),
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            {prune.isPending ? "Starting…" : "Clean up"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <Tick
            checked={containers}
            onChange={setContainers}
            label="Stopped containers"
            hint={size(u?.containers.reclaimable)}
          />
          <Tick
            checked={networks}
            onChange={setNetworks}
            label="Networks no container uses"
          />
          <Tick
            checked={cache}
            onChange={setCache}
            label="Build cache"
            hint={size(u?.build_cache.reclaimable)}
          />
        </div>
        <Field
          label="Images"
          hint={
            images === "all"
              ? "Every image no container uses goes, tagged ones too: the next start pulls them again."
              : size(u?.images.reclaimable)
          }
        >
          {(p) => (
            <Choice
              id={p.id}
              value={images}
              onChange={(v) => setImages(v as typeof images)}
              items={[
                { value: "none", label: "Keep all" },
                { value: "dangling", label: "Untagged leftovers only" },
                { value: "all", label: "Every unused image" },
              ]}
            />
          )}
        </Field>
        <Field
          label="Volumes"
          hint={
            volumes === "all"
              ? "Data in every unused volume is deleted for good, named ones too."
              : volumes === "anonymous"
                ? "Unnamed volumes no container uses."
                : size(u?.volumes.reclaimable)
          }
        >
          {(p) => (
            <Choice
              id={p.id}
              value={volumes}
              onChange={(v) => setVolumes(v as typeof volumes)}
              items={[
                { value: "none", label: "Keep all" },
                { value: "anonymous", label: "Unused unnamed volumes" },
                { value: "all", label: "Every unused volume" },
              ]}
            />
          )}
        </Field>
        {volumes === "all" && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
            Volume data can't be brought back.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
