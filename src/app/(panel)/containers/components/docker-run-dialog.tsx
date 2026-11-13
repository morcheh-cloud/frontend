"use client"

import { Info, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { YamlEditor } from "@/app/(panel)/ansible/components/yaml-editor"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { addServices, parseDockerRun } from "./docker-run"
import { parseEnv, setEnv } from "./env-vars"

const EXAMPLE = `docker run -d --name web \\
  -p 8080:80 \\
  -v web-data:/usr/share/nginx/html \\
  -e TZ=UTC \\
  --restart unless-stopped \\
  nginx:alpine`

// Paste one or more `docker run` commands, see the compose services they make
// and add them to the file (or, with `replace`, use them as the whole file).
export function DockerRunDialog({
  open,
  onOpenChange,
  initial = "",
  replace = false,
  compose,
  env,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: string
  replace?: boolean
  compose: string
  env: string
  onApply: (compose: string, env: string, added: string[]) => void
}) {
  const [text, setText] = useState(initial)
  const [envToFile, setEnvToFile] = useState(true)
  const [external, setExternal] = useState(false)
  const parsed = parseDockerRun(text)
  const values = parseEnv(env)
  const options = { envToFile, externalVolumes: external }
  // The preview shows only what's added; the real merge keeps the file.
  const preview = addServices("", parsed, options, values)
  const count = parsed.services.length
  const hasEnv = parsed.services.some((s) => s.env.length > 0)
  const hasVolumes = parsed.services.some((s) => s.volumes.length > 0)

  const apply = () => {
    const res = addServices(replace ? "" : compose, parsed, options, values)
    const nextEnv = res.env.length > 0 ? setEnv(env, res.env) : env
    onApply(res.compose, nextEnv, res.added)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Convert docker run"
      description="Paste one or more docker run commands: each becomes a service."
      className="sm:max-w-4xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={count === 0}>
            {replace || !compose.trim()
              ? "Use as compose.yaml"
              : count > 1
                ? `Add ${count} services`
                : "Add the service"}
          </Button>
        </>
      }
    >
      <div className="grid min-w-0 gap-5 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <label htmlFor="docker-run-text" className="sr-only">
            docker run commands
          </label>
          <Textarea
            id="docker-run-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="min-h-48 font-mono text-caption md:min-h-72 md:text-caption"
          />
          {hasEnv && (
            <Choice
              id="docker-run-env"
              checked={envToFile}
              onChange={setEnvToFile}
              title="Put environment values in .env"
              body="The service reads ${NAME}; the values go to .env, where they're easy to change and kept out of the compose file."
            />
          )}
          {hasVolumes && (
            <Choice
              id="docker-run-external"
              checked={external}
              onChange={setExternal}
              title="Use the volumes that already exist"
              body="Marks the named volumes external: compose uses the ones the old container wrote to instead of making new ones named after the project."
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-border [contain:inline-size]">
            {count > 0 ? (
              <YamlEditor
                kind="compose"
                value={preview.compose}
                readOnly
                height="18rem"
              />
            ) : (
              <p className="flex h-48 items-center justify-center px-6 text-center text-body-sm text-muted-foreground md:h-72">
                The compose services show here as you paste.
              </p>
            )}
          </div>
          {preview.env.length > 0 && (
            <p className="text-caption text-muted-foreground">
              Adds to .env:{" "}
              {preview.env.map(([k], i) => (
                <span key={k}>
                  {i > 0 && ", "}
                  <code className="text-foreground">{k}</code>
                </span>
              ))}
            </p>
          )}
          <Notes
            tone="destructive"
            title="Couldn't read"
            items={parsed.problems}
          />
          <Notes
            tone="warning"
            title="Left out (no compose equivalent)"
            items={parsed.skipped}
            mono
          />
          <Notes tone="muted" title="Worth knowing" items={parsed.notes} />
        </div>
      </div>
    </ResponsiveDialog>
  )
}

function Choice({
  id,
  checked,
  onChange,
  title,
  body,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
      <label htmlFor={id} className="flex flex-col">
        <span className="text-body-sm font-medium">{title}</span>
        <span className="text-caption text-muted-foreground">{body}</span>
      </label>
    </div>
  )
}

function Notes({
  title,
  items,
  tone,
  mono,
}: {
  title: string
  items: string[]
  tone: "destructive" | "warning" | "muted"
  mono?: boolean
}) {
  if (items.length === 0) return null
  const Icon = tone === "muted" ? Info : TriangleAlert
  return (
    <div className="flex gap-2 text-caption">
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          tone === "destructive" && "text-destructive",
          tone === "warning" && "text-warning",
          tone === "muted" && "text-ash",
        )}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        {items.map((s) => (
          <span
            key={s}
            className={cn(
              "break-words text-muted-foreground",
              mono && "font-mono",
            )}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
