"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Layers,
  Loader2,
  Lock,
  RotateCcw,
  Server,
  Settings2,
} from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { storagesQuery } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { DockerServerSettings, DockerSettings } from "@/lib/services"
import { useChannels } from "../../alerts/api"
import { Empty, Notices } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useDockerServerSettings,
  useDockerSettings,
  useSaveDockerServerSettings,
  useSaveDockerSettings,
} from "../api"
import { useDockerEnv } from "../env"
import { type WsCtx, WsPage } from "./env-page"
import { useDockerWorkspaceCan } from "./permissions"
import {
  defaults,
  type Overrides,
  overridesOf,
  problemsOf,
  type SettingKey,
  type Settings,
  same,
  settingKeys,
  settingsOf,
  tidy,
} from "./settings-model"
import { type FieldState, SideNav, sections } from "./settings-parts"
import { ScopeBar, type ScopeEnv } from "./settings-scope"
import { type Ctl, SettingsSections } from "./settings-sections"
import {
  downloadSettings,
  ImportDialog,
  type ImportPick,
} from "./settings-transfer"

export function SettingsPage() {
  return <WsPage title="Settings">{(ctx) => <SettingsView {...ctx} />}</WsPage>
}

// /containers/settings: the workspace's container settings, and what each
// environment sets for itself on top. Owners change them; everyone else
// reads.
function SettingsView({ ws, phone }: WsCtx) {
  const query = useDockerSettings(ws.id)
  const envQuery = useDockerServerSettings(ws.id)
  if (query.isPending || envQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ))}
      </div>
    )
  }
  const failed = query.error ?? envQuery.error
  if (failed || !query.data || !envQuery.data) {
    return (
      <Empty
        icon={Settings2}
        title="Couldn't read the settings"
        body={failed?.message ?? "Try again in a moment."}
        action={
          <Button
            variant="outline"
            onClick={() => {
              query.refetch()
              envQuery.refetch()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }
  return (
    <SettingsForm
      ws={ws}
      phone={phone}
      saved={query.data}
      envSaved={envQuery.data}
    />
  )
}

type Errors = Record<string, Record<string, string>>

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

function SettingsForm({
  ws,
  phone,
  saved,
  envSaved,
}: WsCtx & { saved: DockerSettings; envSaved: DockerServerSettings[] }) {
  const can = useDockerWorkspaceCan(ws.id)
  const edit = can.own
  const saveWs = useSaveDockerSettings()
  const saveEnv = useSaveDockerServerSettings()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [general, setGeneral] = useState<string>()
  const [importing, setImporting] = useOpen("docker-settings-import")
  const [scopeParam, setScopeParam] = useQueryState(
    "scope",
    parseAsString.withDefault(""),
  )

  // Environments: every server with an engine, plus any that still has
  // settings of its own saved.
  const { servers } = useDockerEnv()
  const savedById = new Map(envSaved.map((e) => [e.server_id, e]))
  const envs = [
    ...servers.map((s) => ({ id: s.server_id, name: s.name })),
    ...envSaved
      .filter((e) => !servers.some((s) => s.server_id === e.server_id))
      .map((e) => ({ id: e.server_id, name: e.server_name })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  const savedWs = settingsOf(saved)
  const savedEnv = (id: string) => overridesOf(savedById.get(id)?.overrides)

  // Drafts: the workspace's whole set (null = what's saved), and the
  // overrides of each environment that was touched.
  const [wsDraft, setWsDraft] = useState<Settings | null>(null)
  const [envDrafts, setEnvDrafts] = useState<Record<string, Overrides>>({})
  const wsValue = wsDraft ?? savedWs
  const envValue = (id: string) => envDrafts[id] ?? savedEnv(id)

  const wsChanged = settingKeys.filter((k) => !same(wsValue[k], savedWs[k]))
  const envChanged = (id: string) => {
    const now = envValue(id)
    const was = savedEnv(id)
    return settingKeys.filter((k) => !same(now[k], was[k]))
  }
  const dirtyEnvs = envs.filter((e) => envChanged(e.id).length > 0)
  const changeCount =
    wsChanged.length +
    dirtyEnvs.reduce((n, e) => n + envChanged(e.id).length, 0)
  const dirty = changeCount > 0

  const env = envs.find((e) => e.id === scopeParam)
  const scope = env?.id ?? ""
  const own = env ? envValue(env.id) : {}
  const value: Settings = env ? { ...wsValue, ...own } : wsValue
  const scopeChanged = env ? envChanged(env.id) : wsChanged

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const clearErrors = (id: string) =>
    setErrors((e) => {
      if (!e[id]) return e
      const { [id]: _, ...rest } = e
      return rest
    })

  const setWs = (patch: Overrides) =>
    setWsDraft((d) => ({ ...(d ?? savedWs), ...patch }))
  const setEnv = (id: string, next: (o: Overrides) => Overrides) =>
    setEnvDrafts((d) => ({ ...d, [id]: next(d[id] ?? savedEnv(id)) }))

  // A change in an environment becomes its own setting, unless it puts
  // every key back to the workspace's value: then it follows again. Keys
  // changed together (a log size and its file count) stay together.
  const set = (patch: Overrides) => {
    setGeneral(undefined)
    clearErrors(scope)
    if (!env) return setWs(patch)
    const keys = Object.keys(patch) as SettingKey[]
    const asWs = keys.every((k) => same(patch[k], wsValue[k]))
    setEnv(env.id, (o) => {
      const next: Overrides = { ...o, ...patch }
      if (asWs) for (const k of keys) delete next[k]
      return next
    })
  }
  const drop = (keys: SettingKey[]) => {
    if (!env) return
    clearErrors(scope)
    setEnv(env.id, (o) => {
      const next = { ...o }
      for (const k of keys) delete next[k]
      return next
    })
  }

  const field = (...keys: SettingKey[]): FieldState => {
    const changed = keys.some((k) => scopeChanged.includes(k))
    if (!env) {
      const off = keys.some((k) => !same(wsValue[k], defaults[k]))
      return {
        changed,
        reset:
          edit && off
            ? {
                label: "Use the default",
                run: () =>
                  set(
                    Object.fromEntries(
                      keys.map((k) => [k, defaults[k]]),
                    ) as Overrides,
                  ),
              }
            : undefined,
      }
    }
    const mine = keys.some((k) => k in own)
    return {
      changed,
      own: mine ? "This environment" : undefined,
      reset:
        edit && mine
          ? { label: "Use the workspace's", run: () => drop(keys) }
          : undefined,
    }
  }
  const problems = problemsOf(value)
  const error = (k: SettingKey) => problems[k] ?? errors[scope]?.[k]

  const submit = async () => {
    // Every scope is checked before anything is sent.
    const bad: string[] = []
    if (wsChanged.length && Object.keys(problemsOf(wsValue)).length)
      bad.push("")
    for (const e of dirtyEnvs) {
      if (Object.keys(problemsOf({ ...wsValue, ...envValue(e.id) })).length)
        bad.push(e.id)
    }
    if (bad.length) {
      setScopeParam(bad[0] || null)
      toast.error("Fix the marked settings first")
      return
    }
    setSaving(true)
    setGeneral(undefined)
    const failed: Errors = {}
    const failedNames: string[] = []
    let message: string | undefined
    const note = (id: string, name: string, err: unknown) => {
      failed[id] = fieldErrors(err)
      failedNames.push(name)
      if (!Object.keys(failed[id]).length)
        message ??= err instanceof Error ? err.message : String(err)
    }
    if (wsChanged.length) {
      try {
        await saveWs.mutateAsync({ ws: ws.id, ...tidy(wsValue) })
        setWsDraft(null)
      } catch (err) {
        note("", "the workspace", err)
      }
    }
    for (const e of dirtyEnvs) {
      try {
        await saveEnv.mutateAsync({
          ws: ws.id,
          server: e.id,
          overrides: tidy(envValue(e.id)),
        })
        setEnvDrafts(({ [e.id]: _, ...rest }) => rest)
      } catch (err) {
        note(e.id, e.name, err)
      }
    }
    setSaving(false)
    setErrors(failed)
    setGeneral(message)
    const first = Object.keys(failed)[0]
    if (first === undefined) {
      toast.success("Settings saved")
      return
    }
    setScopeParam(first || null)
    toast.error(`Couldn't save ${failedNames.join(", ")}`)
  }

  const discard = () => {
    setWsDraft(null)
    setEnvDrafts({})
    setErrors({})
    setGeneral(undefined)
  }

  const channels = useChannels(ws.id)
  const storages = useQuery(storagesQuery)
  const exportFile = () => {
    downloadSettings(
      ws,
      savedWs,
      envs.map((e) => ({
        server_id: e.id,
        server_name: e.name,
        overrides: savedEnv(e.id),
      })),
    )
    if (dirty)
      toast.info("The file has what's saved; unsaved changes aren't in it")
  }
  const load = (p: ImportPick) => {
    if (p.workspace) setWs(p.workspace)
    if (p.environments.length) {
      setEnvDrafts((d) => {
        const next = { ...d }
        for (const e of p.environments) next[e.server_id] = e.overrides
        return next
      })
    }
    toast.success("Loaded into the form", {
      description: "Look it over, then Save to apply it.",
    })
  }

  const scopeEnvs: ScopeEnv[] = envs.map((e) => ({
    id: e.id,
    name: e.name,
    own: Object.keys(envValue(e.id)).length,
    dirty: envChanged(e.id).length > 0,
  }))
  const ownCount = Object.keys(own).length
  const notDefault = settingKeys.some((k) => !same(wsValue[k], defaults[k]))
  const updatedAt = env ? savedById.get(env.id)?.updated_at : saved.updated_at

  const ctl: Ctl = {
    ws,
    phone,
    edit,
    env: env && {
      id: env.id,
      name: env.name,
      prune: savedById.get(env.id)?.prune,
    },
    value,
    set,
    field,
    error,
  }

  const body = (
    <div className="flex min-w-0 flex-col gap-8 max-md:gap-6">
      <div className="flex flex-col gap-3">
        <ScopeBar
          phone={phone}
          workspace={ws.name}
          envs={scopeEnvs}
          scope={scope}
          wsDirty={wsChanged.length > 0}
          onScope={(id) => setScopeParam(id || null)}
          onExport={exportFile}
          onImport={edit ? () => setImporting(true) : undefined}
        />
        <ScopeNote
          env={env}
          workspace={ws.name}
          own={ownCount}
          edit={edit}
          onFollow={() => env && setEnv(env.id, () => ({}))}
        />
      </div>
      {!edit && (
        <Notices
          className="max-md:-mx-4 max-md:mt-0"
          notes={[
            {
              key: "read-only",
              title: "Only a workspace Owner can change these",
              body: `You can read the container settings of ${ws.name}.`,
            },
          ]}
        />
      )}
      <fieldset
        disabled={!edit || saving}
        className="flex min-w-0 flex-col gap-8 max-md:gap-6"
      >
        <SettingsSections key={scope} ctl={ctl} />
      </fieldset>

      {general && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm text-destructive"
        >
          {general}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-ash">
        {!edit && (
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5" />
            Read only
          </span>
        )}
        {updatedAt ? (
          <span>Last changed {timeAgo(updatedAt)}</span>
        ) : env ? (
          <span>Never set for this environment</span>
        ) : (
          <span>Never changed: these are the defaults</span>
        )}
        {edit && !env && notDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto text-muted-foreground max-md:h-11"
            disabled={saving}
            onClick={() => setWsDraft(defaults)}
          >
            <RotateCcw />
            Use all defaults
          </Button>
        )}
      </div>

      {edit && dirty && (
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-30 -mx-4 flex items-center gap-2 border-t border-border bg-background px-4 py-2 md:bottom-6 md:mx-0 md:w-fit md:rounded-2xl md:border md:bg-card md:p-1.5 md:ps-4 md:shadow-md">
          <p
            role="status"
            className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"
          >
            {plural(changeCount, "unsaved change")}
            {dirtyEnvs.length + (wsChanged.length ? 1 : 0) > 1 && (
              <span className="text-ash max-md:hidden">
                {" "}
                in {dirtyEnvs.length + (wsChanged.length ? 1 : 0)} places
              </span>
            )}
          </p>
          <Button
            variant="ghost"
            className="max-md:h-11"
            disabled={saving}
            onClick={discard}
          >
            Discard
          </Button>
          <Button className="max-md:h-11" disabled={saving} onClick={submit}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      )}

      {edit && (
        <ImportDialog
          open={importing}
          onOpenChange={setImporting}
          context={{
            servers: envs,
            channels: (channels.data ?? []).map((c) => c.id),
            storages: (storages.data?.items ?? [])
              .filter((s) => s.workspace_id === ws.id && !s.read_only)
              .map((s) => s.id),
          }}
          onLoad={load}
        />
      )}
    </div>
  )

  if (phone) return body
  return (
    <div className="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] 2xl:grid-cols-[14rem_minmax(0,1fr)]">
      <SideNav
        mark={(id) => {
          const keys = (sections.find((s) => s.id === id)?.keys ??
            []) as readonly SettingKey[]
          return {
            changed: keys.some((k) => scopeChanged.includes(k)),
            own: env ? keys.filter((k) => k in own).length : 0,
          }
        }}
      />
      {body}
    </div>
  )
}

// What the scope in view means, under the picker.
function ScopeNote({
  env,
  workspace,
  own,
  edit,
  onFollow,
}: {
  env?: { id: string; name: string }
  workspace: string
  own: number
  edit: boolean
  onFollow: () => void
}) {
  if (!env) {
    return (
      <p className="flex items-start gap-2 text-caption text-muted-foreground">
        <Layers className="mt-px size-3.5 shrink-0 text-ash" />
        Every environment of {workspace} uses these, unless it sets one for
        itself.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground">
      <Server className="size-3.5 shrink-0 text-ash" />
      <span className="min-w-0 flex-1">
        {own === 0 ? (
          <>
            <span className="font-medium text-foreground">{env.name}</span>{" "}
            follows the workspace. Change a setting here to set it for this
            environment only.
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{env.name}</span>{" "}
            follows the workspace except for {plural(own, "setting")} of its
            own, marked below.
          </>
        )}
      </span>
      {edit && own > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="-my-1 text-brand max-md:h-11"
          onClick={onFollow}
        >
          <RotateCcw />
          Follow the workspace for everything
        </Button>
      )}
    </div>
  )
}
