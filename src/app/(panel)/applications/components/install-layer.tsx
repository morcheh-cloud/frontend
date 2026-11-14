"use client"

import { CircleCheck, CircleX, Info, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import { Labeled } from "@/app/(panel)/scripts/components/run-layer"
import { ServerChecklist } from "@/app/(panel)/servers/components/server-checklist"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SheetTitle } from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import type { Recipe, RecipeParam, SoftwarePreflight } from "@/lib/services"
import { cn } from "@/lib/utils"
import { usePreflight, useStartSoftwareRun } from "../api"
import { kindLabels, RecipeIcon, runHref } from "./meta"
import { Layer, LayerBody, LayerFooter, Section, SwitchRow } from "./parts"
import { useSoftwareCan } from "./permissions"

export type InstallPreset = {
  servers?: { id: string; name: string }[]
}

export function InstallLayer({
  open,
  onOpenChange,
  recipe,
  preset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: Recipe | null
  preset?: InstallPreset
}) {
  const title = recipe ? `Install ${recipe.name}` : "Install"
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={recipe?.summary}
      header={
        recipe && (
          <div className="flex items-center gap-3">
            <RecipeIcon recipe={recipe} size="sm" />
            <div className="min-w-0">
              <SheetTitle className="text-body">{title}</SheetTitle>
              <p className="text-caption text-ash">{kindLabels[recipe.kind]}</p>
            </div>
          </div>
        )
      }
    >
      {recipe && (
        <InstallForm
          key={`${recipe.id}-${open}`}
          recipe={recipe}
          preset={preset}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Layer>
  )
}

function initialValues(recipe: Recipe) {
  const v: Record<string, string> = {}
  for (const p of recipe.params ?? []) {
    v[p.name] = p.default ?? (p.type === "bool" ? "false" : "")
  }
  return v
}

function InstallForm({
  recipe,
  preset,
  onDone,
}: {
  recipe: Recipe
  preset?: InstallPreset
  onDone: () => void
}) {
  const phone = !!useIsPhone()
  const router = useRouter()
  const jobs = useJobActions()
  const can = useSoftwareCan()
  const start = useStartSoftwareRun()
  const params = recipe.params ?? []

  const [servers, setServers] = useState(
    () => new Map((preset?.servers ?? []).map((s) => [s.id, s.name])),
  )
  const [values, setValues] = useState(() => initialValues(recipe))
  const [keepGoing, setKeepGoing] = useState(true)
  const [parallel, setParallel] = useState("5")
  const [touched, setTouched] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // The check waits for typing to stop.
  const ids = [...servers.keys()].sort()
  const checkKey = JSON.stringify({ ids, values })
  const [checked, setChecked] = useState<string>(checkKey)
  useEffect(() => {
    const t = setTimeout(() => setChecked(checkKey), 500)
    return () => clearTimeout(t)
  }, [checkKey])
  const body = JSON.parse(checked) as {
    ids: string[]
    values: Record<string, string>
  }
  const preflight = usePreflight(
    body.ids.length
      ? {
          recipe_id: recipe.id,
          server_ids: body.ids,
          params: given(params, body.values),
        }
      : null,
  )
  const results = (preflight.data ?? []).filter((r) => servers.has(r.server_id))
  const blocked = results.filter((r) => !r.ok)

  const missing = params.filter(
    (p) => p.required && !p.generate && !values[p.name]?.trim(),
  )
  const n = servers.size

  const install = () => {
    setTouched(true)
    if (n === 0 || missing.length > 0 || blocked.length > 0) return
    const parallelN = Number(parallel)
    start.mutate(
      {
        action: "install",
        server_ids: [...servers.keys()],
        recipes: [recipe.id],
        params: given(params, values),
        options: {
          stop_on_failure: n > 1 ? !keepGoing : undefined,
          parallel:
            n > 1 && Number.isInteger(parallelN) && parallelN > 0
              ? Math.min(parallelN, 20)
              : undefined,
        },
      },
      {
        onSuccess: ({ run, job }) => {
          jobs.track(job)
          onDone()
          router.push(runHref(run.id))
        },
        onError: (err) => {
          const fe = fieldErrors(err)
          setErrors(fe)
          if (Object.keys(fe).length === 0) toast.error(err.message)
        },
      },
    )
  }

  const leaveOut = () => {
    const next = new Map(servers)
    for (const r of blocked) next.delete(r.server_id)
    setServers(next)
  }

  return (
    <>
      <LayerBody>
        {phone && (
          <div className="flex items-start gap-3">
            <RecipeIcon recipe={recipe} />
            <p className="text-body-sm text-muted-foreground">
              {recipe.summary}
            </p>
          </div>
        )}

        <Section
          title={n ? `Servers · ${n}` : "Servers"}
          aside="Only servers where you have Engineer access are listed."
        >
          <div className="rounded-2xl border border-border">
            <ServerChecklist
              value={servers}
              onChange={setServers}
              phone={phone}
              canPick={(s) =>
                can.installOn({ server_id: s.id, workspace_id: s.workspace_id })
              }
            />
          </div>
          {touched && n === 0 && (
            <p className="text-caption text-destructive">Tick a server.</p>
          )}
        </Section>

        {n > 0 && (
          <Section
            title="Before it starts"
            aside={
              preflight.isFetching ? (
                <span className="inline-flex items-center gap-1">
                  <LoaderCircle className="size-3 animate-spin" />
                  Checking the servers…
                </span>
              ) : (
                "Nothing is changed by this check."
              )
            }
          >
            {preflight.isError && (
              <Callout title="Couldn't check the servers" warn>
                {preflight.error.message}
              </Callout>
            )}
            {blocked.length > 0 && (
              <Callout
                title={`${blocked.length} of ${n} ${n === 1 ? "server" : "servers"} can't take it`}
                warn
                action={
                  blocked.length < n && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="max-md:h-11"
                      onClick={leaveOut}
                    >
                      Leave them out
                    </Button>
                  )
                }
              >
                Fix what's listed below, or leave those servers out.
              </Callout>
            )}
            {results.length > 0 && (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {results.map((r) => (
                  <PreflightRow key={r.server_id} r={r} />
                ))}
              </ul>
            )}
          </Section>
        )}

        {params.length > 0 && (
          <Section title="Settings" aside="The same on every server.">
            <div className="grid gap-4 md:grid-cols-2">
              {params.map((p) => (
                <ParamField
                  key={p.name}
                  p={p}
                  value={values[p.name] ?? ""}
                  onChange={(v) => {
                    setValues((old) => ({ ...old, [p.name]: v }))
                    setErrors((e) => ({ ...e, [`params.${p.name}`]: "" }))
                  }}
                  error={
                    errors[`params.${p.name}`] ||
                    (touched && missing.includes(p) ? "A value is needed." : "")
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {n > 1 && (
          <Section title="Options">
            <div className="flex flex-col gap-1">
              {n > 1 && (
                <>
                  <SwitchRow
                    label="Keep going when one server fails"
                    hint="Off: the servers not started yet are skipped once one fails."
                    checked={keepGoing}
                    onChange={setKeepGoing}
                  />
                  <div className="mt-2 max-w-60">
                    <Labeled
                      label="Servers at a time"
                      hint="From 1 to 20."
                      error={!/^\d*$/.test(parallel)}
                    >
                      {(id) => (
                        <Input
                          id={id}
                          value={parallel}
                          inputMode="numeric"
                          onChange={(e) => setParallel(e.target.value)}
                        />
                      )}
                    </Labeled>
                  </div>
                </>
              )}
            </div>
          </Section>
        )}

        {errors.recipes && (
          <Callout title="Can't install" warn>
            {errors.recipes}
          </Callout>
        )}
      </LayerBody>
      <LayerFooter>
        {!phone && (
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button
          className="h-11 flex-1 md:ms-auto md:h-9 md:flex-none"
          disabled={start.isPending || (touched && blocked.length > 0)}
          onClick={install}
        >
          {start.isPending
            ? "Starting…"
            : `Install on ${n || ""} ${n === 1 ? "server" : "servers"}`}
        </Button>
      </LayerFooter>
    </>
  )
}

// What the person typed, without blanks: the backend fills defaults and
// makes the generated ones per server.
function given(params: RecipeParam[], values: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const p of params) {
    const v = values[p.name] ?? ""
    if (v !== "" && v !== (p.default ?? "")) out[p.name] = v
  }
  return out
}

function PreflightRow({ r }: { r: SoftwarePreflight }) {
  const facts = [
    r.pm,
    r.arch,
    r.free_mb !== undefined ? `${freeText(r.free_mb)} free` : "",
  ].filter(Boolean)
  return (
    <li className="flex gap-3 px-4 py-3 text-body-sm">
      {r.ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{r.server_name}</span>
          <span className="text-caption text-ash">{facts.join(" · ")}</span>
        </p>
        {r.installed && (
          <p className="text-muted-foreground">
            Already here{r.version ? ` (${r.version})` : ""}: installing again
            sets it up over what's there.
          </p>
        )}
        {r.first.length > 0 && (
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Installs {r.first.join(", ")} first.
          </p>
        )}
        {r.problems.map((p) => (
          <p key={p} className="text-destructive">
            {p}
          </p>
        ))}
        {r.warnings.map((w) => (
          <p key={w} className="text-warning">
            {w}
          </p>
        ))}
      </div>
    </li>
  )
}

const freeText = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB` : `${mb} MB`

export function ParamField({
  p,
  value,
  onChange,
  error,
}: {
  p: RecipeParam
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const label = `${p.label}${p.required || p.type === "bool" ? "" : " (optional)"}`
  const generated =
    p.generate && !value
      ? "Left blank, a strong one is made for each server. Owners can see it later."
      : ""
  const hint = error || p.help || generated || undefined

  if (p.type === "bool") {
    return (
      <div className="md:col-span-2">
        <SwitchRow
          label={p.label}
          hint={p.help}
          checked={value === "true"}
          onChange={(v) => onChange(v ? "true" : "false")}
        />
      </div>
    )
  }

  return (
    <Labeled label={label} hint={hint} error={!!error}>
      {(id) => {
        if (p.type === "password") {
          return (
            <SecretInput
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={p.generate ? "Made for you" : undefined}
              autoComplete="new-password"
              aria-invalid={!!error || undefined}
            />
          )
        }
        if (p.type === "select") {
          const items = (p.options ?? []).map((o) => ({ value: o, label: o }))
          return (
            <Select
              items={items}
              value={value}
              onValueChange={(v) => v !== null && onChange(v)}
            >
              <SelectTrigger id={id} className="h-11 w-full md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {items.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        const numeric = p.type === "port" || p.type === "number"
        return (
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={
              numeric ? "numeric" : p.type === "email" ? "email" : undefined
            }
            type={p.type === "email" ? "email" : "text"}
            placeholder={placeholders[p.type]}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!error || undefined}
            className={cn(numeric && "md:max-w-40")}
          />
        )
      }}
    </Labeled>
  )
}

const placeholders: Partial<Record<RecipeParam["type"], string>> = {
  domain: "app.example.com",
  email: "you@example.com",
  path: "/srv/data",
}
