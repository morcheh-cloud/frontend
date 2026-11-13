"use client"

import { FileJson, Info, TriangleAlert, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Callout } from "../../cronjobs/components/editor-parts"
import {
  buildExport,
  type ImportContext,
  type ImportPlan,
  type Overrides,
  readImport,
  type Settings,
  type SettingsFile,
} from "./settings-model"

// Saves the stored settings as a JSON file.
export function downloadSettings(
  workspace: { name: string },
  settings: Settings,
  envs: SettingsFile["environments"],
) {
  const file = buildExport(settings, envs)
  const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], {
    type: "application/json",
  })
  const slug =
    workspace.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace"
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `docker-settings-${slug}-${file.exported_at.slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ImportPick = {
  workspace?: Overrides
  environments: { server_id: string; overrides: Overrides }[]
}

const count = (o: Overrides | undefined) => Object.keys(o ?? {}).length
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

// Reads a settings file (picked, dropped or pasted), shows what it holds and
// loads the ticked parts into the form; Save applies them.
export function ImportDialog({
  open,
  onOpenChange,
  context,
  onLoad,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: ImportContext
  onLoad: (pick: ImportPick) => void
}) {
  const [text, setText] = useState("")
  const [plan, setPlan] = useState<ImportPlan>()
  const [error, setError] = useState<string>()
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const reset = () => {
    setText("")
    setPlan(undefined)
    setError(undefined)
    setSkip(new Set())
  }
  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) setTimeout(reset, 200)
  }
  const read = (t: string) => {
    const r = readImport(t, context)
    if ("error" in r) {
      setError(r.error)
      setPlan(undefined)
      return
    }
    setError(undefined)
    setPlan(r)
    setSkip(new Set())
  }
  const readFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > 1024 * 1024) {
      setError("That file is too big for a settings file.")
      return
    }
    f.text().then(read)
  }
  const toggle = (id: string, on: boolean) =>
    setSkip((s) => {
      const n = new Set(s)
      if (on) n.delete(id)
      else n.add(id)
      return n
    })

  const wsCount = count(plan?.workspace)
  const ticked = plan
    ? (wsCount && !skip.has("") ? 1 : 0) +
      plan.environments.filter((e) => !skip.has(e.server_id)).length
    : 0

  const load = () => {
    if (!plan) return
    onLoad({
      workspace: wsCount && !skip.has("") ? plan.workspace : undefined,
      environments: plan.environments
        .filter((e) => !skip.has(e.server_id))
        .map((e) => ({ server_id: e.server_id, overrides: e.overrides })),
    })
    close(false)
  }

  const footer = plan ? (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" className="max-md:h-11" onClick={reset}>
        Another file
      </Button>
      <Button className="max-md:h-11" disabled={!ticked} onClick={load}>
        Load into the form
      </Button>
    </div>
  ) : (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        variant="outline"
        className="max-md:h-11"
        onClick={() => close(false)}
      >
        Cancel
      </Button>
      <Button
        className="max-md:h-11"
        disabled={!text.trim()}
        onClick={() => read(text)}
      >
        Read it
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title="Import settings"
      description="From a file exported here or in another workspace. Nothing changes until you save."
      footer={footer}
      className="sm:max-w-lg"
    >
      {!plan ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              readFile(e.dataTransfer.files[0])
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border border-dashed border-mist px-4 py-8 text-center transition-colors hover:bg-subtle",
              over && "border-brand bg-brand-soft",
            )}
          >
            <Upload className="size-5 text-ash" />
            <span className="text-body-sm font-medium">
              Choose a file{" "}
              <span className="font-normal text-muted-foreground max-md:hidden">
                or drop it here
              </span>
            </span>
            <span className="text-caption text-ash">
              docker-settings-….json
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              readFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <div className="flex items-center gap-3 text-caption text-ash">
            <span className="h-px flex-1 bg-border" />
            or paste it
            <span className="h-px flex-1 bg-border" />
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "kind": "morcheh.docker-settings", … }'
            className="min-h-28 font-mono text-caption"
            spellCheck={false}
            aria-label="Settings file text"
          />
          {error && (
            <p role="alert" className="text-caption text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-caption text-muted-foreground">
            <FileJson className="size-4 text-ash" />
            {plan.exportedAt
              ? `Exported ${new Date(plan.exportedAt).toLocaleString()}`
              : "A settings file"}
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {wsCount > 0 && (
              <Tick
                checked={!skip.has("")}
                onChange={(on) => toggle("", on)}
                title="Workspace settings"
                note={`${plural(wsCount, "setting")}; what the file leaves out stays as it is`}
              />
            )}
            {plan.environments.map((e) => (
              <Tick
                key={e.server_id}
                checked={!skip.has(e.server_id)}
                onChange={(on) => toggle(e.server_id, on)}
                title={e.server_name}
                note={[
                  count(e.overrides)
                    ? `${plural(count(e.overrides), "setting")} of its own`
                    : "Follows the workspace",
                  e.from.toLowerCase() !== e.server_name.toLowerCase() &&
                    `matched "${e.from}"`,
                  "replaces what it has now",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
            {wsCount === 0 && plan.environments.length === 0 && (
              <li className="px-3 py-4 text-body-sm text-muted-foreground">
                Nothing in this file applies here.
              </li>
            )}
          </ul>
          {plan.unmatched.length > 0 && (
            <Callout icon={<Info />}>
              No environment here matches{" "}
              {plan.unmatched.map((n) => `"${n}"`).join(", ")}; left out.
            </Callout>
          )}
          {plan.dropped.length > 0 && (
            <Callout icon={<TriangleAlert />} tone="warning">
              Left out {plan.dropped.join(" and ")}: pick this workspace&apos;s
              own after loading.
            </Callout>
          )}
        </div>
      )}
    </ResponsiveDialog>
  )
}

function Tick({
  checked,
  onChange,
  title,
  note,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  title: string
  note: string
}) {
  return (
    <li>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox renders the control inside */}
      <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-subtle has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <Checkbox checked={checked} onCheckedChange={(on) => onChange(on)} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body-sm font-medium">{title}</span>
          <span className="text-caption text-muted-foreground">{note}</span>
        </span>
      </label>
    </li>
  )
}
