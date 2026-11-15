"use client"

import {
  Boxes,
  ChevronDown,
  CircleCheck,
  CircleMinus,
  CircleX,
  Copy,
  Loader2,
  PlugZap,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react"
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import {
  useDockerContainers,
  useDockerFleet,
} from "@/app/(panel)/containers/api"
import { Section } from "@/app/(panel)/cronjobs/components/editor-parts"
import { useServers } from "@/app/(panel)/servers/api"
import { Field, Segmented } from "@/app/(panel)/servers/components/fields"
import { SecretInput } from "@/components/secret-input"
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
import { useIsMobile } from "@/hooks/use-mobile"
import { fieldErrors } from "@/lib/api"
import type {
  Database,
  DatabaseBody,
  DatabaseTest,
  DatabaseTestBody,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useOutboundIp,
  useRevealDatabaseCredentials,
  useTestDatabase,
} from "../api"
import {
  type Engine,
  EngineTile,
  engineMeta,
  engineName,
  engines,
  imageEngine,
  parseConnectionString,
  statusMeta,
} from "./meta"
import { useCanAddDatabase } from "./permissions"

type Mode = Database["mode"]
type Tls = Database["tls"]

type Values = {
  name: string
  engine: Engine
  mode: Mode
  server_id: string
  container: string
  host: string
  port: string
  username: string
  password: string
  clear_password: boolean
  dbname: string
  tls: Tls
  ca_cert: string
  allow_internal: boolean
  interval: number
  description: string
}

// Through a server the traffic already rides the SSH tunnel; across the
// internet it's encrypted unless the user says otherwise.
const defaultTls = (mode: Mode): Tls =>
  mode === "direct" ? "require" : "disable"

function initialValues(
  d: Database | undefined,
  serverId: string | undefined,
  canDirect: boolean,
): Values {
  const mode: Mode = d?.mode ?? (serverId || !canDirect ? "server" : "direct")
  return {
    name: d?.name ?? "",
    engine: d?.engine ?? "postgres",
    mode,
    server_id: d?.server_id ?? serverId ?? "",
    container: d?.container ?? "",
    // The backend stores 127.0.0.1 for "on the server itself".
    host: d && !(d.mode === "server" && d.host === "127.0.0.1") ? d.host : "",
    port: d?.port && d.port !== engineMeta[d.engine].port ? String(d.port) : "",
    username: d?.username ?? engineMeta.postgres.user,
    password: "",
    clear_password: false,
    dbname: d?.dbname ?? "",
    tls: d?.tls ?? defaultTls(mode),
    ca_cert: d?.ca_cert ?? "",
    allow_internal: d?.allow_internal ?? false,
    interval: d?.interval_seconds ?? 60,
    description: d?.description ?? "",
  }
}

// What the save and the test both send; a blank password is left out so an
// edit keeps the stored one.
function connection(v: Values, allowInternal: boolean): DatabaseTestBody {
  const server = v.mode === "server"
  return {
    engine: v.engine,
    mode: v.mode,
    server_id: server ? v.server_id : undefined,
    container: server ? v.container.trim() : undefined,
    host: v.host.trim(),
    port: Number(v.port) || 0,
    username: v.username.trim(),
    password: v.password || undefined,
    clear_password: !v.password && v.clear_password ? true : undefined,
    dbname: v.dbname.trim(),
    tls: v.tls,
    ca_cert: v.tls === "verify" ? v.ca_cert.trim() : "",
    allow_internal: allowInternal && !server ? v.allow_internal : undefined,
  }
}

function toBody(
  v: Values,
  allowInternal: boolean,
  favorite?: boolean,
): DatabaseBody {
  const { password, clear_password, ...rest } = connection(v, allowInternal)
  return {
    ...rest,
    password,
    clear_password,
    name: v.name.trim(),
    interval_seconds: v.interval,
    description: v.description.trim(),
    favorite,
  }
}

// Fields kept under "More options": an error on one opens it.
const advancedFields = [
  "name",
  "container",
  "tls",
  "ca_cert",
  "allow_internal",
  "interval_seconds",
  "description",
]

// The name a database gets when none is typed: its database, container or
// host, else the engine (and server).
function autoName(v: Values, serverName?: string) {
  const engine = engineMeta[v.engine].label.split(" / ")[0]
  if (v.dbname.trim() && v.engine !== "redis") return v.dbname.trim()
  if (v.mode === "server" && v.container) return v.container
  const host = v.host.trim()
  if (host && host !== "127.0.0.1" && host !== "localhost") {
    return /^[\d.]+$/.test(host) || host.includes(":")
      ? host
      : host.split(".")[0]
  }
  return v.mode === "server" && serverName
    ? `${engine} on ${serverName}`
    : engine
}

export type DatabaseFormSubmit = {
  body: DatabaseBody
  setErrors: (errors: Record<string, string>) => void
}

// The page lays these out: desktop puts the test in the title bar and its
// result in the side column, phones keep both after the credentials.
export type DatabaseFormParts = {
  connection: ReactNode
  auth: ReactNode
  options: ReactNode
  testButton: ReactNode
  testResult: ReactNode
  testing: boolean
  dirty: boolean
  engine: Engine
  flavor?: string
  summary: [label: string, value: ReactNode, mono?: boolean][]
}

const intervals = [
  { value: 15, label: "15 s" },
  { value: 30, label: "30 s" },
  { value: 60, label: "1 min" },
  { value: 300, label: "5 min" },
  { value: 900, label: "15 min" },
]

export function DatabaseForm({
  formId,
  database,
  serverId,
  onSubmit,
  phone,
  className,
  children,
}: {
  formId: string
  database?: Database
  // Opened from a server's tab: that server, picked to start with.
  serverId?: string
  phone: boolean
  onSubmit: (submit: DatabaseFormSubmit) => void
  className?: string
  children: (parts: DatabaseFormParts) => ReactNode
}) {
  const can = useCanAddDatabase()
  // Editing keeps whatever the database already uses.
  const canDirect = !!database || can.direct
  const [start] = useState(() => initialValues(database, serverId, canDirect))
  const [values, setValues] = useState(start)
  const [flavor, setFlavor] = useState(database?.flavor || undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tested, setTested] = useState<DatabaseTest | null>(null)
  const [showMore, setShowMore] = useState(false)
  const test = useTestDatabase()
  const reveal = useRevealDatabaseCredentials(database?.id)
  const hostRef = useRef<HTMLInputElement>(null)
  const direct = values.mode === "direct"
  const outbound = useOutboundIp(direct)
  const servers = useServers({ limit: 500 })
  const meta = engineMeta[values.engine]
  const dirty = JSON.stringify(values) !== JSON.stringify(start)

  // biome-ignore lint/correctness/useExhaustiveDependencies: on mount only
  useEffect(() => {
    if (!database && direct && matchMedia("(pointer: fine)").matches) {
      hostRef.current?.focus()
    }
  }, [])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
    if (key !== "name" && key !== "description" && key !== "interval") {
      setTested(null)
    }
  }

  // A new engine brings its own port and admin user, unless one was typed.
  function pickEngine(engine: Engine) {
    setFlavor(undefined)
    setValues((v) => ({
      ...v,
      engine,
      username:
        !v.username || v.username === engineMeta[v.engine].user
          ? engineMeta[engine].user
          : v.username,
      dbname: engine === "redis" && !/^\d*$/.test(v.dbname) ? "" : v.dbname,
    }))
    setErrors({})
    setTested(null)
  }

  function pickMode(mode: Mode) {
    setValues((v) => ({
      ...v,
      mode,
      tls: v.tls === defaultTls(v.mode) ? defaultTls(mode) : v.tls,
    }))
    setErrors({})
    setTested(null)
  }

  // A connection string pasted into Host fills every field, then the text is
  // gone: it usually holds the password.
  function fill(raw: string) {
    const p = parseConnectionString(raw)
    if (!p) return false
    setValues((v) => ({
      ...v,
      engine: p.engine,
      host: p.host || v.host,
      port:
        p.port && p.port !== engineMeta[p.engine].port ? String(p.port) : "",
      username: p.username ?? (v.engine === p.engine ? v.username : ""),
      password: p.password ?? v.password,
      dbname: p.dbname ?? v.dbname,
      tls: p.tls ?? v.tls,
    }))
    setFlavor(undefined)
    setErrors({})
    setTested(null)
    toast.success(`Filled in from the ${engineMeta[p.engine].label} address`)
    return true
  }

  function validate() {
    const e: Record<string, string> = {}
    if (direct && !values.host.trim()) {
      e.host = "Enter an IP address or domain"
    }
    if (!direct && !values.server_id) e.server_id = "Pick the server"
    if (values.port) {
      const port = Number(values.port)
      if (!Number.isInteger(port) || port < 1 || port > 65535)
        e.port = "1–65535"
    }
    if (
      values.container &&
      !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(values.container.trim())
    ) {
      e.container = "A container name or ID"
    }
    if (values.engine === "redis" && values.dbname) {
      const n = Number(values.dbname)
      if (!Number.isInteger(n) || n < 0 || n > 255) e.dbname = "0–255"
    }
    if (
      values.tls === "verify" &&
      values.ca_cert.trim() &&
      !values.ca_cert.includes("-----BEGIN CERTIFICATE-----")
    ) {
      e.ca_cert = "Paste a PEM certificate (-----BEGIN CERTIFICATE-----…)"
    }
    setErrors(e)
    const ok = Object.keys(e).length === 0
    if (!ok) {
      requestAnimationFrame(() =>
        document
          .querySelector(`#${CSS.escape(formId)} [aria-invalid=true]`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      )
    }
    return ok
  }

  const server = servers.data?.items.find((s) => s.id === values.server_id)
  const fallbackName = autoName(values, server?.name)
  const named = { ...values, name: values.name.trim() || fallbackName }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    onSubmit({
      body: toBody(named, can.allowInternal, database?.favorite),
      setErrors,
    })
  }

  function runTest(v: Values = values) {
    if (!validate()) return
    setTested(null)
    test.mutate(
      { ...connection(v, can.allowInternal), database_id: database?.id },
      {
        onSuccess: setTested,
        onError: (error) => setErrors((e) => ({ ...e, ...fieldErrors(error) })),
      },
    )
  }

  // One-click fixes offered by a failed test, for settings kept under
  // "More options".
  function retryWith(patch: Partial<Values>) {
    const next = { ...values, ...patch }
    setValues(next)
    runTest(next)
  }

  const serverOptions = (servers.data?.items ?? [])
    .filter(
      (s) => s.id === values.server_id || can.viaServer(s.id, s.workspace_id),
    )
    .map((s) => ({ value: s.id, label: s.name, detail: s.host }))

  const connectionPart = (
    <Section
      title="Connection"
      hint="Which database it is and where Morche finds it."
      phone={phone}
    >
      <div
        role="radiogroup"
        aria-label="Engine"
        className="flex flex-wrap gap-1.5"
      >
        {engines.map((x) => (
          // biome-ignore lint/a11y/useSemanticElements: pill options; radio inputs can't be styled as pills
          <button
            key={x.value}
            type="button"
            role="radio"
            aria-checked={x.value === values.engine}
            onClick={() => pickEngine(x.value)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border ps-1.5 pe-3.5 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:pe-3",
              x.value === values.engine
                ? "border-brand/30 bg-brand-soft font-medium text-brand-strong"
                : "border-mist hover:bg-muted",
            )}
          >
            <EngineTile
              engine={x.value}
              className="size-6 rounded-full border-0 bg-card text-[9px]"
            />
            {x.label}
          </button>
        ))}
      </div>
      {canDirect && (
        <div className="flex flex-col gap-1.5">
          <Segmented
            label="How Morche reaches it"
            value={values.mode}
            onChange={pickMode}
            options={[
              { value: "direct", label: "By address" },
              { value: "server", label: "Through a server" },
            ]}
          />
          <p className="text-caption text-muted-foreground">
            {direct
              ? "Any IP or domain Morche can reach, like a managed database."
              : "Over SSH to one of your servers, so the port stays closed to the internet."}
          </p>
        </div>
      )}
      {!direct && (
        <>
          <Field label="Server" error={errors.server_id}>
            {(f) => (
              <ServerSelect
                id={f.id}
                value={values.server_id}
                onChange={(id) => set("server_id", id)}
                options={serverOptions}
                loading={servers.isPending}
              />
            )}
          </Field>
          {values.server_id && (
            <ContainerPicks
              serverId={values.server_id}
              value={values.container}
              onPick={(c, found) => {
                const off = c.name === values.container
                setValues((v) => ({
                  ...v,
                  container: off ? "" : c.name,
                  engine: found.engine,
                  username:
                    found.engine !== v.engine &&
                    (!v.username || v.username === engineMeta[v.engine].user)
                      ? engineMeta[found.engine].user
                      : v.username,
                }))
                setFlavor(off ? undefined : found.flavor)
                setErrors(({ container: _, ...rest }) => rest)
                setTested(null)
              }}
            />
          )}
        </>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
        <Field
          label={direct ? "Host" : "Host on the server"}
          error={errors.host}
          hint={
            direct
              ? database
                ? undefined
                : "Or paste a connection string (postgres://…) to fill everything."
              : values.container
                ? `Empty = the container ${values.container}.`
                : "Empty = 127.0.0.1, the server itself."
          }
        >
          {(f) => (
            <Input
              {...f}
              ref={hostRef}
              value={values.host}
              onChange={(e) => set("host", e.target.value.trim())}
              onBlur={(e) => {
                if (/:\/\/|=/.test(e.target.value)) fill(e.target.value)
              }}
              onPaste={(e) => {
                if (fill(e.clipboardData.getData("text"))) e.preventDefault()
              }}
              placeholder={
                direct
                  ? "db.example.com"
                  : values.container
                    ? values.container
                    : "127.0.0.1"
              }
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="next"
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Port" error={errors.port}>
          {(f) => (
            <Input
              {...f}
              value={values.port}
              onChange={(e) => set("port", e.target.value.replace(/\D/g, ""))}
              placeholder={String(meta.port)}
              inputMode="numeric"
              maxLength={5}
              enterKeyHint="next"
              className="font-mono"
            />
          )}
        </Field>
      </div>
    </Section>
  )

  const saved = database?.has_password && !values.clear_password
  const auth = (
    <Section
      title="Sign in"
      hint="The login Morche uses. Stored encrypted."
      phone={phone}
    >
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <Field
          label="Username"
          error={errors.username}
          hint={
            values.engine === "redis"
              ? "Only with ACL users. Empty = default."
              : values.engine === "mongodb"
                ? "Empty when sign-in is off."
                : undefined
          }
        >
          {(f) => (
            <Input
              {...f}
              value={values.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder={meta.user || "default"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="next"
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Password"
          error={errors.password}
          hint={saved ? "Leave blank to keep the saved one." : undefined}
        >
          {(f) => (
            <SecretInput
              {...f}
              value={values.password}
              onChange={(e) => {
                set("password", e.target.value)
                if (e.target.value) set("clear_password", false)
              }}
              placeholder={saved ? "••••••••" : undefined}
              autoComplete="new-password"
              load={
                saved
                  ? () => reveal.mutateAsync().then((c) => c.password)
                  : undefined
              }
            />
          )}
        </Field>
      </div>
      {database?.has_password && !values.password && (
        <CheckRow
          checked={values.clear_password}
          onChange={(on) => set("clear_password", on)}
          label="Forget the saved password"
        />
      )}
      <Field
        label={`${meta.dbLabel} (optional)`}
        error={errors.dbname}
        hint={meta.dbHint}
      >
        {(f) => (
          <Input
            {...f}
            value={values.dbname}
            onChange={(e) =>
              set(
                "dbname",
                values.engine === "redis"
                  ? e.target.value.replace(/\D/g, "")
                  : e.target.value,
              )
            }
            placeholder={meta.dbPlaceholder}
            inputMode={values.engine === "redis" ? "numeric" : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="done"
            className="font-mono"
          />
        )}
      </Field>
    </Section>
  )

  const intervalOptions = intervals.some((i) => i.value === values.interval)
    ? intervals
    : [...intervals, { value: values.interval, label: `${values.interval} s` }]
  const intervalLabel =
    intervals.find((i) => i.value === values.interval)?.label ??
    `${values.interval} s`
  const tlsLabel = { disable: "Off", require: "Encrypted", verify: "Verified" }
  // A refused field under "More options" opens it.
  const moreOpen =
    showMore || advancedFields.some((k) => errors[k] !== undefined)
  const moreSummary = [
    `Name ${values.name.trim() || fallbackName}`,
    { disable: "No encryption", require: "Encrypted", verify: "Verified TLS" }[
      values.tls
    ],
    !direct && values.container ? `Container ${values.container}` : null,
    `Checked every ${intervalLabel}`,
  ]
    .filter(Boolean)
    .join(" · ")

  const options = (
    <Section
      title="More options"
      hint="Name, encryption and checks. The defaults fit most databases."
      phone={phone}
    >
      <button
        type="button"
        aria-expanded={moreOpen}
        onClick={() => setShowMore(!moreOpen)}
        className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-subtle px-3 py-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">
          {moreOpen ? "Hide options" : moreSummary}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ash transition-transform",
            moreOpen && "rotate-180",
          )}
        />
      </button>
      {moreOpen && (
        <>
          <Field
            label="Name"
            error={errors.name}
            hint="How it shows in Morche. Empty = the name shown here."
          >
            {(f) => (
              <Input
                {...f}
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={fallbackName}
                autoComplete="off"
                maxLength={64}
              />
            )}
          </Field>
          {!direct && (
            <Field
              label="Docker container"
              error={errors.container}
              hint="Name or ID, when it runs in a container. Empty = on the server itself."
            >
              {(f) => (
                <Input
                  {...f}
                  value={values.container}
                  onChange={(e) => set("container", e.target.value.trim())}
                  placeholder="Not in a container"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono"
                />
              )}
            </Field>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Encryption (TLS)</span>
            <Segmented
              label="Encryption"
              value={values.tls}
              onChange={(v) => set("tls", v)}
              options={[
                { value: "disable", label: "Off" },
                { value: "require", label: "Encrypted" },
                { value: "verify", label: "Verified" },
              ]}
            />
            <p
              className={cn(
                "flex items-start gap-1.5 text-caption",
                direct && values.tls === "disable"
                  ? "text-warning"
                  : "text-muted-foreground",
              )}
            >
              {direct && values.tls === "disable" && (
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
              )}
              {values.tls === "disable"
                ? direct
                  ? "The password and data cross the network unencrypted."
                  : "Fine here: the traffic already rides the SSH tunnel."
                : values.tls === "require"
                  ? "Encrypted, without checking who answers. Enough for most managed databases."
                  : "Encrypted and the certificate must be valid for this host."}
            </p>
          </div>
          {values.tls === "verify" && (
            <Field
              label="CA certificate"
              error={errors.ca_cert}
              hint="PEM. Empty = the system's trusted CAs. Providers offer theirs for download."
            >
              {(f) => (
                <Textarea
                  {...f}
                  value={values.ca_cert}
                  onChange={(e) => set("ca_cert", e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----"
                  spellCheck={false}
                  className="min-h-24 font-mono text-caption"
                />
              )}
            </Field>
          )}
          {direct && can.allowInternal && (
            <CheckRow
              checked={values.allow_internal}
              onChange={(on) => set("allow_internal", on)}
              label="Allow a private address"
              text="10.x, 192.168.x, localhost and the like are refused by default, so nobody can probe Morche's own network."
            />
          )}
          {direct && (
            <OutboundIp ip={outbound.data?.ip} loading={outbound.isPending} />
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Check every</span>
            <Segmented
              label="Check every"
              value={String(values.interval)}
              onChange={(v) => set("interval", Number(v))}
              options={intervalOptions.map((i) => ({
                value: String(i.value),
                label: i.label,
              }))}
            />
            <p className="text-caption text-muted-foreground">
              Each check runs a few light queries. A busy production database is
              fine at 1 min.
            </p>
          </div>
          <Field label="Notes" error={errors.description}>
            {(f) => (
              <Textarea
                {...f}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What it serves, who to call…"
                maxLength={500}
                className="min-h-20"
              />
            )}
          </Field>
        </>
      )}
    </Section>
  )

  const testButton = (
    <Button
      type="button"
      variant="outline"
      className="max-md:h-11"
      onClick={() => runTest()}
      disabled={test.isPending}
    >
      {test.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />}
      {test.isPending ? "Connecting…" : "Test connection"}
    </Button>
  )

  const testError =
    test.isError && !Object.keys(fieldErrors(test.error)).length
      ? test.error.message
      : null
  const fixes: { label: string; patch: Partial<Values> }[] = []
  if (tested?.status === "tls_error" && values.tls !== "disable") {
    fixes.push({ label: "Try without encryption", patch: { tls: "disable" } })
  }
  if (
    tested?.status === "blocked" &&
    direct &&
    can.allowInternal &&
    !values.allow_internal
  ) {
    fixes.push({
      label: "Allow a private address",
      patch: { allow_internal: true },
    })
  }
  const testResult = tested ? (
    <TestResult
      result={tested}
      fixes={fixes.map((x) => ({
        label: x.label,
        run: () => retryWith(x.patch),
      }))}
    />
  ) : testError ? (
    <p role="alert" className="text-caption text-destructive">
      {testError}
    </p>
  ) : null

  const summary: DatabaseFormParts["summary"] = [
    ["Engine", engineName({ engine: values.engine, flavor: flavor ?? "" })],
    ["Name", named.name],
    [
      "Reached",
      direct
        ? "Directly"
        : server
          ? `Through ${server.name}`
          : "Through a server",
    ],
    [
      "Address",
      direct
        ? values.host
          ? `${values.host}:${values.port || meta.port}`
          : ""
        : values.container
          ? `${values.container}:${values.port || meta.port}`
          : `${values.host || "127.0.0.1"}:${values.port || meta.port}`,
      true,
    ],
    [
      "Signs in as",
      values.username.trim() || (meta.user ? "" : "default"),
      true,
    ],
    ["Encryption", tlsLabel[values.tls]],
    ["Checked every", intervalLabel],
  ]

  return (
    <form id={formId} onSubmit={submit} noValidate className={className}>
      {children({
        connection: connectionPart,
        auth,
        options,
        testButton,
        testResult,
        testing: test.isPending,
        dirty,
        engine: values.engine,
        flavor,
        summary,
      })}
    </form>
  )
}

// The server's containers that run a database image, one tap away from the
// "Docker container" field. Shown only when the server has a working engine.
function ContainerPicks({
  serverId,
  value,
  onPick,
}: {
  serverId: string
  value: string
  onPick: (
    container: { name: string; project?: string },
    found: NonNullable<ReturnType<typeof imageEngine>>,
  ) => void
}) {
  const fleet = useDockerFleet()
  const ready =
    fleet.data?.servers.find((s) => s.server_id === serverId)?.state === "ready"
  const containers = useDockerContainers(serverId, ready)
  if (!ready) return null
  const found = (containers.data ?? []).flatMap((c) => {
    const e = imageEngine(c.image)
    return e ? [{ c, e }] : []
  })
  if (containers.isPending) {
    return (
      <p className="-mt-2 flex items-center gap-1.5 text-caption text-ash">
        <Loader2 className="size-3.5 animate-spin" />
        Looking for database containers on this server…
      </p>
    )
  }
  if (!found.length) return null
  return (
    <div className="-mt-1 flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Boxes className="size-3.5" />
        Database containers on this server
      </span>
      <div className="flex flex-wrap gap-1.5">
        {found.map(({ c, e }) => {
          const on = c.name === value
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(c, e)}
              className={cn(
                "inline-flex h-10 max-w-full min-w-0 items-center gap-2 rounded-full border ps-1.5 pe-3 text-start text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
                on
                  ? "border-brand/30 bg-brand-soft text-brand-strong"
                  : "border-mist hover:bg-muted",
              )}
            >
              <EngineTile
                engine={e.engine}
                flavor={e.flavor}
                className="size-6 rounded-full border-0 bg-card text-[9px]"
              />
              <span className="min-w-0 truncate font-mono text-caption">
                {c.name}
              </span>
              {c.state !== "running" && (
                <span className="shrink-0 text-caption text-ash">
                  {c.state}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ServerSelect({
  id,
  value,
  onChange,
  options,
  loading,
}: {
  id?: string
  value: string
  onChange: (id: string) => void
  options: { value: string; label: string; detail: string }[]
  loading: boolean
}) {
  const isMobile = useIsMobile()
  const placeholder = loading
    ? "Loading…"
    : options.length
      ? "Pick a server"
      : "No server you can manage"

  if (isMobile) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <Select
      items={[{ value: "", label: placeholder }, ...options]}
      value={value}
      onValueChange={(v) => v && onChange(v)}
    >
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
            <span className="ms-auto truncate font-mono text-caption text-ash">
              {o.detail}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// The address a database's firewall must let in.
function OutboundIp({ ip, loading }: { ip?: string; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-subtle px-3 py-2.5 text-body-sm">
      <span className="min-w-0 flex-1">
        <span className="block text-caption text-muted-foreground">
          Morche connects from
        </span>
        <span className="font-mono">
          {ip ?? (loading ? "Finding out…" : "Unknown")}
        </span>
        <span className="block text-caption text-muted-foreground">
          Allow this IP in the database's firewall or allow-list.
        </span>
      </span>
      {ip && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="max-md:size-11"
          aria-label="Copy IP"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(ip)
              toast("IP copied")
            } catch {
              toast.error("Couldn't copy")
            }
          }}
        >
          <Copy />
        </Button>
      )}
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
  text,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  text?: string
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside
    <label className="flex items-start gap-2.5 text-body-sm max-md:min-h-11">
      <Checkbox
        checked={checked}
        onCheckedChange={(on) => onChange(on)}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium">{label}</span>
        {text && (
          <span className="block text-caption text-muted-foreground">
            {text}
          </span>
        )}
      </span>
    </label>
  )
}

const stepIcon = {
  ok: <CircleCheck className="size-4 text-success" />,
  warning: <TriangleAlert className="size-4 text-warning" />,
  failed: <CircleX className="size-4 text-destructive" />,
  skipped: <CircleMinus className="size-4 text-ash" />,
}

// Each step of the connection (DNS, TCP, TLS, sign-in, permissions), so a
// failure says exactly where it stopped.
function TestResult({
  result,
  fixes,
}: {
  result: DatabaseTest
  fixes: { label: string; run: () => void }[]
}) {
  const online = result.status === "online"
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-body-sm",
        online
          ? "border-border bg-subtle"
          : "border-destructive/30 bg-destructive/5",
      )}
    >
      <span className="font-medium">
        {online
          ? `Connected${result.version ? ` · ${result.version}` : ""}`
          : statusMeta[result.status].label}
      </span>
      {result.steps.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {result.steps.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{stepIcon[s.status]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span>{s.title}</span>
                  {s.status !== "skipped" && s.ms > 0 && (
                    <span className="text-caption text-ash tabular-nums">
                      {s.ms} ms
                    </span>
                  )}
                </span>
                {s.message && (
                  <span className="block text-caption break-words text-muted-foreground">
                    {s.message}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!online && result.message && !result.steps.length && (
        <span className="text-muted-foreground">{result.message}</span>
      )}
      {fixes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {fixes.map((x) => (
            <Button
              key={x.label}
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={x.run}
            >
              {x.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
