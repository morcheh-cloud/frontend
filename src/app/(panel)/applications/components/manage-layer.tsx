"use client"

import {
  Copy,
  Ellipsis,
  ExternalLink,
  Eye,
  LoaderCircle,
  RefreshCw,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import { YamlEditor } from "@/app/(panel)/ansible/components/yaml-editor"
import {
  ItemMenu,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useServer } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SheetTitle } from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { Recipe, SoftwareInstall } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  installBusy,
  useCompose,
  useInstall,
  useInstallLogs,
  useRevealSecrets,
  useSaveCompose,
} from "../api"
import { useInstallMenu } from "./install-menu"
import { InstallStatus, kindLabels, linkHref, RecipeIcon } from "./meta"
import { Facts, Layer, LayerBody, LayerFooter, Section } from "./parts"
import { useSoftwareCan } from "./permissions"

type Tab = "overview" | "logs" | "compose"

// One application on one server: what it is, its links, logs and compose
// file, and every action on it.
export function ManageLayer({
  open,
  onOpenChange,
  install,
  recipe,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  install: SoftwareInstall | null
  recipe: Recipe | null
}) {
  // The fresh copy: actions and runs change it while the layer is open.
  const fresh = useInstall(open ? install?.id : undefined)
  const i = fresh.data ?? install
  const title = i ? `${i.name} on ${i.server_name}` : "Application"
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      header={
        i && (
          <div className="flex items-center gap-3">
            <RecipeIcon recipe={recipe ?? { kind: i.kind }} size="sm" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-body">{title}</SheetTitle>
              <InstallStatus install={i} className="text-caption" />
            </div>
          </div>
        )
      }
    >
      {i && (
        <ManageBody
          key={i.id}
          install={i}
          recipe={recipe}
          gone={fresh.error instanceof ApiError && fresh.error.status === 404}
        />
      )}
    </Layer>
  )
}

function ManageBody({
  install: i,
  recipe,
  gone,
}: {
  install: SoftwareInstall
  recipe: Recipe | null
  gone: boolean
}) {
  const phone = useIsPhone()
  const can = useSoftwareCan(i.workspace_id)
  const docker = i.kind === "docker" && i.status !== "missing"
  const [tab, setTab] = useState<Tab>("overview")
  const tabs = [
    { value: "overview" as const, label: "Overview" },
    ...(docker && can.operate(i)
      ? [{ value: "logs" as const, label: "Logs" }]
      : []),
    ...(docker && i.origin === "morcheh" && can.compose(i)
      ? [{ value: "compose" as const, label: "Compose file" }]
      : []),
  ]
  const shown = tabs.some((t) => t.value === tab) ? tab : "overview"

  return (
    <>
      {tabs.length > 1 && (
        <div className="no-scrollbar shrink-0 overflow-x-auto border-b border-border px-4 py-2 md:px-6">
          <Segmented
            label="Show"
            items={tabs}
            value={shown}
            onChange={setTab}
          />
        </div>
      )}
      {gone ? (
        <LayerBody>
          <Callout title="Morche no longer tracks this application">
            It was uninstalled or forgotten.
          </Callout>
        </LayerBody>
      ) : shown === "logs" ? (
        <LogsTab install={i} />
      ) : shown === "compose" ? (
        <ComposeTab install={i} />
      ) : (
        <>
          <Overview install={i} recipe={recipe} />
          <Actions install={i} phone={!!phone} />
        </>
      )}
    </>
  )
}

function Actions({
  install: i,
  phone,
}: {
  install: SoftwareInstall
  phone: boolean
}) {
  const groups = useInstallMenu(i, { details: false })
  const [moreOpen, setMoreOpen] = useOpen("software-manage-more")
  const all = groups.flat()
  if (all.length === 0) return null
  // The one action in sight: Update when there is one, else the first.
  const main =
    all.find((x) => x.key === "update" && i.update_available) ??
    all.find((x) => x.key === "start") ??
    null
  const rest = groups
    .map((g) => g.filter((x) => x !== main))
    .filter((g) => g.length > 0)

  return (
    <LayerFooter>
      {phone ? (
        <>
          {main && (
            <Button
              size="lg"
              className="flex-1"
              disabled={main.disabled}
              onClick={main.onSelect}
            >
              {main.icon}
              {main.label}
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className={cn(!main && "flex-1")}
            onClick={() => setMoreOpen(true)}
          >
            <Ellipsis />
            {main ? "More" : "Actions"}
          </Button>
          <BottomSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            title={i.name}
          >
            <SheetItems groups={rest} onOpenChange={setMoreOpen} />
          </BottomSheet>
        </>
      ) : (
        <>
          {main && (
            <Button disabled={main.disabled} onClick={main.onSelect}>
              {main.icon}
              {main.label}
            </Button>
          )}
          {rest
            .flat()
            .filter((x) => ["restart", "stop", "update"].includes(x.key))
            .map((x) => (
              <Button
                key={x.key}
                variant="outline"
                disabled={x.disabled}
                onClick={x.onSelect}
              >
                {x.icon}
                {x.label}
              </Button>
            ))}
          <span className="ms-auto" />
          <ItemMenu
            label="More actions"
            groups={rest.map((g) =>
              g.filter((x) => !["restart", "stop", "update"].includes(x.key)),
            )}
          />
        </>
      )}
    </LayerFooter>
  )
}

function Overview({
  install: i,
  recipe,
}: {
  install: SoftwareInstall
  recipe: Recipe | null
}) {
  const server = useServer(i.server_id)
  const host = server.data?.host ?? ""
  const links = (recipe?.links ?? [])
    .map((l) => ({
      label: l.label,
      href: linkHref(l, host, i.params, recipe ?? undefined),
    }))
    .filter((l) => l.href)
  const shownParams = Object.entries(i.params ?? {}).filter(
    ([k]) => !i.secret_params.includes(k),
  )
  const paramLabel = (name: string) =>
    recipe?.params?.find((p) => p.name === name)?.label ?? name

  return (
    <LayerBody>
      {i.error && (
        <Callout
          warn
          title={i.status === "failed" ? "The last run failed" : "Problem"}
        >
          <span className="font-mono text-caption whitespace-pre-wrap">
            {i.error}
          </span>
        </Callout>
      )}
      {installBusy(i) && (
        <p className="flex items-center gap-2 text-body-sm text-brand">
          <LoaderCircle className="size-4 animate-spin" />A run is working on
          it.
        </p>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button
              key={l.href}
              variant="outline"
              nativeButton={false}
              render={
                <a href={l.href} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink />
              {l.label}
            </Button>
          ))}
        </div>
      )}

      <Section title="About">
        <Facts
          items={[
            { label: "Server", value: i.server_name },
            { label: "Kind", value: kindLabels[i.kind] },
            { label: "Version", value: i.version || "—" },
            ...(i.latest && i.latest !== i.version
              ? [{ label: "Newest", value: i.latest }]
              : []),
            {
              label: "Installed",
              value:
                i.origin === "found"
                  ? "Found on the server"
                  : i.installed_at
                    ? `${timeAgo(i.installed_at)} by Morche`
                    : "By Morche",
            },
            ...(i.checked_at
              ? [{ label: "Checked", value: timeAgo(i.checked_at) }]
              : []),
            ...(i.dir
              ? [
                  {
                    label: "Folder",
                    value: (
                      <span className="font-mono text-caption">{i.dir}</span>
                    ),
                  },
                ]
              : []),
            ...(i.project
              ? [
                  {
                    label: "Compose project",
                    value: (
                      <span className="font-mono text-caption">
                        {i.project}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Section>

      {i.images.length > 0 && (
        <Section title="Containers">
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {i.images.map((im) => (
              <li
                key={`${im.service}-${im.image}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-body-sm"
              >
                <span className="font-medium">{im.service}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">
                  {im.image}
                </span>
                {im.update && (
                  <span className="text-caption text-brand">Newer image</span>
                )}
                <span
                  className={cn(
                    "text-caption",
                    im.state === "running" ? "text-success" : "text-warning",
                  )}
                >
                  {im.state || "—"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(shownParams.length > 0 || i.secret_params.length > 0) && (
        <Section title="Settings" aside="as installed">
          {shownParams.length > 0 && (
            <Facts
              items={shownParams.map(([k, v]) => ({
                label: paramLabel(k),
                value: v || "—",
              }))}
            />
          )}
          {i.secret_params.length > 0 && (
            <Secrets install={i} label={paramLabel} />
          )}
        </Section>
      )}

      {recipe?.notes && (
        <Section title="Notes">
          <Markdown>{recipe.notes}</Markdown>
        </Section>
      )}
    </LayerBody>
  )
}

// Saved passwords stay hidden until an Owner asks; each ask is logged.
function Secrets({
  install: i,
  label,
}: {
  install: SoftwareInstall
  label: (name: string) => string
}) {
  const can = useSoftwareCan(i.workspace_id)
  const reveal = useRevealSecrets()
  const values = reveal.data?.values
  const copy = (v: string) =>
    navigator.clipboard
      ?.writeText(v)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Couldn't copy: select it instead."))

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {i.secret_params.map((k) => (
          <li
            key={k}
            className="flex min-h-12 items-center gap-3 px-4 py-2 text-body-sm"
          >
            <span className="w-32 shrink-0 text-muted-foreground">
              {label(k)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-caption select-all">
              {values ? values[k] || "—" : "••••••••••"}
            </span>
            {values?.[k] && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copy ${label(k)}`}
                onClick={() => copy(values[k])}
              >
                <Copy />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!values && can.reveal(i) && (
        <Button
          variant="outline"
          className="self-start"
          disabled={reveal.isPending}
          onClick={() =>
            reveal.mutate(i.id, { onError: (e) => toast.error(e.message) })
          }
        >
          <Eye />
          {reveal.isPending ? "Showing…" : "Show passwords"}
        </Button>
      )}
      {!values && !can.reveal(i) && (
        <p className="text-caption text-ash">
          Only an Owner of this server can see them.
        </p>
      )}
    </div>
  )
}

const lineChoices = [
  { value: "100", label: "100" },
  { value: "300", label: "300" },
  { value: "1000", label: "1000" },
] as const

function LogsTab({ install: i }: { install: SoftwareInstall }) {
  const [service, setService] = useState("")
  const [lines, setLines] = useState<"100" | "300" | "1000">("300")
  const logs = useInstallLogs(i.id, service, Number(lines), true)
  const services = [...new Set(i.images.map((im) => im.service))]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3 md:px-6">
        {services.length > 1 && (
          <Select
            value={service || "all"}
            onValueChange={(v) =>
              setService(!v || v === "all" ? "" : String(v))
            }
          >
            <SelectTrigger className="w-44" aria-label="Container">
              <SelectValue>
                {(v: string) => (v === "all" ? "Every container" : v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every container</SelectItem>
              {services.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Segmented
          label="Lines"
          items={lineChoices}
          value={lines}
          onChange={setLines}
        />
        <Button
          variant="ghost"
          size="icon"
          className="ms-auto"
          aria-label="Refresh"
          disabled={logs.isFetching}
          onClick={() => logs.refetch()}
        >
          <RefreshCw className={cn(logs.isFetching && "animate-spin")} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border-t border-border bg-subtle">
        {logs.isPending ? (
          <p className="p-4 text-body-sm text-ash">Reading the logs…</p>
        ) : logs.isError ? (
          <p className="p-4 text-body-sm text-destructive">
            {logs.error.message}
          </p>
        ) : logs.data ? (
          <pre className="p-4 font-mono text-caption break-all whitespace-pre-wrap">
            {logs.data}
          </pre>
        ) : (
          <p className="p-4 text-body-sm text-ash">Nothing written yet.</p>
        )}
      </div>
    </div>
  )
}

function ComposeTab({ install: i }: { install: SoftwareInstall }) {
  const compose = useCompose(i.id, true)
  const save = useSaveCompose(i.id)
  const [draft, setDraft] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const value = draft ?? compose.data?.content ?? ""
  const dirty = draft !== null && draft !== compose.data?.content

  const submit = (revision: string) => {
    setRefused(null)
    save.mutate(
      { content: value, revision },
      {
        onSuccess: () => {
          setDraft(null)
          setConflict(false)
          toast.success("Saved and applied")
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409) setConflict(true)
          else if (e instanceof ApiError && e.status === 422)
            setRefused(e.message)
          else toast.error(e.message)
        },
      },
    )
  }

  if (compose.isPending)
    return (
      <LayerBody>
        <p className="text-body-sm text-ash">Reading the compose file…</p>
      </LayerBody>
    )
  if (compose.isError)
    return (
      <LayerBody>
        <Callout warn title="Couldn't read the compose file">
          {compose.error.message}
        </Callout>
      </LayerBody>
    )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {(conflict || refused) && (
          <div className="shrink-0 px-4 pt-3 md:px-6">
            {conflict ? (
              <Callout
                warn
                title="It changed on the server since you opened it"
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDraft(null)
                        setConflict(false)
                        compose.refetch()
                      }}
                    >
                      Load theirs
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const r = await compose.refetch()
                        if (r.data) submit(r.data.revision)
                      }}
                    >
                      Overwrite
                    </Button>
                  </div>
                }
              />
            ) : (
              <Callout warn title="Docker refused it; nothing changed">
                <span className="font-mono text-caption whitespace-pre-wrap">
                  {refused}
                </span>
              </Callout>
            )}
          </div>
        )}
        <YamlEditor
          kind="compose"
          value={value}
          onChange={setDraft}
          className="min-h-0 flex-1"
        />
      </div>
      <LayerFooter>
        <p className="me-auto text-caption text-ash">
          Checked by docker compose, then applied. The old file stays as
          compose.yml.previous.
        </p>
        <Button
          variant="ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setDraft(null)
            setRefused(null)
          }}
        >
          Undo
        </Button>
        <Button
          disabled={!dirty || save.isPending}
          onClick={() => compose.data && submit(compose.data.revision)}
        >
          {save.isPending ? "Applying…" : "Save and apply"}
        </Button>
      </LayerFooter>
    </>
  )
}
