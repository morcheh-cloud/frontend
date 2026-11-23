"use client"

import {
  Check,
  CircleAlert,
  Globe,
  Info,
  LoaderCircle,
  Rocket,
  TriangleAlert,
  Warehouse,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { useDockerFleet } from "@/app/(panel)/containers/api"
import {
  Callout,
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ServerPicks } from "@/app/(panel)/databases/components/deploy/deploy-editor"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { AsideCard, EditorPage, SummaryList } from "@/components/editor-page"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBackOr } from "@/hooks/useBack"
import { useDebounced } from "@/hooks/useDebounced"
import { useIsPhone } from "@/hooks/useIsPhone"
import { type ApiError, fieldErrors } from "@/lib/api"
import type { DockerFleetServer, RegistrySettings } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCreateRegistry, usePreflight, useRegistryKinds } from "../api"
import {
  defaultSettings,
  kindMeta,
  kindNames,
  type RegistryKindName,
  RegistryLogo,
  registryHref,
} from "./meta"

type Form = {
  kind: RegistryKindName
  server: string
  name: string
  note: string
  access: "domain" | "port"
  domain: string
  https: boolean
  email: string
  port: string
  settings: RegistrySettings
  scopesText: string
}

const domainRe = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

function startForm(kind: RegistryKindName, server: string): Form {
  return {
    kind,
    server,
    name: kind === "harbor" ? "Harbor" : "npm",
    note: "",
    access: "domain",
    domain: "",
    https: true,
    email: "",
    port: "",
    settings: defaultSettings(kind),
    scopesText: "",
  }
}

export function RegistryEditor() {
  const phone = useIsPhone()
  const params = useSearchParams()
  const router = useRouter()
  const back = useBackOr("/registries")
  const jobs = useJobActions()
  const { workspace } = useWorkspace()
  const { serverLevel } = useAccess()
  const kinds = useRegistryKinds()
  const fleet = useDockerFleet()
  const create = useCreateRegistry()

  const startKind = params.get("kind") === "verdaccio" ? "verdaccio" : "harbor"
  const [form, setForm] = useState<Form>(() =>
    startForm(startKind, params.get("server") ?? ""),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const setSettings = (patch: Partial<RegistrySettings>) =>
    setForm((f) => ({ ...f, settings: { ...f.settings, ...patch } }))

  const all = (fleet.data?.servers ?? []).filter(
    (s) => !workspace || s.workspace_id === workspace.id,
  )
  const allowed = (s: DockerFleetServer) =>
    atLeast(serverLevel(s.server_id, s.workspace_id), "engineer")
  const usable = all.filter((s) => s.state === "ready" && allowed(s))
  const server = form.server || (usable.length === 1 ? usable[0].server_id : "")
  const picked = all.find((s) => s.server_id === server)

  const kindInfo = kinds.data?.items.find((k) => k.kind === form.kind)
  const domain =
    form.access === "domain" ? form.domain.trim().toLowerCase() : ""
  const port = Number(form.port) || 0
  const checkDomain = useDebounced(domain, 500)
  const pf = usePreflight(
    server,
    form.kind,
    port,
    domainRe.test(checkDomain) ? checkDomain : "",
    form.name,
  )
  const pre = pf.data

  const problems: Record<string, string> = {}
  if (!server) problems.server = "Pick a server"
  if (!form.name.trim()) problems.name = "Give it a name"
  if (form.access === "domain" && !domainRe.test(domain))
    problems.domain = domain
      ? "Give a name like registry.example.com"
      : "Give the domain clients will use"
  if (form.port && (port < 1 || port > 65535))
    problems.port = "A port is 1 to 65535"
  const blocking = pre?.problems ?? []

  function submit() {
    if (Object.keys(problems).length) {
      setErrors(problems)
      return
    }
    const settings: RegistrySettings = { ...form.settings }
    if (form.kind === "verdaccio")
      settings.scopes = form.scopesText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    create.mutate(
      {
        server_id: server,
        kind: form.kind,
        name: form.name.trim(),
        note: form.note.trim(),
        port: port || pre?.port || 0,
        domain,
        https: !!domain && form.https,
        email: form.email.trim(),
        settings,
      },
      {
        onSuccess: (out) => {
          jobs.track(out.job)
          router.replace(registryHref(out.registry.id))
        },
        onError: (e) => {
          const f = fieldErrors(e)
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(f))
            mapped[k.replace(/^settings\./, "")] = v
          setErrors(mapped)
          toast.error((e as ApiError).message)
        },
      },
    )
  }

  const err = (k: string) =>
    errors[k] ?? (Object.keys(errors).length ? problems[k] : undefined)
  const meta = kindMeta[form.kind]
  if (phone === null) return null

  const sections = (
    <>
      <Section
        title="What to deploy"
        hint="Both are free and have no usage limits."
        phone={phone}
      >
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Registry"
        >
          {kindNames.map((k) => {
            const m = kindMeta[k]
            const on = form.kind === k
            return (
              // biome-ignore lint/a11y/useSemanticElements: a card that acts as a radio
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() =>
                  setForm((f) => ({
                    ...startForm(k, f.server),
                    domain: f.domain,
                    access: f.access,
                    https: f.https,
                    email: f.email,
                  }))
                }
                className={cn(
                  "flex min-w-0 flex-col gap-3 rounded-2xl border p-4 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "border-brand bg-brand-soft/40"
                    : "border-border hover:border-mist",
                )}
              >
                <span className="flex items-center gap-3">
                  <RegistryLogo kind={k} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm font-medium">
                      {m.label}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {m.holds}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      on
                        ? "border-brand bg-brand text-primary-foreground"
                        : "border-mist",
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                </span>
                <span className="text-caption text-muted-foreground">
                  {m.blurb}
                </span>
                <span className="text-caption text-ash">
                  {m.license}
                  {kinds.data &&
                    (() => {
                      const ki = kinds.data.items.find((x) => x.kind === k)
                      return ki
                        ? ` · ${ki.version} · ${ki.memory_mb >= 1024 ? `${ki.memory_mb / 1024} GB` : `${ki.memory_mb} MB`} memory`
                        : ""
                    })()}
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="Where it runs"
        hint="A server with Docker. It becomes a compose project there, listed in Containers."
        phone={phone}
      >
        <ServerPicks
          loading={fleet.isPending}
          servers={all}
          allowed={allowed}
          value={server}
          onChange={(s) => set({ server: s })}
          error={err("server")}
          needMb={kindInfo?.memory_mb}
          phone={phone}
        />
        {server && (
          <PreflightChecks
            loading={pf.isPending || pf.isFetching}
            error={pf.error}
            pre={pre}
          />
        )}
      </Section>

      <Section
        title="Address"
        hint="What clients pull from. A domain goes through the server's reverse proxy with HTTPS."
        phone={phone}
      >
        <Segmented
          label="How it's reached"
          value={form.access}
          onChange={(v) => set({ access: v })}
          items={[
            { value: "domain", label: "A domain (recommended)" },
            { value: "port", label: "The server's port" },
          ]}
        />
        {form.access === "domain" ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="reg-domain">Domain</Label>
              <Input
                id="reg-domain"
                value={form.domain}
                onChange={(e) => set({ domain: e.target.value })}
                placeholder={
                  form.kind === "harbor"
                    ? "registry.example.com"
                    : "npm.example.com"
                }
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
                aria-invalid={!!err("domain")}
              />
              <FieldError text={err("domain")} />
              {picked && (
                <p className="text-caption text-muted-foreground">
                  Point it at{" "}
                  <span className="font-mono">{picked.address}</span> in your
                  DNS first; a certificate needs it.
                </p>
              )}
            </div>
            <ToggleRow
              id="reg-https"
              label="HTTPS with Let's Encrypt"
              hint="A free certificate, renewed by itself. Docker refuses plain http registries unless told otherwise."
              checked={form.https}
              onChange={(v) => set({ https: v })}
            />
            {form.https && (
              <div className="grid gap-2">
                <Label htmlFor="reg-email">
                  Email for expiry warnings (optional)
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="ops@example.com"
                />
              </div>
            )}
            {pre && pre.proxies.filter((p) => p.usable).length === 0 && (
              <Callout icon={<Info />} tone="warning">
                This server has no reverse proxy set up yet.{" "}
                <Link
                  href="/proxy"
                  className="text-brand underline-offset-4 hover:underline"
                >
                  Add one in Reverse proxy
                </Link>{" "}
                (one click), or use the server's port instead.
              </Callout>
            )}
          </>
        ) : (
          <Callout icon={<TriangleAlert />} tone="warning">
            It answers plain http on the port, for a private network only.
            Docker clients need it under{" "}
            <span className="font-mono">insecure-registries</span>, and logins
            travel unencrypted.
          </Callout>
        )}
        <div className="grid gap-2 sm:max-w-60">
          <Label htmlFor="reg-port">Port on the server</Label>
          <Input
            id="reg-port"
            inputMode="numeric"
            value={form.port}
            onChange={(e) => set({ port: e.target.value.replace(/\D/g, "") })}
            placeholder={String(pre?.port ?? kindInfo?.default_port ?? "")}
            aria-invalid={!!err("port")}
          />
          <FieldError text={err("port")} />
          <p className="text-caption text-muted-foreground">
            {form.access === "domain"
              ? "Only on 127.0.0.1: the proxy reaches it there. Empty = a free one."
              : "Opened on every address of the server. Empty = a free one."}
          </p>
        </div>
      </Section>

      <Section
        title="Settings"
        hint="You can change these later on its page."
        phone={phone}
      >
        {form.kind === "harbor" ? (
          <>
            <ToggleRow
              id="reg-mirror"
              label="Docker Hub cache"
              hint={`Pull ${form.settings.mirror_project || "dockerhub"}/library/nginx from here: fetched once, then served from your network (no Docker Hub limits).`}
              checked={form.settings.mirror}
              onChange={(v) => setSettings({ mirror: v })}
            />
            {form.settings.mirror && (
              <div className="grid gap-2 sm:max-w-80">
                <Label htmlFor="reg-mirror-project">Cache project</Label>
                <Input
                  id="reg-mirror-project"
                  value={form.settings.mirror_project ?? ""}
                  onChange={(e) =>
                    setSettings({
                      mirror_project: e.target.value.toLowerCase(),
                    })
                  }
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={!!err("mirror_project")}
                />
                <FieldError text={err("mirror_project")} />
              </div>
            )}
            <ToggleRow
              id="reg-public"
              label="Anyone can pull"
              hint={
                form.settings.public
                  ? "No login needed to pull; pushing still needs one."
                  : "Pulling needs a login (a robot account for servers and CI)."
              }
              checked={form.settings.public}
              onChange={(v) => setSettings({ public: v })}
            />
            <ToggleRow
              id="reg-cleanup"
              label="Weekly cleanup"
              hint="Every Sunday at 03:00, frees the space of deleted and untagged images."
              checked={!!form.settings.cleanup}
              onChange={(v) => setSettings({ cleanup: v })}
            />
            <ToggleRow
              id="reg-scanner"
              label="Vulnerability scanner (Trivy)"
              hint="Scans images for known CVEs. Needs about 1 GB more memory and downloads its database from GitHub."
              checked={!!form.settings.scanner}
              onChange={(v) => setSettings({ scanner: v })}
            />
          </>
        ) : (
          <>
            <ToggleRow
              id="reg-mirror"
              label="npmjs mirror"
              hint="A package installed once is kept here: installs keep working when npmjs is slow or out of reach."
              checked={form.settings.mirror}
              onChange={(v) => setSettings({ mirror: v })}
            />
            {form.settings.mirror && (
              <div className="grid gap-2">
                <Label htmlFor="reg-upstream">Fetch from</Label>
                <Input
                  id="reg-upstream"
                  value={form.settings.upstream ?? ""}
                  onChange={(e) => setSettings({ upstream: e.target.value })}
                  placeholder="https://registry.npmjs.org/"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="url"
                  aria-invalid={!!err("upstream")}
                />
                <FieldError text={err("upstream")} />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reg-scopes">Private scopes</Label>
              <Input
                id="reg-scopes"
                value={form.scopesText}
                onChange={(e) => set({ scopesText: e.target.value })}
                placeholder="@company, @team"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!err("scopes")}
              />
              <FieldError text={err("scopes") ?? err("scopes[0]")} />
              <p className="text-caption text-muted-foreground">
                Packages under these come only from here, never from the mirror,
                so nobody can slip in a public package with your name.
              </p>
            </div>
            <ToggleRow
              id="reg-public"
              label="Anyone can install"
              hint={
                form.settings.public
                  ? "No login needed to install; publishing still needs one."
                  : "Installing needs a login too."
              }
              checked={form.settings.public}
              onChange={(v) => setSettings({ public: v })}
            />
          </>
        )}
      </Section>

      <Section
        title="Name"
        hint="How it shows in Morche and Containers."
        phone={phone}
      >
        <div className="grid gap-2">
          <Label htmlFor="reg-name">Name</Label>
          <Input
            id="reg-name"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            maxLength={100}
            aria-invalid={!!err("name")}
          />
          <FieldError text={err("name")} />
          {pre?.project && (
            <p className="text-caption text-muted-foreground">
              Its folder: <span className="font-mono">{pre.dir}</span>
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-note">Note (optional)</Label>
          <Textarea
            id="reg-note"
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            maxLength={1000}
            rows={2}
          />
        </div>
      </Section>
    </>
  )

  const plan = <WhatHappens form={form} domain={domain} />
  const deployButton = (
    <Button
      onClick={submit}
      disabled={
        create.isPending || !pre || pf.isFetching || blocking.length > 0
      }
      className="max-md:h-11"
    >
      {create.isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <Rocket />
      )}
      Deploy {meta.label}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border px-2 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Cancel"
            onClick={back}
          >
            <X className="size-5" />
          </Button>
          <h1 className="truncate text-body font-medium">New registry</h1>
        </header>
        {sections}
        <div className="px-4 py-5">{plan}</div>
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] border-t border-border bg-background p-4">
          <div className="grid">{deployButton}</div>
          {blocking[0] && (
            <p className="mt-2 text-caption text-destructive">{blocking[0]}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={<Warehouse />}
      title="New registry"
      status={
        blocking[0] ? (
          <span className="text-destructive">{blocking[0]}</span>
        ) : (
          `${meta.label}${picked ? ` on ${picked.name}` : ""}${domain ? ` · ${domain}` : ""}`
        )
      }
      onSave={submit}
      actions={
        <>
          <Button variant="ghost" onClick={back}>
            Cancel
          </Button>
          {deployButton}
        </>
      }
      aside={
        <>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                [
                  "Registry",
                  `${meta.label}${kindInfo ? ` ${kindInfo.version}` : ""}`,
                ],
                ["Server", picked?.name ?? ""],
                [
                  "Address",
                  domain
                    ? `${form.https ? "https" : "http"}://${domain}`
                    : picked
                      ? `http://${picked.address}:${port || pre?.port || ""}`
                      : "",
                ],
                [
                  "Mirror",
                  form.settings.mirror
                    ? form.kind === "harbor"
                      ? "Docker Hub"
                      : "npmjs"
                    : "Off",
                ],
                ["Folder", pre?.dir ?? "", true],
              ]}
            />
          </AsideCard>
          <AsideCard title="What Morche will do">{plan}</AsideCard>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

function PreflightChecks({
  loading,
  error,
  pre,
}: {
  loading: boolean
  error: Error | null
  pre: ReturnType<typeof usePreflight>["data"]
}) {
  if (error && !pre)
    return (
      <Callout icon={<CircleAlert />} tone="warning">
        Couldn't check the server: {error.message}
      </Callout>
    )
  if (!pre)
    return (
      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" />
        Checking the server…
      </p>
    )
  const facts: [string, boolean, string][] = [
    ["Docker", !!pre.docker, pre.docker ? pre.docker : "Not installed"],
    ["Compose", !!pre.compose, pre.compose || "Not installed"],
    [
      "Memory",
      pre.memory_mb > 0,
      pre.memory_mb ? `${(pre.memory_mb / 1024).toFixed(1)} GB` : "Unknown",
    ],
    [
      "Free disk",
      pre.free_gb > 0,
      pre.free_gb ? `${pre.free_gb} GB` : "Unknown",
    ],
    ["Port", pre.port_free, `${pre.port} ${pre.port_free ? "free" : "taken"}`],
  ]
  return (
    <div
      className={cn("grid gap-3 transition-opacity", loading && "opacity-60")}
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {facts.map(([label, ok, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-subtle px-3 py-2">
            <dt className="text-caption text-ash">{label}</dt>
            <dd
              className={cn(
                "flex items-center gap-1 truncate text-body-sm font-medium",
                !ok && "text-destructive",
              )}
            >
              {ok ? (
                <Check className="size-3.5 shrink-0 text-success" />
              ) : (
                <X className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{value}</span>
            </dd>
          </div>
        ))}
      </dl>
      {pre.problems.map((p) => (
        <Callout key={p} icon={<CircleAlert />} tone="warning">
          <span className="text-destructive">{p}</span>
        </Callout>
      ))}
      {pre.warnings.map((w) => (
        <Callout key={w} icon={<Info />}>
          {w}
        </Callout>
      ))}
    </div>
  )
}

// The steps the deploy job takes, in plain words.
function WhatHappens({ form, domain }: { form: Form; domain: string }) {
  const harbor = form.kind === "harbor"
  const steps = [
    harbor
      ? "Download Harbor's installer and write harbor.yml"
      : "Write compose.yaml and Verdaccio's config",
    "Make an admin with a long random password (kept sealed, Owners can see it)",
    "Pull the images and start it",
    form.settings.mirror &&
      (harbor
        ? `Make the ${form.settings.mirror_project || "dockerhub"} cache project`
        : "Turn on the npmjs mirror"),
    domain && `Add ${domain} on the server's reverse proxy`,
    domain && form.https && "Get a Let's Encrypt certificate and force https",
    harbor && "Add a robot login to Containers › Registries",
  ].filter(Boolean) as string[]
  return (
    <ol className="grid gap-2 text-body-sm">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-2.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-caption text-muted-foreground">
            {i + 1}
          </span>
          <span className="min-w-0">{s}</span>
        </li>
      ))}
      <li className="flex items-center gap-2.5 text-caption text-ash">
        <Globe className="size-3.5" />
        {harbor ? "Takes about 3–10 minutes." : "Takes about a minute."}
      </li>
    </ol>
  )
}
