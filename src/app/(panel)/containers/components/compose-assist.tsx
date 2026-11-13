"use client"

import {
  Boxes,
  Check,
  ChevronDown,
  Database,
  Download,
  Ellipsis,
  FolderOpen,
  Globe,
  HardDrive,
  HeartPulse,
  KeyRound,
  Link2,
  ListChecks,
  Lock,
  Network,
  Plug,
  Plus,
  RotateCw,
  Server,
  Sparkles,
  Tag,
  Terminal,
  Trash2,
  X,
} from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/components/access/choice"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { DockerImage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { ItemMenu, SearchBox } from "../../servers/[id]/components/parts"
import { usePorts } from "../../servers/[id]/ports/api"
import {
  useDockerImage,
  useDockerImages,
  useDockerNetworks,
  useDockerVolumes,
  usePullImage,
} from "../api"
import {
  addMount,
  addPort,
  attachNetwork,
  type ComposeModel,
  declareNetwork,
  detachNetwork,
  edit,
  type MountSpec,
  mountText,
  portText,
  readCompose,
  removeMount,
  removeNetwork,
  removePort,
  removeService,
  removeVolume,
  type ServiceInfo,
} from "./compose-edit"
import { envReport, newSecret } from "./env-vars"
import {
  type Advice,
  type AdviceContext,
  type AdviceInput,
  addFromImage,
  adviceFor,
  applyRecommended,
  type Files,
  featured,
  hintFor,
  imageWithTag,
  searchCatalog,
} from "./image-hints"
import { ImageLogo, splitRef } from "./image-meta"
import { EnvHelper } from "./project-new-tools"

export type AssistTab =
  | "services"
  | "networks"
  | "volumes"
  | "variables"
  | "check"

type Ctx = Omit<AdviceContext, "model">

type Common = {
  serverId: string
  files: Files
  onFiles: (files: Files) => void
  model: ComposeModel
}

// ---- Shell ----------------------------------------------------------------

// The helper beside the compose editor: what's in the file, laid out by
// services / networks / volumes, with suggestions from each service's image
// that write themselves into the YAML.
export function ComposeAssist({
  serverId,
  files,
  onFiles,
  tab,
  onTab,
  phone,
  defaultRestart,
  defaultsCard,
  check,
  checkTone,
  showEnv,
  onAdded,
  onDockerRun,
}: {
  serverId: string
  files: Files
  onFiles: (files: Files) => void
  tab: AssistTab
  onTab: (tab: AssistTab) => void
  phone: boolean
  // The new-project defaults already add restart: to every service.
  defaultRestart: boolean
  defaultsCard?: ReactNode
  check: ReactNode
  checkTone?: "good" | "warn" | "bad"
  showEnv: () => void
  onAdded?: (service: string) => void
  onDockerRun: () => void
}) {
  const model = readCompose(files.compose)
  const ports = usePorts(serverId).data
  const volumes = useDockerVolumes(serverId, false).data
  const ctx: Ctx = {
    serverPorts: new Set(
      (ports?.ports ?? []).map((p) => `${p.port}/${p.protocol}`),
    ),
    serverVolumes: new Set((volumes ?? []).map((v) => v.name)),
    defaultRestart,
  }
  const env = envReport(files.compose, files.env)
  const envIssues = env.missing.length + env.weak.length
  const binds = model.services.reduce(
    (n, s) => n + s.mounts.filter((m) => m.kind === "bind").length,
    0,
  )
  const [addOpen, setAddOpen] = useOpen("compose-add-service")
  const common = { serverId, files, onFiles, model }

  const tabs: {
    value: AssistTab
    label: string
    count?: number
    tone?: "warn" | "bad" | "good"
  }[] = [
    { value: "services", label: "Services", count: model.services.length },
    { value: "networks", label: "Networks", count: model.networks.length },
    {
      value: "volumes",
      label: "Volumes",
      count: model.volumes.length + binds,
    },
    {
      value: "variables",
      label: "Variables",
      count: envIssues || undefined,
      tone: envIssues ? "warn" : undefined,
    },
    { value: "check", label: "Check", tone: checkTone },
  ]

  const body =
    tab === "services" ? (
      <ServicesPanel
        {...common}
        ctx={ctx}
        phone={phone}
        onAdd={() => setAddOpen(true)}
        onDockerRun={onDockerRun}
        onAdded={onAdded}
        defaultsCard={defaultsCard}
      />
    ) : tab === "networks" ? (
      <NetworksPanel {...common} />
    ) : tab === "volumes" ? (
      <VolumesPanel {...common} />
    ) : tab === "variables" ? (
      <VariablesPanel files={files} onFiles={onFiles} showEnv={showEnv} />
    ) : (
      check
    )

  return (
    <section
      aria-label="Compose helper"
      className={cn(
        "flex min-h-0 flex-col",
        !phone && "overflow-hidden rounded-2xl border border-border bg-card",
      )}
    >
      <div
        role="tablist"
        aria-label="Compose helper"
        className={cn(
          "no-scrollbar flex shrink-0 gap-0.5 overflow-x-auto border-b border-border",
          phone ? "-mx-4 px-2" : "px-1.5",
        )}
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => onTab(t.value)}
            className={cn(
              "relative flex h-11 shrink-0 items-center text-body-sm",
              phone ? "gap-1.5 px-2.5" : "grow justify-center gap-1 px-1.5",
              "whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:font-medium aria-selected:text-foreground aria-selected:after:bg-brand",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-caption tabular-nums",
                  t.tone === "warn"
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
            {t.count === undefined && t.tone && (
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  t.tone === "good"
                    ? "bg-success"
                    : t.tone === "warn"
                      ? "bg-warning"
                      : "bg-destructive",
                )}
              />
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        className={cn(
          "flex min-h-0 flex-col gap-4",
          phone ? "py-4" : "flex-1 overflow-y-auto p-4",
        )}
      >
        {!model.ok && tab !== "variables" && tab !== "check" && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm text-destructive"
          >
            The YAML doesn't read right now, so nothing can be added until it's
            fixed{model.error ? `: ${model.error}` : "."}
          </p>
        )}
        {body}
      </div>
      <AddServiceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        serverId={serverId}
        files={files}
        ctx={ctx}
        onAdd={(next, service) => {
          onFiles(next)
          setAddOpen(false)
          onTab("services")
          onAdded?.(service)
          toast.success(`Added ${service}`)
        }}
      />
    </section>
  )
}

// ---- Bits -----------------------------------------------------------------

function Heading({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <h3 className="font-label text-caption tracking-label text-ash uppercase">
        {children}
      </h3>
      {action && <div className="ms-auto">{action}</div>}
    </div>
  )
}

function Chip({
  children,
  onRemove,
  removeLabel,
  title,
  disabled,
}: {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
  title?: string
  disabled?: boolean
}) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted py-0.5 ps-1.5 pe-0.5 font-mono text-caption text-foreground"
    >
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          disabled={disabled}
          onClick={onRemove}
          className="grid size-5 shrink-0 place-items-center rounded text-ash outline-none hover:bg-mist hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          <X className="size-3" />
        </button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-caption text-muted-foreground">{children}</p>
}

// Applies edits, and says so when the file couldn't take them.
function useChange({ files, onFiles }: Pick<Common, "files" | "onFiles">) {
  return (...edits: Parameters<typeof edit>[1][]) => {
    const next = edit(files.compose, ...edits)
    if (next === files.compose) {
      toast.error("Couldn't change the compose file", {
        description: "Its YAML has a shape this helper doesn't edit.",
      })
      return false
    }
    onFiles({ ...files, compose: next })
    return true
  }
}

const isPath = (s: string) => /^[./~]/.test(s)
const KEY = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

// Image references the way the engine lists them: docker.io/library/nginx
// and nginx:latest are the same image.
function normalRef(ref: string) {
  let r = ref
    .trim()
    .replace(/^docker\.io\//, "")
    .replace(/^library\//, "")
  if (!r.includes("@") && !/:[^/]+$/.test(r)) r += ":latest"
  return r
}

function onServer(images: DockerImage[] | undefined, image: string) {
  if (!images) return undefined
  const want = normalRef(image)
  return images.some((i) => i.tags.some((t) => normalRef(t) === want))
}

// ---- Services -------------------------------------------------------------

function ServicesPanel({
  serverId,
  files,
  onFiles,
  model,
  ctx,
  phone,
  onAdd,
  onDockerRun,
  onAdded,
  defaultsCard,
}: Common & {
  ctx: Ctx
  phone: boolean
  onAdd: () => void
  onDockerRun: () => void
  onAdded?: (service: string) => void
  defaultsCard?: ReactNode
}) {
  const images = useDockerImages(serverId).data
  const quickAdd = (image: string) => {
    const r = addFromImage(files, imageWithTag(image), {
      recommended: true,
      ctx,
      makeSecret: newSecret,
    })
    if (r.files.compose === files.compose) {
      toast.error("Couldn't change the compose file")
      return
    }
    onFiles(r.files)
    onAdded?.(r.service)
    toast.success(`Added ${r.service}`, {
      description: "With the suggested settings: read them through below.",
    })
  }

  if (model.services.length === 0) {
    return (
      <>
        <div className="flex flex-col gap-1">
          <span className="text-body-sm font-medium">Start with an image</span>
          <Quiet>
            Pick one and it's added with what it usually needs: ports, volumes,
            passwords in .env, a healthcheck.
          </Quiet>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {featured.map((h) => (
            <button
              key={h.image}
              type="button"
              disabled={!model.ok}
              onClick={() => quickAdd(h.image)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-card p-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <ImageLogo repo={h.image} className="size-8" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body-sm font-medium">
                  {h.title}
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  {h.role === "database" ? "Database" : h.about}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onAdd} disabled={!model.ok}>
            <Plus />
            Another image…
          </Button>
          <Button variant="ghost" onClick={onDockerRun}>
            <Terminal />
            From docker run
          </Button>
        </div>
        {defaultsCard}
      </>
    )
  }

  return (
    <>
      <Heading
        action={
          <Button
            size={phone ? "default" : "sm"}
            variant="outline"
            onClick={onAdd}
            disabled={!model.ok}
          >
            <Plus />
            Add a service
          </Button>
        }
      >
        {model.services.length === 1
          ? "1 service"
          : `${model.services.length} services`}
      </Heading>
      {model.services.map((s) => (
        <ServiceCard
          key={s.name}
          service={s}
          serverId={serverId}
          files={files}
          onFiles={onFiles}
          model={model}
          ctx={ctx}
          images={images}
          phone={phone}
        />
      ))}
      {defaultsCard}
    </>
  )
}

const adviceIcons: Record<Advice["kind"], typeof Plug> = {
  port: Plug,
  volume: HardDrive,
  env: KeyRound,
  health: HeartPulse,
  restart: RotateCw,
  tag: Tag,
  hostname: Server,
  command: Terminal,
  socket: Boxes,
  needs: Database,
  depends: Link2,
}

function ServiceCard({
  service: s,
  serverId,
  files,
  onFiles,
  model,
  ctx,
  images,
  phone,
}: Common & {
  service: ServiceInfo
  ctx: Ctx
  images: DockerImage[] | undefined
  phone: boolean
}) {
  const present = s.image ? onServer(images, s.image) : undefined
  const details = useDockerImage(
    serverId,
    present && s.image ? s.image : null,
  ).data
  const pull = usePullImage()
  const change = useChange({ files, onFiles })
  const [moreOpen, setMoreOpen] = useState(false)
  const [portOpen, setPortOpen] = useState(false)
  const hint = hintFor(s.image)
  const advice = adviceFor(s, details, { ...ctx, model }, newSecret)
  const todo = advice.filter((a) => !a.done)
  const recommended = todo.filter((a) => a.level === "recommended")
  const optional = todo.filter((a) => a.level === "optional")
  const done = advice.filter((a) => a.done).length
  // What "Add all" does: the same as applyRecommended.
  const bulk = recommended.filter(
    (a) => a.kind !== "needs" && !(a.kind === "tag" && !a.field?.value),
  )
  const repo = s.image ? splitRef(s.image)[0] : s.name

  const apply = (a: Advice, input?: AdviceInput) => {
    const next = a.apply(files, input)
    if (next.compose === files.compose && next.env === files.env) {
      toast.error("Couldn't change the compose file")
      return
    }
    onFiles(next)
  }
  const addAll = () => {
    const next = applyRecommended(files, s.name, ctx, newSecret, details)
    if (next.compose !== files.compose || next.env !== files.env) onFiles(next)
  }

  return (
    <article className="flex flex-col rounded-xl border border-border">
      <header className="flex items-start gap-3 p-3">
        <ImageLogo repo={repo} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm font-medium">{s.name}</span>
          <span className="truncate font-mono text-caption text-muted-foreground">
            {s.build ? "Built from a Dockerfile" : (s.image ?? "No image")}
          </span>
        </div>
        <ItemMenu
          label={`More for ${s.name}`}
          trigger={
            <Button
              size={phone ? "icon-lg" : "icon-sm"}
              variant="ghost"
              aria-label={`More for ${s.name}`}
            >
              <Ellipsis />
            </Button>
          }
          groups={[
            [
              {
                key: "port",
                label: "Publish a port…",
                icon: <Plug />,
                onSelect: () => setPortOpen(true),
              },
            ],
            [
              {
                key: "remove",
                label: "Remove this service",
                icon: <Trash2 />,
                destructive: true,
                onSelect: () => change(removeService(s.name)),
              },
            ],
          ]}
        />
      </header>

      {s.image && !s.build && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border px-3 py-2 text-caption text-muted-foreground">
          {present === undefined ? (
            <span>Looking for the image on the server…</span>
          ) : present ? (
            <span className="flex items-center gap-1">
              <Check className="size-3.5 text-success" />
              On the server
              {details && (details.exposed_ports?.length ?? 0) > 0
                ? `: exposes ${details.exposed_ports.join(", ")}`
                : ""}
            </span>
          ) : (
            <>
              <span className="min-w-0 flex-1">
                Not on the server yet: pulled when it starts.
                {!hint && " Pull it to see what it exposes and keeps."}
              </span>
              <Button
                size="xs"
                variant="ghost"
                disabled={pull.isPending}
                onClick={() =>
                  pull.mutate({ server: serverId, image: s.image ?? "" })
                }
              >
                <Download />
                Pull now
              </Button>
            </>
          )}
          {hint && (
            <span className="w-full text-ash">
              Known image: {hint.title}. {hint.about}
            </span>
          )}
        </div>
      )}

      {(s.ports.length > 0 || s.mounts.length > 0 || s.networkMode) && (
        <dl className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {s.ports.length > 0 && (
            <div className="flex items-start gap-2">
              <dt className="w-14 shrink-0 pt-0.5 text-caption text-ash">
                Ports
              </dt>
              <dd className="flex min-w-0 flex-wrap gap-1">
                {s.ports.map((p) => (
                  <Chip
                    key={portText(p)}
                    title={
                      p.ip === "127.0.0.1"
                        ? "Only from the server itself"
                        : p.host
                          ? `Port ${p.host} on the server → ${p.target} in the container`
                          : "A random port on the server"
                    }
                    removeLabel={`Stop publishing ${portText(p)}`}
                    onRemove={() => change(removePort(s.name, p))}
                  >
                    {portText(p)}
                  </Chip>
                ))}
              </dd>
            </div>
          )}
          {s.mounts.length > 0 && (
            <div className="flex items-start gap-2">
              <dt className="w-14 shrink-0 pt-0.5 text-caption text-ash">
                Mounts
              </dt>
              <dd className="flex min-w-0 flex-wrap gap-1">
                {s.mounts.map((m) => (
                  <Chip
                    key={m.target}
                    removeLabel={`Remove the mount on ${m.target}`}
                    onRemove={() => change(removeMount(s.name, m.target))}
                  >
                    {mountText(m)}
                  </Chip>
                ))}
              </dd>
            </div>
          )}
          {s.networkMode && (
            <div className="flex items-start gap-2">
              <dt className="w-14 shrink-0 pt-0.5 text-caption text-ash">
                Network
              </dt>
              <dd className="font-mono text-caption">
                network_mode: {s.networkMode}
              </dd>
            </div>
          )}
        </dl>
      )}

      {portOpen && (
        <PortForm
          service={s}
          model={model}
          ctx={ctx}
          onCancel={() => setPortOpen(false)}
          onAdd={(p) => {
            if (change(addPort(s.name, p))) setPortOpen(false)
          }}
        />
      )}

      <div className="flex flex-col border-t border-border px-3">
        {recommended.length > 0 ? (
          <>
            <div className="flex items-center gap-2 pt-3">
              <Sparkles className="size-3.5 text-brand" />
              <span className="text-body-sm font-medium">
                {recommended.length === 1
                  ? "1 suggestion"
                  : `${recommended.length} suggestions`}
              </span>
              {bulk.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ms-auto text-brand"
                  disabled={!model.ok}
                  onClick={addAll}
                >
                  Add all {bulk.length}
                </Button>
              )}
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {recommended.map((a) => (
                <AdviceRow
                  key={`${a.id}|${a.field?.value ?? ""}`}
                  advice={a}
                  disabled={!model.ok}
                  onApply={(i) => apply(a, i)}
                />
              ))}
            </ul>
          </>
        ) : (
          <p className="flex items-center gap-2 py-3 text-body-sm text-muted-foreground">
            <Check className="size-4 text-success" />
            {s.build
              ? "Nothing to suggest for a service built here."
              : "Everything suggested is in place."}
          </p>
        )}
        {optional.length > 0 && (
          <div className="flex flex-col border-t border-border">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className="flex min-h-10 items-center gap-2 text-start text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  !moreOpen && "-rotate-90",
                )}
              />
              {optional.length === 1
                ? "1 more idea"
                : `${optional.length} more ideas`}
            </button>
            {moreOpen && (
              <ul className="flex flex-col divide-y divide-border">
                {optional.map((a) => (
                  <AdviceRow
                    key={`${a.id}|${a.field?.value ?? ""}`}
                    advice={a}
                    disabled={!model.ok}
                    onApply={(i) => apply(a, i)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
        {done > 0 && (
          <p className="border-t border-border py-2 text-caption text-ash">
            {done === 1 ? "1 suggestion" : `${done} suggestions`} already set
          </p>
        )}
      </div>
    </article>
  )
}

function AdviceRow({
  advice: a,
  disabled,
  onApply,
}: {
  advice: Advice
  disabled: boolean
  onApply: (input: AdviceInput) => void
}) {
  const f = a.field
  const [value, setValue] = useState(f?.value ?? "")
  const [local, setLocal] = useState(!!f?.local)
  const Icon = adviceIcons[a.kind]
  const missing = f?.kind === "tag" && !value.trim()
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <span className="text-body-sm">{a.title}</span>
          {a.detail && (
            <span className="text-caption break-words text-muted-foreground">
              {a.detail}
            </span>
          )}
        </div>
        {f && (
          <div className="flex flex-col gap-1.5">
            <Input
              aria-label={f.label}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={f.kind === "tag" ? "e.g. 1.27" : undefined}
              inputMode={f.kind === "port" ? "numeric" : undefined}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono md:h-8 md:text-body-sm"
            />
            {f.kind === "port" && (
              // biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox renders the control inside
              <label className="flex min-h-8 items-center gap-2 text-caption text-muted-foreground">
                <Checkbox checked={local} onCheckedChange={setLocal} />
                Only from the server itself (127.0.0.1)
              </label>
            )}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        disabled={disabled || missing}
        onClick={() => onApply({ value, local })}
        aria-label={`Add: ${a.title}`}
      >
        <Plus />
        Add
      </Button>
    </li>
  )
}

function PortForm({
  service,
  model,
  ctx,
  onAdd,
  onCancel,
}: {
  service: ServiceInfo
  model: ComposeModel
  ctx: Ctx
  onAdd: (p: {
    host?: string
    target: string
    protocol: string
    ip?: string
  }) => void
  onCancel: () => void
}) {
  const [host, setHost] = useState("")
  const [target, setTarget] = useState("")
  const [udp, setUdp] = useState(false)
  const [local, setLocal] = useState(false)
  const [tried, setTried] = useState(false)
  const proto = udp ? "udp" : "tcp"
  const num = (v: string) => /^\d+$/.test(v) && +v > 0 && +v < 65536
  const busy =
    host &&
    (ctx.serverPorts.has(`${host}/${proto}`) ||
      model.services.some((s) =>
        s.ports.some((p) => p.host === host && p.protocol === proto),
      ))
  const problem = !num(target)
    ? "The container's port is a number from 1 to 65535."
    : host && !num(host)
      ? "The server's port is a number, or empty for a random one."
      : undefined
  return (
    <form
      className="flex flex-col gap-2 border-t border-border bg-subtle p-3"
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (problem) return
        onAdd({
          host: host || undefined,
          target,
          protocol: proto,
          ip: local ? "127.0.0.1" : undefined,
        })
      }}
    >
      <span className="text-body-sm font-medium">
        Publish a port of {service.name}
      </span>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Port on the server"
          placeholder="On the server"
          value={host}
          onChange={(e) => setHost(e.target.value.trim())}
          inputMode="numeric"
          className="font-mono md:h-8 md:text-body-sm"
        />
        <span className="text-ash">→</span>
        <Input
          aria-label="Port in the container"
          placeholder="In the container"
          value={target}
          onChange={(e) => setTarget(e.target.value.trim())}
          inputMode="numeric"
          className="font-mono md:h-8 md:text-body-sm"
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox renders the control inside */}
        <label className="flex min-h-8 items-center gap-2 text-caption text-muted-foreground">
          <Checkbox checked={udp} onCheckedChange={setUdp} />
          UDP
        </label>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox renders the control inside */}
        <label className="flex min-h-8 items-center gap-2 text-caption text-muted-foreground">
          <Checkbox checked={local} onCheckedChange={setLocal} />
          Only from the server itself
        </label>
      </div>
      {tried && problem && (
        <p className="text-caption text-destructive">{problem}</p>
      )}
      {busy && !problem && (
        <p className="text-caption text-warning">
          {host}/{proto} is already in use on the server or in this file.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Publish
        </Button>
      </div>
    </form>
  )
}

// ---- Add a service ----------------------------------------------------------

function AddServiceDialog({
  open,
  onOpenChange,
  serverId,
  files,
  ctx,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  files: Files
  ctx: Ctx
  onAdd: (files: Files, service: string) => void
}) {
  const [q, setQ] = useState("")
  const [name, setName] = useState("")
  const [suggested, setSuggested] = useState(true)
  const images = useDockerImages(serverId, open).data
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    setQ("")
    setName("")
    if (window.matchMedia("(pointer: fine)").matches)
      setTimeout(() => input.current?.focus(), 50)
  }, [open])

  const term = q.trim().toLowerCase()
  const known = searchCatalog(term).slice(0, term ? 12 : 40)
  const local = (images ?? [])
    .filter((i) => !i.dangling && i.tags.length > 0)
    .map((i) => i.tags[0])
    .filter((t) => !term || t.toLowerCase().includes(term))
    .slice(0, 12)
  const typed =
    term && /^[a-z0-9][a-z0-9._/:@-]*$/.test(term) ? q.trim() : undefined

  const add = (image: string) => {
    const r = addFromImage(files, imageWithTag(image), {
      name,
      recommended: suggested,
      ctx,
      makeSecret: newSecret,
    })
    if (r.files.compose === files.compose) {
      toast.error("Couldn't change the compose file")
      return
    }
    onAdd(r.files, r.service)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a service"
      description="Pick an image; its usual settings come with it."
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search or type an image, e.g. nginx:1.27"
          label="Image"
          className="md:w-full"
          inputRef={input}
          onKeyDown={(e) => {
            if (e.key === "Enter" && typed) {
              e.preventDefault()
              add(typed)
            }
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            aria-label="Service name"
            placeholder="Service name (from the image)"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="sm:flex-1"
          />
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI's switch renders the control inside */}
          <label className="flex min-h-10 items-center gap-2 text-body-sm">
            <Switch checked={suggested} onCheckedChange={setSuggested} />
            With suggested settings
          </label>
        </div>
        <div className="flex flex-col gap-3">
          {typed && !known.some((h) => h.image === typed) && (
            <ul>
              <ImageRow
                onAdd={add}
                image={typed}
                title={`Use ${imageWithTag(typed)}`}
                sub="Pulled from its registry when the project starts"
              />
            </ul>
          )}
          {local.length > 0 && (
            <div className="flex flex-col gap-1">
              <Heading>On this server</Heading>
              <ul className="flex flex-col">
                {local.map((t) => (
                  <ImageRow
                    onAdd={add}
                    key={t}
                    image={t}
                    title={t}
                    sub={hintFor(t)?.title ?? "Already pulled"}
                    tag="Pulled"
                  />
                ))}
              </ul>
            </div>
          )}
          {known.length > 0 && (
            <div className="flex flex-col gap-1">
              <Heading>Known images</Heading>
              <ul className="flex flex-col">
                {known.map((h) => (
                  <ImageRow
                    onAdd={add}
                    key={h.image}
                    image={h.image}
                    title={h.title}
                    sub={`${imageWithTag(h.image)} · ${h.about}`}
                  />
                ))}
              </ul>
            </div>
          )}
          {!typed && known.length === 0 && local.length === 0 && (
            <Quiet>Nothing matches; type the image's full name.</Quiet>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

function ImageRow({
  image,
  title,
  sub,
  tag,
  onAdd,
}: {
  image: string
  title: string
  sub: string
  tag?: string
  onAdd: (image: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAdd(image)}
        className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ImageLogo repo={splitRef(image)[0]} className="size-8" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm font-medium">{title}</span>
          <span className="truncate text-caption text-muted-foreground">
            {sub}
          </span>
        </span>
        {tag && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 text-caption text-muted-foreground">
            {tag}
          </span>
        )}
      </button>
    </li>
  )
}

// ---- Networks ---------------------------------------------------------------

function NetworksPanel({ serverId, files, onFiles, model }: Common) {
  const server = useDockerNetworks(serverId).data
  const change = useChange({ files, onFiles })
  const [name, setName] = useState("")
  const [internal, setInternal] = useState(false)
  const [tried, setTried] = useState(false)
  const declared = new Set(model.networks.map((n) => n.name))
  const keys = new Set(model.networks.map((n) => n.key))
  const others = (server ?? []).filter(
    (n) => !n.builtin && !declared.has(n.name),
  )
  const onDefault = model.services.filter(
    (s) => !s.networkMode && (!s.networks || s.networks.includes("default")),
  )
  const problem = !name
    ? "Give it a name."
    : !KEY.test(name)
      ? "Letters, digits, - _ and . only."
      : keys.has(name) || name === "default"
        ? "The file already has a network with that name."
        : undefined
  const disabled = !model.ok

  const toggle = (s: ServiceInfo, key: string) =>
    change(
      s.networks?.includes(key)
        ? detachNetwork(s.name, key)
        : attachNetwork(s.name, key),
    )
  const drop = (key: string) =>
    change(
      ...model.services
        .filter((s) => s.networks?.includes(key))
        .map((s) => detachNetwork(s.name, key)),
      removeNetwork(key),
    )
  const join = (n: string) =>
    change(
      declareNetwork(n, { external: true }),
      ...(model.services.length === 1
        ? [attachNetwork(model.services[0].name, n)]
        : []),
    )

  return (
    <>
      <div className="flex flex-col gap-2">
        <Heading>In this file</Heading>
        <NetworkRow
          name="default"
          tags={["Made for the project"]}
          about="Every service that lists no network is on it, and reaches the others by their service name."
        >
          {onDefault.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {onDefault.map((s) => (
                <span
                  key={s.name}
                  className="rounded-md bg-brand-soft px-1.5 py-0.5 text-caption text-brand-strong"
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <Quiet>No service is on it.</Quiet>
          )}
        </NetworkRow>
        {model.networks.map((n) => {
          const members = model.services.filter((s) =>
            s.networks?.includes(n.key),
          )
          return (
            <NetworkRow
              key={n.key}
              name={n.key}
              tags={[
                n.external ? "Already on the server" : "Made for the project",
                ...(n.internal ? ["Internal"] : []),
                ...(n.driver ? [n.driver] : []),
              ]}
              about={
                n.internal
                  ? "Its services reach each other but not the internet."
                  : undefined
              }
              onRemove={disabled ? undefined : () => drop(n.key)}
            >
              <div className="flex flex-col gap-1">
                <span className="text-caption text-ash">
                  {members.length === 0
                    ? "No service yet: tap one to put it on this network."
                    : "Tap a service to put it on or take it off."}
                </span>
                <div className="flex flex-wrap gap-1">
                  {model.services.map((s) => {
                    const on = !!s.networks?.includes(n.key)
                    return (
                      <button
                        key={s.name}
                        type="button"
                        aria-pressed={on}
                        disabled={disabled || !!s.networkMode}
                        title={
                          s.networkMode
                            ? `Uses network_mode: ${s.networkMode}`
                            : undefined
                        }
                        onClick={() => toggle(s, n.key)}
                        className="inline-flex min-h-7 items-center gap-1 rounded-md border border-border px-1.5 text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-pressed:border-transparent aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                      >
                        {on ? (
                          <Check className="size-3" />
                        ) : (
                          <Plus className="size-3" />
                        )}
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </NetworkRow>
          )
        })}
      </div>

      <form
        className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (problem || disabled) return
          if (change(declareNetwork(name, { internal }))) {
            setName("")
            setInternal(false)
            setTried(false)
          }
        }}
      >
        <span className="text-body-sm font-medium">New network</span>
        <div className="flex gap-2">
          <Input
            aria-label="Network name"
            placeholder="e.g. backend"
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono md:h-8 md:text-body-sm"
          />
          <Button type="submit" size="sm" disabled={disabled}>
            <Plus />
            Add
          </Button>
        </div>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox renders the control inside */}
        <label className="flex min-h-8 items-center gap-2 text-caption text-muted-foreground">
          <Checkbox checked={internal} onCheckedChange={setInternal} />
          Internal: no way out to the internet (for databases)
        </label>
        {tried && problem && (
          <p className="text-caption text-destructive">{problem}</p>
        )}
      </form>

      <div className="flex flex-col gap-2">
        <Heading>On this server</Heading>
        {server === undefined ? (
          <Quiet>Reading the server's networks…</Quiet>
        ) : others.length === 0 ? (
          <Quiet>No other networks to join.</Quiet>
        ) : (
          <>
            <Quiet>
              Join one to reach containers outside this project, like a reverse
              proxy's network.
            </Quiet>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {others.map((n) => (
                <li key={n.id} className="flex items-center gap-3 px-3 py-2">
                  <Network className="size-4 shrink-0 text-ash" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-mono text-body-sm">
                      {n.name}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {[
                        n.driver,
                        n.subnets[0]?.subnet,
                        n.containers.length === 1
                          ? "1 container"
                          : `${n.containers.length} containers`,
                        n.project && `project ${n.project}`,
                        n.internal && "internal",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled || !KEY.test(n.name)}
                    onClick={() => join(n.name)}
                  >
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

function NetworkRow({
  name,
  tags,
  about,
  onRemove,
  children,
}: {
  name: string
  tags: string[]
  about?: string
  onRemove?: () => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex items-start gap-2">
        {name === "default" ? (
          <Globe className="mt-0.5 size-4 shrink-0 text-ash" />
        ) : tags.includes("Internal") ? (
          <Lock className="mt-0.5 size-4 shrink-0 text-ash" />
        ) : (
          <Network className="mt-0.5 size-4 shrink-0 text-ash" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-mono text-body-sm font-medium">
            {name}
          </span>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted px-1.5 text-caption text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
          {about && <Quiet>{about}</Quiet>}
        </div>
        {onRemove && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove the ${name} network`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {children}
    </div>
  )
}

// ---- Volumes ----------------------------------------------------------------

type Placed = { service: string; m: MountSpec }

function VolumesPanel({ serverId, files, onFiles, model }: Common) {
  const server = useDockerVolumes(serverId, false).data
  const change = useChange({ files, onFiles })
  const [service, setService] = useState("")
  const [source, setSource] = useState("")
  const [target, setTarget] = useState("")
  const [readOnly, setReadOnly] = useState(false)
  const [tried, setTried] = useState(false)
  const targetRef = useRef<HTMLInputElement>(null)
  const disabled = !model.ok
  const placed: Placed[] = model.services.flatMap((s) =>
    s.mounts.map((m) => ({ service: s.name, m })),
  )
  const declared = new Set(model.volumes.map((v) => v.name))
  const declaredKeys = new Set(model.volumes.map((v) => v.key))
  const binds = placed.filter((p) => p.m.kind === "bind")
  const unnamed = placed.filter((p) => p.m.kind === "anonymous")
  const others = (server ?? []).filter(
    (v) => !v.anonymous && !declared.has(v.name),
  )
  const chosen = service || model.services[0]?.name || ""
  const problem = !chosen
    ? "Add a service first."
    : !source.trim()
      ? "Name a volume, or a folder starting with ./ or /."
      : !target.startsWith("/")
        ? "The path in the container starts with /."
        : model.services
              .find((s) => s.name === chosen)
              ?.mounts.some((m) => m.target === target)
          ? `${chosen} already mounts something on ${target}.`
          : undefined

  const removeVol = (key: string) =>
    change(
      ...placed
        .filter((p) => p.m.source === key)
        .map((p) => removeMount(p.service, p.m.target)),
      removeVolume(key),
    )
  const submit = () => {
    setTried(true)
    if (problem || disabled) return
    const src = source.trim()
    const ok = change(
      addMount(
        chosen,
        { source: src, target, readOnly },
        isPath(src)
          ? undefined
          : {
              external:
                (server ?? []).some((v) => v.name === src) &&
                !declaredKeys.has(src),
            },
      ),
    )
    if (ok) {
      setSource("")
      setTarget("")
      setReadOnly(false)
      setTried(false)
    }
  }

  const mountRow = (p: Placed, showSource: boolean) => (
    <li
      key={`${p.service}:${p.m.target}`}
      className="flex items-center gap-2 text-caption"
    >
      <span className="min-w-0 flex-1 truncate font-mono">
        <span className="text-muted-foreground">{p.service}</span>
        {showSource && p.m.source ? ` · ${p.m.source}` : ""} → {p.m.target}
        {p.m.readOnly && <span className="text-ash"> (read-only)</span>}
      </span>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={`Remove the mount on ${p.m.target} from ${p.service}`}
        disabled={disabled}
        onClick={() => change(removeMount(p.service, p.m.target))}
      >
        <X />
      </Button>
    </li>
  )

  return (
    <>
      <div className="flex flex-col gap-2">
        <Heading>In this file</Heading>
        {model.volumes.length === 0 &&
        binds.length === 0 &&
        unnamed.length === 0 ? (
          <Quiet>
            Nothing is kept yet: whatever the containers write is lost when
            they're recreated. The Services tab suggests what to keep.
          </Quiet>
        ) : null}
        {model.volumes.map((v) => {
          const users = placed.filter((p) => p.m.source === v.key)
          return (
            <div
              key={v.key}
              className="flex flex-col gap-1.5 rounded-xl border border-border p-3"
            >
              <div className="flex items-start gap-2">
                <HardDrive className="mt-0.5 size-4 shrink-0 text-ash" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-mono text-body-sm font-medium">
                    {v.key}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {v.external
                      ? "A volume already on the server"
                      : "Made for the project"}
                    {users.length === 0 && " · not mounted anywhere"}
                  </span>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove the ${v.key} volume`}
                  disabled={disabled}
                  onClick={() => removeVol(v.key)}
                >
                  <Trash2 />
                </Button>
              </div>
              {users.length > 0 && (
                <ul className="flex flex-col gap-0.5 ps-6">
                  {users.map((p) => mountRow(p, false))}
                </ul>
              )}
              {users.length === 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  onClick={() => {
                    setSource(v.key)
                    targetRef.current?.focus()
                  }}
                >
                  <Plus />
                  Mount it in a service
                </Button>
              )}
            </div>
          )
        })}
        {binds.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="size-4 shrink-0 text-ash" />
              <span className="text-body-sm font-medium">
                Folders from the server
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 ps-6">
              {binds.map((p) => mountRow(p, true))}
            </ul>
            <span className="ps-6 text-caption text-ash">
              ./ paths are next to the compose file in the project's folder.
            </span>
          </div>
        )}
        {unnamed.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-warning/40 bg-warning/5 p-3">
            <span className="text-body-sm font-medium">Unnamed volumes</span>
            <ul className="flex flex-col gap-0.5">
              {unnamed.map((p) => mountRow(p, false))}
            </ul>
            <span className="text-caption text-muted-foreground">
              Easy to lose on a clean-up: give them a name instead.
            </span>
          </div>
        )}
      </div>

      <form
        className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <span className="text-body-sm font-medium">
          Mount a volume or folder
        </span>
        {model.services.length > 1 && (
          <Choice
            label="Service"
            value={chosen}
            items={model.services.map((s) => ({
              value: s.name,
              label: s.name,
            }))}
            onChange={setService}
          />
        )}
        <Input
          aria-label="Volume name or folder on the server"
          placeholder="Volume name, or ./folder"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono md:h-8 md:text-body-sm"
        />
        <Input
          ref={targetRef}
          aria-label="Path in the container"
          placeholder="Path in the container, e.g. /data"
          value={target}
          onChange={(e) => setTarget(e.target.value.trim())}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono md:h-8 md:text-body-sm"
        />
        <div className="flex items-center gap-2">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox renders the control inside */}
          <label className="flex min-h-8 flex-1 items-center gap-2 text-caption text-muted-foreground">
            <Checkbox checked={readOnly} onCheckedChange={setReadOnly} />
            Read-only
          </label>
          <Button type="submit" size="sm" disabled={disabled}>
            <Plus />
            Mount
          </Button>
        </div>
        {tried && problem && (
          <p className="text-caption text-destructive">{problem}</p>
        )}
        {!problem && source.trim() && !isPath(source.trim()) && (
          <Quiet>
            {(server ?? []).some((v) => v.name === source.trim())
              ? "Uses the volume already on the server, with its data."
              : declaredKeys.has(source.trim())
                ? "Shares the volume with the other services mounting it."
                : "A new volume, declared at the bottom of the file."}
          </Quiet>
        )}
      </form>

      <div className="flex flex-col gap-2">
        <Heading>On this server</Heading>
        {server === undefined ? (
          <Quiet>Reading the server's volumes…</Quiet>
        ) : others.length === 0 ? (
          <Quiet>No other named volumes.</Quiet>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {others.map((v) => (
              <li key={v.name} className="flex items-center gap-3 px-3 py-2">
                <HardDrive className="size-4 shrink-0 text-ash" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-body-sm">
                    {v.name}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {[
                      v.driver,
                      v.project && `project ${v.project}`,
                      v.used_by.length > 0
                        ? `used by ${v.used_by.length}`
                        : "not in use",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || model.services.length === 0}
                  onClick={() => {
                    setSource(v.name)
                    targetRef.current?.focus()
                  }}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

// ---- Variables --------------------------------------------------------------

function VariablesPanel({
  files,
  onFiles,
  showEnv,
}: Pick<Common, "files" | "onFiles"> & { showEnv: () => void }) {
  const r = envReport(files.compose, files.env)
  if (r.used.length === 0 && r.weak.length === 0 && r.unused.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <KeyRound className="size-5 text-ash" />
        <span className="text-body-sm font-medium">No variables yet</span>
        <Quiet>
          Write <code className="text-foreground">{"${NAME}"}</code> in the
          compose file and put its value in .env, so passwords stay out of the
          YAML. The suggestions on the Services tab do it for you.
        </Quiet>
        <Button size="sm" variant="outline" onClick={showEnv}>
          Open .env
        </Button>
      </div>
    )
  }
  return (
    <EnvHelper
      compose={files.compose}
      env={files.env}
      onEnv={(env) => onFiles({ ...files, env })}
      showEnv={showEnv}
    />
  )
}

// ---- Check ------------------------------------------------------------------

export function CheckPanel({
  children,
  pending,
  onCheck,
}: {
  children?: ReactNode
  pending: boolean
  onCheck: () => void
}) {
  return (
    <>
      {children ?? (
        <div className="flex flex-col items-start gap-2">
          <ListChecks className="size-5 text-ash" />
          <span className="text-body-sm font-medium">Check on the server</span>
          <Quiet>
            Runs <code className="text-foreground">docker compose config</code>{" "}
            on the server with these files and compares the ports with what's
            already listening. Nothing is saved or started.
          </Quiet>
        </div>
      )}
      <Button
        variant="outline"
        className="self-start"
        disabled={pending}
        onClick={onCheck}
      >
        <ListChecks />
        {pending ? "Checking…" : children ? "Check again" : "Check now"}
      </Button>
    </>
  )
}
