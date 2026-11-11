"use client"

import {
  CircleCheck,
  CircleMinus,
  CircleX,
  ClipboardPaste,
  Copy,
  Loader2,
  PlugZap,
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
  engines,
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

export type DatabaseFormSubmit = {
  body: DatabaseBody
  setErrors: (errors: Record<string, string>) => void
}

// Desktop puts the test in the sheet's footer; the phone sheet keeps it
// inline after the credentials.
export type DatabaseFormParts = {
  kind: ReactNode
  connection: ReactNode
  auth: ReactNode
  options: ReactNode
  testButton: ReactNode
  testResult: ReactNode
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
  className,
  children,
}: {
  formId: string
  database?: Database
  // Opened from a server's tab: that server, through SSH, fixed.
  serverId?: string
  onSubmit: (submit: DatabaseFormSubmit) => void
  className?: string
  children: (parts: DatabaseFormParts) => ReactNode
}) {
  const can = useCanAddDatabase()
  // Editing keeps whatever the database already uses.
  const canDirect = !!database || can.direct
  const [values, setValues] = useState(() =>
    initialValues(database, serverId, canDirect),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tested, setTested] = useState<DatabaseTest | null>(null)
  const [pasted, setPasted] = useState("")
  const [pasteNote, setPasteNote] = useState<string | null>(null)
  const test = useTestDatabase()
  const reveal = useRevealDatabaseCredentials(database?.id)
  const nameRef = useRef<HTMLInputElement>(null)
  const direct = values.mode === "direct"
  const outbound = useOutboundIp(direct)
  const servers = useServers({ limit: 500 })
  const meta = engineMeta[values.engine]
  const lockedServer = !!serverId && !database

  // biome-ignore lint/correctness/useExhaustiveDependencies: on mount only
  useEffect(() => {
    if (!database && matchMedia("(pointer: fine)").matches) {
      nameRef.current?.focus()
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

  // Fills the form from a pasted URL or ADO string, then forgets the text:
  // it usually holds the password.
  function fill(raw: string) {
    const p = parseConnectionString(raw)
    if (!p) {
      setPasteNote("Not a connection string Morche can read.")
      return
    }
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
      name: v.name || p.dbname || p.host.split(".")[0] || "",
    }))
    setPasted("")
    setPasteNote(`Filled in from the ${engineMeta[p.engine].label} string.`)
    setErrors({})
    setTested(null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!values.name.trim()) e.name = "Give the database a name"
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
    return Object.keys(e).length === 0
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    onSubmit({
      body: toBody(values, can.allowInternal, database?.favorite),
      setErrors,
    })
  }

  function runTest() {
    if (!validate()) return
    setTested(null)
    test.mutate(
      { ...connection(values, can.allowInternal), database_id: database?.id },
      {
        onSuccess: setTested,
        onError: (error) => setErrors((e) => ({ ...e, ...fieldErrors(error) })),
      },
    )
  }

  const serverOptions = (servers.data?.items ?? [])
    .filter(
      (s) => s.id === values.server_id || can.viaServer(s.id, s.workspace_id),
    )
    .map((s) => ({ value: s.id, label: s.name, detail: s.host }))

  const kind = (
    <Section title="Engine">
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
      {!database && (
        <Field
          label="Connection string"
          error={pasteNote?.startsWith("Not") ? pasteNote : undefined}
          hint={
            pasteNote ??
            "Optional. Paste a URL like postgres://user:pass@host:5432/db and the fields fill in."
          }
        >
          {(f) => (
            <div className="flex gap-2">
              <Input
                {...f}
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value)
                  setPasteNote(null)
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text")
                  if (parseConnectionString(text)) {
                    e.preventDefault()
                    fill(text)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    fill(pasted)
                  }
                }}
                placeholder="postgres://… · mysql://… · Server=…;"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                className="max-md:h-11"
                disabled={!pasted.trim()}
                onClick={() => fill(pasted)}
              >
                <ClipboardPaste />
                Fill
              </Button>
            </div>
          )}
        </Field>
      )}
    </Section>
  )

  const connectionPart = (
    <Section title="Connection">
      <Field label="Name" error={errors.name}>
        {(f) => (
          <Input
            {...f}
            ref={nameRef}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Shop database"
            autoComplete="off"
            maxLength={64}
            enterKeyHint="next"
          />
        )}
      </Field>
      {!lockedServer && canDirect && (
        <Segmented
          label="How Morche reaches it"
          value={values.mode}
          onChange={pickMode}
          options={[
            { value: "server", label: "Through a server" },
            { value: "direct", label: "Direct address" },
          ]}
        />
      )}
      <p className="-mt-2 text-caption text-muted-foreground">
        {direct
          ? "Morche connects straight to a public IP or domain, e.g. a managed database."
          : "Morche opens an SSH tunnel to one of your servers and connects from there, so the port stays closed to the internet."}
      </p>
      {!direct && (
        <>
          {!lockedServer && (
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
          )}
          <Field
            label="Docker container"
            error={errors.container}
            hint="Name or ID, when the database runs in a container. Empty = on the server itself."
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
                enterKeyHint="next"
                className="font-mono"
              />
            )}
          </Field>
        </>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <Field
          label={direct ? "Host" : "Address on the server"}
          error={errors.host}
          hint={
            direct
              ? undefined
              : values.container
                ? "Empty = the container's own address."
                : "Empty = 127.0.0.1. Another host the server can reach works too."
          }
        >
          {(f) => (
            <Input
              {...f}
              value={values.host}
              onChange={(e) => set("host", e.target.value.trim())}
              placeholder={
                direct
                  ? "db.example.com"
                  : values.container
                    ? "Container"
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
      {direct && (
        <OutboundIp ip={outbound.data?.ip} loading={outbound.isPending} />
      )}
      {direct && can.allowInternal && (
        <CheckRow
          checked={values.allow_internal}
          onChange={(on) => set("allow_internal", on)}
          label="Allow a private address"
          text="10.x, 192.168.x, localhost and the like are refused by default, so nobody can probe Morche's own network."
        />
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
              ? "The password and data cross the internet unencrypted."
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
    </Section>
  )

  const saved = database?.has_password && !values.clear_password
  const auth = (
    <Section title="Credentials">
      <Field
        label="Username"
        error={errors.username}
        hint={
          values.engine === "redis"
            ? "Only with ACL users (Redis 6+). Empty = the default user."
            : values.engine === "mongodb"
              ? "Empty when authentication is off."
              : "A read-only monitoring user is enough for everything except stopping sessions."
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
        hint={
          saved
            ? "Saved and encrypted. Leave blank to keep it."
            : "Stored encrypted."
        }
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
      {database?.has_password && !values.password && (
        <CheckRow
          checked={values.clear_password}
          onChange={(on) => set("clear_password", on)}
          label="Forget the saved password"
        />
      )}
      <Field label={meta.dbLabel} error={errors.dbname} hint={meta.dbHint}>
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
            enterKeyHint="next"
            className="font-mono"
          />
        )}
      </Field>
    </Section>
  )

  const intervalOptions = intervals.some((i) => i.value === values.interval)
    ? intervals
    : [...intervals, { value: values.interval, label: `${values.interval} s` }]
  const options = (
    <Section title="Monitoring">
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
    </Section>
  )

  const testButton = (
    <Button
      type="button"
      variant="outline"
      className="max-md:h-11"
      onClick={runTest}
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
  const testResult = tested ? (
    <TestResult result={tested} />
  ) : testError ? (
    <p role="alert" className="text-caption text-destructive">
      {testError}
    </p>
  ) : null

  return (
    <form id={formId} onSubmit={submit} noValidate className={className}>
      {children({
        kind,
        connection: connectionPart,
        auth,
        options,
        testButton,
        testResult,
      })}
    </form>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h3>
      {children}
    </section>
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
function TestResult({ result }: { result: DatabaseTest }) {
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
    </div>
  )
}
